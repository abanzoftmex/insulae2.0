# Minisitio Val'Quirico: tokens actuales y mapeo de roles de Slack

Es un análisis de solo lectura de la rama `feat/minisitio-integrado`, hecho el 29 de octubre de 2026, sin modificar ningún archivo del repositorio. Las versiones instaladas son Next 16.2.1, Tailwind 4.2.2, framer-motion 12.42.2 (motion-dom 12.42.2) y lucide-react 1.14.0.

**Cómo se midió el contraste.** Se usó la fórmula de WCAG 2.x. Primero se calcula la luminancia relativa de cada color en sRGB linealizado: `L = 0.2126·R + 0.7152·G + 0.0722·B`. Luego la razón es `(L_clara + 0.05) / (L_oscura + 0.05)`. Los colores con transparencia se mezclan primero con su superficie real.

Umbrales usados:
- 4.5:1 para texto normal.
- 3:1 para texto grande (≥24 px, o ≥18.66 px en negritas).
- 3:1 para componentes, estados y foco (criterio 1.4.11).

Ejemplo del cálculo: para blanco sobre `#5d5b35`, la luminancia es L = 0.1007, así que (1 + 0.05) / (0.1007 + 0.05) = **6.97:1**.

---

## Resumen

- **Hay paleta, pero el minisitio casi no la usa.** El código tiene un sistema olivo coherente y la rampa neutra de Fluent. Aun así, el minisitio tiene **410 hex escritos a mano** y **1,400 clases de la paleta por defecto de Tailwind** (853 de ellas `gray-*`).
- **La mayoría de los hex sobrantes vienen de Starbucks.** Se copiaron de `DESIGN.md` y `AI_DESIGN_PROMPT.md`, que todavía describen esa marca: `#cba258` aparece 80 veces, `#bca065` 28, y también `#006241`, `#00754a` y `#1e3932`. Ninguno existe ya en los tokens.
- **Los colores reales de la marca no están tokenizados.**
  - El logotipo es un vino oxidado, `#4f140d`.
  - El sello usa crema `#fdd28d`, olivo `#645516`, teja `#be4511` y ocre `#a7712c`.
  - `public/vq_logo_light.png` (sello a color con letras blancas, hecho para fondos oscuros) no se usa en ningún lugar.
- **Equivalente del morado (aubergine) de Slack: `#3d3c22`.** Es el `brand-deep` actual, como fondo del sidebar, con `#2d2c18` para la barra superior. Con letra crema `#fbf8f0`, todos los textos pasan AA: 10.59, 6.90 y 5.64:1.
  - El olivo `#5d5b35` no sirve como fondo del sidebar: los títulos de sección quedan en 3.91:1 y el botón primario se confunde con el fondo (1.00:1).
- **Ítem activo:** una píldora `#f1eac1` con texto `#3d3c22`. Tiene 9.25:1 como texto y 9.25:1 frente al fondo como indicador de estado. Es mejor que el patrón de Slack, cuyo azul activo queda a 2.51:1 de la columna.
- **Fallas de contraste actuales:**

  | Par | Contraste |
  |---|---|
  | Blanco sobre `#cba258` (todos los botones "dorados") | 2.37:1 |
  | Oro usado como texto (`text-primary-light`) | 3.09:1 |
  | Anillo de foco dorado sobre `#f5f5f5` | 2.83:1 |
  | `nav-ink-soft` sobre los módulos del rail | 4.46:1 |
  | `nav-ink-faint` usado como texto | 2.83:1 |
  | Cifra blanca sobre el badge dorado | 3.09:1 |
  | `text-gray-400` | 2.60:1 |
  | `StatusBadge` en rojo (`critical`) | 4.26:1 |
  | Etiquetas de `StatCard` y `Badge` compartidos | 3.19 y 2.43:1 |

- **Tipografía:** servir Inter Variable desde el propio repo con `next/font/local` en los dos layouts raíz. Así el build ya no descarga nada de Google. No recomiendo Lato: en Google y Fontsource no trae pesos 500 ni 600, y el minisitio los usa 422 veces.
- **Animación:** convertir en tokens los valores que ya usa el rail del admin (140, 180, 220 y 260 ms, `ease-smooth` y dos resortes que se asientan sin rebotar). Las duraciones deben llamarse `--transition-duration-*`, que es el nombre que Tailwind 4.2 lee para las clases `duration-*`. Hace falta además una copia de los valores en TypeScript para framer-motion y envolver el shell en `MotionConfig reducedMotion="user"`.
- **Riesgos principales:**
  - Tanto el CSS del admin como el del minisitio leen todo el repo, así que cada uno incluye las clases del otro.
  - `shadow-layered` está roto en el admin (dice `shadow:` en lugar de `box-shadow:`) y en el minisitio no. Por eso el `Card` compartido se ve distinto en cada lado.
  - Tailwind 4.2 ya trae una paleta llamada `olive-*`; no conviene nombrar así los tokens nuevos.

---

## 1. La paleta de Val'Quirico tal como se usa hoy

### 1.1 Dónde están los tokens

- `src/app/(minisitio)/minisitio.css:14–128` tiene un `@theme` que es copia del de `src/app/globals.css:8–131`, con los mismos valores. La diferencia es que al minisitio le falta `--font-sans` (globals.css:119).
- `minisitio.css:230–285` conserva variables antiguas (`--primary-dark`, `--primary-light`, `--background`, `--foreground`, `--surface`, `--border`) y utilidades a mano `.bg-primary-*`, `.text-primary-*` y `.border-primary-*`. Se usan 93 veces.
- Los documentos están desfasados respecto al código. `AI_DESIGN_PROMPT.md` (§2 y §5) pide fondo crema `#f2f0eb`, marca `#006241` y oro `#cba258`. El código usa fondo blanco, olivo `#5d5b35` y oro `#b58c42`. Ese desfase explica de dónde salen los hex de Starbucks en el minisitio.

### 1.2 Tokens, valores y uso real

Los conteos son de clases de Tailwind que usan el token: minisitio (`src/app/(minisitio)` + `src/components/minisitio`) frente al resto de `src/app/(admin)` + `src/components`.

| Token | Valor | Rol | Minisitio | Admin | Dónde se usa en el minisitio |
|---|---|---|---|---|---|
| `--color-canvas` | `#ffffff` | Fondo de página | 35 | 238 | Raíz del shell, tablas, modales |
| `--color-canvas-2` | `#f3f4f6` | Fondo alterno. Es el `gray-100` de Tailwind, un gris frío ajeno a la marca | 2 | 24 | — |
| `--color-card` | `#ffffff` | Tarjeta | 7 | 117 | Encabezado del shell, ítem activo del rail |
| `--color-brand` | `#5d5b35` | Olivo de marca: títulos y acción primaria | 87, más 55 `primary-dark` y 33 hex | 743 | Tablas, paginador, login, shell |
| `--color-brand-accent` | `#b58c42` | Oro: marcador activo, foco, badge | 9, más 38 `primary-light` y 28 hex | 172 | Marcador y badge del shell, reportes |
| `--color-gold` | `#b58c42` | Duplicado de `brand-accent` | 0 | 17 | — |
| `--color-brand-deep` | `#3d3c22` | Olivo profundo: letra del rail, tooltip, fondo oscurecido | 32 | 115 | Shell, tooltip, login, bienvenida |
| `--color-brand-uplift` | `#757242` | Hover del botón primario | 2 | 3 | Reportes |
| `--color-brand-mint` | `#f1eac1` | Pergamino claro (el nombre "mint" viene de Starbucks) | 15 | 80 | Píldora "MINISITIO CONDÓMINOS", tablas, bienvenida |
| `--color-gold-soft` | `#fbf8f0` | Fondo crema | 11 | 14 | Pantalla de error, olvidé y restablecer contraseña |
| `--color-ink` | `rgb(0 0 0 / .87)`, que resulta en `#212121` | Texto | 17 | 272 | Shell, paginador |
| `--color-ink-soft` | `rgb(0 0 0 / .58)`, que resulta en `#6b6b6b` | Texto secundario | 16 | 808 | — |
| `--color-line` | `rgb(0 0 0 / .06)` | Línea fina | 112 | 561 | Todas las vistas |
| `--color-danger` | `#c82014` | Error | 7 | 162 | Hover de cerrar sesión, resumen financiero |
| `--color-terracotta` | `#922f12` | Teja | 0 como clase (14 como hex) | 4 | `welcome-panel.tsx` (en hex) |
| `--color-surface`, `-2`, `-3`, `-4` | `#ffffff`, `#fafafa`, `#f5f5f5`, `#f0f0f0` | Superficies neutras de Fluent | 0 | 13 | Solo a través de `fluent.tsx` |
| `--color-fg`, `-2`, `-3`, `-4` | `#242424`, `#424242`, `#616161`, `#707070` | Texto neutro de Fluent | 8 | 22 | `welcome-panel.tsx` |
| `--color-stroke`, `-2`, `-3` | `#d1d1d1`, `#e0e0e0`, `#f0f0f0` | Bordes de Fluent | 1 | 5 | — |
| `--color-success` y `--color-critical` | `#107c10` y `#d13438` | Estados | 0 | 62 y 3 | — |
| `--color-nav`, `-sunken`, `-hover`, `-pressed` | `#f6f4ec`, `#e7e4d5`, `#dcd8c6`, `#d1ccb7` | Rail "pergamino" (`pressed` sin uso) | 10 | 10 | Solo `minisitio-shell.tsx` |
| `--color-nav-line` y `-line-soft` | `#d9d4be` y `#e4e0cf` | Líneas del rail | 3 | 7 | Solo shell |
| `--color-nav-ink`, `-soft`, `-faint`, `-label` | `rgb(61 60 34)` al .92, .74, .55 y .78 | Letra del rail | 15 | 15 | Solo shell |

