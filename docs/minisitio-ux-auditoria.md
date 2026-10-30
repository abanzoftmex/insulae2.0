# Auditoría UX/UI del minisitio de condóminos de Val'Quirico

**Fecha:** 2026-10-29 · **Rama:** `feat/minisitio-integrado` · **Modo:** solo lectura. No ejecuté la app ni consulté la BD.

> **Ojo:** describe el minisitio de **antes** del rediseño al estilo Slack. Los números de línea citados apuntan al código de entonces; lo ya resuelto se marca en `docs/minisitio-design-system.md` (sección «Estado»).

**Cómo se hizo**
- Leí todas las pantallas de `(portal)` y `(public)`, el shell, los layouts, `minisitio.css` y las consultas que alimentan cada pantalla.
- Leí también los documentos de referencia: `DESIGN.md`, `AI_DESIGN_PROMPT.md`, `docs/fluent-teams-design-analysis.md` y `docs/minisitio-integrado.md`.
- Comprobé qué clases existen de verdad en Tailwind 4.2.2 contra el CSS compilado de desarrollo (`.next/dev/static/chunks/src_app_(minisitio)_minisitio_0vp5.bt.css`).
- Calculé los contrastes con la fórmula WCAG de luminancia relativa.
- Lo visual se deduce del código. Cuando algo es inferencia, lo marco como "probable".

**Convención de rutas** (prefijos absolutos que uso en todo el documento):
- `P/` = `src/app/(minisitio)/minisitio/(portal)/`
- `PU/` = `src/app/(minisitio)/minisitio/(public)/`
- `M/` = `src/app/(minisitio)/minisitio/`
- `C/` = `src/components/minisitio/`
- `Q/` = `src/modules/minisitio/infrastructure/queries/`
- `CSS` = `src/app/(minisitio)/minisitio.css`
- `ROOT` = `src/app/(minisitio)/layout.tsx`
- `shell` = `C/minisitio-shell.tsx`

---

## 0. Resumen ejecutivo

1. **La arquitectura de información (IA) se contradice.**
   - Hay dos inicios: "Bienvenida" y "Panel de Control".
   - El mismo dato (la tabla `notification`) se muestra en cuatro superficies: Comunicados, Notificaciones, Experiencias y "Últimos comunicados".
   - Tres rutas no tienen ningún enlace: `/estado-resultado`, `/reporte-general` y `/notificaciones`.
   - En el menú, "reportes" significa dos cosas: finanzas del condominio y tickets.
2. **Hay datos falsos o engañosos en pantalla.**
   - "Saldo Pendiente" del Panel muestra en realidad el saldo vencido.
   - "Último pago" y "Total cargos" salen siempre en $0.00.
   - Si el indiviso viene vacío, se inventa uno de 0.0417 %.
   - En comercios: Área/Zona "N/A", saldos en $0.00 y "Sin estado" en todas las filas.
   - Los filtros "Propietarios" y "Comercios" de Comunicados siempre dan 0.
   - "Notificaciones de hoy" no filtra por fecha.
   - Cuando una consulta falla, seis pantallas muestran ceros o listas vacías sin avisar, incluida la de **números de emergencia**.
3. **Hay 41 usos de clases que no existen en Tailwind v4** (`bg-opacity-*`, `animate-in`, `fade-in`, `no-scrollbar`…). Efectos que se ven:
   - las miniaturas de la galería quedan tapadas por un overlay negro sólido;
   - los botones del visor de imágenes son blancos sobre blanco;
   - el ícono de "Tipo de usuario" del Panel es dorado sobre dorado.
4. **El menú no funciona con teclado.**
   - "Reportes Condominales" es un `div` con `onClick`: no recibe foco ni responde a Enter.
   - Los enlaces del submenú cerrado se pueden tabular aunque estén invisibles.
   - En el rail contraído, los enlaces se quedan sin nombre accesible.
   - Hay 0 `focus-visible`, 0 `aria-current` y 0 `role="dialog"`.
   - Los ítems del menú se definen dentro del render del shell y se remontan en cada cambio de estado. Eso hace perder el foco y, probablemente, cancela la animación del submenú.
5. **El dorado más usado (`#cba258`, 79 usos) da 2.37:1 con texto blanco.** Falla AA en los CTA principales ("Nueva Solicitud", "Solicitar ayuda", botones de envío de los modales).
6. **"Look de IA" en todas partes:**
   - 62 líneas con degradados (28 son degradados de un solo color);
   - 144 líneas con MAYÚSCULAS + tracking;
   - 32 pastillas de color, más cuatro componentes o mapas de color que las generan;
   - 22 bandas de cabecera saturadas;
   - unos 50 chips de ícono, 7 de ellos repetidos en cada fila;
   - 59 hexadecimales sueltos;
   - 825 clases `gray-*` crudas, contra unos 10 usos de los tokens Fluent que **ya están** en `minisitio.css`.
7. **Motion.**
   - Solo hay transiciones CSS, casi todas de 200 ms (86 usos de `duration-200`).
   - framer-motion no se usa en ningún archivo del minisitio, aunque está instalado (v12.42.2) y el admin lo usa.
   - No se respeta `prefers-reduced-motion` en ningún lugar.
   - No hay transiciones entre rutas, los modales aparecen de golpe y hay 16 `alert()` nativos como feedback.
8. **Móvil.**
   - El título del header queda alineado a la derecha y se desborda en los 64 px de alto.
   - Muchas pantallas suman su propio padding al del shell.
   - Hay tablas de 11 a 49 columnas sin vista alternativa por defecto.
   - El panel del superadmin mide 384 px fijos y no cabe en un celular.
   - La sección ancha de los reportes probablemente desborda 8 px por lado en pantallas de 1024 px o más.
9. **El sistema de referencia ya existe en el repo.**
   - Tokens Fluent y rampa "pergamino" en `CSS`.
   - Primitivas en `src/components/ui/fluent.tsx`.
   - El motion del rail del admin (`src/components/layout/app-sidebar.tsx`): indicador que se desliza con `layoutId` y resorte 480/38/0.7, etiquetas de 180 ms y submenú de 260 ms.
   - El rediseño debe **migrar a eso**, no inventar otro sistema.

---

## 1. Arquitectura de información actual

### 1.1 Estructura del shell

- **`ROOT`.** Es un root layout propio (`<html lang="es">`). Monta la burbuja de superadmin cuando ese modo está activo.
- **`P/layout.tsx`.** Hace estas tres cosas:
  - resuelve la sesión;
  - monta `MinisitioSessionProvider` y luego `MinisitioShell`;
  - si el aviso de privacidad no está aceptado, carga el texto (hoy siempre está aceptado).
- **`shell`.** Contiene:
  - rail fijo de 268 px abierto y 68 px contraído;
  - header sticky de 64 px (`h-16`) con título y breadcrumbs;
  - `main` con padding `p-4 sm:p-6 lg:p-8` **sin ancho máximo** (líneas 730-731).
- **Títulos.** Salen del mapa `ROUTE_TITLES` (shell:66-88). Una página puede sobrescribirlos con `C/../../stores/minisitio-layout.store.ts`.

### 1.2 Entradas del menú hoy (shell:196-341)

| Grupo (glifo) | Etiqueta | Ruta | Ícono | Quién lo ve |
|---|---|---|---|---|
| Inicio (House) | Bienvenida | `/minisitio` | Handshake | todos |
| | Panel de Control | `/minisitio/dashboard` | Settings2 | todos |
| Mi patrimonio (Building2) | Mis Propiedades | `/propiedades` (+ `/[id]`, `/[id]/estado-cuenta`) | Home | `propietario`/`both` **y** `hasPropiedades` |
| | Mis Comercios | `/arrendamientos` (+ `/[id]`, `/[id]/estado-cuenta`) | Landmark | `arrendatario`/`both` **y** `hasComerciosArrendamientos` |
| Financiero (Coins) | Reportes Condominales ▾ (sin ruta propia) | — | BarChart3 | `propietario`/`both` (no exige tener propiedades) |
| | ↳ Resumen Financiero | `/resumen-financiero` | DollarSign | ídem |
| | ↳ Reporte de Cuotas Ordinarias | `/reporte-cuotas` | FileText | ídem |
| | ↳ Reporte de Cuotas Extraordinarias | `/reporte-cuotas-extraordinaria` | FileText | ídem |
| Atención (Headset) | Comunicados | `/comunicados` | Megaphone | todos |
| | Solicitudes y reportes | `/tickets` | MailPlus | todos |
| Val'Quirico (Trees) | Documentos Condominales | `/reglamentos` | BookOpen | todos |
| | Aviso de privacidad | `/aviso-privacidad` | Shield | todos |
| | Experiencias Val'Quirico | `/experiencias` | Sparkles | todos |
| | Números de Emergencia | `/campos-contacto` | Phone | todos |
| | Mostrar el Mapa | `https://www.mapavalquirico.com/` (pestaña nueva, sin indicador ↗) | Map | todos |
| Pie del rail | Mi Perfil | `/mi-perfil` | Settings | todos |
| | Cerrar Sesión | `logoutAction` y luego `/login` | LogOut | todos |

**Notas**
- `userType` se resuelve en `src/modules/minisitio/application/auth.service.ts:58-60`. Una cuenta sin propiedades ni comercios queda como "propietario": ve Reportes pero no "Mis Propiedades".
- **Badges.** El tipo `NavEntry` admite `badge` y se dibuja en shell:461-465 con blanco sobre `#b58c42` (3.09:1, falla AA). Hoy ningún ítem lo usa.
- **Grupo de reportes.**
  - Arranca cerrado aunque estés en una de sus páginas: `expandedMenus = {}` (shell:127) y no se abre solo con `hasActiveChild` (383-384).
  - Su `current` usa `startsWith("/reporte")` (240), que no incluye `/resumen-financiero`.
- La preferencia de rail contraído se guarda en `sessionStorage` (`src/stores/minisitio.store.ts:99`) y se pierde al cerrar el navegador.

### 1.3 Rutas fuera del menú

| Ruta | Estado | Cómo se llega hoy |
|---|---|---|
| `/estado-resultado` | Funciona; solo dueños (validado en servidor) | Ningún enlace |
| `/reporte-general` | Funciona; solo dueños; dice "Información confidencial" | Entrada comentada en shell:230-236 |
| `/notificaciones` | Funciona | Ningún enlace |
| `/privacy` | Puerta para aceptar el aviso | Redirección desde el Panel (`P/dashboard/dashboard-view.tsx:140-142`). Nunca ocurre: `aceptoAvisoPrivacidad: true` está fijo (auth.service.ts:88) |
| `/archivos/descarga` | Route handler de descargas | Botones de adjuntos en tickets |
| Públicas | `/login`, `/forgot-password`, `/reset-password`, `/superadmin-insulae`, `/logout` | — |

**Permisos incoherentes.** `/resumen-financiero` no valida en el servidor que el usuario sea dueño (`P/resumen-financiero/page.tsx:9-11`, `M/_actions/reports.ts:76-79`), aunque el menú lo esconde a los comercios. Las demás pantallas de reportes sí usan `requirePropietario`.

### 1.4 Jerarquía de páginas

