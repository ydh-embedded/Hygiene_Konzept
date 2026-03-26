-- HygieneCheck – MySQL Initialisierungsskript
-- Wird beim ersten Start des Datenbankcontainers automatisch ausgeführt

-- Zeichensatz sicherstellen
ALTER DATABASE hygienecheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Berechtigungen für den Anwendungsbenutzer
GRANT ALL PRIVILEGES ON hygienecheck.* TO 'hygiene'@'%';
FLUSH PRIVILEGES;
