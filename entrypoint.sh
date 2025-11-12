#!/bin/sh
set -e

echo "🔄 Aplicando migraciones de Prisma..."
npx prisma migrate deploy

if [ ! -f ".seed_done" ]; then
  echo "🌱 Ejecutando seed inicial..."
  npx prisma db seed
  touch .seed_done
else
  echo "✅ Seed ya aplicado anteriormente, omitiendo..."
fi

echo "🚀 Iniciando servidor QuantumTec..."
exec npm start
