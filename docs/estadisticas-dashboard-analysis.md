# Análisis de datos — Dashboard de Estadística Insulae

Fecha: 2026-07-21 · Fuente: BD 2.0 viva (Neon Postgres, condominio Val'Quirico) + dump legacy 1.0 (`docs/raw-db/full_dump.sql`, `data/legacy-export/*.ndjson`).

Este documento mapea cada estadística solicitada contra los datos realmente disponibles, marca las que **no existen en ninguna base** (requieren captura nueva), y propone estadísticas adicionales viables hoy.

## 1. Inventario de datos reales (BD 2.0, julio 2026)

| Entidad | Volumen | Dimensiones útiles | Calidad |
|---|---|---|---|
| Áreas privativas | 1,745 (1,356 activas: 487 padres + 869 hijas) | `zone` (10 barrios), `subzone` (8), `useType` (19 usos de suelo), `m2Construction` (821 con construcción), `status`, jerarquía padre/hija, 12 fusiones | Buena. `status` solo usa AVAILABLE/SOLD (no refleja construcción/renta); `level` vacío |
| Usuarios | 855 (732 activos) | email (731), teléfono (728), tipo (INDIVIDUAL/ADMIN) | `gender`, `birthDate`, `registrationType` vacíos — no usables |
| Asignaciones de residentes | 3,453 activas | roleName: Dominio pleno 1,278 · Dueño Legal 1,252 · Dueño Moral 587 · Arrendatario 335 | Buena → 409 propietarios únicos, 137 con >1 inmueble, 1,322 áreas con dueño |
| Arrendamientos (negocios) | 567 (386 con status `1` = activo) | 100% con comercio y `startsAt` (fecha de inicio real) → series por año; 354 áreas con negocio activo | 24 registros con año 1901 (placeholder legacy) |
| Comercios | 316 activos | contacto administrativo/operativo | Buena |
| Pagos | 3,650 (2024→hoy) | `paidAt`, método (CARD 2,199 · TRANSFER 1,169 · OTHER 239 · CASH 22 · CHECK 21) | 1 pago con fecha 4200 (typo legacy) |
| Cargos (cartera) | 26,262 abiertos/parciales, $118.5M | zona, grupo de cobro, periodo | ⚠️ Saldos inflados por `id_opcion_estado_cuenta` perdido en migración — no publicar montos hasta corregir |
| Tickets | 11 | status, departamento, fechas | Volumen aún bajo |
| Convocatorias | 2 activas | asistencia esperada/real/% | Volumen aún bajo |
| Catálogos | 10 zonas (barrios), 8 subzonas, 19 usos de suelo | | Buena |

### Giros comerciales — existen solo en legacy, migrables hoy

El esquema 2.0 **no tiene** giros. El legacy sí:

- `DCAT_GIROS`: 6 giros — Alimento & Bebidas, Educación, Experiencia, Hospedaje, Servicios, Tiendas (coinciden con el mockup del diseño).
- `DCAT_CATEGORIAS_COMERCIAL`: 23 categorías (Restaurante, Cafeterías, Bares, Hoteles, Boutique, …).
- `DCAT_SUBCATEGORIAS_COMERCIAL`: ~180 subcategorías.
- `ARRENDAMIENTOS`: hasta 4 combinaciones giro/categoría/subcategoría por negocio; 315 de 572 con al menos un giro.
- Clase de comercio A/B (`DCAT_CLASES_COMERCIOS`).

`MigrationIdMap` ya guarda el mapeo `ARRENDAMIENTOS → Rental`, así que el backfill es directo. **Decisión: migrar giros a 2.0** (nuevas tablas `BusinessLineCatalog`, `BusinessCategoryCatalog`, `BusinessSubcategoryCatalog`, `RentalBusinessLine` + script de backfill desde `data/legacy-export/ARRENDAMIENTOS.ndjson` y el dump).

## 2. Estadísticas solicitadas vs. disponibilidad

### KPIs principales

| KPI solicitado | ¿Viable? | Fuente / definición |
|---|---|---|
| Total de propietarios | ✅ | Usuarios únicos con asignación activa Dueño Legal / Dueño Moral / Dominio pleno → **409** |
| Total de inmuebles | ✅ | Áreas privativas activas → **1,356** (487 predios padre; se muestran ambos) |
| Total de empleados registrados | ❌ **No existe el dato** | Ni en 1.0 ni en 2.0. Requiere captura nueva (ver §4) |
| Total de giros comerciales | ✅ (tras backfill) | 6 giros, negocios clasificados 315 |
| Total de viviendas | ✅ (por uso de suelo) | Usos habitacionales: Lofts LF, Departamentos DP, Casa CA |
| Total de locales comerciales | ✅ (por uso de suelo) | Usos comerciales/servicios: SS, SD, SX*, CH, P1 |
| Promedio de empleados por negocio | ❌ | Depende de empleados |
| Inmuebles ocupados / desocupados / % ocupación | ✅ (definición proxy) | Ocupado = área activa con dueño asignado o arrendamiento activo → 1,322/1,356 (97.5%). Nota: el `status` del área no es confiable para esto |

### Actividad económica

Todas viables **después del backfill de giros**: distribución de negocios por giro (pastel), ranking, establecimientos por giro, participación %. «Empleados por giro» queda pendiente de captura de empleados.

### Empleo

❌ Sin datos en ninguna base. Ver §4 (propuesta de captura).

### Propietarios

- Total ✅ (409), con >1 inmueble ✅ (137).
- Residentes vs no residentes: ❌ el dato explícito no existe. Proxy débil disponible: propietario que también tiene rol «Arrendatario» o dirección registrada; se propone capturarlo como campo en el directorio (§4).

### Inmuebles

- Total ✅, habitacionales/comerciales ✅ (clasificación por uso de suelo), desocupados ✅ (proxy), % ocupación ✅.
- En construcción: ⚠️ el enum `UNDER_CONSTRUCTION` existe pero no se usa; hoy se reporta «con construcción» (m2Construction > 0: **821**) vs «sin construcción» (lote: 535). Si administración empieza a mantener el `status`, el KPI directo se activa solo.

### Reportes

- Exportar Excel ✅ (`xlsx` ya en el proyecto) y PDF ✅ (`jspdf` ya en el proyecto).
- Filtros: por **barrio** ✅ (zone), **tipo de inmueble** ✅ (useType), **fecha** ✅ (en series temporales). «Etapa» y «sección» no existen como dimensiones en Val'Quirico; su equivalente es zona/subzona.
- Comparativo mensual y anual: ✅ para series con fecha real — aperturas de negocios por año (`Rental.startsAt`), pagos por mes/método, tickets, ingresos/egresos. ⚠️ No para altas de inmuebles/usuarios: su `createdAt` es la fecha de migración, no la histórica.
- Mascotas y vehículos: ❌ no existen en ninguna base (§4).

## 3. Estadísticas adicionales propuestas (con data ya disponible)

1. **Negocios por barrio** y áreas con negocio activo por zona — cruce Rental × PrivateArea.zone.
2. **Aperturas de negocios por año** (2015→2026) — línea de crecimiento comercial real; equivalente al «Evolución mensual» del mockup.
3. **Distribución de inmuebles por barrio** (10 zonas) y por uso de suelo (19 tipos) — pastel/barras.
4. **Superficie construida vs sin construir** por barrio (m²) — ya hay 821 áreas con m² de construcción.
5. **Tipos de propiedad** — Dominio pleno vs Dueño Legal vs Dueño Moral vs Arrendatario (3,453 asignaciones).
6. **Top propietarios por número de inmuebles** (anonimizable) y distribución 1 / 2-5 / >5 inmuebles.
7. **Cobertura de contacto** — % usuarios con email (99.9%) y teléfono (99.5%): alcance de comunicados.
8. **Pagos por método** y por mes — actividad de cobranza (sin montos de cartera hasta corregir saldos).
9. **Áreas con adeudo** (1,187) como conteo — sin montos por el problema de saldos inflados.
10. **Tickets por estado/departamento** y **asistencia a convocatorias** — volumen aún bajo, pero el widget queda listo y crece solo.
11. **Clase de comercio A/B** (dato legacy migrables junto con giros).

## 4. Datos solicitados que requieren captura nueva (propuesta fase 2)

| Dato | Propuesta |
|---|---|
| Empleados por negocio | Campo `employeeCount` en `Rental` (o tabla `CommerceEmployee` si se requiere detalle) + formulario en el registro/renovación anual del comercio |
| Mascotas | Tabla `Pet` (área privativa, tipo, nombre) capturada desde el portal del condómino |
| Vehículos de residentes | Tabla `Vehicle` (área privativa, placa, tipo) — útil también para control de acceso |
| Propietario residente / no residente | Bandera `isResident` en `ResidentAssignment` o en el directorio |
| Inmuebles en construcción | Mantener `PrivateArea.status = UNDER_CONSTRUCTION` desde administración |

El dashboard se construye para que estos indicadores aparezcan automáticamente cuando exista el dato (muestran «Sin datos aún» mientras tanto, solo donde aporte, p. ej. empleados).

## 5. Decisiones de implementación

- Nueva vista `/estadisticas` («Estadísticas» en el menú Condominio), módulo `src/modules/statistics` siguiendo el patrón DDD del repo (domain / infrastructure / application / presentation).
- Migración Prisma aditiva para catálogos de giros + `RentalBusinessLine`; backfill idempotente vía `MigrationIdMap`.
- Filtros server-side por barrio (zone) y uso de suelo vía searchParams.
- Export Excel multi-hoja (xlsx) y PDF resumen (jspdf) en el cliente, con los mismos datos del VM.
- Gráficas con recharts (ya usado en `financial-chart.tsx`).
- La vista existente `/reporte-condominio` (métricas territoriales de m²/APOLEs) se mantiene sin cambios; el nuevo dashboard la complementa.
