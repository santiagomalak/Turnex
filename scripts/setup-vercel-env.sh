#!/usr/bin/env bash
# Carga en Vercel (production + preview) las variables que están en .env.local.
# Uso:  bash scripts/setup-vercel-env.sh
set -euo pipefail

VARS="DATABASE_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SECRET_KEY CRON_SECRET"

if [ ! -f .env.local ]; then
  echo "No encuentro .env.local — ¿estás parado en C:\\Turnex?" >&2
  exit 1
fi

for k in $VARS; do
  v=$(grep -E "^$k=" .env.local | head -1 | cut -d= -f2-)
  if [ -z "$v" ]; then
    echo "  ⚠  $k no está en .env.local, la salteo"
    continue
  fi
  for env in production preview; do
    # borra la anterior si existe, para poder re-correr el script
    vercel env rm "$k" "$env" -y >/dev/null 2>&1 || true
    printf '%s' "$v" | vercel env add "$k" "$env" >/dev/null
    echo "  ✓ $k → $env"
  done
done

echo
echo "Listo. Ahora corré:  vercel redeploy --prod"
