# Sistema de diseño del portal de condóminos (`/minisitio`)

El portal se siente como Slack, pero con los colores de Val'Quirico.

- **La estructura, las medidas y el movimiento salen de Slack.** El análisis con tokens verificados está en [slack-design-analysis.md](slack-design-analysis.md).
- **El color sale del sello y del olivo de la marca.** El análisis está en [valquirico-marca-analisis.md](valquirico-marca-analisis.md).
- **Los problemas de partida y el backlog** están en [minisitio-ux-auditoria.md](minisitio-ux-auditoria.md).

Este documento es el contrato. Si una pantalla nueva necesita algo que aquí no está, se agrega aquí primero.

## 1. Principios

1. **El marco lleva la marca; el contenido no.** El olivo de noche vive en la barra superior y la barra lateral. Sobre él flotan paneles blancos donde va la información. En el contenido, el olivo aparece solo en la acción primaria y en los enlaces.
2. **Primero lo que el condómino necesita saber.** Toda pantalla responde una pregunta, y la respuesta va arriba: ¿debo algo?, ¿qué hay de nuevo?, ¿a quién llamo?
3. **Una señal, un significado.** La negrita indica algo nuevo, el badge cuenta pendientes y el punto marca un estado que dura. El color se reserva para lo que significa algo: vencido, al corriente o acción.
4. **El detalle se abre al lado, no encima.** Abrir un elemento de una lista abre la vista secundaria, como un hilo de Slack, y la lista se queda.
5. **El movimiento es rápido y discreto.** Casi todo dura 80 ms, el hover es instantáneo y nada rebota.
6. **Nunca se inventan datos.** Si una consulta falla, se dice y se ofrece reintentar. Un cero solo aparece si el valor es cero.

## 2. Anatomía del shell

```
┌ marco (chrome-strong) ───────────────────────────────────────────────────────────┐
│ [←][→]           [ 🔍 Buscar o ir a…                       ⌘K ]          [☎][GB] │  44 px
│ ┌ barra lateral ─┐ ┌ contenido ─────────────────────────────┐ ┌ secundaria ────┐ │
│ │ sello  Val'Q.. │ │ Título de la vista                     │ │ Aviso   28 nov │ │  49 px
│ │ Inicio         │ ├────────────────────────────────────────┤ ├────────────────┤ │
│ │ Avisos         │ │                                        │ │                │ │
│ │ Solicitudes 2  │ │  (scroll propio en escritorio)         │ │                │ │
│ │ ▾ Finanzas     │ │                                        │ │                │ │
│ │   Mis saldos ● │ │                                        │ │                │ │
│ └ 260 px ────────┘ └────────────────────────────────────────┘ └ 400 px ────────┘ │
└──────────────────────────────── 4 px de aire entre paneles y al borde ───────────┘
```

| Pieza | Medidas | Archivo |
|---|---|---|
| Marco | `bg-chrome-strong`, alto de la ventana (`h-dvh`) en escritorio | `components/minisitio/minisitio-shell.tsx` |
| Barra superior | 44 px en escritorio y 52 px en el celular. Botones de 28 px con radio 4. Buscador de 26 px con radio 6, texto 13/22 e ícono de 18 px | ídem |
| Paneles | Radio 8, `shadow-panel`, 4 px de separación (`gap-1`, `px-1`, `pb-1`) | ídem |
| Barra lateral | 260 px, `bg-chrome`. Encabezado con el sello de 30 px, "Val'Quirico" 17/24 bold y "Portal del condómino" en caption | `shell/sidebar.tsx` |
| Fila del menú | 28 px, radio 6, padding y separación de 8 px, ícono de 16 px (trazo 1.75), texto 14/20 | ídem |
| Encabezado de vista | 49 px, fijo arriba del panel, línea `stroke-3` abajo, título 18/24 bold y migas en `fg-3`. En el celular el título va en la barra superior | `minisitio-shell.tsx` |
| Contenido | Padding `p-4 sm:p-6`. Ancho de lectura: `max-w-[1040px]` centrado (las tablas pueden ocupar más) | cada página |
| Vista secundaria | 400 px, de `top: 44px` a 4 px del borde inferior. El contenido le cede `mr-[404px]` en 160 ms. En el celular ocupa toda la pantalla | `shell/secondary-view.tsx` |
| Celular | Barra de pestañas de 56 px más el área segura (Inicio, Avisos, Solicitudes, Menú). "Menú" abre la barra lateral en una hoja de `min(86vw, 320px)` | `shell/mobile-nav.tsx` |

Toda la navegación sale de `shell/nav-config.ts`: la barra lateral, el buscador ⌘K, los títulos de las rutas (`ROUTE_TITLES`) y las palabras clave de búsqueda. Una pantalla nueva se registra ahí.

## 3. Color

### Marco ("olivo de noche")

