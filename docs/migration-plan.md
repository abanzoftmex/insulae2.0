# Plan de migracion: Insulae legacy -> Insulae 2.0

Objetivo: reescribir desde cero en Next.js + PostgreSQL + Prisma + Firebase Storage, preservando datos utiles y eliminando deuda historica.

## 1) Principios

1. No migrar basura historica ni tablas fuera del dominio condominal.
2. Migrar por dominios, no por archivo PHP.
3. Definir llaves foraneas reales y constraints antes de datos financieros.
4. Usar estrategia dual-run temporal para validar cifras.

## 2) Dominios destino (snake_case)

- condominiums
- users
- private_areas
- area_uses
- rentals
- roles
- permissions
- resident_assignments
- charge_groups
- charges
- payment_ledger
- payments
- payment_allocations
- incomes
- expenses
- budgets
- budget_lines
- budget_months
- meetings
- meeting_sessions
- attendances
- votes
- notifications
- tickets
- projects
- project_documents
- audit_logs

## 3) Mapeo principal legacy -> nuevo

| Tabla vieja | Tabla nueva | Accion |
| --- | --- | --- |
| PAGOS | charges | migrar |
| HISTORICO_PAGOS | payment_ledger | migrar |
| HISTORICO_PAGOS_DETALLE | payment_ledger_lines | migrar |
| HISTORICO_PAGOS_HAS_PAGOS | payment_allocations | migrar |
| AREAS_PRIVATIVAS | private_areas | migrar |
| AREAS_PRIVATIVAS_HAS_CUOTAS | area_charges | migrar |
| AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO | private_area_uses | migrar |
| ARRENDAMIENTOS | rentals | migrar |
| DIRECTORIO | users | migrar |
| DIRECTORIO_HAS_ASIGNACIONES | resident_assignments | migrar |
| DIRECTORIO_HAS_CAT_PUESTOS | user_positions | migrar |
| ROLES_CONDOMINAL | roles | migrar |
| ROLES_CONDOMINAL_HAS_CAT_MODULOS | role_permissions | migrar |
| INGRESOS | incomes | migrar |
| GASTOS | expenses | migrar |
| PRESUPUESTO | budgets | migrar |
| PRESUPUESTO_DETALLE | budget_lines | migrar |
| PRESUPUESTO_MES | budget_months | migrar |
| RESUMEN_FINANCIERO | financial_snapshots | migrar_parcial |
| CONVOCATORIAS | meetings | migrar |
| CONVOCATORIAS_FECHAS | meeting_sessions | migrar |
| ASISTENCIAS_CONVOCATORIA | attendances | migrar |
| TEMAS | meeting_topics | migrar |
| VOTACIONES_CONVOCATORIAS | votes | migrar |
| TICKETS | tickets | migrar |
| TICKETS_DEPARTAMENTOS | ticket_departments | migrar |
| NOTIFICACIONES | notifications | migrar |
| PROYECTOS | projects | migrar |
| PROYECTOS_DOCUMENTOS | project_documents | migrar |
| CAT_CONCEPTOS_PRESUPUESTO_BACKUP_20260203 | eliminar | no_migrar |
| CAT_GRUPOS_PRESUPUESTO_BACKUP_20260203 | eliminar | no_migrar |
| CUPONES_TOUR | eliminar | no_migrar |
| TOURS | eliminar | no_migrar |
| artistas | eliminar | no_migrar |
| disponibilidad_artistas | eliminar | no_migrar |
| presentaciones_artistas | eliminar | no_migrar |
| REGISTROS_VISITANTES | eliminar | no_migrar |

## 4) Orden de migracion recomendado

### Fase A - Preparacion
- Congelar cambios estructurales en MySQL legacy.
- Exportar snapshot consistente (schema + data).
- Crear diccionario de mapeos y reglas de calidad.

### Fase B - Catalogos
- Migrar catalogos base (formas_pago, grupos_cobro, tipos, zonas, uso_suelo).
- Homologar IDs legacy con tablas puente.

### Fase C - Maestros
- Migrar condominios/proyectos.
- Migrar usuarios/directorio y areas privativas.
- Migrar roles/asignaciones/permisos.

### Fase D - Financiero
- Migrar charges (PAGOS) y ledger historico.
- Migrar allocations de pagos.
- Migrar ingresos y egresos.
- Migrar presupuestos, lineas y meses.

### Fase E - Operacion social
- Migrar convocatorias, sesiones, asistencias, temas, votos.
- Migrar tickets y notificaciones.

### Fase F - Documental
- Migrar metadatos de PROYECTOS_DOCUMENTOS a PostgreSQL.
- Subir binarios/PDF a Firebase Storage con path por condominio.

## 5) Reglas de calidad de migracion

1. Todas las tablas destino llevan condominium_id.
2. UUID en nuevas PK (mantener legacy_id para trazabilidad).
3. Constraints FK obligatorias en dominio financiero.
4. Soft delete estandar: deleted_at nullable.
5. Auditoria: created_at, updated_at, created_by, updated_by.

## 6) Validaciones obligatorias (go-live)

- Conteo por tabla (legacy vs nuevo) con tolerancias definidas.
- Totales financieros por anio/mes/condominio.
- Saldos por area privativa.
- Muestreo de historicos y comprobantes.
- Pruebas E2E en flujos: cuota, cobro, pago, presupuesto, ticket.

## 7) Riesgos y mitigaciones

Riesgo: relaciones implicitas sin FK en legacy.
Mitigacion: reglas de inferencia por id_* + validacion de cardinalidad.

Riesgo: SQL legacy con reglas ocultas en vistas.
Mitigacion: capturar reglas de negocio en casos de uso (hexagonal) con pruebas.

Riesgo: datos huerfanos.
Mitigacion: staging tables + reportes de orfandad + conciliacion previa.

## 8) Estrategia de corte

- Migracion inicial completa a staging.
- Ventana de corte con delta final.
- Read-only temporal en legacy.
- Switch DNS/app al nuevo backend.
- Monitoreo 72h y rollback controlado por snapshot.