```
/minisitio (Bienvenida)
├─ /dashboard (Panel de Control)
├─ /propiedades ── /[id] ── /[id]/estado-cuenta
├─ /arrendamientos ── /[id] ── /[id]/estado-cuenta  (pestañas: Estado de cuenta · Reglamentos)
├─ Reportes: /resumen-financiero · /reporte-cuotas · /reporte-cuotas-extraordinaria · (/estado-resultado) · (/reporte-general)
├─ /comunicados · (/notificaciones) · /experiencias
├─ /tickets
├─ /reglamentos · /aviso-privacidad · /campos-contacto · mapa (externo)
└─ /mi-perfil
```
Entre paréntesis: rutas sin enlace.

### 1.5 Etiquetas confusas: un concepto con varios nombres

| Concepto | Nombres que usa la UI | Dónde |
|---|---|---|
| Inicio / panel | "Bienvenida", "Panel de Control", "Dashboard" (título del header y `<title>`) | shell:67-68, 198-207; `P/dashboard/page.tsx:7` |
| Comercios | "Mis Comercios", "Comercios", "Arrendamientos", "Detalle de Comercio", "Todos los Arrendamientos", "Ir a Arrendamientos" | shell:72-74, 220; `P/arrendamientos/[id]/arrendamiento-detalle-view.tsx:99`; `P/arrendamientos/[id]/estado-cuenta/estado-cuenta-arrendamiento-view.tsx:68, 336, 464` |
| "Reportes" | "Reportes Condominales" (finanzas) frente a "Solicitudes y reportes" (tickets) | shell:238, 270 |
| Reporte de cuotas | Menú "Reporte de Cuotas Ordinarias"; título en página "Estado de Cartera Ordinaria"; pie "Cartera ordinaria consolidada" | shell:250; `P/reporte-cuotas/reporte-cuotas-view.tsx:310, 677` |
| Resumen financiero | El título de `/estado-resultado` dice "Resumen Financiero" mientras el header dice "Estado de Resultados" | `P/estado-resultado/estado-resultado-view.tsx:406-408`; shell:83 |
| Documentos | "Documentos Condominales", "Reglamentos y Normas", ruta `/reglamentos`, pestaña "Reglamentos" | shell:282; `P/welcome-panel.tsx:435-436`; `P/arrendamientos/[id]/estado-cuenta/reglamentos-tab.tsx:29` |
| Contacto | "Números de Emergencia" (menú y header), "Información de Contacto" (título), "Medios de Contacto Disponibles" (subtítulo), "Teléfonos y Emergencia" y "¿Necesitas ayuda?" (Inicio) | shell:294; `P/campos-contacto/campos-contacto-view.tsx:74, 86`; welcome-panel:482, 618 |
| Saldo | "Saldo Pendiente" significa vencido (Panel), total por pagar (KPI de Propiedades) o no vencido (columna de la tabla). "Saldo Total" y "Cargos Totales" muestran el mismo `cargosTotales` | `P/dashboard/dashboard-view.tsx:209-212`; `P/propiedades/propiedades-view.tsx:243-253`; `P/propiedades/propiedades-table.tsx:164-165, 252-261`; estado-cuenta-arrendamiento:207 frente a estado-cuenta-propiedad:156 |
| Comunicados | "Comunicados", "Avisos y Comunicados", "Comunicados Oficiales", "Últimos Comunicados", "Notificaciones de Hoy" | welcome-panel:295, 384, 532; `P/notificaciones/notificaciones-view.tsx:110` |
| Tickets | "Solicitudes y reportes", "Nueva Solicitud", "Crear Nueva Solicitud", "Solicitar ayuda", "Gestionar tickets" | tickets-view; create-ticket-modal; welcome-panel:419 |
| Mapa | "Mostrar el Mapa" frente a "Mapa de Val'Quirico" | shell:301; welcome-panel:505 |
| Ortografía | "Ultima actualizacion" y "areas privativas", sin acentos | propiedades-view:166, 226 |

### 1.6 Páginas redundantes o que se solapan

1. **Bienvenida y Panel de Control.** Hay dos portadas. Bienvenida no muestra ni un dato de dinero. El Panel sí, pero repite "Datos Generales" de Mi Perfil.
2. **Comunicados, Notificaciones, Experiencias y "Últimos comunicados".** Las cuatro leen la misma tabla `notification` (`Q/communications.queries.ts:9-17`):
   - Notificaciones siempre trae `tipo: "info"` (línea 81) y `leida: false` (línea 82).
   - Experiencias son los avisos que tienen imagen o PDF.
3. **Resumen financiero y Estado de resultados.** Ambos muestran ingresos y egresos por mes y año.
4. **Cuotas ordinarias y extraordinarias.** Son dos copias de la misma pantalla (681 y 516 líneas). Reporte general se solapa con ambas.
5. **Dos estados de cuenta** (propiedad: 393 líneas; comercio: 479) con distinto orden de secciones, distintas etiquetas y distintos colores.
6. **Documentos** aparece como página (`/reglamentos`) y como pestaña dentro del estado de cuenta del comercio.
7. **Contacto** aparece como página (`/campos-contacto`) y como bloque "¿Necesitas ayuda?" en Bienvenida.
8. **Aviso de privacidad** aparece en cuatro lugares: `/aviso-privacidad`, `/privacy`, un modal del shell y la síntesis al pie de Bienvenida.
9. **Alta de ticket** tiene dos formularios: el modal de `/tickets` (tickets-view:620-735) y `P/_components/estado-cuenta/create-ticket-modal.tsx`.
10. **"Olvidé mi contraseña"** existe como modal del login (`PU/login/login-view.tsx:340-450`) y como página `/forgot-password`.

### 1.7 Flujos profundos u ocultos

- **Saber cuánto debo de una propiedad:**
  1. Inicio no muestra saldo; hay que ir a Mis Propiedades.
  2. Localizar la fila.
  3. Pulsar un ícono sin texto (FileText).
  4. En el estado de cuenta, bajar hasta el final para Descargar o Enviar.
- **Reportes:** el grupo está cerrado por defecto y no se abre con teclado.
- **Responder un ticket:** expandir el ticket, pulsar "Responder" y escribir. La nueva respuesta **reemplaza** la anterior sin avisar (`Q/tickets.queries.ts:155`).
- **Facturación** (requiere factura y constancia fiscal): está escondida dentro de la banda olivo del perfil (`P/mi-perfil/mi-perfil-view.tsx:243-330`).
- **Paneles "Todas las asignaciones" y "Todos los comercios" del perfil:** ningún botón los abre (mi-perfil-view:84-85, 392-440).
- **Experiencias:** el título y la descripción solo se ven al pasar el mouse.

---

## 2. Análisis pantalla por pantalla

### 2.1 Bienvenida · `/minisitio` (`P/page.tsx`, `P/welcome-panel.tsx`)

- **Propósito:** portada del portal.
- **Tarea principal esperada:** responder "¿qué hay de nuevo y qué debo?". Hoy solo responde lo primero.
- **Datos:** 5 comunicados recientes (`Q/communications.queries.ts:55-68`), campos de contacto y síntesis del aviso de privacidad.
- **Acciones:** 8 tarjetas de acceso y 3 botones en el hero (todos repiten el menú), abrir un comunicado en el panel lateral, "Ver todos".

**Problemas**
- **Hero (226-268):**
  - degradado olivo de 3 paradas con marca de agua;
  - 2 pastillas en MAYÚSCULAS con tracking (239, 242);
  - línea de fecha y hora en mayúsculas (262).
  La hora se calcula una sola vez al pintar y no avanza (174-186).
- **Tarjetas de módulo (313-519).** Son 8 tarjetas que repiten el sidebar, cada una con chip de ícono, pastilla y CTA. Usan 4 colores para 8 destinos que valen lo mismo.
- **Bloques pegados.** La raíz es `min-h-screen` sin `space-y` (224) y ningún bloque trae margen (226, 302, 523, 616). Probablemente se ven pegados entre sí.
- **Tarjetas de comunicado.** Son `div` con `onClick` (564-568): no se pueden enfocar.
- **Panel lateral (715-818):**
  - se monta de forma condicional, así que no anima aunque tiene `transition-transform`;
  - no cierra con Escape ni atrapa el foco;
  - cabecera degradada (725) y bloque del PDF en azul (797-812).
- **"¿Necesitas ayuda?"** repite `/campos-contacto` con otro diseño y un horario fijo "9:30 a 18:00" (619). El aviso de privacidad va en una caja azul (681-699).
- **Errores silenciosos.** Si una consulta falla, la sección se pinta vacía sin avisar (`P/page.tsx:14-28`).
- **Formato regional.** Las fechas usan `es-ES`, no `es-MX` (168, 178).

### 2.2 Panel de Control · `/dashboard` (`P/dashboard/page.tsx`, `dashboard-view.tsx`, `loading.tsx`)

- **Propósito:** resumen de la cuenta: saldo, número de propiedades y comercios, m², indiviso y datos personales.
- **Tarea principal:** saber cuánto debo y por qué unidad.

**Problemas**
- **Etiqueta errónea.** "Saldo Pendiente" muestra `saldoVencido` (209-212).
- **Banda olivo con KPIs (171-257).** Por `bg-opacity-*`, que ya no existe:
  - las tarjetas "translúcidas" se ven blanco sólido (203, 221, 241);
  - el chip de tipo de usuario queda dorado sólido con el ícono también dorado (1:1, invisible) y el texto a 3.33:1 (186-197).
- **Color sin significado.** Chips azul y verde (224, 244) y mosaicos rojo, verde, azul y morado (332-369).
- **Repetición.** "Datos Generales" duplica Mi Perfil (261-298).
- **Falta lo esencial.** No dice qué unidad tiene adeudo ni enlaza a su estado de cuenta. Los botones son genéricos: "Ver Todas…" (374-379, 457-462).
- **Ceros falsos.** Si el resumen falla, la pantalla muestra $0.00 sin avisar (`page.tsx:13-23`; vista:127).
- La redirección a `/privacy` ocurre en un efecto de cliente (137-143).
- La carga es un spinner azul a pantalla completa (`loading.tsx`; `C/loading-spinner.tsx:19`).
- El header dice "Dashboard" y el menú "Panel de Control".

### 2.3 Mis Propiedades · `/propiedades` (`propiedades-view.tsx`, `propiedades-table.tsx`, `indiviso-info.tsx`, `propiedades-report-pdf.ts`)

- **Propósito:** inventario de áreas privativas (AP, FAP, fusiones) con superficie, indiviso y saldos, más un reporte en PDF.
- **Acciones:** buscar, alternar Tabla/Tarjetas, generar PDF, ir al detalle o al estado de cuenta.

**Problemas**
- **Cabecera.** Banda olivo con 4 KPI con chips (160-283). El título se repite: en la página (163) y en el header.
- **Saldo inconsistente en la misma pantalla.** El KPI "Saldo Pendiente" es la suma total (243-253), pero la columna "Saldo Pendiente · No vencido" es pendiente menos vencido (`propiedades-table.tsx:164-165, 248-262`).
- **Tabla de 11 columnas en MAYÚSCULAS (146-176).**
  - Usa el verde Starbucks `#00754A` en los prefijos AP/FAP y en los separadores (109, 197).
  - La flecha del tooltip es `#1E3932` (136).
  - Las filas "padre con hijos" van en amarillo (92).