Los contrastes están calculados contra `--color-chrome`, la superficie real del menú.

| Token | Valor | Uso |
|---|---|---|
| `chrome-strong` | `#2d2c18` | marco y barra superior |
| `chrome` | `#3d3c22` | barra lateral y hoja del celular |
| `chrome-hover` / `chrome-pressed` | blanco al 8 % / 12 % | hover instantáneo / presionado |
| `chrome-field` / `-hover` | tinta al 25 % / 32 % | buscador (Slack: `surf-inv-pry` al 25 %) |
| `chrome-ink` | `#fbf8f0` (10.59:1) | texto principal y no leído |
| `chrome-ink-soft` | tinta al 76 % (6.90:1) | ítem en reposo e íconos |
| `chrome-label` | tinta al 66 % (5.64:1) | detalle atenuado y caption |
| `chrome-selected` / `-ink` | `#f1eac1` / `#3d3c22` (9.25:1) | píldora del ítem activo |
| `chrome-focus` | `#ffcf87` (7.78:1) | anillo de foco sobre el marco |
| `unread` | `#ffcf87` | badge de conteo y punto de atención |
| `mention` | `#b8431a` (blanco 5.45:1) | badge sobre fondo claro y punto sobre la píldora |

### Contenido

Usa la rampa neutra de Fluent que ya está en `minisitio.css`:

- superficies: `surface` `#fff`, `-2` `#fafafa`, `-3` `#f5f5f5` y `-4` `#f0f0f0`;
- texto: `fg` `#242424`, `fg-2` `#424242` y `fg-3` `#616161`;
- bordes: `stroke` `#d1d1d1`, `stroke-2` `#e0e0e0` y `stroke-3` `#f0f0f0`.

| Token | Valor | Significa |
|---|---|---|
| `brand` / `brand-hover` / `brand-deep` | `#5d5b35` (blanco 6.97:1) / `#4b4a2b` / `#3d3c22` | acción primaria (reposo, hover y presionado) y enlaces |
| `overdue` | `#922f12` (7.97:1) | **vencido**: la teja del sello, no el rojo de Fluent |
| `success` | `#107c10` | al corriente |
| `warning` | `#8d6928` (5.02:1) | dorado accesible para texto |
| `highlight` | `#f6f1e8` | fila abierta en la vista secundaria |

**Prohibido:**
- `#cba258` con texto blanco (2.37:1);
- azul, verde o morado como acento;
- colores distintos para destinos que valen lo mismo.

## 4. Tipografía, radios y sombras

- **Inter** con `next/font` (`--font-inter`), pesos 400, 500, 600 y 700.
- **Mayúsculas solo al inicio de la oración.** Nunca MAYÚSCULAS con tracking.
- **Montos** siempre con `tabular-nums` y `formatCurrency` de `(portal)/_lib/format.ts`.

| Token | Tamaño / interlínea | Uso |
|---|---|---|
| `text-caption` | 12/16 | metadatos, horas |
| `text-body` | 14/20 | interfaz |
| `text-message` | 15/22 | cuerpo de avisos y respuestas (el ritmo de lectura de Slack) |
| `text-body-lg` | 16/22 | títulos de sección (bold) |
| `text-subtitle` | 20/28 | título dentro de un panel |
| `text-title` | 24/32 | saludo, título de pantalla grande |
| `text-display` | 28/36 | la cifra principal (saldo) |

**Radios:**
- `rounded-ctrl` (4): botón chico y botones de la barra superior;
- `rounded-surface` (6): filas del menú, buscador, filas de la paleta y del menú de cuenta;
- `rounded-panel` (8): paneles, tarjetas, botón mediano y avatar de 36 px (22 %).

**Sombras:**
- `shadow-panel`: paneles del shell;
- `shadow-menu`: menús;
- `shadow-modal`: diálogos;
- `shadow-button`: solo en hover.
- Las tarjetas en reposo no llevan sombra, solo un borde de 1 px `stroke-2`.

**Trampa de Tailwind v4:** los tokens de espacio se llaman `--space-N`, nunca `--spacing-N`.

## 5. Señales de la barra lateral

| Señal | Significa | Ejemplo | Detalle |
|---|---|---|---|
| **Negrita** + tinta plena | hay algo nuevo sin ver | Avisos con un aviso más reciente que la última visita | `NavItem.unread` |
| **Badge** crema con cifra | pendientes que se cuentan | Solicitudes abiertas | `NavItem.count` |
| **Punto** crema | un estado que dura | unidad con saldo vencido | `NavItem.attention`; no pone negrita |
| Título de sección en negrita | sección plegada con algo de lo anterior | "Mis propiedades" plegada con adeudos | más el resumen a la derecha |

Notas:

