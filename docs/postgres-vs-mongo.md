# Decision tecnica: PostgreSQL vs MongoDB para Insulae 2.0

Base evaluada: 79 tablas, 76,360 registros, dominio financiero-condominal con historial y reporteria.

## Matriz comparativa basada en evidencia real

| Criterio | PostgreSQL | MongoDB | Ganador |
| --- | --- | --- | --- |
| Cantidad de relaciones | Excelente para modelo relacional complejo y N:N | Requiere modelado denormalizado o referencias manuales | PostgreSQL |
| Integridad financiera | ACID fuerte, FK, constraints, transacciones robustas | ACID por documento/transacciones multi-doc mas costosas | PostgreSQL |
| Historiales de pagos/cobros | Muy adecuado para ledger y conciliacion | Posible pero con mayor complejidad de consistencia | PostgreSQL |
| Presupuestos y reportes | SQL analitico, CTE, window functions | Aggregation pipeline potente, pero mas complejo para joins intensivos | PostgreSQL |
| Roles y permisos relacionales | Modelo limpio con tablas intermedias y constraints | Se puede, pero tiende a duplicacion o consultas cruzadas | PostgreSQL |
| Consultas complejas multi-join | Nativo y optimizable con planner maduro | Menos natural para 8+ colecciones relacionadas | PostgreSQL |
| Migracion desde MySQL legacy | Mapeo directo tabla->tabla y SQL conocido | Requiere rediseño profundo orientado a documento | PostgreSQL |
| Escalabilidad operativa SaaS | Muy buena con particionamiento, replicas y tuning | Muy buena horizontalmente, pero no compensa costo relacional | Empate tecnico |
| Productividad con Prisma | Excelente soporte relacional y migraciones | Prisma Mongo limitado para relaciones complejas | PostgreSQL |
| Auditoria y cumplimiento | Constraints y trazabilidad transaccional fuerte | Posible, pero mas trabajo de disciplina de app | PostgreSQL |

## Conclusiones tecnicas

1. Insulae legacy es claramente relacional: hay muchas tablas intermedias (_HAS_), historicos y reportes financieros.
2. El sistema requiere integridad fuerte para pagos, saldos, presupuestos y conciliaciones.
3. Migrar a MongoDB incrementaria riesgo de inconsistencia y esfuerzo de rediseño.
4. La ruta de menor riesgo y mayor mantenibilidad es PostgreSQL + Prisma.

## Recomendacion definitiva

**Usar PostgreSQL como base principal de Insulae 2.0.**

Uso recomendado de MongoDB (opcional, no core):
- Telemetria/eventos no criticos.
- Cache documental o busquedas especializadas.
- Nunca como fuente de verdad financiera.

## Arquitectura de datos recomendada

- Source of truth: PostgreSQL.
- ORM/migrations: Prisma.
- Archivos/PDF: Firebase Storage.
- Bus de eventos (opcional): cola para notificaciones y procesos async.

Esta decision maximiza integridad, trazabilidad y capacidad de evolucion del dominio condominal SaaS.
