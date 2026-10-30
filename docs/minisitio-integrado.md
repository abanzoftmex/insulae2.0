# Minisitio de condóminos integrado en insulae2.0 (`/minisitio`)

Rama `feat/minisitio-integrado` (2026-10-29). El portal de condóminos que vivía en el repo
`minisitio-insulae` (Next 15 Pages Router, JS) ahora es un módulo de insulae2.0 bajo
`/minisitio`. Ya no hay API intermedia: las pantallas consultan Neon directo con Prisma.

## Qué cambió

| Antes | Ahora |
|---|---|
| Proyecto aparte, desplegado aparte | Un solo proyecto y un solo deploy |
| ~50 proxies `/api/*` del minisitio → `/api/condomino/*` de insulae2.0 (dos saltos HTTP) | Consultas Prisma en el mismo proceso (`src/modules/minisitio`) |
| Token Bearer en `sessionStorage`; verificación en el cliente | Cookie httpOnly firmada `minisitio_session`; verificación en middleware y en cada página/acción contra la base |
| Suplantación vía `/api/dev/*` con secreto compartido | Server actions; no hace falta `SUPERADMIN_IMPERSONATE_SECRET` |

Se eliminaron `src/app/api/condomino/*` y `src/app/api/dev/*`. El minisitio independiente deja de funcionar cuando se despliegue esta rama (su backend era esa API).

## Diseño

El portal sigue el sistema de [minisitio-design-system.md](minisitio-design-system.md): shell al estilo Slack con los colores de Val'Quirico. Una pantalla nueva se registra en `src/components/minisitio/shell/nav-config.ts` y no lleva encabezado propio.

## Estructura

```
src/app/
├── (admin)/            ← panel administrativo (movido aquí sin cambiar URLs)
├── (minisitio)/        ← root layout propio: CSS del minisitio, burbuja superadmin
│   ├── layout.tsx, minisitio.css
│   └── minisitio/
│       ├── (public)/   login, forgot-password, reset-password, privacy, superadmin-insulae
│       ├── (portal)/   layout con sesión + shell; las 21 pantallas
│       ├── _actions/   server actions (auth, superadmin, tickets, reports, account)
│       ├── archivos/descarga   descarga forzada de adjuntos (redirige a R2; requiere sesión)
│       └── logout      borra la cookie y vuelve al login (?reason=inactivity|revoked)
├── actions/, api/      sin cambios (salvo lo eliminado)
src/modules/minisitio/  ← dominio, auth.service, consultas (infrastructure/queries/*), mailer
src/components/minisitio/ ← shell (shell/: barra lateral, ⌘K, cuenta, celular, vista secundaria), sesión, burbuja superadmin, componentes compartidos
src/stores/minisitio*.ts  ← preferencias de vista y caché (sessionStorage); secciones plegadas y avisos vistos (localStorage)
src/shared/application/auth/{signed-token,condomino-token,condomino-session,superadmin-session}.ts
```

Las consultas devuelven exactamente el JSON que consumían las pantallas viejas (mismos nombres de campo). Se verificó con un script que compara ambos lados: **152/152 respuestas idénticas** para tres condóminos de prueba (propietario y comercio, solo comercios, propietario con tickets).

Pantallas (`/minisitio/...`): inicio (`/minisitio`), `dashboard`, `propiedades`, `propiedades/[id]`, `propiedades/[id]/estado-cuenta`, `arrendamientos`, `arrendamientos/[id]`, `arrendamientos/[id]/estado-cuenta`, `comunicados`, `notificaciones`, `experiencias`, `tickets`, `mi-perfil`, `reglamentos`, `campos-contacto`, `aviso-privacidad`, `estado-resultado`, `resumen-financiero`, `reporte-cuotas`, `reporte-cuotas-extraordinaria`, `reporte-general`, más las públicas.

## Variables de entorno (producción)