- **Unidades homónimas:** llevan su detalle atenuado ("Ronzino · VQ#01G-010").
- **Avisos vistos:** se guardan por dispositivo en `localStorage` (`minisitio-nav`), porque la BD no registra lecturas. La primera vez cuenta como nuevo lo de la última semana.
- **Conteos frescos:** los conteos los calcula el layout (`sidebar.queries.ts`), que no se vuelve a ejecutar al navegar. Tras una acción que cambie un conteo hay que llamar a `router.refresh()`.

## 6. Componentes

- **Botones** (`components/minisitio/ui/button.ts`, `buttonClass(variante, tamaño)`):
  - tamaños: chico de 28 px (radio 4, 13 px) y mediano de 36 px (radio 8, 14 px semibold);
  - variantes: `primary` en olivo, `outline` con borde `stroke-button` y `ghost` con texto olivo;
  - el hover suma `shadow-button` y el presionado oscurece **sin encoger**;
  - el foco es un anillo `brand` con 2 px de separación.
- **Fila de mensaje** (avisos, respuestas):
  - avatar de 36 px con radio 8, autor en 14 bold, hora en caption `fg-3` y cuerpo 15/22;
  - hover `surface-2` instantáneo y fila abierta en `highlight`;
  - las imágenes van en miniatura de 56 px y completas en la vista secundaria.
- **Vista secundaria** (`SecondaryView`): encabezado de 49 px con título y contexto atenuado, y botón de cerrar de 32 px.
  - En escritorio no es modal: la lista sigue usable.
  - Esc la cierra, el foco entra al abrir y vuelve a su lugar al cerrar.
  - En el celular es un diálogo a pantalla completa, sin scroll detrás.
- **Buscar o ir a… (⌘K / Ctrl K)** (`shell/command-palette.tsx`):
  - busca sin acentos entre pantallas, unidades y acciones;
  - es un combobox con listbox, se maneja con ↑ ↓ Inicio Fin Enter Esc y la fila activa lleva olivo sólido;
  - acción "Nueva solicitud" → `/tickets?nueva=1`.
- **Menú de cuenta** (`shell/account-menu.tsx`): popover de 260 px con filas de 32 px y resaltado sólido; "Cerrar sesión" se resalta en peligro.
- **Diálogo** (`ui/dialog.tsx`): el modal de Slack.
  - Medidas: 520 px y radio 8; encabezado de 70 px con título 22/30; contenido con 28 px a los lados (16 en el celular); acciones a la derecha, con una sola primaria.
  - Entra de .95 a 1 en 80 ms sobre un velo olivo al 60 % y en el celular ocupa la pantalla.
  - Atrapa el foco y Esc lo cierra. Con `dismissible={false}` (aceptar el aviso de privacidad) no hay X y ni Esc ni el velo lo cierran: hay que elegir una acción.
  - Su efecto depende solo de `open`: `onClose` suele cambiar en cada render del dueño, y si fuera dependencia el foco saltaría al primer campo con cada tecla. El visor de imagen y la hoja del celular siguen la misma regla.
- **Campos** (`ui/field.ts`): 40 px, radio 8, borde de 1 px y anillo olivo. En el celular el texto va a 16 px: con menos, iOS hace zoom.
- **Toasts** (`toast("…")` de `stores/minisitio-toast.store.ts`, que pinta `ui/toaster.tsx` en el shell):
  - sustituyen a `alert()`;
  - suben 20 px en 80 ms, se van a los 5 s y se pausan al pasar el cursor;
  - van abajo al centro.
  - Fuera del portal (acceso, superadmin) no hay `Toaster`: ahí el error va en línea con `role="alert"`.
- **Texto del aviso de privacidad** (`components/minisitio/aviso-privacidad-texto.tsx`):
  - en la base es texto plano de un textarea, no HTML; se reconstruyen título, secciones ("1. SECCIÓN"), párrafos e incisos ("I." y "a)" con sangría colgante) y los correos se vuelven enlaces;
  - si un proyecto guarda HTML de verdad, se pinta con `.aviso-privacidad-html` (tokens del portal);
  - lo usan la pantalla del portal, la ventana de aceptación y `/privacy`.
- **Visor de imagen** (`ui/image-viewer.tsx`): pantalla completa sobre olivo casi negro, con "Abrir original" y cerrar.
- **Hilo** (Solicitudes):
  - mensajes de 36 px separados por una línea "N respuestas";
  - compositor fijo en el pie de la vista secundaria, con radio 8, borde que se enciende con el foco y ⌘/Ctrl + Enter para enviar.
- **Separador de día** (Avisos):
  - una línea con una píldora (`shadow-float`, 13 px) que se fija bajo el encabezado al desplazarse;
  - "Hoy", "Ayer" o el día con nombre;
  - lo nuevo lleva `highlight` y la etiqueta "Nuevo" en `mention`.