- **Vista Tarjetas.** No es la predeterminada en celular y no se recuerda (34, 40-41, 72-75).
- **Acciones por fila.** Son solo íconos con `title` (292-305). Los tooltips de barrio e indiviso solo funcionan con mouse (table:277-279; `indiviso-info.tsx:12-18`).
- Usa `alert()` para el PDF (132, 142). El estado vacío ofrece "Actualizar", que recarga la página (528).
- Ortografía (166, 226).
- Los m² del KPI pueden diferir de los del Panel (lo registra `docs/minisitio-integrado.md`).

### 2.4 Detalle de propiedad · `/propiedades/[id]` (`propiedad-detalle-view.tsx`, `image-gallery.tsx`)

**Problemas**
- **Dato inventado:** si el indiviso viene vacío, muestra 0.0417 % (116).
- **Ceros fijos:** "ÚLTIMO PAGO" y "TOTAL CARGOS" salen siempre en $0.00 o "Sin registros" (177-204), aunque `balance.cargosTotales` existe.
- Etiquetas en MAYÚSCULAS (164, 179, 199); botón `gray-800` (154).
- **Doble padding:** `p-6 max-w-7xl` (97).
- La fila propietario/ubicación no tiene `flex-wrap` (121-145): se desborda en celular.
- "No encontrada" usa el emoji ❌ y un botón azul (80-93).
- **Galería:**
  - el overlay `bg-black bg-opacity-0` es negro sólido sobre las miniaturas (98);
  - los botones del visor son blanco sobre blanco (123, 135, 165);
  - las miniaturas son `div` con `onClick` (86-90);
  - el teclado solo funciona si el visor tiene el foco (113-118);
  - `/placeholder-image.svg` no existe en `public/` (9).
- El título "Propiedad: X" se fija en un efecto: probablemente parpadea primero "Propiedad" (46-52).

### 2.5 Mis Comercios · `/arrendamientos` (`arrendamientos-view.tsx`, `arrendamientos-table.tsx`)

**Problemas**
- Banda olivo con 3 KPI con chips rojo y verde (113-174).
- **Tabla de 12 columnas:**
  - "Estado Financiero (Saldo Vencido)" muestra `saldo_pendiente` (70-72, 128-134);
  - la columna "Estado" dice siempre "Sin estado" (159-164).
- Con una búsqueda sin resultados, "Actualizar" recarga la página en lugar de limpiar la búsqueda (351-357).
- Las tarjetas llevan banda gris y subsecciones en MAYÚSCULAS (228, 245, 301).

### 2.6 Detalle de comercio · `/arrendamientos/[id]` (`arrendamiento-detalle-view.tsx`)

- Área Privativa y Zona dicen siempre "N/A" (137, 142).
- "Saldo Total" y "Monto Vencido" salen siempre en $0.00 (156-188).
- "Estado" pinta una pastilla azul vacía (127-130).
- El breadcrumb se duplica dentro de la página y usa otro nombre, "Arrendamientos" (97-103).
- Usa `<label>` como texto, sin formulario (110 y siguientes).
- Las acciones van al final, en verde y gris (219-234). El error es genérico, con enlace azul (72-82).

### 2.7 Estados de cuenta · `/propiedades/[id]/estado-cuenta` y `/arrendamientos/[id]/estado-cuenta`

Archivos: `estado-cuenta-propiedad-view.tsx`, `estado-cuenta-arrendamiento-view.tsx`, `P/_components/estado-cuenta/*`, `P/_lib/estado-cuenta-utils.ts`.

- **Propósito:** ver los movimientos (cargo, abono, intereses, descuento, saldo, estado), los pagos y los totales.
- **Acciones:** descargar PDF, enviar por correo, solicitar ayuda.

**Problemas**
- **Acciones enterradas.** Las acciones principales están al final de la página (propiedad 327-383; comercio 319-375).
- **Emojis como íconos:** propiedad 344, 357, 378; comercio 336, 349, 370; modal de correo 163, 235, 240.
- **Spinner invisible.** El spinner es blanco sobre un botón blanco (propiedad 353).
- **Dos versiones que divergen:**
  - el comercio pone los pagos antes del resumen (155 frente a 199);
  - "Cargos Totales" (propiedad 156) y "Saldo Total" (comercio 207) son el mismo `cargosTotales`;
  - "Saldo a Favor" solo existe en la propiedad (161-166);
  - el comercio muestra solo 3 pagos y no ofrece "ver todos" (178);
  - el modal de correo es azul para el comercio (`send-email-modal.tsx:112-124`);
  - el botón de correo del comercio es negro con hover azul (360).
- **Tablas de 11 columnas en MAYÚSCULAS** con borde en cada celda (propiedad 195-231; comercio `min-w-[900px]`, 232).
- **Sin filtros** (año, tipo, estado), sin orden y sin paginación.
- **Sin estado vacío.** Si no hay movimientos, la sección simplemente desaparece (189, 224).
- La columna "Saldo" esconde los saldos a favor de cada fila (237-238).
- Los KPI llevan 4 colores de borde izquierdo (155-183).
- Usa `alert()`: correo 41, 46, 69, 76; PDF 91; comercio 78, 87.
- **"Solicitar ayuda" sin contexto.** El ticket no incluye la propiedad ni el periodo (`create-ticket-modal.tsx:8-12`).
- Las pestañas del comercio no tienen roles (389-413) y repiten `/reglamentos`.
- Doble padding `max-w-7xl mx-auto px-4 py-6` (propiedad 117; comercio 380).
- Los errores no coinciden: la propiedad muestra una tarjeta roja con enlace azul (37-49); el comercio, un modal con botón azul (430-470).

### 2.8 Resumen financiero · `/resumen-financiero` (`resumen-financiero-view.tsx`, `compact-financial-table.tsx`)

- **Propósito:** transparencia del condominio. Ingresos, egresos, saldo y cartera por mes, en 3 ejercicios, ordinario y extraordinario.

**Problemas**
- **Cabecera.** Título en MAYÚSCULAS y la insignia "Fase 1 · BETA" (434-435). A un condómino eso le dice "no confíes en estas cifras".
- **KPI.** Son 6, con chips de color (cyan, lime, amber, emerald) y uno está repetido: "Ingresos Ordinarios" y "Cuotas Ord. {año} (Anual)" muestran el mismo `kpi.ingresos` (482, 496-501).
- **Selectores de año y modo.** Son segmentados sin `aria-pressed` ni roles, en MAYÚSCULAS (420-475).
- **Tablas de 40 columnas** con `min-w-480`, que equivale a 1,920 px (`compact-financial-table.tsx:106`):
  - `no-scrollbar` no existe (105);
  - las cabeceras van a 10 px en MAYÚSCULAS (98, 108);
  - el color de cada tabla (mint, ámbar, oro; 36-55) contradice la regla de color de datos de `docs/fluent-teams-design-analysis.md` §6.
- `animate-in fade-in` no existe (428). "Reintentar" reemplaza toda la pantalla por un spinner (398-406).
- Un comercio puede abrirla por URL (ver 1.3). El título se repite con el del header.

### 2.9 Estado de resultados · `/estado-resultado` (`estado-resultado-view.tsx`, `egresos-modal.tsx`, `conceptos-modal.tsx`)

- No tiene enlace en ningún lugar.
- Su título dice "Resumen Financiero" (406-408): choca con 2.8.
- **Selector de año.** Mezcla años fijos (2025/2024/2023) con los que tienen datos (422) y usa `pushState` a mano (414-419).
- **Color de datos.** Bandas verde, roja y azul/naranja (540, 710, 866-868). Verde contra rojo para ingresos/egresos es justo lo que `docs/fluent-teams-design-analysis.md` §6 prohíbe. Las tarjetas también llevan bordes de color (446-525).
- **Interacción muerta.** Los grupos de egresos se "expanden", pero las opciones siempre llegan vacías (771-783; `M/_actions/reports.ts:57-62`).
- Las filas abren un modal con `tr onClick` (806): no funciona con teclado.
- `hover:bg-gray-150` no existe (768). `conceptos-modal.tsx` es código muerto: no se importa en ningún lado.
- El error ocupa la pantalla completa con `min-h-screen` (368).

### 2.10 Cartera de cuotas ordinarias y extraordinarias · `/reporte-cuotas`, `/reporte-cuotas-extraordinaria`

Archivos: `reporte-cuotas-view.tsx`, `reporte-cuotas-extraordinaria-view.tsx`, `P/_reportes/report-chrome.tsx`, `P/_reportes/financial-cards.tsx`.

- **Propósito:** cartera de **todas** las unidades del condominio (`Q/reports.queries.ts:53`), separando propietario (P) y comercio (C), por año y por mes.

**Problemas**
- **Nombre triple** (ver 1.5).
- **Tabla gigante:**
  - hasta 49 columnas con 3 años: 1 + 2 + 9 + 1 + 36 (383-421);
  - cada celda lleva **2 mini tarjetas P/C** (`financial-cards.tsx:84-107`);
  - las etiquetas miden 8 px (92, 102) y los meses 9 px (414);
  - la cabecera va en MAYÚSCULAS con `tracking-widest` (383).
- El KPI "Ciclo Fiscal" lleva un chip cian `#0e7490` con un ícono de mapa (MapPin) que no tiene relación (336). La leyenda son 5 pastillas (339-345).
- **"Filtros" sin filtros.** La banda olivo de filtros (`report-chrome.tsx:129-147`) solo contiene "Registros por página" (349-366). No se puede buscar una unidad ni filtrar las que tienen adeudo.
- **Paginador** (`C/ui/paginator.tsx`):
  - pinta **todos** los números de página (32-33);
  - va en MAYÚSCULAS de 10 px con píldoras café `#5a4838` (41-91).
- **`WideTableSection`** (`report-chrome.tsx:171`):
  - sus márgenes negativos no coinciden con el padding del shell (`lg:-mx-10` = 40 px frente a `lg:p-8` = 32 px), lo que probablemente desborda 8 px por lado;
  - inyecta CSS con `!important` (175-189);
  - crea un scroll anidado de `max-h-[75vh]` (190).
- **Totales engañosos.** "TOTALES" suma solo la página actual (257-303, 603) y la UI no lo dice.
- Las dos pantallas son copias: cabría una sola con un segmentado.

### 2.11 Reporte general · `/reporte-general` (`reporte-general-view.tsx`)

- No tiene enlace.
- Muestra el saldo por área de todo el condominio con "Información confidencial" en rojo (126) y un botón rojo "Exportar PDF" (131).
- Lleva un chip en cada fila (278) y usa `alert()` (98).
- Mostrarla o no es una decisión de negocio (ver §8).

### 2.12 Comunicados · `/comunicados` (`comunicados-view.tsx`)

**Problemas**
- **Filtros muertos.** `tipo_fijo` siempre vale 3 (`Q/communications.queries.ts:29`), así que "Propietarios (0)" y "Comercios (0)" nunca muestran nada (vista 100-137).
- Los botones de filtro llevan degradado y el activo crece con `scale-105` (92-133): el layout salta.
- **Avisos enormes.** Cada aviso es una tarjeta con cabecera degradada, chip de color y la pastilla "Dirigido a" (149-200), con la descripción completa a `text-lg` (231-237). La página queda larguísima, sin búsqueda, sin agrupar por fecha y sin marca de leído/no leído.
- Hay un botón "compartir" sin acción y sin nombre accesible (257-261).
- Los vencidos van en escala de grises con la clase `watermark-expired`, que ya no existe (151).
- El visor de imagen tiene fondo negro sólido (305) y su botón de cerrar no tiene nombre (309-314).
- Usa `key={index}` (150) y doble padding con `min-h-screen bg-canvas p-6` (61).
- **Error silencioso.** Si la consulta falla, la pantalla dice "No hay comunicados" (`page.tsx:12-16`).

