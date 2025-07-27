/**
 * Testzeitraum-Benachrichtigungsservice für Bau-Structura
 * Automatische E-Mail- und Push-Erinnerungen für ablaufende Testversionen
 */

import { storage } from "./storage";
import { emailService } from "./emailService";
import { pushService } from "./pushService";

export class TrialReminderService {
  
  /**
   * Überprüft alle Benutzer auf ablaufende Testversionen
   * Sendet Erinnerungen an Tag 7 und Tag 12 des 14-tägigen Testzeitraums
   */
  async checkTrialExpirations(): Promise<{
    checked: number;
    remindersSent: number;
    errors: string[];
  }> {
    const results = {
      checked: 0,
      remindersSent: 0,
      errors: [] as string[]
    };

    try {
      // Alle Benutzer mit aktivem Testzeitraum abrufen
      const users = await storage.getAllUsers();
      const trialUsers = users.filter(user =>
        user.paymentStatus === "trial" &&
        user.trialEndDate &&
        (user.trialReminderSent ?? 0) < 12
      );

      results.checked = trialUsers.length;

      for (const user of trialUsers) {
        try {
          const now = new Date();
          const trialStart = new Date(user.trialStartDate!);
          const trialEnd = new Date(user.trialEndDate!);
          const daysUntilExpiry = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
          const lastReminder = user.trialReminderSent ?? 0;

          if (daysSinceStart >= 7 && lastReminder < 7 && daysUntilExpiry > 0) {
            await this.sendTrialReminderEmail(user, daysUntilExpiry);
            await pushService.sendPush(user.pushSubscription, {
              title: 'Testzeitraum Erinnerung',
              body: `Ihr Testzeitraum endet in ${daysUntilExpiry} Tagen.`
            });
            await storage.updateUser(user.id, { trialReminderSent: 7 });
            results.remindersSent++;
            console.log(`✅ Testzeitraum-Erinnerung (Tag 7) gesendet an ${user.email} (${daysUntilExpiry} Tage verbleibend)`);
          }

          if (daysSinceStart >= 12 && lastReminder < 12 && daysUntilExpiry > 0) {
            await this.sendTrialReminderEmail(user, daysUntilExpiry);
            await pushService.sendPush(user.pushSubscription, {
              title: 'Testzeitraum Erinnerung',
              body: `Ihr Testzeitraum endet in ${daysUntilExpiry} Tagen.`
            });
            await storage.updateUser(user.id, { trialReminderSent: 12 });
            results.remindersSent++;
            console.log(`✅ Testzeitraum-Erinnerung (Tag 12) gesendet an ${user.email} (${daysUntilExpiry} Tage verbleibend)`);
          }

          // Account deaktivieren wenn Testzeitraum abgelaufen
          if (daysUntilExpiry <= 0) {
            await storage.updateUser(user.id, {
              paymentStatus: "expired"
            });
            console.log(`⏰ Testzeitraum abgelaufen für ${user.email}`);
          }

        } catch (userError) {
          const errorMsg = `Fehler bei Benutzer ${user.email}: ${userError}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

    } catch (error) {
      const errorMsg = `Allgemeiner Fehler beim Testzeitraum-Check: ${error}`;
      results.errors.push(errorMsg);
      console.error(errorMsg);
    }

    return results;
  }

  /**
   * Sendet Testzeitraum-Erinnerungs-E-Mail mit Lizenzangeboten
   */
  private async sendTrialReminderEmail(user: any, daysRemaining: number): Promise<void> {
    const subject = `🚨 Ihr Bau-Structura Testzeitraum läuft in ${daysRemaining} Tagen ab`;
    
    await emailService.sendTrialReminderEmail({
      to: user.email,
      firstName: user.firstName,
      daysRemaining,
      trialEndDate: user.trialEndDate
    });
  }

  /**
   * Manueller Test der Erinnerungsfunktion (nur für Entwicklung)
   */
  async testTrialReminder(userEmail: string): Promise<boolean> {
    try {
      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        throw new Error("Benutzer nicht gefunden");
      }

      await this.sendTrialReminderEmail(user, 7); // Test mit 7 Tagen
      return true;
    } catch (error) {
      console.error("Test-Erinnerung fehlgeschlagen:", error);
      return false;
    }
  }
}

export const trialReminderService = new TrialReminderService();

/**
 * Startet den automatischen Testzeitraum-Check
 * Läuft täglich um 09:00 Uhr
 */
export function startTrialReminderScheduler(): void {
  // Sofortiger Check beim Start
  trialReminderService.checkTrialExpirations().then(results => {
    console.log(`🕘 Testzeitraum-Check abgeschlossen:`, results);
  });

  // Täglicher Check um 09:00 Uhr
  const checkInterval = 24 * 60 * 60 * 1000; // 24 Stunden
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 9) { // 09:00 Uhr
      const results = await trialReminderService.checkTrialExpirations();
      console.log(`🕘 Täglicher Testzeitraum-Check (09:00):`, results);
    }
  }, checkInterval);

  console.log("✅ Testzeitraum-Reminder-Scheduler gestartet");
}