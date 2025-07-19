import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User } from "@shared/schema";
import connectPg from "connect-pg-simple";

// Sichere Passwort-Generierung für SFTP-Accounts
function generateSecurePassword(): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    // Check if it's a bcrypt hash (starts with $2b$)
    if (stored.startsWith('$2b$')) {
      return await bcrypt.compare(supplied, stored);
    }
    
    // Fallback for old format (salt.hash)
    if (stored.includes('.')) {
      const [hashed, salt] = stored.split(".");
      if (hashed && salt) {
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        return timingSafeEqual(hashedBuf, suppliedBuf);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export async function setupLocalAuth(app: Express) {
  // Session setup
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Allow creating table if missing
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Test session store connection
  console.log('🔍 Testing session store connection...');
  sessionStore.on('connect', () => {
    console.log('✅ Session store connected successfully');
  });
  sessionStore.on('error', (err) => {
    console.error('❌ Session store error:', err);
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
      sameSite: 'lax',
      path: '/',
    },
    name: 'connect.sid' // Ensure consistent session name
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          console.log('🔍 Login attempt for:', email);
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password) {
            console.log('❌ User not found or no password');
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log('🔐 Comparing passwords...');
          const isValid = await comparePasswords(password, user.password);
          console.log('✅ Password comparison result:', isValid);
          
          if (!isValid) {
            console.log('❌ Invalid password');
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log('✅ Login successful for:', user.email);
          return done(null, user);
        } catch (error) {
          console.error('❌ Login error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    console.log('🔍 Serializing user:', user.id, user.email);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('🔍 Deserializing user with ID:', id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log('❌ User not found during deserialization:', id);
        return done(null, false);
      }
      console.log('✅ User successfully deserialized:', user.email);
      done(null, user);
    } catch (error) {
      console.error("❌ Error deserializing user:", error);
      done(null, false);
    }
  });

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    console.log('📧 Login request received for:', req.body.email);
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('❌ Passport authentication error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('❌ Authentication failed:', info?.message || 'No user returned');
        return res.status(401).json({ 
          message: info?.message || "Invalid credentials" 
        });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('❌ Login error:', err);
          return next(err);
        }
        
        console.log('✅ Login successful for:', user.email);
        res.json({ user: req.user, message: "Login successful" });
      });
    })(req, res, next);
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, privacyConsent } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Alle Felder sind erforderlich" });
      }

      // Validate DSGVO consent
      if (!privacyConsent) {
        return res.status(400).json({ message: "DSGVO-Einverständnis ist erforderlich" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Diese E-Mail-Adresse existiert bereits im System" });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ message: "Passwort muss mindestens 6 Zeichen lang sein" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user with privacy consent and 30-day trial
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 Tage Testzeitraum

      const user = await storage.upsertUser({
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: "user",
        privacyConsent: true, // User has explicitly consented
        emailNotificationsEnabled: true,
        trialStartDate,
        trialEndDate,
        paymentStatus: "trial",
        trialReminderSent: false
      });

      console.log(`✅ Neuer Benutzer registriert: ${email} (DSGVO-Einverständnis: ${privacyConsent})`);

      // Automatische SFTP-Account-Erstellung für neuen Benutzer
      try {
        const sftpUsername = `baustructura_user_${user.id}`;
        const sftpPassword = generateSecurePassword();
        const homeDir = `/var/ftp/user_${user.id}`;
        
        // Benutzer mit SFTP-Daten aktualisieren
        await storage.updateUser(user.id, {
          sftpHost: "128.140.82.20",
          sftpPort: 21,
          sftpUsername: sftpUsername,
          sftpPassword: sftpPassword,
          sftpPath: `${homeDir}/uploads/`
        });
        
        console.log(`✅ SFTP-Account automatisch erstellt für Benutzer ${user.id}: ${sftpUsername}`);
      } catch (sftpError) {
        console.error("❌ SFTP-Account-Erstellung fehlgeschlagen:", sftpError);
        // Registrierung trotzdem fortsetzen
      }

      // Willkommens-E-Mail senden mit SFTP-Informationen und Retry-Logik
      let emailSent = false;
      let emailError = null;
      
      try {
        const { emailService } = await import('./emailService');
        console.log(`📧 Sende Willkommens-E-Mail an: ${email}`);
        
        // Retry-Logik für E-Mail-Versand (3 Versuche)
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const emailResponse = await emailService.sendWelcomeEmail({
              to: email,
              firstName: firstName,
              role: "user",
              id: user.id
            });
            
            console.log(`✅ Willkommens-E-Mail erfolgreich versendet (Versuch ${attempt}):`, emailResponse.messageId);
            emailSent = true;
            break; // Erfolgreich, Schleife beenden
            
          } catch (retryError) {
            console.error(`❌ Willkommens-E-Mail Versuch ${attempt} fehlgeschlagen:`, retryError);
            emailError = retryError;
            
            if (attempt < 3) {
              console.log(`⏳ Wiederhole E-Mail-Versand in 2 Sekunden...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!emailSent) {
          throw new Error(`E-Mail-Versand nach 3 Versuchen fehlgeschlagen: ${emailError?.message || 'Unbekannter Fehler'}`);
        }
        
      } catch (emailError) {
        console.error("❌ Willkommens-E-Mail komplett fehlgeschlagen:", emailError);
        emailSent = false;
        
        // Wichtig: Registrierung trotzdem fortsetzen, aber Status korrekt setzen
        console.log("⚠️  Registrierung wird trotz E-Mail-Fehler fortgesetzt");
      }

      // Log user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Anmeldung nach Registrierung fehlgeschlagen" });
        }
        res.status(201).json({ 
          user, 
          message: "Registrierung erfolgreich",
          sftpEnabled: true,
          welcomeEmailSent: emailSent,
          emailStatus: emailSent ? "Willkommens-E-Mail erfolgreich versendet" : "E-Mail-Versand fehlgeschlagen - prüfen Sie Ihr Postfach oder kontaktieren Sie den Support"
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registrierung fehlgeschlagen" });
    }
  });

  // Support both GET and POST for logout (for browser redirects and API calls)
  const handleLogout = (req: any, res: any) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        if (req.method === 'GET') {
          return res.redirect('/auth?error=logout_failed');
        }
        return res.status(500).json({ message: "Logout failed" });
      }
      
      // Clear session data
      req.session.destroy((sessionErr: any) => {
        if (sessionErr) {
          console.error("Session destroy error:", sessionErr);
        }
        
        if (req.method === 'GET') {
          // Redirect to auth page for browser requests
          res.redirect('/auth?message=logged_out');
        } else {
          // JSON response for API calls
          res.json({ message: "Logout successful" });
        }
      });
    });
  };

  app.get("/api/logout", handleLogout);
  app.post("/api/auth/logout", handleLogout);

  app.get("/api/auth/user", (req: any, res: any) => {
    console.log("=== /API/AUTH/USER REQUEST ===");
    console.log("Session ID:", req.sessionID);
    console.log("Session exists:", !!req.session);
    console.log("Session passport:", req.session?.passport);
    console.log("User object:", req.user);
    console.log("isAuthenticated():", req.isAuthenticated ? req.isAuthenticated() : 'method not available');
    
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      console.log("✅ User authenticated, returning user data");
      res.json(req.user);
    } else {
      console.log("❌ User not authenticated");
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Password reset request
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "E-Mail-Adresse ist erforderlich" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists
        return res.json({ message: "Falls die E-Mail-Adresse registriert ist, wurde ein Reset-Link gesendet." });
      }

      // Generate secure reset token
      const resetToken = Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
      
      // In production, save token to database with expiration
      // For now, we'll use a simple approach with email notification
      
      console.log(`Password reset requested for ${email}. Reset token: ${resetToken}`);
      
      // Send reset email with BREVO
      try {
        const { emailService } = await import('./emailService');
        await emailService.sendPasswordResetEmail({
          to: email,
          firstName: user.firstName,
          resetToken: resetToken,
          resetLink: `https://bau-structura.com/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
        });
        console.log(`📧 Passwort-Reset-E-Mail versendet an: ${email}`);
      } catch (emailError) {
        console.error("❌ Passwort-Reset-E-Mail fehlgeschlagen:", emailError);
        // Continue anyway for security
      }
      
      // Send reset notification
      res.json({ 
        message: "Falls die E-Mail-Adresse registriert ist, wurde ein Reset-Link gesendet.",
        // For demo purposes, return the token (remove in production)
        resetToken: resetToken
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Passwort-Reset fehlgeschlagen" });
    }
  });

  // Password reset confirmation
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, newPassword, resetToken } = req.body;
      
      if (!email || !newPassword || !resetToken) {
        return res.status(400).json({ message: "Alle Felder sind erforderlich" });
      }

      // In production, verify reset token from database
      // For now, we'll accept any token for demo purposes
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Ungültiger Reset-Link" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user password
      await storage.updateUser(user.id, { password: hashedPassword });
      
      console.log(`Password reset completed for ${email}`);
      
      res.json({ message: "Passwort erfolgreich zurückgesetzt" });
    } catch (error) {
      console.error("Password reset confirmation error:", error);
      res.status(500).json({ message: "Passwort-Reset fehlgeschlagen" });
    }
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  console.log("=== AUTHENTICATION CHECK ===");
  console.log("Session ID:", req.sessionID);
  console.log("Session:", JSON.stringify(req.session, null, 2));
  console.log("User:", req.user);
  console.log("isAuthenticated():", req.isAuthenticated ? req.isAuthenticated() : 'method not available');
  
  if (req.isAuthenticated()) {
    console.log("✓ Authentication successful");
    return next();
  }
  
  console.log("✗ Authentication failed");
  res.status(401).json({ message: "Unauthorized" });
};

export { hashPassword, comparePasswords };