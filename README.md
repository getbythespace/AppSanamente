# SanamenteAPP



Aplicación para monitoreo del estado de ánimo de pacientes, psicólogos y administradores.  
Construida con Prisma, Supabase y un backend en Node.js/TypeScript (o el stack que uses).

## Estructura principal

- `prisma/` — Contiene el esquema y migraciones de la base de datos.
- `src/` — Código fuente de la aplicación.
- `migrations/` — Migraciones generadas por Prisma.

## Funcionalidades actuales

- Registro y gestión de usuarios según roles: ADMIN, PSYCHOLOGIST, PATIENT.
- CRUD para usuarios y organizaciones.
- Registro y visualización de entradas de ánimo por parte de pacientes.
- Relación paciente–psicólogo para acceso restringido a datos.

## Cómo correr el proyecto

1. Instalar dependencias:


```bash
npm install


Configurar variables de entorno en .env (base de datos, supabase, etc).

Ejecutar migraciones y generar cliente Prisma:


npx prisma migrate dev
npx prisma generate


Ejecutar la aplicación:


npm run dev
