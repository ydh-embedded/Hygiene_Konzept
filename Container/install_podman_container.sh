#!/usr/bin/env bash
# =============================================================================
# HygieneCheck – HACCP Dokumentationssoftware
# Podman Container Installationsskript
#
# Unterstützte Systeme:
#   - Ubuntu / Debian
#   - RHEL / CentOS / Fedora / Rocky Linux / AlmaLinux
#   - openSUSE / SLES
#
# Verwendung:
#   chmod +x install_podman_container.sh
#   ./install_podman_container.sh
#
# Optionen:
#   --uninstall    Container und Volumes entfernen (Daten bleiben erhalten)
#   --reset        Container, Volumes UND alle Daten entfernen (ACHTUNG!)
#   --update       Container neu bauen und aktualisieren
#   --status       Status aller Container anzeigen
#   --logs         Live-Logs der App anzeigen
#   --help         Diese Hilfe anzeigen
# =============================================================================

set -euo pipefail

# ── Konfiguration ─────────────────────────────────────────────────────────────
readonly SCRIPT_VERSION="1.0.0"
readonly APP_NAME="HygieneCheck"
readonly COMPOSE_PROJECT="hygienecheck"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ENV_FILE="${SCRIPT_DIR}/.env"
readonly ENV_TEMPLATE="${SCRIPT_DIR}/env-template.txt"
readonly COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

# Kurzform für alle podman-compose Aufrufe mit expliziter Datei
PC_CMD() { podman-compose -f "${COMPOSE_FILE}" -p "${COMPOSE_PROJECT}" "$@"; }

# Farben für Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Hilfsfunktionen ───────────────────────────────────────────────────────────

print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║  ${APP_NAME} – HACCP Dokumentationssoftware                  ║${NC}"
    echo -e "${BOLD}${BLUE}║  Podman Container Installer v${SCRIPT_VERSION}                        ║${NC}"
    echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step()    { echo -e "\n${BOLD}${BLUE}▶ $*${NC}"; }

confirm() {
    local prompt="${1:-Fortfahren?}"
    local default="${2:-n}"
    if [[ "$default" == "y" ]]; then
        read -rp "$(echo -e "${YELLOW}${prompt} [J/n]: ${NC}")" answer
        [[ -z "$answer" || "$answer" =~ ^[JjYy]$ ]]
    else
        read -rp "$(echo -e "${YELLOW}${prompt} [j/N]: ${NC}")" answer
        [[ "$answer" =~ ^[JjYy]$ ]]
    fi
}

# ── Systemvoraussetzungen prüfen ──────────────────────────────────────────────

check_requirements() {
    log_step "Systemvoraussetzungen prüfen"

    # Betriebssystem erkennen
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        OS_ID="${ID:-unknown}"
        OS_VERSION="${VERSION_ID:-unknown}"
        log_info "Betriebssystem: ${PRETTY_NAME:-$OS_ID $OS_VERSION}"
    else
        log_warn "Betriebssystem konnte nicht erkannt werden"
        OS_ID="unknown"
    fi

    # Architektur prüfen
    ARCH=$(uname -m)
    log_info "Architektur: ${ARCH}"
    if [[ "$ARCH" != "x86_64" && "$ARCH" != "aarch64" ]]; then
        log_warn "Architektur ${ARCH} wurde nicht getestet. Fortfahren auf eigene Gefahr."
    fi

    # Freier Speicherplatz (mindestens 5 GB)
    FREE_GB=$(df -BG "${SCRIPT_DIR}" | awk 'NR==2 {gsub("G",""); print $4}')
    if [[ "$FREE_GB" -lt 5 ]]; then
        log_warn "Nur ${FREE_GB} GB freier Speicherplatz. Mindestens 5 GB empfohlen."
    else
        log_ok "Freier Speicherplatz: ${FREE_GB} GB"
    fi

    # RAM prüfen (mindestens 1 GB)
    RAM_MB=$(free -m | awk '/^Mem:/ {print $2}')
    if [[ "$RAM_MB" -lt 1024 ]]; then
        log_warn "Nur ${RAM_MB} MB RAM. Mindestens 1024 MB empfohlen."
    else
        log_ok "Verfügbarer RAM: ${RAM_MB} MB"
    fi
}

# ── Podman installieren ───────────────────────────────────────────────────────