- **Pestañas** (Avisos, Solicitudes): 40 px, con cifra en caption. El subrayado olivo de 2 px se desliza con el resorte de la píldora del menú.
- **Cifras de resumen** (`ui/stat-strip.tsx`): en el celular, una por renglón (etiqueta a la izquierda y monto a la derecha; la destacada arriba y grande). Desde tablet van en columnas, con tamaños que dejan caber montos de ocho cifras.
- **Año de un reporte** (`_reportes/year-buttons.tsx`): botones segmentados de 28 px, con el elegido en olivo.
- **Tabla mensual de reporte** (`_reportes/tabla-mensual.tsx`: `TablaMensual` con `Fila`, `Seccion`, `Subseccion`, `FilaAccion` y `Espacio`; la usan Estado de resultados y Resumen financiero, y es el modelo para las demás tablas anchas):
  - columnas configurables (`Columna`: título, nombre completo para lectores de pantalla, ancho, separador y destacada) y grupos de encabezado opcionales ("Total del año" | "2025, mes por mes");
  - la columna destacada (el año elegido) va en crema. Si queda fuera de la vista, por ejemplo en el celular, la tabla se desplaza hasta ella: al instante al cargar y suave al cambiar de año (instantáneo si se pide reducir el movimiento);
  - un solo scroll, el de la página. El encabezado de meses es una copia visual que se queda bajo la barra (`top` de 52 px en el celular y 49 px en escritorio) y sigue el scroll horizontal del cuerpo; la tabla tiene su propio `<thead>` aplanado para lectores de pantalla;
  - `table-fixed` con el mismo `<colgroup>` en las dos tablas, para que las columnas coincidan;
  - primera columna fija, con una sombra cuando quedan columnas ocultas a la izquierda;
  - secciones con título, subtotales y totales en `surface-2` y negritas, sin bandas de color; solo los negativos del balance van en `overdue`;
  - un mes sin movimientos se marca con "—" y no con "$0.00";
  - los grupos se abren con un chevrón que gira 90° (160 ms). Muestran sus 10 conceptos principales y "Ver los N restantes".
- **Estados:**
  - **carga:** esqueleto con pulso 1 → .65 → 1 en 1 s, y spinner solo si tarda más de 400 ms;
  - **vacío:** una frase y, si aplica, la acción;
  - **error:** "No pudimos cargar …" y el botón **Reintentar** (`router.refresh()`).
- **Teléfonos:** siempre con `telHref` y `formatPhone` (`_lib/format.ts`), y botón "Llamar".

## 7. Movimiento

Los valores viven en `components/minisitio/motion.ts` (framer-motion) y en `minisitio.css` (`duration-*`, `ease-slack`). No se inventan duraciones.

| Elemento | Movimiento | Origen |
|---|---|---|
| Hover de filas (menú y mensajes) | instantáneo | Slack |
| Color, fondo y borde de botones | 80 ms, `cubic-bezier(.36,.19,.29,1)` | Slack |
| Menús y popovers | opacidad, escala .96 → 1, 80 ms | Slack |
| Diálogos | escala .95 → 1 en 80 ms; velo en 80 ms lineal | Slack |
| Toasts | `translateY(20px)` → 0, 80 ms | Slack |
| Pliegue de secciones y chevron | alto y rotación, 160 ms | Slack |
| Contenido que llega (`(portal)/template.tsx`) | fundido de 200 ms lineal con 40 ms de retraso | Slack |
| Vista secundaria | entra de x 24 → 0 en 160 ms y sale en 80 ms; el contenido se recorre en 160 ms | Val'Quirico |
| Píldora del ítem activo | se desliza con resorte 720/52/0.6 | Val'Quirico (igual que el riel del admin) |
| Hoja del celular | resorte 520/48/0.8; sale en 160 ms | Val'Quirico |
| Badge que cambia | resorte 600/32/0.5 | Val'Quirico |

Con `prefers-reduced-motion`, `MotionConfig reducedMotion="user"` quita los desplazamientos y `minisitio.css` deja en 0 las duraciones de 160 ms en adelante.

## 8. Accesibilidad

- **Estructura de la página:**
  - "Saltar al contenido" lleva a `#ms-main`;
  - landmarks: `nav` "Menú del portal", `main` y `complementary` (vista secundaria);
  - el ítem activo lleva `aria-current="page"`;
  - los encabezados de sección son botones con `aria-expanded`.
- **Foco:**
  - siempre visible: `chrome-focus` sobre el marco y `brand` en el contenido;
  - los diálogos lo atrapan y lo devuelven, y Esc cierra.
- **Medidas mínimas:**
  - objetivos táctiles de 40 px o más en el celular;
  - texto con 4.5:1 o más;
  - íconos y estados con 3:1.
- **Lectores de pantalla:**
  - los enlaces genéricos ("Ver todos") llevan `aria-label` con contexto;
  - lo que abre otra pestaña lo anuncia.

## 9. Pantalla nueva: lista de verificación

