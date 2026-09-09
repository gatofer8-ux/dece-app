# syntax=docker/dockerfile:1

# ===========================================================================
# Etapa 1 — build
# ===========================================================================
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Herramientas para compilar módulos nativos (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

# Secreto ficticio solo para que la validación de entorno no aborte el build.
# En tiempo de ejecución se usa el NEXTAUTH_SECRET real inyectado por el host.
RUN NEXTAUTH_SECRET=build-time-only-not-a-real-secret-000000 npm run build

# Quita las dependencias de desarrollo del árbol que se copiará a la imagen final
RUN npm prune --omit=dev

# ===========================================================================
# Etapa 2 — runtime
# ===========================================================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Dependencias de SISTEMA necesarias en ejecución:
#  - libreoffice-writer/calc: conversión .docx/.xlsx -> PDF
#  - poppler-utils: pdf -> imagen (pdf-to-png-converter)
#  - tesseract-ocr(-spa): OCR de documentos escaneados
#  - fuentes: render fiel de los documentos oficiales
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-writer libreoffice-calc \
      poppler-utils \
      tesseract-ocr tesseract-ocr-spa \
      fonts-dejavu fontconfig \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=America/Guayaquil
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_FILE=/data/dece.db
ENV NODE_OPTIONS="--max-old-space-size=2048"
# NEXTAUTH_SECRET debe inyectarlo el host (Railway/Render/compose). La app
# NO arranca sin él. Ver .env.example.

RUN mkdir -p /data /app/data

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

# Fuentes personalizadas para los membretes oficiales
RUN mkdir -p /usr/share/fonts/truetype/custom \
    && cp templates/fonts/* /usr/share/fonts/truetype/custom/ 2>/dev/null || true \
    && fc-cache -f

EXPOSE 3000

# `npm run start` corre scripts/seed.js (migraciones idempotentes + bootstrap
# del superadmin) y luego `next start`. El seed ya NO sobrescribe contraseñas
# existentes y los datos demo requieren SEED_DEMO=1.
CMD ["npm", "run", "start"]
