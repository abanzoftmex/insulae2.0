# Migration Pipeline Valquirico

Este pipeline implementa la obtencion y migracion incremental de datos legacy a Insulae 2.0 con trazabilidad completa.

## Cobertura implementada

1. Alcance congelado por tablas incluidas y excluidas.
2. Capas de carga por dependencias.
3. Staging generico en Postgres.
4. Mapeo legacy_id -> target_id por corrida.
5. ETL por lotes con dry run o cutover.
6. Validaciones por capa y tabla.
7. Orquestador de corridas.
8. Base para exponer lecturas confiables en vistas.

## Artefactos clave

- Configuracion de alcance: src/config/migration-scope.ts
- Modelos de pipeline: prisma/schema.prisma
- Carga a staging: src/modules/migration-etl/application/load-layer-to-staging.use-case.ts
- Promocion inicial de datos: src/modules/migration-etl/application/promote-from-staging.use-case.ts
- Validaciones: src/modules/migration-etl/application/validate-layer.use-case.ts
- Orquestador: src/modules/migration-etl/application/run-full-migration.use-case.ts

## Formato de datos de entrada

Directorio por defecto: data/legacy-export

Cada tabla debe existir como archivo NDJSON:

- data/legacy-export/DIRECTORIO.ndjson
- data/legacy-export/AREAS_PRIVATIVAS.ndjson
- data/legacy-export/PAGOS.ndjson
- etc.

Cada linea del archivo debe ser JSON valido.

## Ejecucion

1. Aplicar esquema actualizado en base de datos destino.
2. Correr migracion completa.
3. Revisar reporte de validaciones.

## Paso a paso operativo

1. Configurar variables de entorno para fuente legacy MySQL:

```env
LEGACY_DB_HOST=...
LEGACY_DB_PORT=3306
LEGACY_DB_USER=...
LEGACY_DB_PASSWORD=...
LEGACY_DB_NAME=...
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
```

2. Exportar tablas legacy a NDJSON:

```bash
npm run migration:export -- --outDir=data/legacy-export --batchSize=1000
```

3. Validar que se generaron archivos NDJSON por tabla en `data/legacy-export`.

4. Ejecutar dry run (sin promover datos al modelo final):

```bash
npm run migration:run -- --runName=baseline-dry --dryRun=true --sourceSnapshot=2026-03-28
```

5. Guardar el `runId` que imprime el comando.

6. Consultar validaciones del dry run:

```bash
npm run migration:validate -- --runId=<RUN_ID_DRY>
```

7. Corregir inconsistencias de datos si aparece `severity=ERROR`.

8. Ejecutar cutover (promocion al modelo final):

```bash
npm run migration:run -- --runName=baseline-cutover --dryRun=false --sourceSnapshot=2026-03-28
```

9. Guardar el `runId` del cutover.

10. Revisar validaciones del cutover:

```bash
npm run migration:validate -- --runId=<RUN_ID_CUTOVER>
```

11. Verificar conteos clave en la base nueva (User, PrivateArea, Charge, Payment, Income, Expense, Ticket, Notification, Project).

12. Si los conteos y diferencias son correctos, avanzar a la capa de vistas y APIs.

Comando dry run:

npm run migration:run -- --runName=baseline-dry --dryRun=true --sourceSnapshot=2026-03-28

Comando cutover:

npm run migration:run -- --runName=baseline-cutover --dryRun=false --sourceSnapshot=2026-03-28

Reporte de validacion:

npm run migration:validate -- --runId=<RUN_ID>

## Alcance actual de promocion

Promocion activa a modelo final:

- DIRECTORIO -> User
- AREAS_PRIVATIVAS -> PrivateArea

Las demas tablas ya se cargan y validan en staging, y quedan listas para extender la promocion por modulo.

## Siguiente extension recomendada

1. Financiero: PAGOS, HISTORICO_PAGOS, INGRESOS, GASTOS.
2. Gobernanza: CONVOCATORIAS, TEMAS, VOTACIONES.
3. Operativo: TICKETS y NOTIFICACIONES.
4. Proyectos y documentos.
