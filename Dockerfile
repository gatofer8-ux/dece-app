FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip python3-venv make g++ libreoffice-writer libreoffice-calc fonts-dejavu fontconfig poppler-utils tesseract-ocr tesseract-ocr-spa && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data && mkdir -p /app/data

ENV TZ=America/Guayaquil
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_FILE=/data/dece.db
ENV NEXTAUTH_SECRET=dece-app-default-secret-production-2026-key
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN mkdir -p /usr/share/fonts/truetype/custom && cp templates/fonts/* /usr/share/fonts/truetype/custom/ && fc-cache -f
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run start"]