- `MINISITIO_SESSION_SECRET` — **definir** (firma las cookies de sesión del condómino y los enlaces de restablecimiento). Si falta usa `CONDOMINO_API_SECRET` → `NEXTAUTH_SECRET` → un default de desarrollo (con aviso en el log).
- `SUPERADMIN_USER`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_KEY` — modo superadministrador. Sin `SUPERADMIN_KEY` el modo queda deshabilitado (antes tumbaba toda la app).
- `RESEND_API_KEY` — ya existía; la usan "olvidé mi contraseña" y el envío del estado de cuenta.
- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — archivos en Cloudflare R2 (ver `docs/almacenamiento-r2.md`).
- `MINISITIO_SEND_EMAILS=1` — solo desarrollo: fuera de producción los correos del minisitio NO se envían (se registran en el log) salvo que se defina.
- Ya no se usan: `INSULAE_V2_API_URL`, `SUPERADMIN_IMPERSONATE_SECRET`.

`next.config.ts`: las server actions aceptan hasta 10 MB (constancia fiscal y PDF por correo; el default de Next es 1 MB).

## Despliegue

1. Definir `MINISITIO_SESSION_SECRET`, las `SUPERADMIN_*` y las `R2_*` en Vercel.
2. Desplegar la rama y probar `/minisitio/login` con un condómino real (y "¿Olvidaste tu contraseña?": el enlace llega a `/minisitio/reset-password`).
3. Redirigir el dominio del minisitio viejo (`insulae-minisitio.vercel.app/*`) a `https://<dominio insulae>/minisitio/*` y apagar ese proyecto.
4. Reescribir las URLs de archivos de Firebase a R2 (`npm run storage:migrate-to-r2 -- --apply`, ver `docs/almacenamiento-r2.md`).

## Correcciones respecto al minisitio independiente

- **Estado de resultados** siempre caía en "Error al cargar datos" (leía `totales.balance`, que la API no devolvía) y pedía ingresos/egresos con el año actual: ahora funciona y las tres secciones usan el año elegido. El selector suma los años con datos reales a sus opciones fijas (antes 2026 aparecía como "2025" y no se podía volver a él).
- **Notificaciones** fallaba al cargar (usaba un `<Layout>` sin importarlo).
- **Mis Propiedades** ocultaba las FAP y fusiones: el organizador comparaba los ids con `> 0` y en insulae2.0 son UUID. Ahora salen todas (Cristóbal Encinas: 6 → 9 filas) y a las FAP se les suma `m2_construccion` como pretendía el código, así que la tarjeta de m² puede diferir del dashboard (2,234.28 vs 2,390.6 en ese caso). Revertible en `propiedades/propiedades-organizer.ts` (`tieneReferencia`).
- URLs de archivos: logos, documentos y constancias ya vienen completas (hoy `/api/archivos/...`, servidas desde R2); el minisitio les anteponía la ruta legacy de sistemasabanza y quedaban rotas.
- Restablecer contraseña sin token se quedaba en "Verificando enlace" para siempre.
- Tickets: tras crear uno, los contadores quedaban en (0) hasta cambiar de pestaña.
- CSV de los modales de egresos salía en una sola línea.
- PDF del reporte general: con jspdf-autotable 5 el minisitio caía en la tabla manual de respaldo; ahora usa autoTable.
- Reportes de condominio (estado de resultados, cuotas, general): la restricción a propietarios se valida en el servidor, en la página y en sus server actions (antes solo en el cliente, después de descargar los datos).
- Rail colapsado: los íconos salían de dos en dos.
- Rendimiento: `getFinancialYears` ya no trae todas las filas de cargos/pagos (SQL de años distintos) y `getFinancials` se memoriza por petición (estado de resultados de ~4-5 s a ~1.5 s).

## Defectos heredados que se conservaron a propósito (corrección de una línea cada uno)

- Tabla de comercios, columna "Estado": siempre "Sin estado" (se pasa un objeto a `StatusBadge`).
- Detalle de comercio: Área/Zona "N/A" y Saldo Total/Monto Vencido $0.00 (campos que la API nunca devolvió: `area_nombre`, `zona_nombre`, `monto_cargado`, `monto_vencido`).
- Detalle de propiedad: ÚLTIMO PAGO y TOTAL CARGOS en $0.00 (`ultimo_pago`, `total_cargos` no existen; `balance.cargosTotales` sí).
- PDF de arrendamiento: el resumen por grupo busca claves 1..7 y la consulta devuelve UUID (filas en $0.00).
- Paneles laterales de Mi Perfil (asignaciones/comercios): ningún botón los abre.
- El aviso de privacidad nunca se pide: no hay campo de aceptación en la base y el login lo da por aceptado.
- Bienvenida: el carrusel de destacados era código muerto en el original y no se portó; destacados siguen en Experiencias. `ExperienciasComponent` y `MasonryLayout` no se usaban.

## Pendientes y avisos

- **Archivos en Cloudflare R2**: Firebase Storage (que respondía 402 por la facturación cerrada) se sustituyó por R2; al desplegar hay que copiar lo nuevo y reescribir las URLs de la base. Ver `docs/almacenamiento-r2.md`.
- **Token de GitHub Packages caducado** en `.npmrc`: `npm install` falla en `@abanzoftmex/luca-insulae-contract`. Vercel usa `NPM_TOKEN`, revisar que siga vigente.
- `/presupuesto-pdf` responde 500 ("Event handlers cannot be passed to Client Component props") también en `main`.
- `npm run guard:runtime-db-boundary` falla por dos archivos del admin que ya fallaban en `main`.
- `reporte-general` pesa ~4.3 MB de HTML (1,745 áreas × 12 meses; antes eran los mismos datos por JSON en el cliente).

## Verificación hecha

- Paridad de datos contra el minisitio viejo (corriendo local contra `main`): 152/152.
- Smoke test de 66 combinaciones ruta × usuario: todas 200 (o redirección esperada); log sin errores.
- Comparación en navegador lado a lado (texto renderizado idéntico) de bienvenida, dashboard, propiedades, comercios, ambos estados de cuenta y detalles, comunicados, tickets, perfil, documentos, contactos, aviso, experiencias, resumen financiero, cuotas (incl. paginación), cuotas extraordinarias y reporte general. Sin errores de consola ni de hidratación.
- Superadmin de punta a punta: burbuja, búsqueda, suplantación, terminar suplantación, cerrar modo.
- `tsc` y `next build` (Turbopack, como Vercel) limpios.
- **No probado** (escriben en la base o envían correo): crear/responder ticket, cambiar "requiere factura", restablecer contraseña, enviar estado de cuenta por correo, login con contraseña real. Las descargas de PDF tampoco se ejecutaron en navegador (los generadores sí se corrieron en Node con datos reales).
