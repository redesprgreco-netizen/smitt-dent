#!/bin/bash
# Script para subir los fixes a GitHub
# Ejecutar desde Git Bash dentro de la carpeta del proyecto

echo "=== SmittDent — Subiendo fixes a GitHub ==="

git add lib/bitacora.ts
git add lib/supabase-admin.ts
git add app/api/contratos/route.ts
git add app/api/firmar/\[token\]/route.ts
git add app/api/firmas/\[id\]/route.ts
git add app/api/reportes/route.ts

git commit -m "fix: supabase no lanza error en build, bitacora Prisma.JsonNull, groupBy orderBy"

git push origin main

echo ""
echo "=== Listo. Vercel desplegará automáticamente ==="
echo ""
echo "SIGUIENTE PASO OBLIGATORIO:"
echo "Agrega estas variables en Vercel > Settings > Environment Variables:"
echo ""
echo "  DATABASE_URL              = postgresql://postgres.[ref]:[pass]@pooler.supabase.com:6543/postgres"
echo "  DIRECT_URL                = postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres"
echo "  JWT_SECRET                = (texto largo aleatorio)"
echo "  NEXT_PUBLIC_APP_URL       = https://tu-proyecto.vercel.app"
echo "  NEXT_PUBLIC_SUPABASE_URL  = https://[ref].supabase.co"
echo "  SUPABASE_SERVICE_ROLE_KEY = eyJ... (la service_role key de Supabase)"