### 2.13 Notificaciones · `/notificaciones` (`notificaciones-view.tsx`)

- No tiene enlace y muestra los mismos datos que Comunicados.
- Se titula "Notificaciones de Hoy" pero no filtra por fecha (110-115).
- El tipo siempre es "info", así que todo sale azul (`Q/communications.queries.ts:81`; vista 61-88).
- `leida: false` está fijo (82).
- Los errores solo se escriben en consola (36-38).
- "Cargar más" no anuncia a lectores de pantalla los nuevos resultados.

### 2.14 Experiencias · `/experiencias` (`experiencias-view.tsx`, `loading.tsx`, `page.tsx`)

- Es un carrusel Embla con los avisos que tienen imagen o PDF.
- **Problemas:**
  - banda dorada degradada (151);
  - las tarjetas tienen `cursor-pointer` pero no hacen nada al tocarlas (214);
  - título y descripción solo aparecen con hover (261): en celular no se ven;
  - los avisos que solo tienen PDF muestran "Próximamente" y no hay forma de abrir el PDF (246-256);
  - se rellena con tarjetas vacías ("Sin experiencias adicionales") hasta llegar a 3 (77-90, 217-231);
  - el autoplay de 4 s no tiene pausa ni respeta el modo de movimiento reducido (95-100, 117-118);
  - la categoría siempre dice "Todos" (31-43);
  - el mensaje de error promete un "contenido de ejemplo" que no existe (`page.tsx:28`).

### 2.15 Solicitudes · `/tickets` (`tickets-view.tsx`)

- **Propósito:** dar de alta tickets por departamento y seguirlos: respuesta de la administración y respuesta del condómino.

**Problemas**
- La cabecera lleva un chip degradado y el CTA crece con `hover:scale-105` (291-315).
- Las pestañas llevan degradado y no tienen roles (334-357). Al cambiar de pestaña no hay indicador de carga (144-148).
- Usa los verdes de Starbucks `#006241` y `#00754A` en chips y botones de respuesta (403, 473, 571, 577, 602).
- Las pastillas de estado son amarillo y verde (276-280, 418-425).
- **Estado perdido.** "En proceso" se muestra como "Abierto" (`Q/tickets.queries.ts:13-15`).
- **Respuesta que se pierde.** La respuesta del condómino reemplaza la anterior sin avisar (`Q/tickets.queries.ts:155`).
- Usa `alert()` 4 veces (212, 247, 249, 253).
- El alta duplica la de los estados de cuenta (620-735 frente a `create-ticket-modal.tsx`). No se pueden adjuntar archivos.
- Doble padding con `min-h-screen p-6` (291).

### 2.16 Documentos · `/reglamentos` (`reglamentos-view.tsx`)

- La lista en sí es sencilla y funciona.
- **Problemas:**
  - chips azules (30, 59);
  - una tarjeta de cabecera con sombra (28-40) que repite el título;
  - el subtítulo es genérico, "Documento oficial" (64);
  - no hay descripción, fecha, tamaño, vista previa ni búsqueda.

### 2.17 Mi Perfil · `/mi-perfil` (`mi-perfil-view.tsx`, `side-panel.tsx`, `asignaciones-list.tsx`)

**Problemas**
- Todo el perfil vive dentro de una banda olivo (224-389), con un chip dorado de 64 px (229).
- **Toggle "Factura":**
  - es verde, sin `role="switch"` y sin etiqueta asociada (243-262);
  - si falla, el error solo va a la consola (99-104).
- La constancia fiscal se sube con un input invisible encima de una etiqueta (290-325).
- El divisor usa `border-opacity-20`, que no existe (347).
- Los paneles de asignaciones y comercios son inalcanzables (84-85, 392-440).
- No se pueden editar los datos de contacto ni cambiar la contraseña.
- **Error silencioso.** Si la consulta falla, se ve un perfil vacío (`page.tsx:12-18`).

### 2.18 Números de emergencia · `/campos-contacto` (`campos-contacto-view.tsx`)

- **Teléfonos sin enlace.** Son texto plano, sin `tel:` (124-126): en el celular no se puede llamar con un toque.
- Chips en 8 colores (33-52, 111) y una pastilla azul por tipo (120).
- Tres títulos distintos en la misma pantalla (74, 86 y el header).
- **Error peligroso.** Si la consulta falla, la pantalla dice "No hay información de contacto disponible" (`page.tsx:12-19`). En una pantalla de emergencias, una falla no debe verse como si no hubiera números.

### 2.19 Aviso de privacidad · `/aviso-privacidad` (+ `/privacy` y el modal)

- `/aviso-privacidad` muestra el HTML del aviso y su PDF, con un chip ámbar (38) y el título repetido.
- `/privacy` usa banda, spinner y CTA azules (`PU/privacy/privacy-view.tsx:39, 48, 88`).
- El modal (`C/privacy-notice-modal.tsx:52, 161`) tiene cabecera dorada y CTA que crece con `scale`. Hoy nunca se muestra.

### 2.20 Login · `/login` (`PU/login/login-view.tsx`)

**Problemas**
- Fondo casi negro con 3 halos difuminados y un degradado radial (127-134).
- La pastilla "MINISITIO CONDÓMINOS" (146-148) y las etiquetas de 10 px en MAYÚSCULAS con `tracking-widest` (206, 228).
- El CTA es un degradado con el texto "INGRESAR AL MINISITIO" en mayúsculas (301-328).
- **Contraste insuficiente:**
  - textos de ayuda en blanco al 40 %: 3.78:1 (161);
  - pie en blanco al 30 %: 2.63:1 (334);
  - placeholders en blanco al 20 %: 1.80:1.
- El modal "olvidé mi contraseña" duplica la página (340-450) y usa `animate-in`, que no existe (343).
- La foto de Val'Quirico solo aparece en pantallas de 1024 px o más (453).
- Los errores no tienen `aria-live` (183-200).
- La estética oscura es opuesta a la del portal, que es clara.

### 2.21 Olvidé / restablecer contraseña · `/forgot-password`, `/reset-password`

- Es un tercer lenguaje visual:
  - fondo claro con degradado, manchas difuminadas y una retícula que no existe (`bg-grid-slate-100`) (forgot 50-54; reset 133-137);
  - texto con degradado `bg-clip-text` (169; 275);
  - panel derecho en verde azulado `#122420` → `#2d5249`, ajeno a la marca (161; 267);
  - tarjetas que crecen con `hover:scale-105` (178-194; 284-300).
- Los requisitos de la contraseña solo aparecen cuando falla el envío (reset 46-58).
- El logo de respaldo viene de un dominio externo, `encuesta.sistemasabanza.com` (reset 13-16).

### 2.22 Superadmin · `/superadmin-insulae` y la burbuja (`PU/superadmin-insulae/superadmin-view.tsx`, `C/superadmin-bubble.tsx`)

- La página usa degradado oscuro y halos (38-45) y MAYÚSCULAS (60, 74, 95, 139).
- **Burbuja:**
  - fondo `slate-900`, fuera de la paleta, con un contador de color (223-254);
  - panel de 384 px fijos que no cabe en un celular (270);
  - usa `alert()` (156, 160);
  - no cierra con Escape ni tiene roles.
- Es una herramienta interna, así que puede verse distinta, pero debe usar los tokens y ser responsive.

### 2.23 Error, 404 y carga

- **El error borra el shell.** `M/error.tsx` y `M/not-found.tsx` están por encima del layout del portal. Un error en cualquier pantalla hace desaparecer el menú.
- No hay botón "Reintentar": no se usa `reset` (`M/error.tsx:6-11`). La pantalla (`M/error-screen.tsx:10-48`) tiene degradado y CTA dorado.
- Hay 5 `loading.tsx`, todos con un spinner azul centrado.

### 2.24 Estados de carga, vacío y error (matriz)

| Pantalla | Carga | Vacío | Error |
|---|---|---|---|
| Bienvenida | spinner genérico de `P/loading.tsx` | sí (comunicados y contactos) | **silencioso** |
| Panel de Control | spinner azul a pantalla completa | no (muestra ceros) | **silencioso, ceros** |
| Propiedades / Comercios | spinner genérico | sí (botón que recarga) | la consulta no está protegida, cae a `M/error.tsx` (sin shell) |
| Detalle propiedad / comercio | genérico | "no encontrada" | tarjeta genérica |
| Estados de cuenta | genérico | **no** (la sección desaparece) | tarjeta o modal, distintos entre sí |
| Resumen financiero | genérico | no | tarjeta con reintento (reemplaza la pantalla) |
| Estado de resultados | skeleton (`C/skeleton-loaders.tsx`) | no | reintento por sección |
| Reportes de cuotas | skeleton pergamino | no | reintento |
| Comunicados | spinner propio | sí | **silencioso** |
| Notificaciones | spinner | sí | **solo consola** |
| Experiencias | banda dorada con spinner | sí, más relleno | sí |
| Solicitudes | genérico | sí | banner |
| Documentos / Aviso | genérico | sí | caja roja |
| Mi Perfil | genérico | no | **silencioso** |
| Emergencias | genérico | sí | **silencioso (peligroso)** |

---

## 3. Patrones de "look de IA" que hay que quitar

| Patrón | Ocurrencias | Archivos |
|---|---|---|
| Degradados (`bg-gradient-*`, `radial-gradient`, `bg-clip-text`) | **62 líneas**; 28 son "degradados" de un solo color `from-[#cba258] to-[#cba258]` | 15 |
| MAYÚSCULAS + tracking (`uppercase` con `tracking-wide/wider/widest/[0.1em]`) | **144 líneas** (174 `uppercase` en total, 26 `tracking-widest`), más 17 textos escritos en mayúsculas | 21 |
| Pastillas de color (`rounded-full` + `px-*` + texto de 12 px o menos) | **32 líneas literales**, más componentes que las generan (StatusBadge ×7, LegendPill ×10, AreaStatusBadge ×2) y 6 mapas de color | 16 + 7 |
| Bandas de cabecera saturadas | **22 saturadas** + 16 grises | 16 + 8 |
| Chips de ícono redondeados | **50** (7 repetidos en cada fila) | 18, más `stat-card.tsx` |

### 3.1 Degradados (62)

- `PU/reset-password/reset-password-view.tsx`: 82, 94, 113, 133, 155, 238, 267, 270, 275, 286, 300
- `PU/forgot-password/forgot-password-view.tsx`: 50, 72, 132, 161, 164, 169, 180, 194
- `P/comunicados/comunicados-view.tsx`: 67, 92, 104, 117, 130, 155, 270, 291
- `PU/login/login-view.tsx`: 127, 133, 301, 351, 429, 462, 463
- `P/tickets/tickets-view.tsx`: 296, 310, 340, 351, 378, 622, 724
- `P/experiencias/experiencias-view.tsx`: 125, 151, 219, 247, 261 · `P/experiencias/loading.tsx`: 8
- `PU/superadmin-insulae/superadmin-view.tsx`: 38, 45, 139
- `P/welcome-panel.tsx`: 226, 524, 725
- `C/privacy-notice-modal.tsx`: 52, 161 · `M/error-screen.tsx`: 11, 35
- `P/_components/estado-cuenta/create-ticket-modal.tsx`: 91, 158
- `P/propiedades/[id]/estado-cuenta/estado-cuenta-propiedad-view.tsx`: 361 · `P/arrendamientos/[id]/estado-cuenta/estado-cuenta-arrendamiento-view.tsx`: 353 · `P/propiedades/[id]/image-gallery.tsx`: 102