Otros tokens:
- **Radios:** `card` 12, `pill` 9999, `ctrl` 4, `surface` 6 y `panel` 8 px.
- **Sombras:** `card`, `2`, `4`, `8`, `16` y las del rail (`nav-item`, `nav-flyout`, `nav-rail`, `nav-well`).
- **Curvas:** `ease-smooth` `cubic-bezier(0.32, 0.72, 0, 1)` y `ease-out-quint` `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Espaciado:** `--space-1` a `--space-9`, de 4 a 64 px. Hoy no se usan (cero apariciones de `var(--space-N)`).

### 1.3 Colores de los archivos de marca

Ninguno de estos colores está tokenizado. Los saqué leyendo los píxeles de cada imagen.

| Origen | Color | OKLCH | Lectura |
|---|---|---|---|
| Letras de `valquirico-logo.png` | `#4f140d` (100 % de los píxeles) | 0.290 / 0.090 / 30° | Vino oxidado. Es el color real del logotipo; da 14.60:1 sobre blanco |
| Sello (`logo-mono.png`) | `#fdd28d` crema (25 %), `#645516` olivo (13 %), `#be4511` teja (12 %), `#a7712c` y `#dba353` ocres | El olivo está a ~95°, la teja a ~40° | Paleta "fresco medieval" |
| `vq_logo_light.png` | El mismo sello (`#fad190`, `#5e5421`, `#ab491f`) con letras `#ffffff` | — | Versión para fondo oscuro |
| `images/fdo1.jpg` | Aplanado de muro `#bd8768` y `#875e46`, claro `#e1c6b4` | ~50° | Fachada ocre-terracota con hiedra |
| `images/fdo2.jpg` | Cantera `#b39978` y `#e6d1b4`, follaje `#3b371b` | ~73° | Piedra caliza, puerta verde y olivo |

Como referencia, el olivo de marca `#5d5b35` está a 0.463 / 0.056 / 105.8° y `#3d3c22` a 0.350 / 0.041 / 106.4°. El tono es el mismo; cambia la luminosidad.

### 1.4 Archivos de marca en `public/`

| Archivo | Tamaño | Qué es | Dónde se usa |
|---|---|---|---|
| `valquirico-logo.png` | 1077×290, 50 KB | Logotipo horizontal en línea, en vino `#4f140d`. Solo funciona sobre fondo claro | Shell expandido del minisitio (`minisitio-shell.tsx:521`), respaldo del admin, logo del correo (`_actions/account.ts:119`) |
| `logo-mono.png` | 158×164, 44 KB | Sello ilustrado a color | Shell colapsado (`minisitio-shell.tsx:521`) |
| `vq_logo_light.png` | 633×164, 55 KB | Sello a color con letras blancas | **No se usa.** Es el candidato natural para el sidebar oscuro |
| `brand/valquirico-logo-light.png` | 1077×290, 48 KB | Logotipo en línea gris `#e2e2e2` | Marca de agua de bienvenida (`welcome-panel.tsx:230`), login del minisitio (`login-view.tsx:141`), logins del admin, PDFs. También es el respaldo del shell, donde no se vería sobre el pergamino |
| `brand/reinos-de-mexico-logo-c.png` | 807×548, 70 KB | Logo del grupo en oro pálido `#ffd895` | PDF de tickets del admin |
| `brand/abanzoft-logo-light.png` | 609×111, 15 KB | Logo del proveedor, blanco | Login del admin |
| `images/fdo1.jpg` | 1280×800, 293 KB | Foto de fachada | Login del minisitio (`login-view.tsx:456`) y del admin |
| `images/fdo2.jpg` | 900×604, 107 KB | Foto de casa de cantera | **No se usa** |

El favicon está en `src/app/favicon.ico` (26 KB).

### 1.5 Colores fuera del sistema y su reemplazo

Las rutas son relativas a `src/app/(minisitio)/minisitio/`, salvo las que empiezan con `src/`.

**A. Oro de Starbucks: `#cba258` (80), `#bca065` (28) y `#a8853f` (1).** Casi siempre aparecen como un degradado falso, `bg-gradient-to-r from-[#cba258] to-[#cba258]`, con el mismo color en ambos extremos. El texto blanco encima queda en 2.37:1.
- `error-screen.tsx:35`
- `(portal)/tickets/tickets-view.tsx:296, 310, 340, 351, 378, 404, 622, 669, 695, 715, 724`
- `(portal)/comunicados/comunicados-view.tsx:67, 84, 92, 167, 291`
- `(portal)/experiencias/experiencias-view.tsx:125, 151, 168, 179` y `experiencias/loading.tsx:8, 24`
- `(portal)/_components/estado-cuenta/create-ticket-modal.tsx:91, 116, 136, 150, 158`
- `(portal)/propiedades/[id]/estado-cuenta/estado-cuenta-propiedad-view.tsx:361` y `(portal)/arrendamientos/[id]/estado-cuenta/estado-cuenta-arrendamiento-view.tsx:353`
- `(public)/forgot-password/forgot-password-view.tsx:72, 103, 132, 152, 164, 180, 194`
- `(public)/reset-password/reset-password-view.tsx:84, 103, 122, 155, 186, 209, 238, 258, 270, 286, 300`
- `src/components/minisitio/privacy-notice-modal.tsx:52, 82, 161`
- `_actions/account.ts:187` (correo)

Reemplazo:
- Botones: `bg-brand` con hover `bg-brand-hover`.
- Encabezados de modal: `SurfaceHeader`, texto plano con una línea divisoria, sin banda de color.
- Texto dorado: `text-warning` o `text-brand`.
- Los recuadros de icono con degradado se eliminan.

**B. Verdes de Starbucks: `#006241` (7), `#00754a` (5), `#1e3932` (6), `#122420` y `#2d5249` (2 cada uno).**
- `tickets-view.tsx:403, 473, 571, 577, 602`
- `(portal)/propiedades/propiedades-table.tsx:109, 136, 197`
- `forgot-password-view.tsx:94, 161`
- `reset-password-view.tsx:177, 200, 267`
- `_actions/account.ts:176, 195`

Reemplazo: `brand`, `brand-deep` o `chrome-strong`.

