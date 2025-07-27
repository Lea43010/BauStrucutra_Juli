#!/usr/bin/env node

/**
 * Database Setup Script for BauStructura
 * This script initializes the database schema and creates necessary tables
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema.js';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { eq } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    // Create database connection
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });

    console.log('📊 Running database migrations...');
    
    // Run migrations
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('✅ Database migrations completed successfully');
    
    // Create initial admin user if not exists
    console.log('👤 Checking for admin user...');
    
    const adminUser = await db.select().from(schema.users).where(eq(schema.users.email, 'admin@bau-structura.de')).limit(1);
    
    if (adminUser.length === 0) {
      console.log('🔧 Creating initial admin user...');
      
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      
      await db.insert(schema.users).values({
        id: 'admin_' + Date.now(),
        email: 'admin@bau-structura.de',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        password: hashedPassword,
        privacyConsent: true,
        emailNotificationsEnabled: true,
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        paymentStatus: 'paid',
        licenseType: 'enterprise',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Admin user created successfully');
      console.log('📧 Email: admin@bau-structura.de');
      console.log('🔑 Password: Admin123!');
      console.log('⚠️  Please change the password after first login!');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Create system statistics
    console.log('📈 Creating system statistics...');
    
    const stats = await db.select().from(schema.users);
    console.log(`📊 Total users in database: ${stats.length}`);
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}

export { setupDatabase };