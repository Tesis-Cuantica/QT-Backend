# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Generar cliente de Prisma
COPY prisma ./prisma
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Etapa de ejecución
FROM node:20-alpine

WORKDIR /app

# Copiar dependencias y código del builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Crear carpetas necesarias
RUN mkdir -p ./public/certificates

# Copiar entrypoint y darle permisos
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