**C. Colores del sistema escritos como hex: `#5d5b35` (33), `#b58c42` (28), `#922f12` (14) y `#3d3c22` (4).**
- `(portal)/welcome-panel.tsx:284–513` (por ejemplo 304, 318, 347, 375, 399–418, 432, 444, 501, 513)
- `(public)/login/login-view.tsx:130, 131, 132, 146, 220, 235, 251, 301, 373, 410, 421, 429, 442`
- `(public)/superadmin-insulae/superadmin-view.tsx:40, 41, 45, 83, 105, 139`

Reemplazo: la clase del token correspondiente.

**D. Variantes de tono que no existen como token.**

| Color | Archivos | Reemplazo |
|---|---|---|
| `#8d6928` | `welcome-panel.tsx:378, 455, 458, 467`; `superadmin-view.tsx:45` | Formalizarlo como `--color-warning` |
| `#78230b` | `welcome-panel.tsx:478, 490` | `--color-brand-deep` o `terracotta`. El hover no debe oscurecer más la teja |
| `#c99f52` | `login-view.tsx:235, 301, 429`; `superadmin-view.tsx:139` | Se elimina junto con el degradado |
| `#f4f7f6` | `welcome-panel.tsx:321, 350, 570` | `surface-3` |
| `#f5f4f0` | `src/components/minisitio/collapsed-menu.tsx:53` | `surface-3` |

**E. Negro olivo del login: `#0e0e0a`, `#242416`, `#32321e` y `#181812`.**
- `login-view.tsx:124, 127, 146, 301, 306, 347, 429`
- `superadmin-view.tsx:38, 47, 139`

Reemplazo: color sólido `chrome-strong` o `chrome`.

**F. Paleta "kraft" de reportes.** Son 21 hex y 139 apariciones. La comparte el admin, que la usa todavía más: `#e8ddd0` 113 veces y `#c8b8a0` 89 veces allá. Valores: `#4c4a24`, `#7a5e44`, `#5a4838`, `#2b1e12`, `#c8b8a0`, `#c8b49a`, `#c8b59d`, `#e8ddd0`, `#e0d5c8`, `#ece5d8`, `#f0e0c8`, `#d0b898`, `#faf6f0`, `#fdfbf7`, `#dfcfb9`, `#ddd0be`, `#d8c8b4`, `#e5d8c8`, `#a89678`, `#f0e6d6` y `#6a3810`.
- `(portal)/_reportes/report-chrome.tsx:27–199`
- `(portal)/_reportes/financial-cards.tsx:23–60`
- `(portal)/reporte-cuotas/reporte-cuotas-view.tsx:115–660`
- `(portal)/reporte-cuotas-extraordinaria/reporte-cuotas-extraordinaria-view.tsx:279–498`
- `src/components/minisitio/ui/paginator.tsx:39, 59, 75, 76, 88`

Reemplazo:
- Títulos `#4c4a24` por `fg`.
- `#7a5e44` por `fg-3`.
- Bordes por `stroke-2` y `stroke-3`.
- Filas alternas por `surface-2`.

**G. Rosa y vino para "comercio": `#8f1a3d`, `#fdf6fa`, `#f5e0eb`, `#35202a`, `#fff5f7`, `#f5c0d0` y `#501020`.**
- `financial-cards.tsx:28–30, 64–66`
- `report-chrome.tsx:107`

Recomiendo distinguir "propietario" y "comercio" con una etiqueta o un ícono, no con una paleta paralela. Hoy `#8f1a3d` al 60 % sobre `#fdf6fa` da 3.36:1, que no pasa.

**H. Colores semánticos de Tailwind escritos como hex.**
- `financial-cards.tsx:38` (`#dc2626`), `45` (`#d97706`), `52` (`#16a34a`), `124` (`#fef2f2`, `#b91c1c`, `#fecaca`) y `125` (`#ecfdf5`, `#047857`, `#a7f3d0`)
- `#0e7490` en `reporte-cuotas-view.tsx:336` y `reporte-cuotas-extraordinaria-view.tsx:392`

Reemplazo: `critical`, `success` y `warning`.

**I. Plantilla del correo: `_actions/account.ts:170–202`.** Usa `#f3f4f6`, `#1E3932`, `#cba258`, `#1f2937`, `#e5e7eb` y `#d1d5db`. En un correo los colores tienen que ir en hex dentro del HTML, así que ahí se quedan como hex, pero con los valores de la marca.

**J. El propio `minisitio.css`.**
- Línea 16: `--color-canvas-2: #f3f4f6` (gris frío).
- Líneas 345–366: `.sidebar-scroll` con `rgba(0,0,0,.1/.2)`. Se puede borrar, porque `scrollbar-slim` ya la sustituye.
- Líneas 369–391: el aviso de privacidad usa `#374151`, `#111827`, el enlace `#b45309` y su hover `#92400e`, y bordes `#e5e7eb`. Pasarlos a `fg-2`, `fg`, `brand` subrayado, `brand-deep` y `stroke-2`.
- Líneas 230–285: las utilidades antiguas `primary-*`. `text-primary-light` es oro usado como texto (3.09:1).

**K. Paleta por defecto de Tailwind: 1,400 clases.**
- Por familia: `gray` 853, `red` 179, `blue` 128, `green` 114, `slate` 33, `yellow` 26, `purple` 21, `amber` 13, `orange` 11, `emerald` 10, `rose` 6, `pink`, `neutral` e `indigo` 2 cada una.
- Archivos con más líneas afectadas: `estado-resultado-view.tsx` (97), `estado-cuenta-arrendamiento-view.tsx` (74), `dashboard-view.tsx` (67), `estado-cuenta-propiedad-view.tsx` (63), `propiedades-view.tsx` (59) y `arrendamientos-view.tsx` (58).
- Los grises de Tailwind 4 son fríos (tono ~260°), al revés del olivo. Además, `text-gray-400` (36 usos) da 2.60:1 sobre blanco y `text-gray-300` (18) da 1.47:1.

Equivalencias propuestas:

| Tailwind | Token |
|---|---|
| `gray-50` | `surface-2` |
| `gray-100` | `surface-4` |
| `border-gray-200` | `stroke-2` |
| `border-gray-300` | `stroke` |
| `text-gray-500` y `-600` | `fg-3` |
| `text-gray-700` | `fg-2` |
| `text-gray-900` | `fg` |
| `red` | `critical` |
| `green` | `success` |
| `yellow` y `amber` | `warning` |
| `blue` y `purple` | Fuera; no tienen papel en la marca |

**L. Clases que no producen ningún estilo.**
- `shadow-soft`, `shadow-medium` y `text-primary-800` en `src/components/minisitio/legacy-card.tsx:14, 17`.
- `bg-grid-slate-100` en forgot y reset password, líneas 52 y 135.
- `animate-in fade-in` y similares (ver §4.1): no hay ningún plugin que las defina.
- `src/components/minisitio/status-badge.tsx:6–16` usa `green`, `red`, `yellow` y `blue` en sus versiones `-100` y `-800`, todas de la paleta por defecto.

**M. PDFs de jsPDF.** Usan tuplas RGB de grises de Tailwind, por ejemplo `setTextColor(31, 41, 55)` y `(239, 68, 68)`. Están en `property-statement-pdf.ts`, `rental-statement-pdf.ts`, `propiedades-report-pdf.ts`, `reporte-general-pdf.ts` y `_lib/estado-cuenta-pdf.ts`. No heredan los tokens de CSS.

### 1.6 Degradados

Hay 65 líneas con degradado.
- **Unos 25 son falsos**, con el mismo color al inicio y al final (familia A). Se cambian por un color sólido.
- **Decorativos que se eliminan:**
  - `welcome-panel.tsx:226` (encabezado `from-brand-deep via-brand to-brand-deep`), `524` y `725`
  - `login-view.tsx:127`, `133` (radial), `301` (botón dorado de tres colores en `font-black` con `tracking-[0.16em]`), `351`, `429` y `463`
  - `superadmin-view.tsx:38, 45, 139`
  - `forgot-password-view.tsx:50, 161, 169` y `reset-password-view.tsx:82, 94, 113, 133, 267, 275`. Las líneas 169 y 275 son texto con degradado.
  - `comunicados-view.tsx:104, 117, 130` (pestañas azul, verde y morada), `155` y `270`
  - `experiencias-view.tsx:219, 247` y `error-screen.tsx:11`
