#!/usr/bin/env bash
# Cambia el DATABASE_URL de la conexión directa (IPv6, no anda en Vercel) al
# Session Pooler de Supabase (IPv4). Actualiza .env.local y Vercel.
# Uso:  bash scripts/usar-pooler.sh
set -euo pipefail

REF="nwcwvnrxfzzizzydprwl"
POOLER_HOST="aws-0-sa-east-1.pooler.supabase.com"

OLD=$(grep -E '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2-)
if [ -z "$OLD" ]; then echo "No encuentro DATABASE_URL en .env.local" >&2; exit 1; fi

# Password = lo que está entre "postgres:" y "@"
PW=$(printf '%s' "$OLD" | sed -E 's|^postgres(ql)?://postgres:([^@]+)@.*$|\2|')
if [ "$PW" = "$OLD" ] || [ -z "$PW" ]; then
  echo "No pude leer la password del DATABASE_URL actual." >&2
  exit 1
fi

if printf '%s' "$OLD" | grep -q "pooler.supabase.com"; then
  echo "El DATABASE_URL ya usa el pooler, no hago nada."
  NEW="$OLD"
else
  NEW="postgresql://postgres.${REF}:${PW}@${POOLER_HOST}:5432/postgres"
  cp .env.local .env.local.bak
  # reescribe la línea sin tocar el resto del archivo
  awk -v new="DATABASE_URL=$NEW" '/^DATABASE_URL=/{print new; next} {print}' .env.local.bak > .env.local
  echo "  ✓ .env.local actualizado (backup: .env.local.bak)"
fi

for env in production preview; do
  vercel env rm DATABASE_URL "$env" -y >/dev/null 2>&1 || true
  printf '%s' "$NEW" | vercel env add DATABASE_URL "$env" >/dev/null
  echo "  ✓ DATABASE_URL → Vercel ($env)"
done

echo
echo "Listo. Verificá local con:  npm run dev"
echo "Y avisá para el redeploy de producción."