Excepción aceptable: los velos de legibilidad sobre foto (image-gallery:102, experiencias:261, login:462-463). Pueden quedarse como un velo plano.

### 3.2 MAYÚSCULAS + tracking (144 líneas)

- `estado-cuenta-arrendamiento-view.tsx` (30): 121, 126, 130, 134, 138, 142, 146, 158, 164, 167, 170, 202, 207, 213, 227, 235, 238, 241, 244, 247, 250, 253, 256, 259, 262, 265, 322, 384, 393, 405
- `estado-cuenta-propiedad-view.tsx` (26): 122, 127, 132, 139, 151, 156, 162, 168, 178, 192, 198, 201, 204, 207, 210, 213, 216, 219, 222, 225, 228, 290, 296, 299, 302, 330
- `arrendamientos-table.tsx` (12): 52-85 · `propiedades-table.tsx` (11): 146-176
- `welcome-panel.tsx` (9): 239, 242, 262, 304, 321, 350, 378, 405, 583
- `reporte-general-view.tsx` (8): 122, 152, 165, 251, 254, 257, 263, 345
- `estado-resultado-view.tsx` (7): 406, 578, 581, 587, 748, 751, 757
- `login-view.tsx` (6): 146, 206, 228, 398, 429, 467
- `report-chrome.tsx` (5): 68, 98, 142, 154, 199
- `conceptos-modal.tsx` (4): 169, 172, 175, 181
- 3 cada uno: `C/ui/paginator.tsx` (41, 59, 88), `superadmin-view.tsx` (74, 95, 139), `compact-financial-table.tsx` (60, 70, 98), `reporte-cuotas-view.tsx` (225, 383, 602), `egresos-modal.tsx` (176, 179, 185), `reglamentos-tab.tsx` (29, 33, 75)
- 2 cada uno: shell (532, 589), `reporte-cuotas-extraordinaria-view.tsx` (438, 475), `arrendamientos-view.tsx` (245, 301)
- 1 cada uno: `tickets-view.tsx` (465), `financial-cards.tsx` (122)
- **Textos escritos en mayúsculas:**
  - `propiedad-detalle-view.tsx`: 164, 179, 199;
  - `reporte-cuotas-view.tsx`: 385, 407, 603 (y sus equivalentes en `-extraordinaria`: 440, 453, 476);
  - "MINISITIO CONDÓMINOS": shell:533, login:147;
  - "INGRESAR AL MINISITIO" e "INGRESANDO…": login:324-327;
  - "ENVIAR ENLACE" y "ENVIANDO…": login:432-434;
  - "INSULAE": forgot:70, reset:153.
- Mayúsculas con `tracking-tighter` fuera del conteo anterior: `resumen-financiero-view.tsx:434`, `report-chrome.tsx:34`.

### 3.3 Pastillas de color

- **Líneas literales (32):**
  - welcome-panel (11): 239, 242, 321, 350, 378, 405, 444, 467, 490, 513, 583
  - paginator: 59, 88 · shell: 462, 532 · login: 146, 467
  - reporte-cuotas: 225, 316 · propiedades-view: 391, 448 · comunicados: 170, 194
  - superadmin-bubble: 249 · status-badge: 23 · tickets: 419 · resumen-financiero: 435
  - reporte-cuotas-extraordinaria: 372 · notificaciones: 178 · reglamentos-tab: 58 · report-chrome: 122 · financial-cards: 122
- **Componentes y mapas que generan pastillas:**
  - `C/status-badge.tsx:2-27`;
  - `report-chrome.tsx:105-126` (LegendPill);
  - `financial-cards.tsx:111-131` (AreaStatusBadge, una por fila);
  - `propiedades-view.tsx:106-127`; `arrendamientos-table.tsx:29-37`;
  - `tickets-view.tsx:276-280`; `notificaciones-view.tsx:61-88`;
  - `campos-contacto-view.tsx:34-52` (8 colores).

### 3.4 Bandas de cabecera

- **Saturadas (22):**
  - welcome-panel: 226, 524, 725
  - bandas olivo sólidas que contienen datos: dashboard:171, propiedades-view:160, arrendamientos-view:113, mi-perfil:224
  - doradas: experiencias:125, 151; experiencias/loading:8
  - cabeceras doradas de modal: tickets:622, create-ticket-modal:91, privacy-notice-modal:52
  - login:351
  - send-email-modal: 101 (olivo), 114 (azul)
  - report-chrome:140
  - estado-resultado: 540 (verde), 710 (rojo), 866-868 (azul/naranja)
  - superadmin-bubble:273 · privacy-view:48 (azul)
- **Grises (16):** estado-cuenta-propiedad 121, 150, 191, 289, 329; estado-cuenta-arrendamiento 120, 157, 201, 226, 321; reglamentos-tab 28; reporte-general 119; propiedad-detalle 150; image-gallery 76; estado-resultado 403; arrendamientos-view 228.

### 3.5 Chips de ícono (50)

- welcome-panel (12): 318, 347, 375, 402, 432, 455, 478, 501, 527, 550, 727, 742
- propiedades-view (6): 184, 210, 238, 261, 503, 522
- dashboard (6): 205, 224, 244, 263, 305, 390
- experiencias (5): 128, 154, 192, 221, 249; experiencias/loading: 11
- arrendamientos-view (3): 124, 148, 161
- 2 cada uno: superadmin-bubble (230, **441**), tickets (296, **401**), reglamentos-view (30, **59**), notificaciones (106, 220), comunicados (67, **158**)
- 1 cada uno: error-screen:13, mi-perfil:229, campos-contacto:**111**, aviso-privacidad:38, report-chrome:72, reporte-general:**278**, reglamentos-tab:**116**
- Además, `src/components/ui/stat-card.tsx:63` (chips cian, lima, ámbar y esmeralda; 6 usos en resumen financiero).

En **negrita**, los que se repiten en cada fila.

### 3.6 Otros síntomas del mismo problema

- **59 hexadecimales sueltos.** Los principales:
  - `#cba258` ×79 y `#bca065` ×28: no son tokens (el token es `--color-gold: #b58c42`);
  - verdes de Starbucks `#006241`, `#00754A`, `#1E3932`;
  - verde azulado `#122420` y `#2d5249`;
  - cian `#0e7490`;
  - rosa `#8f1a3d`, `#fdf6fa` y `#f5e0eb`.
- **825 clases `gray-*` crudas** (541 de texto, 156 de fondo, 128 de borde) y **501 de tonos crudos** (rojo 178, azul 122, verde 112, otros 89). En cambio, los tokens Fluent de `CSS:39-53` se usan unas 10 veces (`text-fg` ×8, `border-stroke` ×1, `rounded-panel` ×1).
- **Formas y sombras.** `rounded-xl/2xl` ×156 y `shadow-lg/xl/2xl` ×75. La regla Fluent del repo pide radio máximo de 8 px y ninguna sombra en reposo.
- **Escalado en hover.** `hover:scale-*` ×18 y `hover:-translate-y` ×4.
- **Emojis como íconos:** 11 (ver 2.4 y 2.7, y `conceptos-modal.tsx:150`).
- **Rail.** Las marcas de agua y los grupos en "pozos" hundidos (shell:562-586) son decoración. Las etiquetas de grupo van en MAYÚSCULAS (589).

---

## 4. Motion actual

### 4.1 Inventario

| Recurso | Usos |
|---|---|
| `transition-colors` / `transition-all` / `transition-transform` / `transition-opacity` / `transition-shadow` / `transition-[…]` / `transition-standard` | 138 / 67 / 17 / 4 / 2 / 3 / 12 |
| Duraciones | 200 ms ×86 · 150 ms ×15 · 300 ms ×15 · 500 ms ×6 · 260 ms ×4 |
| Curvas | `ease-smooth` ×4 (solo el rail) · `ease-in-out` ×2 · el resto, la curva por defecto |
| `animate-spin` / `animate-pulse` | 33 (spinners hechos a mano, casi todos azules) / 13 |
| `hover:scale` / `active:scale` / `hover:-translate-y` / `group-hover:translate-x` | 18 / 14 / 4 / 5 |
| framer-motion · `prefers-reduced-motion` · `ViewTransition` · `useLinkStatus` | **0 · 0 · 0 · 0** |
| Clases que no existen (`animate-in`, `fade-in`, `animate-fade-in`, `zoom-in`) | 8 líneas: resumen-financiero:428; reporte-cuotas:114, 306; extraordinaria:361; create-ticket-modal:65, 74; login:343; tooltip:55 |

### 4.2 Lo que sí anima

- **Rail.** El ancho y el desplazamiento animan en 260 ms con `cubic-bezier(0.32,0.72,0,1)` (shell:503), igual que el alto del logo (511-512), el padding del menú (551) y el `padding-left` del contenido (676-677).
- **Cajón móvil.** Se desliza (503-505), pero el fondo oscuro aparece sin transición (492-497).
- **Submenú.** Usa el truco de `grid-template-rows` de 0fr a 1fr en 260 ms (`CSS:212-227`), y el chevron rota en 200 ms. **Probablemente no se ven:** `NavItem`, `SubNavItem` y `ActiveMark` se definen dentro del render (shell:351-487), así que cada cambio de estado del shell los remonta ya abiertos.
- **Panel lateral de Mi Perfil.** Se desliza en 300 ms (`side-panel.tsx:68-77`), pero nada lo abre.
- **Hover.** Cambios de color, zoom de imágenes de 500 ms y escalados de botones y tarjetas.
- **Carrusel de Experiencias.** Autoplay cada 4,000 ms (95-100).
- **Paginación de reportes.** Desplazamiento suave al inicio de la página (reporte-cuotas:196).

### 4.3 Lo que falta

- **Transiciones de ruta.** No hay ninguna. `loading.tsx` cambia el contenido por un spinner azul.
- **Feedback de navegación.** `setLoadingPath` es estado muerto (shell:126, 168-172): no hay indicador en el ítem que se pulsó.
- **Indicador del ítem activo.** Salta de un ítem a otro. En el admin se desliza con `layoutId`.
- **Superposiciones.** Ninguna anima al abrir ni al cerrar: panel de comunicado, alta de ticket, correo, privacidad, error, visores de imagen, modal de "olvidé", menú del rail contraído, tooltips y panel del superadmin.
- **Feedback.** El "toast" de tickets depende de una animación que no existe, y hay 16 `alert()` nativos.
- **Pestañas y segmentados.** Cambian de golpe, sin un indicador que se desplace (tickets, estado de cuenta, resumen financiero).
- **Acordeones de tickets y "Cargar más".** El contenido aparece sin transición de alto ni de entrada.
- **Movimiento reducido.** No se respeta en ningún lugar, tampoco en el carrusel.

### 4.4 Referencias reales en el repo y en Next 16

- **`src/components/layout/app-sidebar.tsx`:**
  - `EASE_SMOOTH = [0.32, 0.72, 0, 1]` (189);
  - indicador activo compartido con `layoutId` y resorte `stiffness 480, damping 38, mass 0.7` (192, 255-260);
  - etiquetas de 180 ms con 60 ms de retardo (272);
  - submenú: alto en 260 ms y opacidad en 160 ms, con escalonado de 30 + 25 ms por hijo (400-413);
  - `useReducedMotion` en todas las animaciones.