1. Registrar la ruta en `nav-config.ts` (sección, `ROUTE_TITLES` y `keywords`).
2. **Sin encabezado propio:** el título lo pone el shell. Si depende de datos, se fija con `useMinisitioLayoutStore().setPageData({ title, breadcrumbs })`.
3. Contenido en `mx-auto w-full max-w-[1040px]`, con secciones de `h2` en `text-body-lg font-bold`.
4. Tarjetas con `rounded-panel border border-stroke-2` y listas con `divide-y divide-stroke-3`.
5. Errores visibles con reintento: nunca ceros ni listas vacías por una consulta fallida.
6. Abrir un elemento de una lista → `SecondaryView`, no un modal.
7. Solo tokens: nada de `gray-*` crudos ni hexadecimales sueltos.

**No se usan:**
- degradados;
- bandas de cabecera saturadas;
- MAYÚSCULAS con tracking;
- pastillas de color;
- chips de ícono en cada fila;
- tarjetas de relleno;
- `alert()`.

## 10. Estado

**Hecho (2026-10-29), decimoquinta vuelta:**
- **Reportes de cuotas ordinarias y extraordinarias:** ahora son una sola pieza (`_reportes/reporte-cuotas.tsx`) sobre la tabla mensual, con un solo scroll. Antes eran dos pantallas casi iguales, con doble scroll.
  - Por área: cuota mensual vigente, vencido (en `overdue`), pendiente y lo que se cargó cada mes del año elegido (botones de año), más el total de la página.
  - En las áreas con comercio, una segunda línea "C" con la parte del comercio, solo si la fila tiene algún importe suyo.
  - Paginación en el servidor con "N por página"; la página siguiente llega con la tabla atenuada y, si falla, avisa con un toast.
- **Se quitaron** las tarjetas con íconos, la leyenda de cinco píldoras y los encabezados en MAYÚSCULAS. También las columnas que no aportaban:
  - el tríptico por año, que repetía la misma cuota (anual = mensual × 12);
  - el "saldo del año" y el "pago anticipado", que siempre llegaban en cero;
  - 36 columnas de meses (tres años);
  - los colores de mora, que se calculaban con la fecha del *último* cargo.
- **Datos mal rotulados:** "Cartera vencida {año anterior}" era todo lo vencido, y "pagos mensuales" eran cargos.
- **Se borraron** `report-chrome`, `financial-cards`, `skeleton-loaders` y las dos vistas viejas.
- **`Importe`** trata como cero los residuos de redondeo.

**Hecho (2026-10-29), decimocuarta vuelta:**
- **Reporte general de adeudos:**
  - arriba, saldo vencido, saldo pendiente y "1,091 de 1,745" áreas con saldo vencido. Antes, "Total áreas con adeudos" contaba todas las áreas;
  - las áreas van de la que más debe a la que menos, 50 por página, con pestañas "Con saldo vencido / Con saldo / Todas", buscador sin acentos y selector de zona. Antes salían las 1,745 de golpe, también las que no deben, con "$0.00" en rojo;
  - el estado del área en español ("Disponible", "Vendida"…; antes "AVAILABLE"), también en el PDF, cuyas columnas ahora dicen "Estado" y "Pendiente";
  - el resumen por zona como tabla, de la zona que más debe a la que menos;
  - si la carga falla, "No pudimos cargar…" con "Reintentar". Antes decía que todas las áreas estaban al corriente. Se quitaron "Actualizar", el filtro por tipo (todas son propiedades) y una acción de servidor.
- **Piezas:** la tabla mensual acepta columnas `alerta` (positivos en `overdue`); `fieldBaseClass` es el campo sin ancho, para un select junto a otros controles; las pestañas formatean sus cifras ("1,091").

**Hecho (2026-10-29), decimotercera vuelta:**
- **Resumen financiero:**
  - una sola tabla por tipo de cuota, con los totales de los tres años visibles (el elegido en crema) y el detalle mes por mes de ese año. Antes eran hasta cinco tablas de unas 40 columnas, con encabezados beige y tarjetas con sombra, y el año elegido solo cambiaba las cifras de arriba;
  - cuatro cifras (cuotas, otros ingresos, egresos y balance) y una frase con los ingresos del año. Se quitó "Cuotas ordinarias 2025", que repetía la primera;
  - en extraordinarias solo hay cobros: no se muestra un saldo sin egresos, y se dice dónde ver los gastos extraordinarios;
  - las filas con el mismo nombre en un año se suman (antes la segunda pisaba a la primera);
  - error de carga con "Reintentar" que vuelve a pedir la pantalla. Se borraron `compact-financial-table` (y su cartera, que siempre llegaba en cero), la carga del cliente y dos acciones de servidor.
- **Tabla mensual compartida** (`_reportes/tabla-mensual.tsx`, §6): Estado de resultados ya la usa.

