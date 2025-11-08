# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Generar cliente de Prisma
COPY prisma ./prisma
RUN npx prisma generate

# Etapa de ejecución
FROM node:20-alpine

WORKDIR /app

# Copiar node_modules 
COPY --from=builder /app/node_modules ./node_modules

# Copiar el resto del código
COPY . .

# Crear carpeta para certificados
RUN mkdir -p ./public/certificates

EXPOSE 5000

CMD ["npm", "start"]