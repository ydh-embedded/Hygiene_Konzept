# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# Node 22 LTS auf Alpine für minimale Image-Größe
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# pnpm über corepack aktivieren
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Abhängigkeiten zuerst kopieren (Layer-Caching)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Produktions- und Dev-Abhängigkeiten installieren (für den Build benötigt)
RUN pnpm install --frozen-lockfile

# Quellcode kopieren
COPY . .

# Frontend und Backend bauen
RUN pnpm build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production
# Nur Runtime-Abhängigkeiten und Build-Artefakte
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production

# Sicherheits-Updates und curl für Healthcheck
RUN apk update && apk upgrade && apk add --no-cache curl tini

# pnpm für Produktions-Install
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Nicht-root Benutzer für Sicherheit
RUN addgroup -g 1001 -S hygiene && \
    adduser -u 1001 -S hygiene -G hygiene

WORKDIR /app

# Nur package.json für Produktions-Install
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Nur Produktionsabhängigkeiten installieren
RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# Build-Artefakte aus Stage 1 kopieren
COPY --from=builder /app/dist ./dist

# Drizzle-Schema für Migrationen kopieren
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Shared-Dateien kopieren
COPY --from=builder /app/shared ./shared

# Eigentümer setzen
RUN chown -R hygiene:hygiene /app

USER hygiene

# Port freigeben (Standard: 3000)
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# tini als Init-Prozess für sauberes Signal-Handling
ENTRYPOINT ["/sbin/tini", "--"]

# Anwendung starten
CMD ["node", "dist/index.js"]