**Hecho (2026-10-29), duodécima vuelta:**
- **Estado de resultados**, rehecho como estado contable:
  - arriba, ingresos, egresos y balance, con una frase que dice cuánto superaron unos a otros;
  - abajo, una sola tabla con ingresos, egresos y balance, mes por mes y con los meses alineados (antes, tres tablas de anchos distintos con tarjetas, sombras e íconos);
  - el año se cambia con botones; la tabla anterior queda atenuada mientras llega el nuevo año. Ya no hay "Actualizar".
- **Desglose de egresos, que nunca funcionó:** el chevrón de cada grupo pedía "opciones" a un stub que siempre devolvía vacío, y "Ver conceptos" abría un modal sin datos. Ahora cada grupo se abre en sus conceptos presupuestales reales, de mayor a menor gasto, armados con los mismos egresos que ya se leían (sin otra consulta). Se borraron ese modal, otro que nunca se montaba, los dos stubs, la consulta que solo usaba ese otro modal y seis acciones de servidor que quedaron sin uso.
- **Grupos de egreso con nombre:** la migración dejó el nombre del grupo en `category` y en `name` el tipo de presupuesto, así que salían cuatro "Presupuesto ordinario". Ahora se llaman por su categoría ("Gastos de seguridad"…), con el tipo como detalle, en el orden del catálogo. En el **Resumen financiero** esto corrige un error de cuentas: fusionaba filas por nombre y cada "Presupuesto ordinario" pisaba al anterior, de modo que las filas no sumaban el total.
- **Cifras de resumen en el celular:** una por renglón; antes "-$10,841,545.12" se cortaba. Verificado sin desbordes en cuatro pantallas a 390, 768 y 1280 px.

**Hecho (2026-10-29), undécima vuelta:**
- **Aviso de privacidad:**
  - el texto se leía como un solo bloque: está guardado como texto plano y se pintaba como HTML, así que se perdían todos los saltos de línea. Ahora se lee como documento, con título, secciones, incisos con sangría y el correo de derechos ARCO como enlace;
  - en el portal, el PDF va arriba ("Abrir") y el texto con ancho de lectura de 720 px. Sin aviso publicado se dice así, y no se muestra un texto genérico que parecía el aviso;
  - la ventana de aceptación usa el diálogo compartido sin modo descartable ("Cerrar sesión" / "Acepto");
  - `/privacy` es un documento con las dos acciones fijas abajo, y "Cerrar sesión" ahora sí cierra la sesión (antes solo llevaba al login).
- **Superadmin:** el marco de acceso, con los campos del portal y "Mostrar". Se quitaron el degradado, las manchas difuminadas y las MAYÚSCULAS.
- **Diálogo:** se corrigió que, en "Enviar por correo", cada tecla mandara el foco al primer radio (ver §6).
- **Limpieza:**
  - los últimos `alert()`: un toast en el reporte general y un error en línea en la burbuja de superadmin;
  - los esqueletos de reportes pasan al pulso plano del portal; las tablas respetan su número de columnas (antes, 6 fijas);
  - se borró `StatusBadge`, que no se usaba.

**Hecho (2026-10-29), décima vuelta:**
- **Acceso:** entrar, olvidé y nueva contraseña usan un marco compartido (`(public)/_components/auth-shell.tsx`):
  - formulario sobre blanco con el sello y la foto de Val'Quirico con un solo velo olivo plano;
  - campos del portal, "Mostrar" la contraseña y mensajes claros: enlace vencido, faltante o sesión cerrada por inactividad.
  - Se quitó el modal de "olvidé", que repetía su página, junto con los degradados, las MAYÚSCULAS y el botón dorado que se encogía.
- **Errores:**
  - dentro del portal, un error o un `notFound()` se muestran en el panel con "Reintentar" (`(portal)/error.tsx` y `not-found.tsx`) y el shell queda en pie; antes se perdía toda la navegación;
  - fuera del portal, el mismo marco de acceso.

**Hecho (2026-10-29), novena vuelta:**
- **Año por defecto:** los reportes abren en el último año con ingresos o egresos (2025), no en 2026 en ceros. Los cargos se generan por adelantado y empujaban el año actual.
- **Resumen financiero:**
  - pestañas de tipo de cuota, selector de año y seis cifras en `StatStrip` (dos filas de tres);
  - sin el título duplicado, la pastilla "Fase 1 · Beta" ni el "No disponible".
- **Estado de resultados:** el periodo como título (antes decía "Resumen financiero"), el selector con los campos del portal y "Actualizar" outline.