install_podman() {
    log_step "Podman installieren"

    if command -v podman &>/dev/null; then
        PODMAN_VERSION=$(podman --version | awk '{print $3}')
        log_ok "Podman ist bereits installiert (Version: ${PODMAN_VERSION})"
        return 0
    fi

    log_info "Podman wird installiert..."

    case "$OS_ID" in
        ubuntu|debian|linuxmint|pop)
            log_info "Paketquellen aktualisieren..."
            sudo apt-get update -qq
            sudo apt-get install -y podman podman-compose curl
            ;;
        rhel|centos|rocky|almalinux)
            sudo dnf install -y podman podman-compose curl
            ;;
        fedora)
            sudo dnf install -y podman podman-compose curl
            ;;
        opensuse*|sles)
            sudo zypper install -y podman podman-compose curl
            ;;
        *)
            log_error "Automatische Installation für '${OS_ID}' nicht unterstützt."
            log_info "Bitte Podman manuell installieren: https://podman.io/getting-started/installation"
            exit 1
            ;;
    esac

    if command -v podman &>/dev/null; then
        PODMAN_VERSION=$(podman --version | awk '{print $3}')
        log_ok "Podman erfolgreich installiert (Version: ${PODMAN_VERSION})"
    else
        log_error "Podman-Installation fehlgeschlagen."
        exit 1
    fi
}

# ── podman-compose installieren ───────────────────────────────────────────────

install_podman_compose() {
    log_step "podman-compose prüfen"

    if command -v podman-compose &>/dev/null; then
        PC_VERSION=$(podman-compose --version 2>/dev/null | head -1 || echo "unbekannt")
        log_ok "podman-compose ist bereits installiert (${PC_VERSION})"
        return 0
    fi

    log_info "podman-compose wird installiert..."

    # Versuche über pip3
    if command -v pip3 &>/dev/null; then
        pip3 install --user podman-compose
        # PATH aktualisieren
        export PATH="$HOME/.local/bin:$PATH"
        if command -v podman-compose &>/dev/null; then
            log_ok "podman-compose via pip3 installiert"
            return 0
        fi
    fi

    # Fallback: direkt als Skript herunterladen
    log_info "Installiere podman-compose als ausführbares Skript..."
    sudo curl -o /usr/local/bin/podman-compose \
        -L https://raw.githubusercontent.com/containers/podman-compose/main/podman_compose.py
    sudo chmod +x /usr/local/bin/podman-compose

    if command -v podman-compose &>/dev/null; then
        log_ok "podman-compose erfolgreich installiert"
    else
        log_error "podman-compose konnte nicht installiert werden."
        log_info "Bitte manuell installieren: pip3 install podman-compose"
        exit 1
    fi
}

# ── .env Konfigurationsdatei einrichten ───────────────────────────────────────