- **Se conservan, con un token `--color-scrim`:** las sombras que oscurecen una foto para que se lea el texto encima, en `propiedades/[id]/image-gallery.tsx:102`, `experiencias-view.tsx:261` y `login-view.tsx:462`.

---

## 2. Tipografía

### 2.1 Admin frente a minisitio

| | Admin | Minisitio |
|---|---|---|
| Carga | `next/font/google` con Inter (`(admin)/layout.tsx:2, 11–14`, variable `--font-inter`). Además, DM Serif Display y Plus Jakarta Sans en `listado-usos-suelo/nuevo/page.tsx:4` y `[landUseId]/editar/page.tsx:5`, y Lora y Nunito Sans en `listado-zonas/nuevo/page.tsx:4` y `[zoneId]/editar/page.tsx:5`. Cada familia es otra descarga de Google durante el build | Nada |
| `--font-sans` | `var(--font-inter), ui-sans-serif, system-ui, sans-serif` (`globals.css:119`) | No está definido, así que `font-sans` usa la lista por defecto de Tailwind |
| `body` | `font-sans tracking-[-0.01em] antialiased` | Fuentes del sistema: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto…` (`minisitio.css:247`). El correo usa Arial |
| Cifras | — | `font-mono` 83 veces, `tabular-nums` solo 6 |
| Pesos | — | `medium` 221, `bold` 209, `semibold` 201, `black` 10, `extrabold` 8 |
| Tamaños | — | `text-sm` 351, `text-xs` 258, y 68 usos por debajo de 12 px (10 px ×35, 11 px ×16, 9 px ×11, 8 px ×3) |
| Mayúsculas | — | `uppercase` 174, `tracking-wider` 78, `tracking-widest` 26. Es justo el estilo que se rechazó |

### 2.2 Opciones

| Opción | A favor | En contra |
|---|---|---|
| **Inter servida desde el repo** | Es la misma fuente que el admin, así que se ve como un solo producto. Se lee bien a 12–14 px por su ojo grande. Tiene cifras tabulares y es variable de 100 a 900, de modo que 500 y 600 se ven correctos | Es neutra. La calidez tiene que venir del color, del sidebar, de la letra crema y de la fotografía |
| **Lato** (la que se asocia con Slack) | Humanista y cálida | En Google y `@fontsource/lato` solo hay 100, 300, 400, 700 y 900. Por cómo elige pesos el navegador, `font-medium` se vería normal y `font-semibold` en negritas. Su ojo es más pequeño, así que a 12–13 px se lee más chica. Para tener 500 y 600 habría que alojar a mano los archivos de Lato 2.0 (licencia OFL). Además, se aleja del admin |
| **Fuentes del sistema** (lo que hay hoy) | Cero bytes y cero riesgo en el build | Cada sistema dibuja distinto (San Francisco, Segoe UI, Roboto), así que la maqueta cambia. Admin y minisitio se ven como productos distintos |

Sobre Slack: se le asocia con Lato, pero no hay una confirmación oficial y hay fuentes que dicen que su cliente usa la fuente del sistema (ver §Fuentes). No vale la pena sacrificar los pesos 500 y 600 por ese parecido.

### 2.3 Recomendación

Servir **Inter Variable desde el repo con `next/font/local`**, en un módulo que importen los dos layouts raíz. El archivo woff2 se sube al repositorio, ya sea `InterVariable.woff2` del proyecto oficial `rsms/inter` (licencia OFL) o la copia de `@fontsource-variable/inter`.

Ventajas:
- Elimina la descarga de Google en el build, que ya falló una vez en Vercel.
- Funciona sin instalar paquetes nuevos. Eso importa porque la instalación depende de un registro privado (`vercel.json`).
- Mantiene el ajuste automático de la fuente de respaldo, que evita saltos de maqueta al cargar.

```ts
// src/app/fonts.ts — lo importan (admin)/layout.tsx y (minisitio)/layout.tsx
import localFont from "next/font/local";
export const inter = localFont({
  src: [{ path: "./fonts/InterVariable.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});
```

Cambios en el minisitio:
1. Poner `className={inter.variable}` en el `<html>` de `(minisitio)/layout.tsx:31`.
2. Agregar `--font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;` al `@theme` de `minisitio.css`.
3. Borrar el `font-family` de `minisitio.css:247`.

Hay que mantener la variable en `<html>`. Si se pusiera en `<body>`, habría que usar `@theme inline` (ver §5).

### 2.4 Escala de tamaños

La escala parte de la de Fluent. El espaciado entre letras sale de la fórmula de Inter, `−0.0223 + 0.185·e^(−0.1745·tamaño)` en em. Con ese criterio, el `tracking-[-0.01em]` global del admin queda demasiado apretado a 12 px, donde lo correcto es ~0.

```css
@theme {
  --text-caption: 12px;  --text-caption--line-height: 16px;   /* espaciado ≈ 0 */
  --text-body: 14px;     --text-body--line-height: 20px;      --text-body--letter-spacing: -0.006em;
  --text-body-lg: 16px;  --text-body-lg--line-height: 22px;   --text-body-lg--letter-spacing: -0.011em;
  --text-subtitle: 20px; --text-subtitle--line-height: 28px;  --text-subtitle--letter-spacing: -0.017em;
  --text-title: 24px;    --text-title--line-height: 32px;     --text-title--letter-spacing: -0.02em;
  --text-display: 28px;  --text-display--line-height: 36px;   --text-display--letter-spacing: -0.021em;
}
```

Reglas:
- Pesos 400, 500 y 600; 700 solo para cifras de indicadores; nunca 800 ni 900.
- Nada de mayúsculas espaciadas.
- Mínimo 12 px.
- Los campos de formulario a 16 px en móvil, porque Safari de iOS hace zoom en campos de menos de 16 px.
- Las cifras con `tabular-nums` en lugar de `font-mono`.

---

## 3. Mapeo de los roles de Slack a Val'Quirico

### 3.1 Referencia de Slack

Estos valores vienen de terceros, no de documentación oficial de Slack.
- **Tema clásico Aubergine**, según una cadena de importación publicada para Mattermost:
  - Columna `#3f0e40`, texto `#cbc1cb`, hover `#350d36`, activo `#1264a3`.
  - Encabezado `#350d36`, barra de equipos `#2b0a2c`.
  - Mención `#cd2553`, en línea `#2eb67d`, ausente `#ecb22e`.
  - Contenido `#ffffff` con texto `#1d1c1d`, enlace `#1264a3`, botón `#007a5a`.
  - Resaltado de mención `#fbf4d6`, error `#e01e5a`.
- **Morado de marca:** `#4a154b`.

Contrastes de esos valores:

| Par de Slack | Contraste |
|---|---|
| Texto `#cbc1cb` sobre la columna | 8.92:1 |
| Blanco sobre la columna | 15.58:1 |
| Blanco sobre el activo azul | 6.22:1 |
| Azul activo frente a la columna | 2.51:1 (no pasa) |
| Badge de mención frente a la columna | 2.96:1 (no pasa) |
| Texto `#1d1c1d` sobre blanco | 16.99:1 |

Sobre esa base, la propuesta mejora a Slack en el estado activo.

### 3.2 Estructura

| Slack (escritorio, diseño actual) | Minisitio propuesto | Token |
|---|---|---|
| El color del tema enmarca la ventana y el área de trabajo queda como superficie clara encima. Slack tiene incluso una preferencia de "degradado de ventana"; aquí va sólido | `body` en `chrome-strong`. Panel de contenido en `surface` con `rounded-panel` (8 px), sin sombra: el contraste ya lo separa | `chrome-strong`, `surface` |
| Barra superior con buscador | Logo claro (`vq_logo_light.png`); buscador ⌘K al centro ("Buscar comunicados, documentos, estados de cuenta"); campana con badge; ayuda | `chrome-field`, `mention` |
| Pestañas Inicio, DMs, Actividad y Archivos; botón "+"; avatar | Los 5 grupos que ya existen en `NAV_GROUPS` (`minisitio-shell.tsx:314–330`): Inicio, Mi patrimonio, Financiero, Atención y Val'Quirico. Botón "+ Nueva solicitud". Avatar con Mi perfil y Cerrar sesión | `chrome-strong`, `chrome-selected` |
| Sidebar con secciones plegables; no leídos en negritas; menciones con badge | Ítems del grupo activo. Comunicados no leídos en peso 600 con un punto. Solicitudes con respuesta, con badge | `chrome`, `chrome-ink`, `unread`, `mention` |
| Encabezado del canal dentro del panel | Título y migas de pan dentro del panel. Hoy es una barra blanca aparte con `shadow-sm` (`minisitio-shell.tsx:681–726`) | `fg`, `fg-3`, `stroke-3` |
| Móvil: navegación por pestañas abajo | 4 pestañas más "Más", en lugar del cajón de 268 px | `chrome-strong` |

Los módulos hundidos con marca de agua del rail actual no tienen equivalente en Slack, que usa secciones planas con título.

### 3.3 Roles, tokens y contraste

En la columna "Resultado", las abreviaturas de superficie son: s1 = `surface`, s2 = `surface-2`, s3 = `surface-3`, s4 = `surface-4`.

**Chrome (sidebar y barra superior)**

| Rol de Slack | En Slack | Token propuesto | Valor (mezclado) | Par evaluado | Resultado |
|---|---|---|---|---|---|
| Barra superior y riel de pestañas | `#350d36` / `#2b0a2c` | `--color-chrome-strong` | `#2d2c18` | ink / ink-soft / label | 13.32 / 8.35 / 6.69 ✓ |
| Fondo del sidebar | `#3f0e40` | `--color-chrome` | `#3d3c22` (= brand-deep) | ink | 10.59 ✓ |
| Texto principal y no leído | `#ffffff` en negritas | `--color-chrome-ink`, en peso 600 si no está leído | `#fbf8f0` (= gold-soft) | Sobre chrome / hover / pressed | 10.59 / 8.25 / 7.38 ✓ |
| Texto secundario (ítem en reposo, íconos) | `#cbc1cb` | `--color-chrome-ink-soft` | `.76` → `#cdcbbf` | chrome / hover / pressed / strong | 6.90 / 5.59 / 5.08 / 8.35 ✓ |
| Título de sección | Igual que el secundario | `--color-chrome-label` | `.66` → `#bab8aa` | chrome / hover / strong | 5.64 / 4.66 / 6.69 ✓ |
| | | | | Sobre pressed | **4.28 ✗**. En hover y pressed el título sube a `ink-soft` (5.59 / 5.08) |
| Decoración (puntos, separadores) | — | `--color-chrome-faint` | `.45` → `#92917f` | chrome / hover | **3.51 / 3.06**. Solo decoración, nunca texto que informe |
| Hover | `#350d36` (oscurece) | `--color-chrome-hover` | Blanco al 8 % → `#4d4c34` | Ver filas de arriba | Aclara en lugar de oscurecer |
| Presionado | — | `--color-chrome-pressed` | Blanco al 12 % → `#54533d` | Ver filas de arriba | — |
| Ítem activo | `#1264a3` con `#fff` | `--color-chrome-selected` y `-selected-ink` | `#f1eac1` / `#3d3c22`, radio 6 px | Texto | 9.25 ✓ |
| | | | | Píldora frente al chrome (estado) | 9.25 ✓ (Slack: 2.51 ✗) |
| | | | | Ícono `#5d5b35` en la píldora | 5.73 ✓ |
| | | | | Ícono dorado `#b58c42` en la píldora | **2.54 ✗**, no usar |
| Marcador lateral (opcional, solo rail colapsado) | — | `--color-chrome-accent` | `#b58c42`, 3 px | Frente al chrome | 3.64 ✓ |
| No leído | Negritas | Peso 600 más `--color-unread` | Punto de 6 px en `#ffcf87` (crema del sello) | Frente al chrome | 7.78 ✓ |
| Badge de mención | `#cd2553` con `#fff` | `--color-mention` y `-mention-ink` | `#b8431a` (teja del sello) / `#ffffff` | Cifra | 5.45 ✓ |
| | | | | Badge frente al chrome | **2.06 ✗**, igual que Slack (2.96). La cifra es la información. Alternativa: badge `#fbf8f0` con cifra `#b8431a` (5.13 ✓, y 10.59 ✓ frente al chrome) |
| | | | | Badge dentro de la píldora (frente a `#f1eac1`) | 4.48 ✓ |
| Foco en el chrome | — | `--color-chrome-focus` | Anillo de 2 px en `#ffcf87`, separado 2 px | chrome / strong | 7.78 / 9.78 ✓ |
| Buscador | Campo translúcido | `--color-chrome-field` | Blanco al 10 % sobre strong → `#42412f` | Texto / texto de ayuda al 66 % | 9.75 / 5.30 ✓ |
| Tooltip | — | `chrome-strong` con `chrome-ink` | — | — | 13.32 ✓ |
| Divisores | — | `--color-chrome-line` | Blanco al 10 % | Frente al chrome | 1.36, decorativo |
| Logotipo | — | `vq_logo_light.png` (colapsado: `logo-mono.png`) | Letras blancas | chrome / strong | 11.24 / 14.14 ✓ |

**Contenido**

| Rol de Slack | En Slack | Token propuesto | Valor | Par evaluado | Resultado |
|---|---|---|---|---|---|
| Superficie de trabajo | `#ffffff` | `--color-surface`, `-2`, `-3`, `-4` (sin cambios) | `#ffffff`, `#fafafa`, `#f5f5f5`, `#f0f0f0` | — | — |
| Texto principal | `#1d1c1d` | `--color-fg` | `#242424` | s1 / s3 | 15.52 / 14.24 ✓ |
| Texto secundario | — | `--color-fg-2` | `#424242` | s1 | 10.05 ✓ |
| Metadatos | — | `--color-fg-3` | `#616161` | s1 / s2 / s3 / s4 / gold-soft / highlight | 6.19 / 5.93 / 5.68 / 5.43 / 5.84 / 5.50 ✓ |
| Deshabilitado | — | `--color-fg-4` | `#707070` | s1 / s2 / s3 | 4.95 / 4.74 / 4.54 ✓ |
| | | | | s4 | **4.35**. Solo para deshabilitado, que WCAG exime |
| Borde de tarjeta | — | `--color-stroke-2` | `#e0e0e0` | Frente a s1 | **1.32**. Decorativo: la tarjeta no es un control |
| Borde de control | — | `--color-stroke` más el nuevo `--color-stroke-accessible` | `#d1d1d1`, con borde inferior `#616161` (patrón de Fluent) | Frente a s1 | **1.53 ✗** si va solo; 6.19 ✓ con el borde inferior |
| Botón primario | `#007a5a` con `#fff` (5.34) | `--color-brand` | `#5d5b35` con `#fff` | — | 6.97 ✓ |
| Hover del primario | — | Nuevo `--color-brand-hover` | `#4b4a2b` | — | 9.08 ✓. Hoy `brand-uplift` da 4.95 y aclara al pasar el cursor |
| Primario presionado | — | `--color-brand-deep` | `#3d3c22` | — | 11.24 ✓ |
| Botón secundario | — | s1 con borde `stroke` y texto `fg` | — | Reposo / hover en s3 | 15.52 / 14.24 ✓ |
| Destructivo | `#e01e5a` | `--color-danger` | `#c82014` con `#fff` | — | 5.72 ✓ |
| Enlace | `#1264a3` (6.22) | `--color-brand`, subrayado | `#5d5b35`; hover `#3d3c22` | Frente a s1 / hover | 6.97 / 11.24 ✓ |
| | | | | Frente al texto `fg` | **2.23 ✗**: el subrayado es obligatorio en texto corrido |
| Foco en el contenido | — | Anillo de 2 px en `--color-brand`, separado 2 px | `#5d5b35` | s1 / s3 / mint | 6.97 / 6.39 / 5.73 ✓. Hoy es dorado: 3.09 / 2.83 / 2.81 |
| Éxito | `#007a5a` | `--color-success` y nuevo `-success-bg` | `#107c10` / `#ecf5ec` | s1 / fondo | 5.37 / 4.81 ✓ |
| Advertencia | `#ecb22e` | Nuevo `--color-warning` y `-warning-bg` | `#8d6928` / `#fbf8f0` | s1 / fondo | 5.02 / 4.73 ✓ |
| | | | | Sobre `#f1eac1` | **4.13 ✗**, no combinar |
| Crítico | `#e01e5a` | `--color-critical`, unificado en `#c82014`, más nuevo `-critical-bg` | `#c82014` / `#fbefef` | s1 / tinte al 10 % / fondo | 5.72 / 4.85 / 5.09 ✓. `#d13438` sobre su tinte: 4.26 ✗ |
| Mención en el contenido (fila no leída) | `#fbf4d6` | Nuevo `--color-highlight` | `#f6f1e8` (oro al 12 %) | `fg` / `fg-3` | 13.80 / 5.50 ✓ |
| Barra de la fila no leída | — | Nuevo `--color-highlight-bar` | `#922f12`, 3 px | Frente a highlight | 7.08 ✓. Dorada: 2.75 ✗ |
| Separador "Nuevo" | `#e01e5a` | `--color-terracotta` | `#922f12` | s1 / highlight | 7.96 / 7.08 ✓ |
| Indicador de en línea | `#2eb67d` | — | No aplica en el minisitio | — | — |

**Colores descartados para el fondo del sidebar:**
- **`#5d5b35`:** la letra principal da 6.57, la secundaria 4.60 y los títulos **3.91 ✗**. Con hover, la secundaria baja a **3.89 ✗**. Además, el botón primario queda a **1.00:1** del fondo.
- **Vino `#4f140d`:** los textos dan 13.76 y 8.41 ✓, pero un fondo rojizo choca con el rojo de "vencido" (`#c82014` frente a `#4f140d` da 2.55). Mejor dejarlo para el logotipo.

**Si se conserva el rail claro ("pergamino") como tema alternativo:**
- Subir `nav-ink-soft` de .74 a .82. Así da 6.08 sobre `nav`, 5.48 sobre `nav-sunken` y 5.06 sobre `nav-hover`, todos ✓.
- Cambiar el marcador por `#5d5b35`: 5.46 frente a `nav-sunken`, contra 2.42 del dorado.

### 3.4 Pares que fallan hoy

| Par | Dónde | Contraste | Corrección |
|---|---|---|---|
| Blanco sobre `#cba258` y sobre `#bca065` | Unos 25 botones y encabezados (familia A) | 2.37 / 2.51 | `bg-brand` (6.97) con hover `brand-hover` (9.08) |
| `#cba258` como texto | `comunicados-view.tsx:84, 167`; `experiencias-view.tsx:168, 179`; `forgot-password-view.tsx:152`; `reset-password-view.tsx:103, 122, 258` | 2.37 | `text-brand` o `text-warning` |
| `text-primary-light` (oro `#b58c42` como texto) | `propiedades-table.tsx:294, 301`; `arrendamientos-table.tsx:182, 189`; `dashboard-view.tsx:187`; `send-email-modal.tsx:102–107` | 3.09 | `text-warning` (5.02) |
| `Badge` de advertencia: `text-gold` sobre `bg-gold-soft` | `src/components/ui/badge.tsx:12` (compartido) | 2.91 | `text-warning` (4.73) |
| `Badge` por defecto: `text-ink-soft/60` en 9 px | `badge.tsx:10` (compartido) | 2.43 | `fg-3` |
| Etiqueta y nota de `StatCard`: `ink-soft/75` y `/70` | `src/components/ui/stat-card.tsx` (compartido) | 3.19 / 2.90 | `fg-3` |
| Cifra blanca sobre badge dorado (10 px) | `minisitio-shell.tsx:462` | 3.09 | `bg-mention` (5.45) |
| Anillo de foco dorado | `ui/button.tsx:7`, `ui/page-back-badge.tsx:26`, `app-sidebar.tsx:779` | 3.09 / 2.83 / 2.81 | Anillo `brand` |
| `focus:ring-[#cba258]` (×9) y `focus:ring-[#b58c42]/5` (×4) | Formularios y modales | 2.37 / ≈1.0 | Ídem |
| `nav-ink-soft` sobre `nav-sunken` y `nav-hover` | Subítems, `minisitio-shell.tsx:365` (también en el admin) | 4.46 / 4.17 | Alfa .82 (5.48 / 5.06) |
| `nav-ink-faint` como texto | `minisitio-shell.tsx:620` (tipo de usuario, 10 px); `app-sidebar.tsx:760` ("Sesión activa") | 2.83–2.98 | `nav-ink-soft` |
| Marcador dorado frente a `nav-sunken` | `minisitio-shell.tsx:354`; `app-sidebar.tsx:258` | 2.42 | Marcador `brand` (5.46) |
| `text-gray-400` (×36) y `text-gray-300` (×18) sobre blanco | Varias vistas | 2.60 / 1.47 | `fg-3` o `fg-4` |
| `#7a5e44` al 60 % sobre `#faf6f0` | `financial-cards.tsx:24` | 2.50 | `fg-3` |
| `#8f1a3d` al 60 % sobre `#fdf6fa` | `financial-cards.tsx:29` | 3.36 | `fg-3` |
| `StatusBadge` en rojo (`critical` sobre `critical/10`) | `ui/fluent.tsx:128` (compartido) | 4.26 | `critical` = `#c82014` (4.85) |
| `ink-soft/40`, el patrón de etiquetas de `AI_DESIGN_PROMPT.md` §4 y §9 | Documento | 1.75 | No bajar de .58 de opacidad en texto |

### 3.5 Bloque `@theme` propuesto

Solo se agregan nombres nuevos. No se redefine ningún nombre compartido con el admin, salvo `--color-critical`, que conviene cambiar en los dos archivos.

```css
@theme {
  /* Chrome "olivo nocturno" — el papel del aubergine de Slack */
  --color-chrome-strong: #2d2c18;                    /* barra superior, pestañas, tooltip */
  --color-chrome: #3d3c22;                           /* sidebar (= brand-deep) */
  --color-chrome-hover: rgb(255 255 255 / 0.08);     /* → #4d4c34 */
  --color-chrome-pressed: rgb(255 255 255 / 0.12);   /* → #54533d */
  --color-chrome-field: rgb(255 255 255 / 0.10);     /* buscador sobre strong → #42412f */
  --color-chrome-line: rgb(255 255 255 / 0.10);
  --color-chrome-ink: #fbf8f0;                       /* 10.59:1 */
  --color-chrome-ink-soft: rgb(251 248 240 / 0.76);  /* 6.90:1 */
  --color-chrome-label: rgb(251 248 240 / 0.66);     /* 5.64:1 */
  --color-chrome-faint: rgb(251 248 240 / 0.45);     /* solo decoración */
  --color-chrome-selected: #f1eac1;                  /* píldora activa */
  --color-chrome-selected-ink: #3d3c22;              /* 9.25:1 */
  --color-chrome-accent: #b58c42;                    /* marcador de 3 px, 3.64:1 */
  --color-chrome-focus: #ffcf87;                     /* 7.78:1 */
  /* Avisos */
  --color-mention: #b8431a;                          /* cifra blanca 5.45:1 */
  --color-mention-ink: #ffffff;
  --color-unread: #ffcf87;
  --color-highlight: #f6f1e8;
  --color-highlight-bar: #922f12;                    /* 7.08:1 */
  /* Complementos del contenido */
  --color-brand-hover: #4b4a2b;                      /* 9.08:1 con blanco */
  --color-stroke-accessible: #616161;                /* borde inferior de campos, 6.19:1 */
  --color-warning: #8d6928;                          /* 5.02:1 */
  --color-warning-bg: #fbf8f0;
  --color-success-bg: #ecf5ec;
  --color-critical-bg: #fbefef;
}
```

Las clases de Tailwind 4 apuntan a `var(--color-…)`. Por eso, un tema claro alternativo se resuelve con un bloque `[data-theme="pergamino"] { --color-chrome: #f6f4ec; … }`, sin tocar los componentes. Es parecido a como Slack deja elegir tema.

---

## 4. Animación

### 4.1 Lo que hay hoy

**Minisitio:**
- No importa framer-motion en ningún archivo.
- Transiciones: `transition-colors` 138 veces, `duration-200` 86, `transition-all` 67, `transition-standard` 12 (que también anima `all`).
- Escalas al pasar el cursor: `hover:scale-105` 9 y `hover:scale-110` 4.
- Animaciones: `animate-spin` 33 y `animate-pulse` 13.
- Clases de animación que no hacen nada, porque no hay plugin `tw-animate` instalado:
  - `animate-in fade-in` en `resumen-financiero-view.tsx:428`, `reporte-cuotas-view.tsx:114, 306`, `reporte-cuotas-extraordinaria-view.tsx:361`, `login-view.tsx:343`, `src/components/minisitio/tooltip.tsx:55`.
  - Las de los avisos de `create-ticket-modal.tsx:65, 74`.
- No hay ningún `prefers-reduced-motion`, `motion-reduce` ni `useReducedMotion`.
- El carrusel de Experiencias avanza solo cada 4 s, con `stopOnInteraction: false` y sin botón de pausa (`experiencias-view.tsx:95–99, 117–118`).

**Admin** (`src/components/layout/app-sidebar.tsx`), que es la referencia de la casa:

| Valor | Uso | Línea |
|---|---|---|
| `EASE_SMOOTH [0.32, 0.72, 0, 1]` | Curva de geometría | 189 |
| Resorte `{stiffness: 480, damping: 38, mass: 0.7}` | Indicador activo | 192 |
| 0.18 s con retardo 0.06 | Etiquetas | 272 |
| 0.22 s | Flecha del submenú | 385 |
| 0.26 s de alto y 0.16 s de opacidad | Submenú | 401 |
| 0.22 s más 25 ms por ítem | Ítems del submenú, en cascada | 413 |
| 0.16 a 0.20 s | Marca | 678–689 |
| 0.14 s | Cambio de ícono | 792 |
| 110 ms al entrar y 220 ms al salir | Despliegue del rail al pasar el cursor | 891, 896 |
| Resorte `{420, 42, 0.9}` | Cajón móvil | 1015 |

### 4.2 Tokens en CSS

Comprobé en `tailwindcss/dist/lib.js` que `duration-*` lee las variables `--transition-duration-*`, `delay-*` lee `--transition-delay-*` y `ease-*` lee `--ease-*`. Un nombre como `--duration-*` no generaría ninguna clase.

```css
@theme {
  --transition-duration-instant: 80ms;     /* clic, color de interruptores */
  --transition-duration-fast: 140ms;       /* hover, aparición de tooltip, cambio de ícono */
  --transition-duration-base: 180ms;       /* aparición de etiquetas y de contenido */
  --transition-duration-moderate: 220ms;   /* menús, popovers, flecha, subítems */
  --transition-duration-slow: 260ms;       /* geometría: ancho del rail, alto del submenú */
  --transition-duration-deliberate: 320ms; /* cajón o panel grande sin resorte */
  --transition-delay-peek-in: 110ms;
  --transition-delay-peek-out: 220ms;
  --ease-smooth: cubic-bezier(0.32, 0.72, 0, 1);   /* geometría (ya existe) */
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1); /* entradas y opacidad (ya existe) */
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);          /* salidas */
  --default-transition-duration: 140ms;             /* para `transition` sin duración */
  --default-transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  --animate-fade-in: fade-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
  --animate-rise-in: rise-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
  --animate-shimmer: shimmer 1.6s linear infinite;
  @keyframes fade-in { from { opacity: 0; } }
  @keyframes rise-in { from { opacity: 0; transform: translateY(4px); } }
  @keyframes shimmer { to { background-position: -200% 0; } }
}
```

### 4.3 Los mismos valores para framer-motion 12

Conviene un módulo compartido con el admin, por ejemplo `src/shared/utils/motion.ts`, con números idénticos a los del CSS. Hoy el rail del admin tiene estos valores escritos dentro del componente.

```ts
export const EASE = { smooth: [0.32, 0.72, 0, 1], outQuint: [0.22, 1, 0.36, 1], exit: [0.4, 0, 1, 1] } as const;
export const DUR = { instant: 0.08, fast: 0.14, base: 0.18, moderate: 0.22, slow: 0.26, deliberate: 0.32 } as const;
export const SPRING = {
  indicator: { type: "spring", stiffness: 480, damping: 38, mass: 0.7 }, // ζ≈1.04: 95 % en ≈190 ms, sin rebote
  drawer:    { type: "spring", stiffness: 420, damping: 42, mass: 0.9 }, // ζ≈1.08: 95 % en ≈250 ms, sin rebote
  popover:   { type: "spring", visualDuration: 0.22, bounce: 0 },        // visualDuration y bounce existen en 12.42
} as const;
export const STAGGER = { base: 0.03, step: 0.025, maxItems: 6 } as const;
```

Si algún código de JavaScript va a leer estas variables con `getComputedStyle`, hay que declararlas con `@theme static`. Tailwind 4 solo emite las variables que se usan. Lo verifiqué en el CSS compilado: `--ease-out-quint` no aparece porque ninguna clase lo usa.

### 4.4 Cómo se comporta cada interacción

| Interacción | Tiempo y curva | Qué se anima |
|---|---|---|
| Hover de fila o botón | `instant` o `fast` | Solo `background-color` y `color`, sin retardo |
| Clic | `instant` | `motion-safe:active:scale-[0.98]` en botones y 0.94 en íconos. Sustituye al 0.95 de `active-scale` |
| Píldora activa que se desliza entre ítems | `SPRING.indicator` con `layoutId` | Posición (transform) |
| Sección plegable | `slow` con `smooth` para el alto; `base` para la opacidad | Alto y opacidad |
| Popover o menú | `moderate` al entrar, escala de .98 a 1 desde el botón que lo abre; `fast` con `exit` al salir | Transform y opacidad |
| Modal | 220 ms subiendo 8 px; sale en 140 ms | Transform y opacidad |
| Cajón móvil | `SPRING.drawer` | Posición |
| Cambio de página | `animate-rise-in` solo en el panel de contenido, con un `template.tsx` en `(portal)`. Sin animación de salida, porque el App Router desmonta la página | Transform y opacidad |
| Listas | Cascada de 25 ms por ítem, máximo 6; los demás aparecen de golpe | Opacidad |
| Esqueleto de carga a contenido real | Fundido de 140 ms; destello de 1.6 s lineal | Opacidad |
| Aviso (toast) | `rise-in` al entrar, `fast` con `exit` al salir; dura al menos 5 s y se pausa con el cursor o el foco; `role="status"` | Transform y opacidad |

Qué evitar:
- `transition-all` y `transition-standard`: animan cualquier propiedad, incluso el tamaño, y producen saltos.
- `hover:scale` y `-translate-y` en tarjetas.
- Montos que cuentan hacia arriba. Una cifra financiera no debe animarse.
- Rebotes en la navegación y el marco.

### 4.5 Política de movimiento reducido

1. **Envolver `MinisitioShell` en `<MotionConfig reducedMotion="user">`.** Cuando el usuario activó "reducir movimiento", framer-motion apaga las animaciones de posición y de layout y mantiene opacidad y color. Así lo describen su tipo local (`framer-motion/dist/index.d.ts:229–234`) y su documentación.
2. **En `minisitio.css`, después del `@theme`:**

   ```css
   @media (prefers-reduced-motion: reduce) {
     :root {
       --transition-duration-moderate: 0ms;
       --transition-duration-slow: 0ms;
       --transition-duration-deliberate: 0ms;
       --animate-rise-in: fade-in 120ms linear both;
       --animate-shimmer: none;
     }
     html { scroll-behavior: auto; }
   }
   ```

3. **Toda transformación con `motion-safe:`** y toda transición de tamaño con `motion-reduce:transition-none`.
4. **Carrusel de Experiencias:** sin avance automático cuando el usuario reduce movimiento, con un botón visible de pausa y reproducción, y con `stopOnInteraction: true`. WCAG 2.2.2 lo exige para contenido que se mueve solo más de 5 s.
5. **Spinners:** se conservan, porque indican que algo está en curso. Deben ir con `role="status"` y el texto "Cargando…".
6. **Pruebas:** con la opción "Reducir movimiento" de macOS y con la emulación de `prefers-reduced-motion` de las herramientas del navegador.

---

## 5. Riesgos

1. **La trampa de `--space-N` en Tailwind 4: por ahora no hay problema.**
   - Ningún archivo de `src` define `--spacing-*`.
   - `--space-1` a `--space-9` existen en ambos CSS pero no se usan.
   - Reglas:
     - Nunca declarar `--spacing-N` en `@theme`. Cambiaría el valor de `p-N`, `m-N`, `gap-N`, `w-N` y `h-N`, también en los componentes compartidos.
     - Nunca redefinir `--spacing` (el multiplicador base, 0.25 rem) en `minisitio.css`, porque reescalaría todo el espaciado del minisitio.
2. **Choques de nombres dentro de `@theme`.**
   - Tailwind 4.2 ya trae las paletas `olive-*`, `taupe-*`, `mist-*` y `mauve-*` (`tailwindcss/theme.css:274–320`). Por eso los tokens nuevos se llaman `chrome-*` y no `olive-*`.
   - `--ease-in`, `--ease-out` y `--ease-in-out` ya existen (líneas 434–436); la curva nueva se llama `--ease-exit`. `--shadow-xs` a `-2xl` también, y el minisitio usa `shadow-sm` y `shadow-lg`.
   - `--text-*` es el espacio de los tamaños de letra. Ningún token de tamaño puede llamarse igual que un color (por ejemplo, no crear `--text-ink`), o `text-ink` quedaría ambiguo.
   - Si la variable de `next/font` se pone en `<body>` en vez de `<html>`, `--font-sans` necesita `@theme inline`.
   - Las duraciones tienen que llamarse `--transition-duration-*`.
3. **Mismo nombre, dos archivos.** Hoy los valores son idénticos en `globals.css` y `minisitio.css`. Si el minisitio redefine, por ejemplo, `--color-brand-deep` o `--color-critical`, `Button`, `Tooltip` y `StatusBadge` cambiarían solo en el minisitio, sin aviso. Recomendaciones:
   - Usar nombres nuevos para lo propio del minisitio.
   - Pasar los tokens compartidos a un `src/styles/tokens.css` que contenga solo `@theme` (sin `@import "tailwindcss"`) e importarlo desde los dos archivos.
4. **Cada CSS incluye todo el repositorio.**
   - Los dos paquetes compilados pesan unos 283 KB y 281 KB sin comprimir (`.next/static/chunks`).
   - El del minisitio contiene clases que solo usa el admin; lo comprobé con `lg:pl-[var(--sidebar-w)]`.
   - Las listas forzadas de `@source inline` para `cyan`, `lime`, `amber` y `emerald` (`minisitio.css:4–6`) están duplicadas.
   - Solución: `@import "tailwindcss" source(none)` con un `@source` explícito para cada app y para `src/components/ui`.
5. **Componentes compartidos con el admin.** Son `ui/fluent` (`welcome-panel.tsx:36`), `ui/card` (`compact-financial-table.tsx:2`), y `ui/badge`, `ui/button`, `ui/stat-card` y `ui/page-back-badge` (`resumen-financiero-view.tsx:13–17`, `reporte-cuotas-view.tsx:6`, `reporte-cuotas-extraordinaria-view.tsx:7`).
   - `shadow-layered`: `globals.css:148` dice `shadow:`, que no es una propiedad válida, y `minisitio.css:132` dice `box-shadow:`. El mismo `Card` tiene sombra en el minisitio y no la tiene en el admin. Lo confirmé en el CSS compilado.
   - `Button` usa forma de píldora, se encoge a 0.95 al hacer clic, su anillo de foco es dorado y su hover aclara. `Badge` usa 9 px, mayúsculas y `tracking-tighter`. `StatCard` pone recuadros de color distinto por categoría, justo el estilo que se rechazó. `StatusBadge` en rojo no pasa contraste.
   - Arreglar estos componentes cambia también el admin. Hay que corregirlos en ambos lados a la vez o crear piezas propias en `components/minisitio/ui/*`, pero no dividir los tokens en silencio.
6. **El shell del minisitio duplica el rail del admin.** `minisitio-shell.tsx` reimplementa `WELL_RATIO`, `gutterFor` y `ActiveMark` sin framer-motion, y tiene además estos problemas:
   - Las filas con submenú son `<div onClick>` (líneas 396 y 411), así que no se pueden usar con teclado.
   - El botón del menú móvil no tiene `aria-label` (líneas 685–690).
   - Ningún ítem marca `aria-current`.

   El shell nuevo, al estilo Slack, debe usar `button`, `aria-current="page"` y `aria-expanded`.
7. **Lugares que no heredan los tokens de CSS:** la plantilla del correo (`_actions/account.ts:170–202`) y los cinco generadores de PDF. Conviene un módulo de paleta en TypeScript con valores en hex y en RGB para ambos.
8. **Utilidades antiguas.** `--primary-*` y `.bg-primary-*` (`minisitio.css:230–285`, 93 usos) mantienen el oro como color de texto. Hay que pasarlas a `brand` y `warning` antes de borrarlas.
9. **Fuentes en el build.** El admin descarga cinco familias de Google con `next/font/google` (`(admin)/layout.tsx` y cuatro páginas de zonas y usos de suelo). Aunque está fuera del minisitio, es el mismo riesgo de fallo en el build.
10. **Logotipo sobre el fondo nuevo.** El respaldo del shell es `valquirico-logo-light.png`, gris `#e2e2e2`, que no se ve sobre el pergamino. Sobre el sidebar oscuro hay que usar `vq_logo_light.png` (o `logo-mono.png` en el rail colapsado) y dejar `valquirico-logo.png` (`#4f140d`) para fondos claros: tarjeta del login, PDFs y correo.

---

## Fuentes

**Slack** (resumido con mis palabras; los valores de color son de terceros):
- Estructura del diseño actual: Inicio, DMs, Actividad y Archivos, buscador, botón "+" y perfil. https://slack.com/intl/en-au/help/articles/16764236868755-An-overview-of-Slacks-new-design
- Temas personalizados y "degradado de ventana": https://slack.com/intl/en-gb/help/articles/205166337-Change-your-Slack-theme
- Valores del tema Aubergine (importación para Mattermost): https://help.nuilab.org/systems/mattermost/themes/
- Morado de marca `#4A154B`: https://brandpalettes.com/slack-logo-color-codes/
- Navegación por pestañas en móvil: https://slack.com/intl/en-ph/blog/productivity/simpler-more-organized-slack-mobile-app
- Fuente de Slack, fuentes que se contradicen: https://www.designyourway.net/blog/what-font-does-slack-use/ y https://madegooddesigns.com/what-font-does-slack-use/

**Tipografía, animación y accesibilidad:**
- Fórmula de espaciado de Inter: https://d.rsms.me/inter-website/v3/dynmetrics/
- `MotionConfig` y `reducedMotion`: https://motion.dev/docs/react-motion-config
- WCAG 2.2 (1.4.3, 1.4.11, 2.2.2): https://www.w3.org/TR/WCAG22/
- Cómo elige peso el navegador: https://www.w3.org/TR/css-fonts-4/#font-matching-algorithm

**Fuentes locales verificadas:**
- `node_modules/tailwindcss/theme.css`: paletas en 274–320, curvas en 434–436, transición por defecto en 492–493.
- `node_modules/tailwindcss/dist/lib.js`: variables que leen `duration`, `delay` y `ease`, y las opciones `static` e `inline` de `@theme`.
- `node_modules/framer-motion/dist/index.d.ts:208, 229–234`.
- `node_modules/motion-dom/dist/index.d.ts:2023, 2035` (`visualDuration` y `bounce`).
- CSS compilado en `.next/static/chunks/0t0d4by7t3y~t.css` (minisitio) y `0l-w_4zjqin1v.css` (admin).
