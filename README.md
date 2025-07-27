# BauStructura - Mobile Baustellendokumentation

Eine moderne Webanwendung für die mobile Baustellendokumentation mit SFTP-Dateiverwaltung, Authentifizierung und umfassenden Projektmanagement-Features.

## 🚀 Features

- **Benutzerauthentifizierung** mit sicherem Session-Management
- **SFTP-Dateiverwaltung** für sichere Datei-Uploads und Downloads
- **Projektmanagement** mit Kunden- und Firmenverwaltung
- **Mobile-optimierte UI** für Baustelleneinsatz
- **E-Mail-Benachrichtigungen** und Support-System
- **AI-Assistent** für Dokumentation
- **Kartenintegration** mit Google Maps
- **Zahlungsabwicklung** mit Stripe
- **Automatische Backups** mit Azure Storage

## 📋 Voraussetzungen

- Node.js 18+ 
- PostgreSQL Datenbank
- SFTP-Server (Hetzner: 128.140.82.20)
- SMTP-Server für E-Mails
- Stripe-Account für Zahlungen
- Google Maps API Key
- OpenAI API Key (optional)

## 🛠️ Installation

### 1. Repository klonen
```bash
git clone https://github.com/your-username/BauStructura_Juli.git
cd BauStructura_Juli
```

### 2. Abhängigkeiten installieren
```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env
```

Bearbeiten Sie die `.env`-Datei und konfigurieren Sie alle erforderlichen Umgebungsvariablen:

```env
# Datenbank
DATABASE_URL=postgresql://username:password@localhost:5432/baustructura

# Session-Sicherheit
SESSION_SECRET=your-super-secret-session-key-change-in-production-2024

# E-Mail-Konfiguration
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SENDER_EMAIL=support@bau-structura.de

# Weitere Konfigurationen...
```

### 4. Datenbank einrichten
```bash
# Datenbank-Schema erstellen
npm run db:push

# Oder mit Setup-Skript (erstellt auch Admin-User)
node scripts/setup-database.js
```

### 5. Entwicklungsserver starten
```bash
npm run dev
```

Die Anwendung ist jetzt unter `http://localhost:5000` verfügbar.

## 🚀 Produktions-Deployment

### Automatisches Setup
```bash
# Script ausführbar machen
chmod +x scripts/start-production.sh

# Produktions-Setup starten
./scripts/start-production.sh
```

### Manuelles Setup
```bash
# Build erstellen
npm run build

# Produktions-Server starten
NODE_ENV=production npm start
```

## 🔐 Standard-Anmeldedaten

Nach der Installation wird automatisch ein Admin-User erstellt:

- **E-Mail:** admin@bau-structura.de
- **Passwort:** Admin123!

⚠️ **Wichtig:** Ändern Sie das Passwort nach der ersten Anmeldung!

## 📁 SFTP-Konfiguration

Die Anwendung unterstützt automatische SFTP-Account-Erstellung für Benutzer:

- **Server:** 128.140.82.20
- **Port:** 22
- **Basis-Pfad:** /home/sftp-users

SFTP-Credentials werden automatisch bei der Registrierung erstellt.

## 🔧 API-Endpunkte

### Authentifizierung
- `POST /api/auth/login` - Benutzeranmeldung
- `POST /api/auth/register` - Benutzerregistrierung
- `POST /api/auth/logout` - Abmeldung

### SFTP-Verwaltung
- `GET /api/sftp/files` - Dateien auflisten
- `POST /api/sftp/upload` - Datei hochladen
- `GET /api/sftp/download/:fileName` - Datei herunterladen
- `DELETE /api/sftp/files/:fileName` - Datei löschen
- `POST /api/sftp/create-folder` - Ordner erstellen

### Projekte
- `GET /api/projects` - Projekte auflisten
- `POST /api/projects` - Projekt erstellen
- `PUT /api/projects/:id` - Projekt bearbeiten
- `DELETE /api/projects/:id` - Projekt löschen

## 🛡️ Sicherheitsfeatures

- **Sichere Passwort-Hashing** mit bcrypt
- **Session-Management** mit PostgreSQL
- **CSRF-Schutz** und Security Headers
- **Rate Limiting** für API-Endpunkte
- **Input-Validierung** mit Zod
- **SQL-Injection-Schutz** mit Drizzle ORM

## 📧 E-Mail-Konfiguration

Die Anwendung unterstützt mehrere E-Mail-Provider:

### Brevo (Sendinblue)
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

### SendGrid
```env
SENDGRID_API_KEY=your-sendgrid-api-key
```

## 🔄 Backup-System

Automatische Backups werden in Azure Blob Storage gespeichert:

```env
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_BACKUP_CONTAINER=bau-structura-backups
```

## 🐛 Troubleshooting

### Datenbankverbindung fehlgeschlagen
- Überprüfen Sie die `DATABASE_URL` in der `.env`-Datei
- Stellen Sie sicher, dass PostgreSQL läuft
- Testen Sie die Verbindung: `psql $DATABASE_URL`

### SFTP-Verbindung fehlgeschlagen
- Überprüfen Sie die SFTP-Server-Konfiguration
- Stellen Sie sicher, dass der SFTP-Server erreichbar ist
- Überprüfen Sie die Benutzer-Credentials in der Datenbank

### E-Mail-Versand funktioniert nicht
- Überprüfen Sie die SMTP-Einstellungen
- Testen Sie die Verbindung mit einem SMTP-Test-Tool
- Überprüfen Sie die Firewall-Einstellungen

## 📞 Support

Bei Problemen oder Fragen:

1. Überprüfen Sie die Logs: `npm run dev` zeigt detaillierte Logs
2. Erstellen Sie ein Issue im GitHub-Repository
3. Kontaktieren Sie den Support: support@bau-structura.de

## 📄 Lizenz

Dieses Projekt ist proprietär und gehört zu BauStructura.

## 🔄 Updates

Für Updates:

```bash
git pull origin main
npm install
npm run build
NODE_ENV=production npm start
```

---

**BauStructura** - Mobile Baustellendokumentation der Zukunft 🏗️ 
