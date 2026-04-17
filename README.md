# Insulae 2.0 Valquirico

Base técnica para migrar Insulae legacy (PHP/MySQL) a una plataforma moderna con Next.js, PostgreSQL y arquitectura hexagonal.

## Objetivo

- Migrar datos y procesos críticos del legacy de forma incremental.
- Mantener alcance exclusivo Valquirico (sin multi-sitio).
- Estabilizar dominio y casos de uso antes de construir vistas finales.

## Stack

- Next.js App Router + TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Arquitectura hexagonal (domain/application/infrastructure/presentation)

## Estructura base

- `src/modules/*`: módulos de negocio.
- `src/shared/*`: contratos y utilidades transversales.
- `src/config/project-scope.ts`: configuración de alcance Valquirico-only.
- `prisma/schema.prisma`: modelo relacional objetivo para migración.
- `docs/*`: artefactos de auditoría y estrategia de migración.

## Desarrollo local

1. Instalar dependencias:

```bash
npm install
```

2. Definir variables de entorno en `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB"
```

3. Ejecutar entorno local:

```bash
npm run dev
```

4. Abrir `http://localhost:3000`.

## Prisma

Comandos útiles:

```bash
npx prisma format
npx prisma validate
npx prisma generate
```

Cuando exista base de datos objetivo:

```bash
npx prisma migrate dev --name init-valquirico
```

## Pipeline de migracion de datos

El pipeline ETL incremental (staging + validacion + promocion) se documenta en:

- docs/migration-pipeline.md

Comandos principales:

```bash
# dry run
npm run migration:run -- --runName=baseline-dry --dryRun=true --sourceSnapshot=2026-03-28

# cutover
npm run migration:run -- --runName=baseline-cutover --dryRun=false --sourceSnapshot=2026-03-28

# validacion por corrida
npm run migration:validate -- --runId=<RUN_ID>
```

## Guardrails de runtime (Neon-only)

Antes de crear nuevas vistas, valida que el runtime no dependa de artefactos legacy:

```bash
npm run guard:runtime-db-boundary
```

Este check revisa `src/app`, `src/modules`, `src/shared` y `src/config` para bloquear:

- Referencias a `data/legacy-export` o `docs/raw-db/full_dump.sql`.
- Imports de `fs`/`fs/promises` en capas de runtime.

Los módulos ETL/migración (`src/modules/migration*`) se excluyen de esta validación por diseño.

## Siguiente fase

- Implementar adapters Prisma por módulo.
- Definir pipeline ETL por lotes desde tablas legacy prioritarias.
- Construir vistas por dominio sobre casos de uso estables.