**Hecho (2026-10-29), octava vuelta:**
- **Reportes:**
  - las piezas compartidas (`_reportes/report-chrome.tsx` y `financial-cards.tsx`) pasaron del pergamino del panel al lenguaje del portal, con la misma API: cifras sin chips de ícono, leyenda con puntos, filtros sin banda olivo y celdas P/C con el color de su estado sobre fondo neutro;
  - la tabla ancha ya no se sale del panel (márgenes iguales al padding).
  - Paginador compacto ("1 … 5 6 7 … 59") con la página actual en olivo.
  - Pasada mecánica a los ocho archivos de reportes:
    - sin MAYÚSCULAS con tracking;
    - `font-mono` → `tabular-nums`;
    - fondos verde y rojo neutros, con el texto conservando su sentido;
    - el pergamino en hexadecimal → tokens.
  - Se quitó el botón de regreso de los reportes (el shell ya tiene historial y migas).

**Hecho (2026-10-29), séptima vuelta:**
- **Teléfonos de emergencia:**
  - agrupados en Emergencias (con "Llamar" destacado), Administración y Experiencias, cada contacto con sus acciones y un botón para copiar;
  - las acciones se arman con el tipo y el contenido (`(portal)/_lib/contactos.ts`, que también usa Inicio), porque los enlaces guardados estaban rotos: `https://tel:…`, números sueltos y `wa.me` sin lada.
- **Experiencias:**
  - una galería de carteles con pestañas "Próximas / Anteriores" (si no hay próximas, abre en anteriores y lo dice);
  - visor de imagen y PDF a un clic;
  - se quitaron el carrusel con reproducción automática y las tarjetas vacías de relleno.
- **Mi perfil:**
  - datos tal como los tiene la administración, con "Pide que lo corrijan" (abre `/tickets?nueva=1&asunto=…`);
  - el interruptor "Requiero factura" (`ui/switch.tsx`), que se guarda al momento con un toast;
  - la constancia fiscal se manda por correo a la administración;
  - las asignaciones a la vista, sin paneles laterales.
  - Se quitó el "Subir PDF", que siempre fallaba porque su acción era un stub; la acción también se borró.

**Hecho (2026-10-29), sexta vuelta:**
- **Detalle de propiedad y de comercio** con una pieza compartida (`_components/unidad-detalle.tsx`):
  - nombre y "Ver estado de cuenta";
  - vencido, por vencer y el último pago real (solo en propiedades: los pagos se registran por área y no distinguen al comercio);
  - una ficha con "Sin registrar" donde no hay dato;
  - la galería solo si hay imágenes (hoy no hay ninguna en la base).
  - Se quitaron:
    - el indiviso inventado de 0.0417 %;
    - "Último pago" y "Total cargos" siempre en $0.00;
    - los "N/A" del comercio.
- **Estado de cuenta de comercio:**
  - las mismas piezas que el de propiedad, con su "¿Algo no cuadra?";
  - pestañas "Estado de cuenta / Reglamentos";
  - un mensaje claro si no se encuentra, en lugar del modal de error.
  - La consulta trae también descuentos y saldo a favor.
- **Documentos del condominio:** una lista de documentos compartida (`_components/document-list.tsx`), la misma de la pestaña de reglamentos.
- **Títulos de pestaña:** "Pantalla | Val'Quirico", iguales en el metadata y en el shell.
- **Se borraron** `ImageGallery`, `ReglamentosTab`, `ReglamentosView`, `ButtonSpinner` y `LegacyCard`.

**Hecho (2026-10-29), quinta vuelta:**
- **Estado de cuenta de propiedad:**
  - arriba, la unidad y sus acciones: PDF, correo y "¿Algo no cuadra?", que abre una solicitud con el asunto escrito;
  - un resumen con la cuenta completa (cargos + intereses − pagos − descuentos = saldo);
  - los movimientos, pendientes o todos, con estado (vencido, por vencer o pagado) según la misma regla del saldo;
  - los últimos pagos.
  - Fechas como "7 ene 2023" y una sola columna de fecha: las dos que había eran el mismo dato, y "Pagado el" siempre estaba vacío.
- **Piezas compartidas para comercios:** `_components/estado-cuenta/statement-parts.tsx`.
- **Corrección de datos:** los estados de cuenta, y por tanto sus PDF y correos, mostraban los cargos **cancelados** (3,814 de propiedades y 2,743 de comercios) como "Pendiente" con saldo, aunque los totales no los contaban. Ahora se excluyen en la consulta, como en la 1.0.
- **Enviar por correo:** el diálogo compartido, con los errores dentro y un toast al enviar, en vez de cuatro `alert()`.

**Hecho (2026-10-29), cuarta vuelta:**
- **Mis propiedades** y **Mis comercios** con el lenguaje de Mis saldos:
  - resumen de cifras (`StatStrip`) y buscador (`SearchField`) compartidos;
  - tabla con encabezado fijo y totales en escritorio, y lista en el celular (se quitó el botón tabla / tarjetas).
