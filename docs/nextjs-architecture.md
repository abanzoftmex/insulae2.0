# Arquitectura propuesta - Insulae 2.0 (Next.js + Hexagonal)

## 1) Stack objetivo

- Frontend/Backend BFF: Next.js 15+ (App Router)
- ORM: Prisma
- BD principal: PostgreSQL
- Storage documentos: Firebase Storage
- Auth: NextAuth/Auth.js + RBAC multi-condominio
- Jobs async: cola (BullMQ o equivalente)

## 2) Arquitectura hexagonal (ports & adapters)

### Capas

1. Domain
- Entidades de negocio: PrivateArea, Charge, LedgerEntry, Payment, Budget, Meeting, Ticket, Notification.
- Value Objects: Money, Period, Folio, TenantId.
- Servicios de dominio: Prorrateo, Aplicacion de pago, Generacion de estado de cuenta.

2. Application
- Casos de uso (use cases):
  - createCharge
  - registerPayment
  - allocatePayment
  - generateFinancialSummary
  - createBudget
  - publishMeeting
  - registerAttendance
  - createTicket
- DTOs y validaciones de entrada/salida.

3. Ports
- Repositorios abstractos (interfaces): ChargeRepository, PaymentRepository, BudgetRepository, etc.
- StoragePort para documentos.
- NotificationPort para email/push.

4. Adapters
- Prisma adapters (PostgreSQL).
- FirebaseStorage adapter.
- HTTP adapter (Route Handlers de Next.js).
- Queue adapter para procesos en background.

## 3) Estructura sugerida de carpetas

```txt
src/
  app/
    (dashboard)/
    api/
  modules/
    finance/
      domain/
      application/
      infrastructure/
      presentation/
    directory/
    governance/
    tickets/
    projects/
  shared/
    domain/
    infrastructure/
    ui/
```

## 4) Multi-condominio (SaaS)

Modelo recomendado:
- Tabla condominiums como tenant principal.
- Todas las tablas de negocio con condominium_id indexado.
- Restriccion por tenant en repositorios (nunca en UI solamente).
- Politicas RBAC por rol y modulo.

Buenas practicas:
- Composite unique keys por tenant cuando aplique.
- Logs de auditoria por tenant y usuario.
- Row-level security opcional en PostgreSQL (fase avanzada).

## 5) Documentos PDF en Firebase Storage

Convencion de paths:
- condominiums/{condominiumId}/projects/{projectId}/{fileId}.pdf
- condominiums/{condominiumId}/receipts/{year}/{month}/{fileId}.pdf

Guardar en PostgreSQL:
- storage_provider = firebase
- bucket
- object_path
- mime_type
- size_bytes
- checksum
- uploaded_by

## 6) Flujos financieros criticos

1. Cuota/Cargo
- Crear charge por periodo y area.
- Guardar base_calculation_json para auditoria.

2. Pago
- Registrar payment con metodo y referencia.
- Aplicar en payment_allocations contra ledger abierto.
- Recalcular saldo de area de forma transaccional.

3. Cierre presupuestal
- budget + budget_lines + budget_months.
- Versionamiento por anio.

## 7) Seguridad y compliance

- Prepared statements via Prisma (sin SQL concatenado).
- Validacion con Zod en borde HTTP.
- Cifrado de secretos en entorno.
- Auditoria inmutable de operaciones financieras.
- Politica de retencion de documentos.

## 8) Estrategia de desarrollo

1. Construir primero modulo Finance (core transaccional).
2. Luego Directory + Roles.
3. Luego Governance (convocatorias/votaciones).
4. Luego Tickets/Notificaciones.
5. Integrar Projects/Documents con Firebase.

## 9) KPIs de exito tecnico

- 100% de operaciones financieras dentro de transaccion.
- 0 SQL concatenado en codigo.
- 100% de entidades core con FK declarada.
- Cobertura de pruebas por caso de uso critico.
- Tiempos de respuesta < 300 ms en consultas frecuentes.