setup_env() {
    log_step "Konfigurationsdatei einrichten"

    if [[ -f "$ENV_FILE" ]]; then
        log_ok ".env-Datei gefunden: ${ENV_FILE}"
        log_info "Bestehende Konfiguration wird verwendet."

        # Kritische Variablen prüfen
        local missing=()
        for var in JWT_SECRET DB_PASSWORD DB_ROOT_PASSWORD MINIO_ROOT_PASSWORD; do
            local value
            value=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' || true)
            if [[ -z "$value" || "$value" == *"aendern"* || "$value" == *"ersetzen"* ]]; then
                missing+=("$var")
            fi
        done

        if [[ ${#missing[@]} -gt 0 ]]; then
            log_warn "Folgende Variablen müssen noch gesetzt werden:"
            for var in "${missing[@]}"; do
                echo -e "  ${RED}✗ ${var}${NC}"
            done
            echo ""
            if ! confirm "Trotzdem fortfahren (nicht empfohlen für Produktion)?"; then
                log_info "Bitte die .env-Datei bearbeiten und das Skript erneut ausführen."
                log_info "Vorlage: ${ENV_TEMPLATE}"
                exit 0
            fi
        fi
        return 0
    fi

    # .env aus Vorlage erstellen
    if [[ -f "$ENV_TEMPLATE" ]]; then
        log_info "Erstelle .env aus Vorlage..."
        cp "$ENV_TEMPLATE" "$ENV_FILE"
    else
        log_info "Erstelle Standard-.env-Datei..."
        cat > "$ENV_FILE" << 'EOF'
APP_PORT=3000
DB_ROOT_PASSWORD=BITTE_AENDERN
DB_NAME=hygienecheck
DB_USER=hygiene
DB_PASSWORD=BITTE_AENDERN
JWT_SECRET=BITTE_AENDERN_MIN_32_ZEICHEN
VITE_APP_ID=hygienecheck
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=
OWNER_NAME=Administrator
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=BITTE_AENDERN
MINIO_BUCKET=hygienecheck
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
EOF
    fi

    log_warn "Eine neue .env-Datei wurde erstellt: ${ENV_FILE}"
    echo ""
    echo -e "${BOLD}Bitte jetzt die folgenden Passwörter in der .env-Datei setzen:${NC}"
    echo ""
    echo -e "  ${CYAN}nano ${ENV_FILE}${NC}"
    echo ""
    echo -e "  Folgende Werte MÜSSEN geändert werden:"
    echo -e "  ${RED}  DB_ROOT_PASSWORD${NC}    – MySQL Root-Passwort"
    echo -e "  ${RED}  DB_PASSWORD${NC}         – MySQL Anwendungspasswort"
    echo -e "  ${RED}  JWT_SECRET${NC}          – Zufälliger String (min. 32 Zeichen)"
    echo -e "  ${RED}  MINIO_ROOT_PASSWORD${NC} – MinIO Passwort (min. 8 Zeichen)"
    echo ""
    echo -e "  JWT_SECRET generieren: ${CYAN}openssl rand -base64 32${NC}"
    echo ""

    if confirm "Möchtest du die .env-Datei jetzt im Editor öffnen?" "y"; then
        # Editor auswählen
        if command -v nano &>/dev/null; then
            nano "$ENV_FILE"
        elif command -v vim &>/dev/null; then
            vim "$ENV_FILE"
        else
            log_warn "Kein Editor gefunden. Bitte manuell bearbeiten: ${ENV_FILE}"
        fi
    fi

    # Nochmal prüfen
    local missing=()
    for var in JWT_SECRET DB_PASSWORD DB_ROOT_PASSWORD MINIO_ROOT_PASSWORD; do
        local value
        value=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' || true)
        if [[ -z "$value" || "$value" == *"AENDERN"* || "$value" == *"BITTE"* ]]; then
            missing+=("$var")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Folgende Pflichtfelder sind noch nicht gesetzt:"
        for var in "${missing[@]}"; do
            echo -e "  ${RED}✗ ${var}${NC}"
        done
        echo ""
        log_info "Bitte .env bearbeiten und Skript erneut ausführen."
        exit 1
    fi

    log_ok "Konfiguration vollständig"
}

# ── MinIO Bucket erstellen ────────────────────────────────────────────────────

setup_minio_bucket() {
    log_step "MinIO Bucket einrichten"

    # Werte aus .env lesen
    local minio_user minio_pass minio_bucket minio_port
    minio_user=$(grep "^MINIO_ROOT_USER=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
    minio_pass=$(grep "^MINIO_ROOT_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
    minio_bucket=$(grep "^MINIO_BUCKET=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
    minio_port=$(grep "^MINIO_API_PORT=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
    minio_port="${minio_port:-9000}"

    log_info "Warte auf MinIO-Start..."
    local retries=0
    while [[ $retries -lt 30 ]]; do
        if curl -sf "http://localhost:${minio_port}/minio/health/live" &>/dev/null; then
            break
        fi
        sleep 2
        ((retries++))
    done

    if [[ $retries -ge 30 ]]; then
        log_warn "MinIO nicht erreichbar. Bucket muss manuell erstellt werden."
        log_info "MinIO-Konsole: http://localhost:${MINIO_CONSOLE_PORT:-9001}"
        return 0
    fi

    # mc (MinIO Client) prüfen oder über Podman ausführen
    log_info "Erstelle MinIO Bucket: ${minio_bucket}"
    podman run --rm --network host \
        quay.io/minio/mc:latest \
        alias set local "http://localhost:${minio_port}" "${minio_user}" "${minio_pass}" \
        && podman run --rm --network host \
        quay.io/minio/mc:latest \
        mb --ignore-existing "local/${minio_bucket}" \
        2>/dev/null || log_warn "Bucket-Erstellung übersprungen (möglicherweise bereits vorhanden)"

    log_ok "MinIO Bucket '${minio_bucket}' bereit"
}

# ── Container starten ─────────────────────────────────────────────────────────

start_containers() {
    log_step "Container bauen und starten"

    # Compose-Datei prüfen
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Compose-Datei nicht gefunden: ${COMPOSE_FILE}"
        log_info "Bitte das Skript aus dem Projektverzeichnis ausführen."
        exit 1
    fi
    log_ok "Compose-Datei gefunden: ${COMPOSE_FILE}"

    cd "$SCRIPT_DIR"

    # Bestehende Container stoppen (falls vorhanden)
    if PC_CMD ps --quiet 2>/dev/null | grep -q .; then
        log_info "Bestehende Container werden gestoppt..."
        PC_CMD down --remove-orphans 2>/dev/null || true
    fi

    # Container bauen
    log_info "Docker-Image wird gebaut (dies kann einige Minuten dauern)..."
    PC_CMD build --no-cache

    # Container starten
    log_info "Container werden gestartet..."
    PC_CMD up -d

    log_ok "Container gestartet"
}

# ── Gesundheitsprüfung ────────────────────────────────────────────────────────

wait_for_health() {
    log_step "Warte auf Anwendungsstart"

    local app_port
    app_port=$(grep "^APP_PORT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"')
    app_port="${app_port:-3000}"

    local retries=0
    local max_retries=60

    echo -n "  Warte auf http://localhost:${app_port}/api/health "

    while [[ $retries -lt $max_retries ]]; do
        if curl -sf "http://localhost:${app_port}/api/health" &>/dev/null; then
            echo ""
            log_ok "Anwendung ist bereit!"
            return 0
        fi
        echo -n "."
        sleep 2
        ((retries++))
    done

    echo ""
    log_warn "Anwendung antwortet noch nicht auf Port ${app_port}."
    log_info "Logs prüfen mit: podman-compose -p ${COMPOSE_PROJECT} logs -f app"
    return 1
}

# ── Systemd-Service einrichten (optional) ─────────────────────────────────────

setup_autostart() {
    log_step "Autostart einrichten"

    if ! command -v systemctl &>/dev/null; then
        log_info "systemd nicht verfügbar – Autostart übersprungen."
        return 0
    fi

    if ! confirm "Soll HygieneCheck beim Systemstart automatisch starten?"; then
        log_info "Autostart übersprungen."
        return 0
    fi

    local service_name="hygienecheck"
    local service_file="/etc/systemd/system/${service_name}.service"

    sudo tee "$service_file" > /dev/null << EOF
[Unit]
Description=HygieneCheck HACCP Dokumentationssoftware
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${SCRIPT_DIR}
ExecStart=/usr/bin/podman-compose -f ${COMPOSE_FILE} -p ${COMPOSE_PROJECT} up -d
ExecStop=/usr/bin/podman-compose -f ${COMPOSE_FILE} -p ${COMPOSE_PROJECT} down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable "$service_name"
    log_ok "Systemd-Service '${service_name}' aktiviert"
    log_info "Manuell starten/stoppen: sudo systemctl start/stop ${service_name}"
}

# ── Zusammenfassung ausgeben ──────────────────────────────────────────────────

print_summary() {
    local app_port
    app_port=$(grep "^APP_PORT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"')
    app_port="${app_port:-3000}"

    local minio_console_port
    minio_console_port=$(grep "^MINIO_CONSOLE_PORT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"')
    minio_console_port="${minio_console_port:-9001}"

    echo ""
    echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║  Installation erfolgreich abgeschlossen!                     ║${NC}"
    echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Zugang:${NC}"
    echo -e "  ${CYAN}Anwendung:${NC}      http://localhost:${app_port}"
    echo -e "  ${CYAN}MinIO-Konsole:${NC}  http://localhost:${minio_console_port}"
    echo ""
    echo -e "${BOLD}Nützliche Befehle:${NC}"
    echo -e "  ${CYAN}Status:${NC}         podman-compose -f docker-compose.yml -p ${COMPOSE_PROJECT} ps"
    echo -e "  ${CYAN}Logs (App):${NC}     podman-compose -f docker-compose.yml -p ${COMPOSE_PROJECT} logs -f app"
    echo -e "  ${CYAN}Stoppen:${NC}        podman-compose -f docker-compose.yml -p ${COMPOSE_PROJECT} down"
    echo -e "  ${CYAN}Starten:${NC}        podman-compose -f docker-compose.yml -p ${COMPOSE_PROJECT} up -d"
    echo -e "  ${CYAN}Aktualisieren:${NC}  ./install_podman_container.sh --update"
    echo ""
    echo -e "${BOLD}Datensicherung:${NC}"
    echo -e "  Datenbank-Volume: ${CYAN}podman volume inspect ${COMPOSE_PROJECT}_db-data${NC}"
    echo -e "  Dateien-Volume:   ${CYAN}podman volume inspect ${COMPOSE_PROJECT}_minio-data${NC}"
    echo ""
}

# ── Deinstallation ────────────────────────────────────────────────────────────

uninstall() {
    log_step "Deinstallation"
    log_warn "Container und Images werden entfernt. Daten (Volumes) bleiben erhalten."

    if ! confirm "Wirklich deinstallieren?"; then
        log_info "Abgebrochen."
        exit 0
    fi

    cd "$SCRIPT_DIR"
    PC_CMD down --rmi local 2>/dev/null || true

    # Systemd-Service entfernen falls vorhanden
    if [[ -f "/etc/systemd/system/hygienecheck.service" ]]; then
        sudo systemctl disable hygienecheck 2>/dev/null || true
        sudo rm -f /etc/systemd/system/hygienecheck.service
        sudo systemctl daemon-reload
        log_ok "Systemd-Service entfernt"
    fi

    log_ok "Deinstallation abgeschlossen. Daten-Volumes sind noch vorhanden."
    log_info "Volumes anzeigen: podman volume ls | grep ${COMPOSE_PROJECT}"
}

# ── Vollständiges Reset ───────────────────────────────────────────────────────

reset_all() {
    log_step "Vollständiges Reset"
    echo -e "${RED}${BOLD}WARNUNG: Alle Daten werden unwiderruflich gelöscht!${NC}"
    echo -e "${RED}  - Datenbank (alle HACCP-Einträge, Temperaturen, Protokolle)${NC}"
    echo -e "${RED}  - Datei-Uploads (MinIO)${NC}"
    echo ""

    if ! confirm "ALLE DATEN WIRKLICH LÖSCHEN? (nicht rückgängig zu machen)"; then
        log_info "Abgebrochen."
        exit 0
    fi

    # Nochmalige Bestätigung
    read -rp "$(echo -e "${RED}Bitte 'LOESCHEN' eingeben zur Bestätigung: ${NC}")" confirm_text
    if [[ "$confirm_text" != "LOESCHEN" ]]; then
        log_info "Abgebrochen."
        exit 0
    fi

    cd "$SCRIPT_DIR"
    PC_CMD down --volumes --rmi local 2>/dev/null || true

    log_ok "Alle Container, Images und Daten wurden entfernt."
}

# ── Update ────────────────────────────────────────────────────────────────────

update() {
    log_step "Anwendung aktualisieren"
    log_info "Container werden neu gebaut und gestartet..."

    cd "$SCRIPT_DIR"
    PC_CMD build --no-cache app
    PC_CMD up -d app

    log_ok "Update abgeschlossen"
    wait_for_health
}

# ── Status anzeigen ───────────────────────────────────────────────────────────

show_status() {
    echo ""
    echo -e "${BOLD}Container-Status:${NC}"
    PC_CMD ps 2>/dev/null || \
        podman ps --filter "label=io.podman.compose.project=${COMPOSE_PROJECT}" 2>/dev/null || \
        log_warn "Keine Container gefunden"
}

# ── Logs anzeigen ─────────────────────────────────────────────────────────────

show_logs() {
    log_info "Live-Logs (Strg+C zum Beenden):"
    PC_CMD logs -f app
}

# ── Hilfe anzeigen ────────────────────────────────────────────────────────────

show_help() {
    echo ""
    echo -e "${BOLD}Verwendung:${NC} $0 [OPTION]"
    echo ""
    echo -e "${BOLD}Optionen:${NC}"
    echo "  (keine)      Vollständige Installation durchführen"
    echo "  --uninstall  Container und Images entfernen (Daten bleiben)"
    echo "  --reset      Alles entfernen inkl. aller Daten (ACHTUNG!)"
    echo "  --update     App-Container neu bauen und aktualisieren"
    echo "  --status     Status aller Container anzeigen"
    echo "  --logs       Live-Logs der App anzeigen"
    echo "  --help       Diese Hilfe anzeigen"
    echo ""
}

# ── Hauptprogramm ─────────────────────────────────────────────────────────────

main() {
    print_header

    # Argumente auswerten
    case "${1:-}" in
        --uninstall)
            uninstall
            exit 0
            ;;
        --reset)
            reset_all
            exit 0
            ;;
        --update)
            setup_env
            update
            print_summary
            exit 0
            ;;
        --status)
            show_status
            exit 0
            ;;
        --logs)
            show_logs
            exit 0
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        "")
            # Normale Installation
            ;;
        *)
            log_error "Unbekannte Option: ${1}"
            show_help
            exit 1
            ;;
    esac

    # Vollständige Installation
    log_info "Starte Installation von ${APP_NAME}..."
    echo ""

    check_requirements
    install_podman
    install_podman_compose
    setup_env
    start_containers
    setup_minio_bucket
    wait_for_health
    setup_autostart
    print_summary
}

main "$@"
