# HygieneCheck – HACCP Dokumentationssoftware TODO

## Datenbankschema
- [x] Tabelle: temperature_logs (Temperaturerfassung)
- [x] Tabelle: checklists (Checklisten-Vorlagen)
- [x] Tabelle: checklist_items (Einzelne Checkpunkte)
- [x] Tabelle: checklist_completions (Erledigte Checklisten)
- [x] Tabelle: goods_receipts (Warenannahme-Protokolle)
- [x] Tabelle: cleaning_plans (Reinigungspläne)
- [x] Tabelle: cleaning_completions (Reinigungsbestätigungen)
- [x] Tabelle: pest_controls (Schädlingskontrolle)
- [x] Tabelle: haccp_points (HACCP-Qualitätspunkte)
- [x] Tabelle: haccp_entries (Einträge zu HACCP-Punkten)
- [x] Tabelle: training_records (Schulungsnachweise)

## Backend (tRPC Router)
- [x] Router: temperature (CRUD Temperaturmessungen)
- [x] Router: checklists (Vorlagen + Erledigungen)
- [x] Router: goodsReceipt (Warenannahme)
- [x] Router: cleaning (Reinigungspläne + Bestätigungen)
- [x] Router: pestControl (Schädlingskontrolle)
- [x] Router: haccp (HACCP-Punkte-Verwaltung + toggleApplicable + updatePoint)
- [x] Router: training (Schulungen)
- [x] Router: dashboard (Übersichtsdaten)
- [x] Router: reports (JSON-Export via S3)
- [x] Router: users (Liste + setRole)

## Frontend – Layout & Design
- [x] Design-System: Navy/Emerald-Farbpalette, Inter-Typografie (elegant, professionell)
- [x] DashboardLayout mit Sidebar-Navigation
- [x] Responsive/Tablet-optimiertes Layout
- [x] Startseite / Login-Weiterleitung

## Frontend – Feature-Seiten
- [x] Dashboard (Übersicht, Warnungen, fällige Aufgaben, Schnellerfassung)
- [x] Temperaturerfassung (Eingabe + Verlauf + Warnungen)
- [x] Checklisten (täglich/wöchentlich/monatlich)
- [x] Warenannahme-Protokoll
- [x] Reinigungsplan (mit Mitarbeiterzuweisung)
- [x] Schädlingskontrolle
- [x] HACCP-Qualitätspunkte-Übersicht (alle 19 QPs)
- [x] Schulungen (QP 17)
- [x] Benutzerverwaltung (Admin-Bereich)
- [x] Berichte & JSON-Export (PDF-Vorbereitung)

## Tablet-Optimierung
- [x] Touch-freundliche Eingabefelder (große Buttons h-12)
- [x] Ganzzahlige Temperatureingabe
- [x] Schnelleingabe-Modus für Temperaturerfassung (Schnellerfassung im Dashboard)

## Stammdaten
- [x] 19 HACCP-Qualitätspunkte eingefügt
- [x] 7 Checklisten-Vorlagen eingefügt
- [x] 8 Reinigungsplan-Aufgaben eingefügt

## Tests
- [x] Vitest: Temperatur-Router Tests
- [x] Vitest: Checklisten-Router Tests
- [x] Vitest: Warenannahme-Router Tests
- [x] Vitest: HACCP-Router Tests (toggleApplicable, updatePoint)
- [x] Vitest: Users-Router Tests (setRole, Berechtigungsprüfung)
- [x] Vitest: Dashboard-Router Tests
- [x] Vitest: Reports-Router Tests
- [x] Vitest: Auth-Router Tests (17 Tests gesamt, alle grün)

## Deployment
- [x] Dockerfile / Podman-Container-Konfiguration erstellen (Multi-Stage Build, Node 22 Alpine)
- [x] docker-compose.yml für lokalen Betrieb (App + MySQL 8 + MinIO S3)
- [x] install_podman_container.sh – Vollständiges Installationsskript mit Autostart, Update, Deinstallation
- [x] env-template.txt – Umgebungsvariablen-Vorlage
- [x] docker/mysql/init/01-init.sql – MySQL-Initialisierungsskript
