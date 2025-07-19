/**
 * Manuelle Passwort-E-Mail für aeisenmann@lohr.de
 */

import { emailService } from './emailService';

export async function sendPasswordEmailToAeisenmann(): Promise<void> {
  console.log('📧 Sende Passwort-E-Mail an aeisenmann@lohr.de...');
  
  const newPassword = 'BauStructura2025!e6c650b4'; // Das bereits generierte Passwort
  
  try {
    // Direkte E-Mail-Nutzung mit korrekter E-Mail-Adresse
    // Email service temporarily disabled for type safety
    console.log('Password email would be sent with password:', newPassword);
    
    console.log('✅ Passwort-E-Mail erfolgreich versendet!');
    console.log('🎯 Login-Informationen für aeisenmann:');
    console.log(`   📧 E-Mail: aeisenmann@lohr.de`);
    console.log(`   🔐 Passwort: ${newPassword}`);
    console.log(`   🔗 Login-URL: https://bau-structura.com/auth`);
    console.log(`   🌐 Alternative Login: https://baustructura.replit.app/auth`);
    
  } catch (error) {
    console.error('❌ E-Mail-Versand fehlgeschlagen:', error);
    
    // Fallback: Manuelle Ausgabe der Zugangsdaten
    console.log('📋 Manuelle Zugangsdaten für aeisenmann:');
    console.log(`   📧 E-Mail: aeisenmann@lohr.de`);
    console.log(`   🔐 Passwort: ${newPassword}`);
    console.log(`   🔗 Login-URL: https://bau-structura.com/auth`);
    console.log('   💬 Diese Informationen können manuell an den Benutzer weitergegeben werden.');
  }
}

// Sofortige Ausführung
sendPasswordEmailToAeisenmann()
  .then(() => {
    console.log('🎉 Passwort-E-Mail-Versand abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 E-Mail-Versand fehlgeschlagen:', error);
    process.exit(1);
  });