- **Mis propiedades:**
  - las FAP se sangran bajo su AP solo si esa AP está en la lista;
  - el indiviso se explica en un desplegable accesible (antes, un tooltip que solo abría con el ratón);
  - el PDF sigue saliendo de lo que se ve.
- **Mis comercios:**
  - superficie real (construcción o, si no hay, terreno);
  - contacto y "Contrato inactivo";
  - sin el indiviso del dueño ni los "N/A" y "Sin estado".
- **Se borraron:** las tablas viejas, `IndivisoInfo`, `ViewToggle` y las redirecciones del navegador (quien no tiene unidades ve el estado vacío).

**Hecho (2026-10-29), tercera vuelta:**
- **Mis saldos:**
  - arriba, vencido, por vencer y a favor, más una frase de qué unidades deben;
  - abajo, la lista por unidad de propiedades y comercios, ordenada por lo vencido, con pestañas "Con saldo vencido / Todas", buscador sin acentos y el encabezado de la tabla fijo;
  - cada fila abre su estado de cuenta y en el celular la lista va en filas.
  - Se quitaron:
    - "Saldo pendiente", que mostraba lo vencido;
    - los datos personales repetidos de Mi perfil;
    - los colores sin significado;
    - el resumen viejo (`dashboard.queries.ts`).
- **Piezas compartidas:** `UnderlineTabs` (`ui/tabs.tsx`) y la frase de adeudo (`(portal)/_lib/saldos.ts`).

**Hecho (2026-10-29), segunda vuelta:**
- **Avisos** como canal:
  - separadores de día fijos, "Nuevo" desde la visita anterior, pestañas Todos / Vigentes y visor de imagen;
  - sin los filtros que daban 0 ni la categoría "3".
  - `/notificaciones` redirige aquí: era la misma lista, paginada.
- **Solicitudes** como hilos:
  - lista Abiertas / Cerradas y detalle en la vista secundaria;
  - compositor que avisa que la respuesta reemplaza la anterior (el modelo guarda una sola);
  - diálogo de alta compartido con los estados de cuenta;
  - toasts en vez de `alert()`.
  - Ya no se promete un aviso por correo al departamento: `createTicket` no envía ninguno.

**Hecho (2026-10-29), primera vuelta:**
- **Shell:** marco y paneles, barra superior con historial y buscador, barra lateral con secciones, señales y homónimos, ⌘K, menú de cuenta, celular (pestañas y hoja), vista secundaria y fundido entre pantallas.
- **Inicio:** saldo vencido de todas las unidades, avisos como mensajes con detalle al lado, solicitudes y emergencias con `tel:`.
- **Etiquetas:** unificadas ("Mis saldos", "Avisos", "Solicitudes"…).
- **Solicitudes:** acepta `?nueva=1`.

**Pendiente**, en orden:
1. **Limpieza:**
   - ya no quedan clases `gray-*` (salvo los colores del PDF del reporte general);
   - 4 `flex-shrink-0` de Tailwind v3, que en v4 no existen, en la burbuja de superadmin;
   - la burbuja de superadmin sigue en pizarra (`slate-*`): es interna, pero desentona.
2. **Reportes de cuotas:** buscar un área exige paginar (1,745 áreas en orden de catálogo). Un buscador en el servidor (por nombre o clave) haría el reporte manejable.
3. **Revisión de conjunto:** recorrer todas las pantallas a 390, 768 y 1280 px buscando inconsistencias, errores de consola y problemas de accesibilidad.

**Dato, no interfaz (decisión del usuario):** el Resumen financiero del portal no reparte igual que el panel de administración (`modules/financial-summary`), y por eso su balance ordinario 2025 (−$12.1 M) no coincide con el del Estado de resultados (−$10.8 M):
- **egresos:** el portal resta *todos* los egresos en el balance ordinario, incluidos los "Gastos extraordinarios" ($9.7 M en 2025), y deja sin egresos el balance extraordinario. El panel aparta los de la categoría "Gastos extraordinarios" (`resolveBudgetGroup` + `CATEGORY_MAP`);
- **ingresos:** el panel cuenta como extraordinarios también el comodato, las cuotas STC y las sanciones; el portal, solo las cuotas extraordinarias.
- Alinear el portal con el panel cambia cifras que ven los condóminos: solo por los egresos, el balance ordinario 2025 pasaría de −$12.1 M a unos −$2.4 M. Mientras tanto, la pestaña de extraordinarias solo muestra cobros y dice dónde ver los gastos.

**Acceso (decisión del usuario):** el Reporte general muestra los adeudos de *todas* las áreas a cualquier propietario (`requirePropietario`), como en el minisitio anterior. Se rotula como confidencial; si debe verlo solo el comité, hay que restringir el acceso.

**Datos que no son de la interfaz:** la imagen guardada del aviso "13va Asamblea General Ordinaria" es un WebP negro de 600 × 776 (894 bytes); el contenido real está en su PDF.
