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
  - Atrapa el foco y Esc lo cierra.
- **Campos** (`ui/field.ts`): 40 px, radio 8, borde de 1 px y anillo olivo. En el celular el texto va a 16 px: con menos, iOS hace zoom.
- **Toasts** (`toast("…")` de `stores/minisitio-toast.store.ts`, que pinta `ui/toaster.tsx` en el shell):
  - sustituyen a `alert()`;
  - suben 20 px en 80 ms, se van a los 5 s y se pausan al pasar el cursor;
  - van abajo al centro.
- **Visor de imagen** (`ui/image-viewer.tsx`): pantalla completa sobre olivo casi negro, con "Abrir original" y cerrar.
- **Hilo** (Solicitudes):
  - mensajes de 36 px separados por una línea "N respuestas";
  - compositor fijo en el pie de la vista secundaria, con radio 8, borde que se enciende con el foco y ⌘/Ctrl + Enter para enviar.
- **Separador de día** (Avisos):
  - una línea con una píldora (`shadow-float`, 13 px) que se fija bajo el encabezado al desplazarse;
  - "Hoy", "Ayer" o el día con nombre;
  - lo nuevo lleva `highlight` y la etiqueta "Nuevo" en `mention`.
- **Pestañas** (Avisos, Solicitudes): 40 px, con cifra en caption. El subrayado olivo de 2 px se desliza con el resorte de la píldora del menú.
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

**Pendiente**, en orden: cada pantalla todavía trae su encabezado y estilo viejos dentro del shell nuevo.
1. **Mis saldos, Mis propiedades, Mis comercios y estados de cuenta** con un solo lenguaje de dinero. Además:
   - "Saldo pendiente" muestra el vencido;
   - las columnas "N/A" y "Sin estado".
2. **Teléfonos de emergencia** con `tel:`, WhatsApp (`wa.me`), `mailto:` y mapa.
3. **Documentos, Experiencias** (quitar las tarjetas de relleno) **y Mi perfil.**
4. **Reportes:**
   - paginador compacto, porque Cartera de cuotas pinta 59 números;
   - sin MAYÚSCULAS ni degradados verde y rojo;
   - año por defecto con datos.
5. **Login y recuperación de contraseña**, `error.tsx` y `not-found.tsx`.
6. **Limpieza:**
   - 41 clases que no existen en Tailwind v4;
   - 16 `alert()`;
   - unas 825 clases `gray-*`.

**Datos que no son de la interfaz:** la imagen guardada del aviso "13va Asamblea General Ordinaria" es un WebP negro de 600 × 776 (894 bytes); el contenido real está en su PDF.
