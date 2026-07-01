# Smitt-Dent — Sistema de Gestión Clínica Odontológica

Sistema web construido con **Next.js 14 + Supabase + Prisma**, desplegado en **Vercel**.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + React 18 |
| Backend | Next.js Route Handlers (API REST) |
| Base de datos | Supabase (PostgreSQL) |
| ORM | Prisma |
| Auth | JWT propio (HttpOnly cookies, 8h) |
| Estilos | Tailwind CSS + CSS Variables |
| Iconos | Tabler Icons |
| Fuentes | Inter + Sora (Google Fonts) |
| Deploy | Vercel |

---

## Estructura del Proyecto

```
smittdent/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Design tokens + utilidades globales
│   ├── login/                  # Página de login
│   ├── register/               # Solicitud de acceso
│   ├── dashboard/
│   │   ├── layout.tsx          # Layout protegido (Topbar + Sidebar)
│   │   └── page.tsx            # Panel principal
│   ├── agenda/                 # Calendario mensual
│   ├── expedientes/            # Lista y detalle de pacientes
│   ├── facturacion/            # Pagos y recibos
│   ├── inventario/             # Gestión de insumos
│   ├── reportes/               # Admin only
│   ├── configuracion/          # Admin only
│   └── api/
│       ├── auth/               # login, register, me (logout)
│       ├── citas/              # CRUD citas
│       ├── expedientes/        # CRUD expedientes
│       ├── historial/          # Historial clínico (inmutable)
│       ├── odontograma/        # Estados de piezas dentales
│       ├── plan-tratamiento/   # Presupuesto
│       ├── pagos/              # Cobros + anulación
│       ├── inventario/         # Artículos + movimientos
│       ├── reportes/           # Admin only
│       ├── bitacora/           # Admin only
│       └── usuarios/           # Admin only
├── components/
│   └── layout/                 # Topbar, Sidebar
├── lib/
│   ├── prisma.ts               # Singleton Prisma Client
│   ├── auth.ts                 # JWT + bcrypt + cookies
│   └── api.ts                  # Helpers de respuesta HTTP
├── types/
│   └── index.ts                # Tipos TypeScript globales
├── prisma/
│   └── schema.prisma           # Schema de la BD
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # SQL listo para Supabase
├── middleware.ts               # Auth guard + protección de rutas
└── .env.example                # Plantilla de variables de entorno
```

---

## Setup en 5 pasos

### 1. Clonar y instalar

```bash
git clone https://github.com/tu-usuario/smittdent.git
cd smittdent
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores de Supabase.

### 3. Crear la base de datos en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor**
3. Pega y ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`
4. Copia las URLs de conexión a tu `.env.local`

### 4. Generar el cliente Prisma

```bash
npm run db:generate
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Primer acceso

El SQL inicial crea una cuenta admin:
- **Correo:** `admin@smittdent.com`
- **Contraseña:** Debes generar un hash con bcrypt y actualizar la fila en Supabase.

Para generar el hash de tu contraseña inicial:

```bash
node -e "const b = require('bcryptjs'); b.hash('TuContraseña123!', 10).then(h => console.log(h))"
```

Luego en Supabase SQL Editor:
```sql
UPDATE usuarios SET password_hash = 'el-hash-generado' WHERE correo = 'admin@smittdent.com';
```

---

## Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Agrega las variables de entorno en **Vercel Dashboard → Settings → Environment Variables**.

---

## Roles y Permisos

| Acción | Doctora | Visitante | Admin |
|--------|---------|-----------|-------|
| Ver agenda completa | ✅ | ✅ | ✅ |
| Crear/editar sus citas | ✅ | ✅ | ✅ |
| Editar citas ajenas | ❌ | ❌ | ✅ |
| Ver sus expedientes | ✅ | ✅ | ✅ |
| Ver todos los expedientes | ❌ | ❌ | ✅ |
| Registrar pagos | ✅ | ✅ | ✅ |
| Anular pagos | ❌ | ❌ | ✅ |
| Reportes globales | ❌ | ❌ | ✅ |
| Gestión de usuarios | ❌ | ❌ | ✅ |
| Bitácora | ❌ | ❌ | ✅ |

---

## Módulos Implementados

- ✅ **Autenticación** — JWT, bcrypt, cookies HttpOnly
- ✅ **Gestión de usuarios** — Alta, aprobación, rol, color de agenda
- ✅ **Agenda** — Citas por día/mes, colores por doctora
- ✅ **Expedientes** — Ficha clínica completa con folio único
- ✅ **Historial clínico** — Notas inmutables + correcciones admin
- ✅ **Odontograma** — 32 piezas FDI con historial de cambios
- ✅ **Plan de tratamiento** — Presupuesto con descuentos
- ✅ **Pagos** — Registro, folio de recibo, anulación con motivo
- ✅ **Inventario** — Artículos, movimientos, alertas de stock bajo
- ✅ **Reportes** — Resumen mensual, pagos por doctora (admin)
- ✅ **Bitácora** — Log de acciones (admin)
- ✅ **Middleware** — Protección de rutas por rol

---

*Smitt-Dent v1.0 — Documento de referencia: Requerimientos v2.0*