- **Next 16.2.1 (instalado):**
  - exporta `useLinkStatus` desde `next/link` (`node_modules/next/dist/client/app-dir/link.d.ts:200`);
  - acepta `experimental.viewTransition` (`node_modules/next/dist/server/config-shared.d.ts:676`);
  - el React que trae exporta `ViewTransition` (`node_modules/next/dist/compiled/react/cjs/react.production.js`).
- **No conviene portar** `src/components/global-loader.tsx`: es una capa a pantalla completa que bloquea la interfaz y usa MAYÚSCULAS.

---

## 5. Responsive y accesibilidad

### 5.1 El shell en celular

- **Cajón:**
  - se abre con un botón de hamburguesa **sin `aria-label`** (shell:685-690);
  - se cierra al tocar el fondo o al cambiar de ruta (162-165);
  - no cierra con Escape, no atrapa el foco, no bloquea el scroll y no marca el resto como `inert`.
  - Bien resuelto: dentro del cajón el rail siempre se muestra abierto (346).
- **Header:**
  - es `flex justify-between` con dos hijos, así que el **título queda alineado a la derecha** (683);
  - el título va a `text-2xl` dentro de 64 px fijos y los breadcrumbs no se envuelven (694-722). Los títulos largos ("Estado de Cuenta: …", "Reporte de Cuotas Extraordinarias") se desbordan.
- **Doble padding.** Las pantallas suman su padding al del shell (`p-4`):
  - comunicados (61) y tickets (291): `p-6` → 40 px por lado, unos 295 px útiles en un celular de 375 px;
  - estados de cuenta (117, 380) y campos de contacto (70): `px-4` → 32 px por lado;
  - detalle de propiedad: `p-6` (97).
- **`min-h-screen` dentro del portal** en 11 lugares: genera scroll vacío.
- **`main` sin ancho máximo** (730-731): en monitores anchos el texto se estira de lado a lado.
- **Objetivos táctiles por debajo de 44 px:** filas del menú de 36 px (`h-9`), acciones de tabla y paginador de 32 px, botones de cerrar de 24 a 32 px.

### 5.2 Pantallas pesadas

| Pantalla | Columnas | Ancho mínimo | Alternativa en celular |
|---|---|---|---|
| Mis Propiedades (tabla) | 11 | `w-full` + `nowrap`, scroll en `max-h-[calc(100vh-300px)]` | Vista "Tarjetas", que no es la predeterminada ni se recuerda |
| Mis Comercios (tabla) | 12 | ídem | Tarjetas |
| Estado de cuenta de propiedad | 11 | `min-w-full` + `whitespace-nowrap` | ninguna |
| Estado de cuenta de comercio | 11 | `min-w-[900px]` | ninguna |
| Resumen financiero | 40 por tabla × 4-5 tablas | `min-w-480` = 1,920 px | ninguna |
| Estado de resultados | 14 | `min-w-full` | ninguna |
| Cartera de cuotas | hasta 49, con 2 mini tarjetas por celda | `min-w-max`, columnas de 110-290 px (unos 7,000 px) | ninguna; además hay scroll anidado de 75vh |
| Reporte general | 15 | `min-w-full` | ninguna |

También: el panel del superadmin mide 384 px fijos más 24 px de margen y no cabe por debajo de 408 px de ancho (`superadmin-bubble.tsx:270`). `WideTableSection` probablemente desborda en pantallas de 1024 px o más (ver 2.10).

### 5.3 Accesibilidad

**Teclado y foco**
- El grupo de reportes es un `div` con `onClick`, tanto abierto como contraído (shell:395-396, 410-411): no hay forma de abrirlo con teclado.
- Los enlaces del submenú cerrado se pueden tabular aunque están invisibles (`CSS:212-227`: le falta `visibility: hidden` o `inert`).
- Los ítems del menú se remontan en cada render (351-487): **se pierde el foco** al navegar.
- Hay 0 `focus-visible`, 109 `focus:` (casi todos anillos en inputs) y 25 `outline-none`.
- El anillo de foco `#cba258` sobre blanco tiene 2.37:1; WCAG 1.4.11 pide 3:1.
- **Elementos clicables que no son botones:**
  - tarjetas de comunicado (welcome:564-568);
  - miniaturas de la galería (86-90);
  - filas de estado de resultados (806);
  - tarjetas de Experiencias (214), que además no hacen nada.

**Nombres y roles**
- En el rail contraído, los enlaces, "Mi Perfil" y "Cerrar Sesión" **se quedan sin nombre accesible**: el texto no se renderiza y el tooltip solo aparece con mouse (shell:458-460, 654, 668; `tooltip.tsx:50`).
- Hay 0 `role="dialog"`, `aria-modal` o `aria-labelledby`. Ningún modal atrapa el foco ni lo devuelve al cerrar. Solo cierran con Escape el modal del login (106-121), el panel lateral del perfil y la galería (esta, solo si tiene el foco).
- **Pestañas y segmentados sin roles:** tickets 334-357, estado de cuenta de comercio 389-413, resumen financiero 444-475.
- El switch de Factura no tiene rol ni etiqueta (mi-perfil:249-261).
- **Botones de solo ícono sin nombre:** hamburguesa; "compartir" de comunicados (257-261); cerrar del visor (309-314); cerrar, anterior y siguiente de la galería (121-169); cerrar del alta de ticket (create-ticket-modal:92-99). Las acciones de las tablas solo tienen `title`.
- No hay enlace para saltar al contenido.
- **Jerarquía de títulos invertida:** el header usa `<h2>` (722) y la página añade un `<h1>` que suele repetir el mismo texto.
- No hay `aria-live` para errores, éxitos ni resultados.

**Contraste (calculado)**

| Uso | Ratio |
|---|---|
| Texto blanco sobre `#cba258` (CTA principales) | **2.37:1** ✗ |
| Badge del menú, blanco sobre `#b58c42` (shell:462) | 3.09:1 ✗ |
| `text-nav-ink-faint` usado para el tipo de usuario (shell:620) | 2.81 a 2.97:1 ✗ (el propio token dice "solo decorativo", CSS:73) |
| Login: blanco al 40 %, al 30 % y placeholder al 20 % | 3.78 · 2.63 · 1.80 ✗ |
| Chip del Panel: `gray-700` sobre dorado · ícono dorado sobre dorado | 3.33 ✗ · 1.00 ✗ |
| Etiquetas P/C de 8 px apagadas (financial-cards) | 2.49:1 ✗ |
| Referencias válidas: olivo `#5d5b35` con blanco · terracota `#922f12` con blanco · `#616161` sobre blanco | 6.97 · 7.96 · 6.19 ✓ |

**Tamaño, color, tiempo y movimiento**
- Hay textos de 8 px (financial-cards:92, 102, 122), 9 px (pastillas de welcome, leyendas y meses de reportes) y muchos de 10 px en mayúsculas.
- Hay significado que solo depende del color: montos rojo/verde, bandas de ingresos y egresos, chip de tipo de ticket (403).
- El carrusel avanza solo y no tiene pausa (WCAG 2.2.2).
- La sesión se cierra tras 30 minutos de inactividad sin aviso previo (`C/use-inactivity-logout.ts:7, 30-34`; WCAG 2.2.1): quien está escribiendo un ticket largo pierde el texto.
- Bien resuelto: `lang="es"` (`ROOT:31`). Mal: hay fechas en `es-ES` (welcome:168, 178; tickets:77, 186).

---

## 6. Propuesta de IA al estilo Slack

### 6.1 Qué tomamos de Slack (resumen con fuentes)

