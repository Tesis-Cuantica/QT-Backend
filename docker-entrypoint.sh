#!/bin/sh
set -e

echo "🔄 Aplicando migraciones de Prisma..."
npx prisma migrate deploy

echo "👤 Creando usuario admin (si no existe)..."
node prisma/seed.js

echo "🚀 Iniciando servidor..."
exec "$@"