- **Secciones reordenables y personalizables.** La barra lateral de Slack se organiza en secciones que se reordenan arrastrando. Cada sección filtra y ordena sus conversaciones y puede llevar un emoji. La barra se puede redimensionar o reducir a solo íconos. Las pestañas de navegación (Inicio, Actividad, Pendientes) se pueden ocultar y pasan a "Más". Fuentes: [Ajustar las preferencias de la barra lateral](https://slack.com/intl/en-gb/help/articles/212596808-Adjust-your-sidebar-preferences) y [Organizar la barra lateral con secciones personalizadas](https://slack.com/help/articles/360043207674-Organize-your-sidebar-with-custom-sections).
- **Atajos de teclado.** Ctrl K abre el selector rápido. Alt/Option+Shift+↑/↓ salta a la conversación sin leer anterior o siguiente. Alt/Option+clic contrae o expande todas las secciones. F6 y Shift+F6 cambian de región. Fuente: [Atajos de teclado de Slack](https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts).
- **Lector de pantalla.** Con ↑/↓ se recorren canales y secciones, y se anuncia si tienen mensajes sin leer. Con ←/→ sobre el encabezado de una sección, esta se contrae o expande. Enter abre el elemento. Fuente: [Usar Slack con lector de pantalla](https://slack.com/help/articles/360000411963-Use-Slack-with-a-screen-reader).
- **Adaptación al portal:**
  - las unidades del condómino (AP, FAP, comercios) se vuelven "canales" dentro de su sección, con un punto de aviso;
  - los detalles (un aviso, un ticket, un movimiento) se abren en un **panel a la derecha**, como un hilo de Slack, con su propia URL. Así no se pierde la lista.

### 6.2 Estructura propuesta

```
[Logo VQ] Val'Quirico · Portal del condómino      [Avatar ▾]  → Mi perfil · Datos fiscales · Aviso de privacidad · Cerrar sesión
[ Buscar o ir a…                        Ctrl K ]

  Inicio
  Avisos                                   (3)
  Solicitudes                              (1)

▾ Finanzas
    Mis saldos                              ●
    Estados de cuenta                         (panel para elegir la unidad)

▾ Mis propiedades                          ●2
    AP Casa 12 · San Juan                   ●   → pestañas: Resumen · Estado de cuenta · Galería
    FAP Terraza 12-A
    Ver todas (6)

▾ Mis comercios
    La Trattoria                            ●   → pestañas: Resumen · Estado de cuenta · Reglamento
    Ver todos

▾ Reportes del condominio                    (solo dueños)
    Resumen financiero
    Estado de resultados
    Cartera de cuotas                          (segmentado: Ordinarias · Extraordinarias)
    Reporte general                            (pendiente de decisión)

▾ Comunidad
    Experiencias                            •
    Documentos del condominio
    Mapa de Val'Quirico ↗

▾ Ayuda
    Teléfonos de emergencia
    Nueva solicitud
```

**En celular:** barra inferior con Inicio · Avisos · Solicitudes · Menú. "Menú" abre el sidebar completo como hoja, con "Teléfonos de emergencia" fijo arriba y botones "Llamar" con `tel:`.

### 6.3 Mapeo de rutas (todas siguen alcanzables)

| Zona / sección | Ítem (etiqueta nueva) | Rutas que cubre | Visible para | Badge (¿existe el dato?) |
|---|---|---|---|---|
| Cabecera | Menú de cuenta | `/mi-perfil`, `/aviso-privacidad`, `/logout` | todos | Punto si `requiereFactura` es verdadero y falta la constancia (**sí**, en el perfil) |
| Cabecera | Buscar o ir a… (Ctrl/⌘ K) | pantallas, unidades, avisos, documentos, teléfonos | todos | — |
| Fijos | Inicio | `/minisitio` | todos | — |
| Fijos | Avisos | `/comunicados` (+ `/notificaciones` como vista "Historial") | todos | Avisos nuevos desde la última visita (**no**: hace falta guardar la lectura; hoy `leida: false` está fijo) |
| Fijos | Solicitudes | `/tickets` (alta con `?nueva=1`) | todos | Abiertas: OPEN + IN_PROGRESS (**sí**). Respuesta nueva (**no**, hace falta guardar la lectura) |
| Finanzas | Mis saldos | `/dashboard` | con propiedades o comercios | Punto terracota si `saldoVencido > 0` (**sí**, en `Q/dashboard.queries.ts:76-81`) |
| Finanzas | Estados de cuenta | `/propiedades/[id]/estado-cuenta`, `/arrendamientos/[id]/estado-cuenta` | ídem | — |
| Mis propiedades | Cada AP o FAP, más "Ver todas" | `/propiedades/[id]`, `/propiedades/[id]/estado-cuenta`, `/propiedades` | `propietario`/`both` con propiedades | Punto por unidad con `saldo_vencido > 0` y conteo en el encabezado de la sección contraída (**sí**) |
| Mis comercios | Cada comercio, más "Ver todos" | `/arrendamientos/[id]`, `/arrendamientos/[id]/estado-cuenta`, `/arrendamientos` | `arrendatario`/`both` con comercios | Ídem (**sí**, `saldo_vencido` por comercio) |
| Reportes del condominio | Resumen financiero | `/resumen-financiero` | dueños (alinear la validación del servidor) | — |
| | Estado de resultados | `/estado-resultado` | dueños | — |
| | Cartera de cuotas | `/reporte-cuotas` · `/reporte-cuotas-extraordinaria` | dueños | — |
| | Reporte general | `/reporte-general` | dueños, si se aprueba | — |
| Comunidad | Experiencias | `/experiencias` | todos | "Nuevo" si hay una vigente publicada en los últimos 7 días (**sí**, `sentAt`/`validUntil`) |
| | Documentos del condominio | `/reglamentos` | todos | (hace falta la fecha de publicación) |
| | Mapa de Val'Quirico ↗ | enlace externo | todos | — |
| Ayuda | Teléfonos de emergencia | `/campos-contacto` | todos | — |
| Puertas y públicas | — | `/privacy`, `/login`, `/forgot-password`, `/reset-password`, `/superadmin-insulae`, `/archivos/descarga` | — | — |

**Badges con datos frescos.** Conviene calcularlos en el servidor con una consulta nueva (por ejemplo `Q/sidebar.queries.ts`) llamada desde `P/layout.tsx`. El layout no se vuelve a ejecutar en las navegaciones internas (lo advierte su propio comentario, líneas 10-12). Por eso hay que llamar a `router.refresh()` después de cada mutación (crear un ticket, subir la constancia) y opcionalmente refrescar al volver el foco a la ventana.

### 6.4 Renombres

| Hoy | Propuesta |
|---|---|
| Bienvenida | Inicio |
| Panel de Control / Dashboard | Mis saldos |
| Mis Comercios / Arrendamientos / Comercios | Mis comercios (un solo nombre en todo el portal) |
| Reportes Condominales | Reportes del condominio |
| Reporte de Cuotas Ordinarias / Extraordinarias / Estado de Cartera… | Cartera de cuotas (Ordinarias · Extraordinarias) |
| Comunicados / Notificaciones / Avisos y Comunicados | Avisos (usar el mismo término que publica la administración) |
| Solicitudes y reportes | Solicitudes |
| Documentos Condominales / Reglamentos y Normas | Documentos del condominio |
| Números de Emergencia / Información de Contacto / Teléfonos y Emergencia | Teléfonos de emergencia |
| Mostrar el Mapa | Mapa de Val'Quirico ↗ |
| Experiencias Val'Quirico | Experiencias |

**Comportamientos**
- Las secciones se contraen y se recuerda su estado (en `localStorage`; no en `sessionStorage`).
- La sección que contiene la página activa se abre sola.
- Con ↑/↓ y ←/→ se navega dentro del rail, con F6 se cambia de región y con Alt+clic se contraen todas las secciones.
- El ítem actual lleva `aria-current="page"`.
- Los ítems con novedades van en negrita.
- Los badges numéricos se reservan para lo que pide acción.

### 6.5 Lenguaje visual (valores con contraste calculado)

| Token | Opción A "Pergamino" (igual al admin) | Opción B "Olivo de noche" (más cercana a Slack) |
|---|---|---|
| Fondo del rail | `#f6f4ec` | `#3d3c22` (`--color-brand-deep`) |
| Ítem leído | `rgb(61 60 34 / .92)`, 7.17:1 | `#c2c0b3` (pergamino al 72 %), 6.15:1 |
| Ítem con novedades (600) | `#3d3c22` | `#f6f4ec`, 10.21:1 |
| Encabezado de sección (12 px, 600, minúsculas normales) | `rgb(61 60 34 / .78)`, 4.95:1 | `#acaa9b` (60 %), 4.81:1 |
| Hover | `#dcd8c6` | `#4c4b32` (pergamino al 8 %); texto a 8.08:1 |
| Ítem activo | blanco + `--shadow-nav-item` + marcador dorado de 3 px | `#f6f4ec` con texto `#3d3c22` (10.21:1) + marcador `#b58c42` (3.64:1 como elemento gráfico) |
| Badge crítico (vencido) | `#922f12` con texto blanco, 7.96:1 | `#c4532b` con texto blanco, 4.55:1 |
| Badge informativo | `#e7e4d5` con `#242416`, 12.29:1 | pergamino al 16 % con `#f6f4ec` |
| Texto dorado | `#8d6928` sobre blanco, 5.02:1 | `#d4b06a` sobre el rail, 5.47:1 |

**Superficie de contenido (las dos opciones)**
- Rampa neutra Fluent que ya está en `CSS:39-53`: `#ffffff`, `#fafafa`, `#f5f5f5`, texto `#242424` y `#616161`, bordes `#e0e0e0`.
- Acción primaria: olivo `#5d5b35` con texto blanco (6.97:1). **Nunca `#cba258` con texto blanco.**
- Color de datos: olivo `#8a8619` frente a azul `#2563eb` (doc §6).
- Estados: "vencido" en terracota `#922f12`, "al corriente" en `#107c10` (5.37:1) y "pendiente" en gris.
- Radios de 4, 6 y 8 px (`rounded-ctrl`, `rounded-surface`, `rounded-panel`). Solo los badges de conteo y el avatar son circulares.
- Ninguna sombra en reposo. `shadow-8` para menús flotantes y `shadow-16` para diálogos (`CSS:94-97`).

**Tipografía, densidad y foto**
- Inter con `next/font`, como el admin (`src/app/(admin)/layout.tsx:2, 11`). Hoy `CSS:247` usa la fuente del sistema.
- Escala 12/14/16/20/28, pesos 400 y 600, `tabular-nums` en todos los montos y nunca menos de 12 px.
- Densidad: menú de 36 px en escritorio y 44 px en táctil, filas de lista de unos 56 px, filas de comando de unos 44 px.
- Foto: `/images/fdo1.jpg` (piedra ocre, teja terracota, olivo), solo en el login y con un único velo plano.

**Motion propuesto** (reutiliza los valores reales del admin)

| Elemento | Propuesta |
|---|---|
| Indicador del ítem activo | `layoutId` con resorte 480/38/0.7 |
| Ancho del rail | 260 ms con `--ease-smooth` (ya existe) |
| Abrir/cerrar sección | alto 260 ms + opacidad 160 ms; hijos escalonados 25 ms; chevron 200 ms |
| Etiquetas del rail | 180 ms, 60 ms de retardo |
| Entrada de página (`P/template.tsx` o `ViewTransition`) | opacidad 0→1 + desplazamiento 4 px→0 en 180 ms con `--ease-out-quint`; salida inmediata |
| Panel derecho (hoja) | 24 px→0 + opacidad en 240 ms; salida 180 ms |
| Diálogo | escala .98→1 + opacidad en 200 ms; fondo 150 ms; salida 140 ms |
| Toast | 8 px→0 en 200 ms, se cierra a los 5 s (se pausa con hover); `aria-live="polite"` |
| Cambio de un badge | escala .85→1 con resorte |
| Hover | solo color, 120 ms (en lugar de `transition-all` de 200 ms) |
| Pulsación | escala .98 solo en botones primarios (sin `hover:scale-105`) |
| Navegación | `useLinkStatus` en el ítem pulsado + barra dorada de 2 px; skeletons con la forma real de la pantalla |
| Movimiento reducido | `MotionConfig reducedMotion="user"` + `motion-reduce:` en CSS; carrusel sin autoplay |

Tokens nuevos: van en `@theme` como `--ease-*` y `--animate-*`. Los de espaciado se llaman siempre `--space-N`, **nunca `--spacing-N`**.

---

## 7. Backlog priorizado

### P0: errores visibles, datos falsos y accesibilidad que bloquea

| ID | Trabajo | Archivos |
|---|---|---|
| P0-1 | Sustituir las 41 clases muertas de Tailwind v4: `bg-opacity-*` y `border-opacity-*` por el modificador `/alpha`; quitar `animate-in`, `fade-in`, `animate-fade-in`, `no-scrollbar`, `bg-gray-25`, `hover:bg-gray-150`, `bg-grid-slate-100`, `shadow-soft/medium`, `text-primary-800` y `watermark-expired`. Arregla la galería negra, los botones blancos sobre blanco y el ícono invisible | `P/propiedades/[id]/image-gallery.tsx`, `P/propiedades/propiedades-view.tsx`, `P/dashboard/dashboard-view.tsx`, `P/arrendamientos/arrendamientos-view.tsx`, `C/legacy-card.tsx`, `P/reporte-cuotas*/…-view.tsx`, `P/notificaciones/notificaciones-view.tsx`, `P/comunicados/comunicados-view.tsx`, `P/_components/estado-cuenta/create-ticket-modal.tsx`, `C/tooltip.tsx`, `C/skeleton-loaders.tsx`, `PU/login`, `PU/forgot-password`, `PU/reset-password`, `P/resumen-financiero/*`, `P/mi-perfil/*`, `P/experiencias/experiencias-view.tsx`, `P/estado-resultado/estado-resultado-view.tsx` |
| P0-2 | Datos engañosos y controles muertos: etiqueta de saldo del Panel; usar `cargosTotales` y quitar el 0.0417 en el detalle de propiedad; Área/Zona/saldo/estado del comercio; columna "Estado" y "Estado financiero" de la tabla de comercios; filtros de comunicados; "Notificaciones de Hoy"; KPI duplicado y "BETA"; botón "compartir"; tarjetas de Experiencias que no hacen nada; acordeón de egresos vacío; "TOTALES (página actual)" | `dashboard-view.tsx`, `propiedad-detalle-view.tsx`, `arrendamiento-detalle-view.tsx`, `arrendamientos-table.tsx`, `comunicados-view.tsx`, `Q/communications.queries.ts`, `notificaciones-view.tsx`, `resumen-financiero-view.tsx`, `experiencias-view.tsx`, `estado-resultado-view.tsx`, `reporte-cuotas*-view.tsx` |
| P0-3 | Errores explícitos con "Reintentar" en lugar de ceros o listas vacías silenciosas (Bienvenida, Panel, Comunicados, Notificaciones, Mi Perfil y **Emergencias**). Proteger las consultas de Propiedades y Comercios | `P/page.tsx`, `P/dashboard/page.tsx`, `P/comunicados/page.tsx`, `P/notificaciones/*`, `P/mi-perfil/page.tsx`, `P/campos-contacto/page.tsx`, `P/propiedades/page.tsx`, `P/arrendamientos/page.tsx` |
| P0-4 | Menú operable con teclado: sacar `NavItem`, `SubNavItem` y `ActiveMark` del render; grupos como `<button aria-expanded aria-controls>`; submenú cerrado con `inert` o `visibility:hidden`; `aria-current`; abrir solo el grupo activo; nombres accesibles en el rail contraído; hamburguesa con `aria-label`; cajón con Escape, foco atrapado y scroll bloqueado; menú del rail contraído anclado a su ítem y con Escape; tooltips también con foco | `shell`, `C/collapsed-menu.tsx`, `C/tooltip.tsx`, `CSS:212-227` |
| P0-5 | Contraste: cambiar `#cba258` con texto blanco (79 usos) por olivo `#5d5b35` o por dorado con tinta `#242416`; badge del menú; `nav-ink-faint` en texto; blanco al 30-40 % y placeholders del login | `tickets-view.tsx`, `create-ticket-modal.tsx`, `comunicados-view.tsx`, `experiencias-view.tsx`, `C/privacy-notice-modal.tsx`, estados de cuenta, `M/error-screen.tsx`, `PU/*`, `shell:462, 620` |
| P0-6 | Teléfonos de emergencia que se puedan tocar: `tel:`, `mailto:` y WhatsApp según `tipo_contacto`/`enlace`, con botón "Llamar" | `P/campos-contacto/campos-contacto-view.tsx`, `P/welcome-panel.tsx:639-668` |
| P0-7 | Que un error no borre el shell: `P/error.tsx` con `reset()` y `P/not-found.tsx`; `error-screen` queda solo para las pantallas públicas | nuevos en `P/`; `M/error.tsx`, `M/not-found.tsx`, `M/error-screen.tsx` |
| P0-8 | Desbordes en celular: título del header a la izquierda, truncado y con breadcrumb compacto; quitar el padding y el `min-h-screen` propios de cada pantalla; burbuja superadmin con `w-[min(24rem,calc(100vw-2rem))]`; márgenes de `WideTableSection` iguales al padding del shell; ancho máximo del contenido; placeholder de la galería que sí exista | `shell:681-731`, `comunicados-view.tsx:61`, `tickets-view.tsx:291`, estados de cuenta (117, 380), `propiedad-detalle-view.tsx:97`, `campos-contacto-view.tsx:70`, `C/superadmin-bubble.tsx:270`, `P/_reportes/report-chrome.tsx:171`, `image-gallery.tsx:9` |

### P1: rediseño del núcleo

| ID | Trabajo | Archivos |
|---|---|---|
| P1-1 | Shell nuevo con la IA de §6: secciones que se contraen y se recuerdan, unidades dinámicas, menú de cuenta, renombres y badges con datos que ya existen (solicitudes abiertas, vencido por unidad, perfil fiscal incompleto) | `shell` (dividir en `sidebar/*` + `nav-config.ts`), `P/layout.tsx`, nuevo `Q/sidebar.queries.ts`, `C/session-provider.tsx`, `src/stores/minisitio.store.ts` |
| P1-2 | "Buscar o ir a…" con Ctrl/⌘ K (el mismo patrón de `src/components/ui/search-modal.tsx` y `app-shell.tsx:56`) | nuevo `C/command-palette.tsx`, `shell` |
| P1-3 | Primitivas del minisitio sobre los tokens Fluent y pergamino: PageHeader (un solo título), Surface, Metric, StatusBadge, ActionRow y EmptyState (reutilizar `ui/fluent.tsx`); DataTable responsive (tabla en pantallas medianas, tarjetas en celular); Dialog y Sheet accesibles; Toast que reemplace los 16 `alert()`; Tabs y Segmented con roles; Switch con `role="switch"`; Skeleton; spinner olivo | nuevos en `C/ui/`; retirar `C/legacy-card.tsx`, `C/status-badge.tsx`, `C/loading-spinner.tsx`, `C/view-toggle.tsx`, `C/skeleton-loaders.tsx`, `P/_reportes/*` |
| P1-4 | Sistema de motion de §6.5: `MotionConfig`, `P/template.tsx` o `experimental.viewTransition`, indicador con `layoutId`, hojas, diálogos, toasts, `useLinkStatus`, transiciones solo de color | `CSS` (`--ease-*`, `--animate-*`), `shell`, nuevo `C/motion.ts`, `next.config.ts` (si se usa ViewTransition) |
| P1-5 | Inicio unificado: saludo sobrio; tarjeta "Tu cuenta" con vencido, por vencer y a favor, más el CTA al estado de cuenta; avisos recientes como lista; solicitudes abiertas; accesos como ActionRow. `/dashboard` pasa a ser "Mis saldos" | `P/page.tsx`, `P/welcome-panel.tsx`, `P/dashboard/*` |
| P1-6 | Un solo estado de cuenta para propiedad y comercio: cabecera fija con el saldo y las acciones (PDF, correo, "Solicitar ayuda" con la unidad y el periodo ya rellenos); filtros por año, tipo y estado; movimientos agrupados por mes y en lista en celular; pagos con "ver todos"; estado vacío | `P/propiedades/[id]/estado-cuenta/*`, `P/arrendamientos/[id]/estado-cuenta/*`, `P/_components/estado-cuenta/*`, `P/_lib/estado-cuenta-utils.ts` |
| P1-7 | Mis propiedades y Mis comercios: lista responsive; KPI con definiciones únicas (vencido, por vencer, total); filtros "con adeudo" y "por barrio"; recordar la vista; detalle con pestañas (Resumen · Estado de cuenta · Galería); quitar los verdes de Starbucks | `P/propiedades/*`, `P/arrendamientos/*` |
| P1-8 | Avisos como canal: lista con título, fecha relativa y adjuntos; filtros reales (Vigentes · Vencidos · Con adjuntos); búsqueda; detalle en panel derecho con su URL; `/notificaciones` como "Historial"; Experiencias como galería sin autoplay y con detalle | `P/comunicados/*`, `P/notificaciones/*`, `P/experiencias/*`, `Q/communications.queries.ts` |
| P1-9 | Solicitudes: lista con detalle en panel; un solo formulario de alta; mostrar "En proceso"; estados en colores neutros; avisar que una respuesta reemplaza la anterior | `P/tickets/*`, `create-ticket-modal.tsx`, `Q/tickets.queries.ts:13-15` |
| P1-10 | Autenticación con un solo layout para login, forgot, reset, privacy y superadmin: fondo claro con la foto, formularios en minúsculas normales, sin halos ni degradados, `aria-live`, requisitos de contraseña visibles mientras se escribe; dejar solo el modal o solo la página de "olvidé" | `PU/*` |
| P1-11 | Limpieza de tokens: mapear los 59 hex a tokens; Inter con `next/font` en `ROOT`; quitar el `@source inline` de StatCard (`CSS:3-6`) y las utilidades heredadas (`CSS:251-285`, `.sidebar-scroll` en 344-366) | `CSS`, `ROOT`, todos los TSX |
| P1-12 | Reportes: "Cartera de cuotas" con segmentado (se conservan las dos rutas); Resumen financiero sin "BETA" y con 4 KPI sin repetir; Estado de resultados en el menú; color de datos olivo/azul; texto mínimo de 12 px; paginador truncado (1 … 4 5 6 … 20); filtros reales (buscar unidad, solo con adeudo) | `P/reporte-cuotas*/*`, `P/resumen-financiero/*`, `P/estado-resultado/*`, `P/_reportes/*`, `C/ui/paginator.tsx` |

### P2: mejoras que dependen de datos nuevos o de pulido

| ID | Trabajo | Archivos |
|---|---|---|
| P2-1 | Guardar la lectura de avisos (`lastSeenAvisosAt` por usuario o tabla de lecturas) para el badge "nuevos" | `prisma/schema.prisma`, `Q/communications.queries.ts`, `P/layout.tsx` |
| P2-2 | Hilo real en solicitudes (tabla de mensajes y adjuntos) y marca de "respuesta nueva" | `schema.prisma`, `Q/tickets.queries.ts`, `P/tickets/*` |
| P2-3 | Aviso de inactividad a los 28 minutos con botón "Seguir conectado" | `C/use-inactivity-logout.ts` |
| P2-4 | Cambiar la contraseña y editar los datos de contacto desde Mi Perfil; abrir los paneles de asignaciones y comercios o convertirlos en pestañas; sección "Datos fiscales" que muestre su estado | `P/mi-perfil/*`, `M/_actions/account.ts`, `M/_actions/auth.ts` |
| P2-5 | Reportes en celular: resumen por unidad en tarjetas, "abrir la tabla completa" en horizontal y exportar CSV | `P/reporte-cuotas*/*`, `compact-financial-table.tsx` |
| P2-6 | Barra inferior en celular y acceso fijo a "Emergencias" | `shell` |
| P2-7 | Teclado al estilo Slack: F6 entre regiones, flechas dentro del rail y Alt+Shift+↑/↓ al siguiente elemento con badge | `shell` |
| P2-8 | "Mis saldos" consolidado (propiedades + comercios, vencido por antigüedad) | `P/dashboard/*`, `Q/dashboard.queries.ts` |
| P2-9 | Código muerto: `conceptos-modal.tsx`, `propiedadesView`/`arrendamientosView` del store, `.embla` si se quita el carrusel | `P/estado-resultado/conceptos-modal.tsx`, `src/stores/minisitio.store.ts`, `CSS:287-333` |
| P2-10 | Correo del estado de cuenta con los colores de la marca (hoy usa el verde de Starbucks) | `M/_actions/account.ts:176, 195` |

---

## 8. Decisiones abiertas para el usuario

1. **Rail oscuro u oscuro claro.** Opción B (olivo de noche, más cercana a Slack) u Opción A (pergamino, igual que el admin).
2. **¿Fusionar** Resumen financiero y Estado de resultados en una sola pantalla con pestañas?
3. **¿Publicar** el Reporte general, que está marcado como confidencial y se ocultó a propósito?
4. **¿El Resumen financiero es solo para dueños,** como el resto de los reportes? Hoy un comercio lo puede abrir por URL.
5. **Badge de avisos:** ¿marca de lectura en la BD (funciona en cualquier dispositivo) o solo en el dispositivo?
6. **¿Hilo real en Solicitudes?** Requiere cambiar el modelo de datos.

**Fuentes externas** (resumidas con mis palabras):
- [Slack: ajustar las preferencias de la barra lateral](https://slack.com/intl/en-gb/help/articles/212596808-Adjust-your-sidebar-preferences)
- [Slack: organizar la barra lateral con secciones personalizadas](https://slack.com/help/articles/360043207674-Organize-your-sidebar-with-custom-sections)
- [Slack: atajos de teclado](https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts)
- [Slack: usar Slack con lector de pantalla](https://slack.com/help/articles/360000411963-Use-Slack-with-a-screen-reader)

Referencias internas: `docs/fluent-teams-design-analysis.md`, `AI_DESIGN_PROMPT.md`, `DESIGN.md`, `docs/minisitio-integrado.md`.