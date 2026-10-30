# Análisis de sistema de diseño: Slack (escritorio y web, rediseño 2023+)

Este documento sirve de referencia para rediseñar el minisitio de condóminos (`src/app/(minisitio)/minisitio`). Complementa a `DESIGN.md` (análisis de Starbucks), a `docs/fluent-teams-design-analysis.md` (Fluent 2 / Teams, del panel admin) y a `AI_DESIGN_PROMPT.md` (contrato de implementación). **No es una piel para copiar.** Recoge lo que hace que Slack se sienta de primer nivel (estructura, métricas, estados y movimiento) para traducirlo a la paleta de Val'Quirico en el §9.

**Fecha y alcance.** El análisis se hizo el 2026-10-29 sobre el build público `bv1-13` del cliente web, que es el mismo que carga la app de escritorio. Cubre el rediseño de agosto de 2023 y su evolución hasta 2026, incluida Actividad como bandeja única (mayo de 2026).

**Método.**
1. Leí las hojas CSS públicas que `a.slack-edge.com` sirve a `app.slack.com/client`. Incluyen los chunks asíncronos que lista su `webpack.manifest`: barra lateral, lista de mensajes, DMs, atajos y búsqueda.
2. Revisé el motor de temas en el JS público (`modern.vendor.*.min.js` y `prefs-dialog.*.min.js`): los presets, el mapeo de cada token a su escalón y la opacidad de cada token por modo.
3. Para comportamiento y criterios usé el centro de ayuda, el blog y la documentación de Block Kit.
4. Hay un límite. Sin sesión iniciada no se sirve el CSS del "shell": riel de pestañas, contenedor de la barra lateral, anchos por defecto y apertura del panel lateral. Esas medidas van marcadas como inferidas.

**Leyenda.**
- **[V]** Verificado: CSS o JS inspeccionado, o fuente oficial de Slack.
- **[I]** Inferido: observación del producto o deducción a partir de CSS verificado. No está medido.
- **[P]** Propuesta para Val'Quirico. No es dato de Slack.

Si la etiqueta está en el título de una sección o tabla, vale para todos sus valores, salvo que una fila diga otra cosa.

**Notación.** Un hex de 8 dígitos es RGBA: `#1d1c1d21` es la tinta `#1d1c1d` al 13 %. Calculé los contrastes WCAG componiendo la opacidad sobre el fondo real.

---

## 1. Tema visual y atmósfera

Slack es una herramienta de trabajo vestida con un solo color. Toda la ventana es el **marco** (*chrome*): el riel de pestañas, la barra superior y el fondo de la columna lateral. El marco lleva el color del tema; en el tema por defecto es una berenjena muy oscura (`#39063a`). Sobre él flotan **paneles** con radio de 8 px y una sombra difusa, separados 4 px entre sí: la barra lateral (un velo translúcido), la vista primaria (la conversación) y la secundaria (hilo o perfil). El contenido nunca lleva el color de marca, que vive sólo en el marco. **[V]**

La idea central del rediseño de 2023 fue el foco. Se crearon vistas dedicadas (Inicio, DMs, Actividad, Más tarde y Más) y un único botón Crear. Las notificaciones se llevaron a sus vistas para que cada persona decida cuándo atenderlas, y la búsqueda abre cada resultado en su contexto. La dirección de diseño de producto lo defendió como una forma de bajar la sobrecarga cognitiva. En 2026, Actividad se convirtió en una bandeja única que se procesa hasta vaciarla. **[V]**

Lo que lo hace sentir premium es disciplina, no decoración:

- **Un solo color fuerte.** El marco carga toda la identidad. El contenido es blanco con grises casi neutros. **[V]**
- **La selección es el polo opuesto del panel.** Sobre un marco oscuro, el ítem activo es una píldora casi blanca con tinta oscura (14.7:1). Sobre un marco claro, es una píldora oscura con tinta clara. Así, dónde estás siempre es lo de mayor contraste. **[V]**
- **Estados con velos, no con colores nuevos.** El hover es un velo del 6 % y el presionado uno del 13 %, mezclados con `multiply` sobre el fondo existente. El hover nunca cambia de matiz. **[V]**
- **Jerarquía por peso.** Casi todo mide 15 px. Nombres, títulos y no leídos van en Lato Black (900). **[V]**
- **Densidad honesta.** Filas de 28 px, cuerpo de 15/22 y metadatos de 12 o 13. **[V]**
- **El color significa algo.** Azul es selección, foco y enlace. Verde es acción primaria y presencia. Rojo es mención, peligro y "Nuevo". Amarillo es resaltado temporal. **[V]**
- **Movimiento rápido y silencioso.** Domina el de 80 ms, con una sola curva propia. El spinner sólo aparece si la carga pasa de 400 ms. **[V]**
- **Contención.** Los encabezados de vista son planos con un hairline. Los iconos son monocromos de 16 px y heredan el color del texto. Las insignias sólo muestran conteos. **[V]**

**Características clave**
- Dos capas: el marco en el color del tema y paneles flotantes (radio 8, sombra `0 4px #0000000d, 0 0 20px #0000001a`, 4 px de aire). **[V]**
- Un modelo de tema de 4 roles (navegación, selección, presencia y notificaciones), con un brillo de 1 a 6 y un interruptor para invertir el marco. **[V]**
- Tokens `--dt_*`: 20 paletas de 12 escalones, superficies translúcidas, velos de interacción y sombras de anillo más difusa. **[V]**
- Lato (alojada como "Slack-Lato") en 400/700/900, con la escala 12 · 13 · 15 · 18 · 22 · 28. **[V]**
- Una curva, `cubic-bezier(.36,.19,.29,1)`, y siete duraciones entre 80 y 480 ms. **[V]**
- Todo se navega con teclado: ⌘K para saltar, F6 entre regiones, Esc para marcar leído y ⌥⇧↑/↓ para el siguiente no leído. **[V]**

## 2. Paleta y roles de color

### 2.1 Arquitectura de tokens [V]

Slack Kit, el sistema interno que empezó en 2016, tenía en 2019 más de 40 componentes. Reducir la paleta a 16 colores accesibles fue lo que permitió construir encima el modo oscuro. Hoy los tokens se distribuyen en el bundle `rollup-style-plastic` y siguen la gramática `--dt_color-{familia}-{rol}[-variante]`:

| Parte | Valores | Significado |
|---|---|---|
| familia | `base` · `surf` · `ctr` · `content` · `otl` | relleno sólido · superficie translúcida · contenedor flotante (menú, peek) · texto e iconos · contornos y anillos |
| rol | `pry` · `sec` · `ter` | jerarquía primaria, secundaria y terciaria |
| rol | `hgl-1` · `hgl-2` · `hgl-3` | azul (selección, foco, enlace) · verde (acción primaria, positivo) · amarillo (resaltado) |
| rol | `imp` · `education` | rojo de "importante" (mención, peligro, nuevo) · índigo (avisos educativos) |
| modificador | `inv` · `-hover` · `-pressed` | sobre superficie inversa · velo de hover · velo de presionado |

- **Paletas.** Son 20 matices (tomato, paprika, tangerine, campfire, honeycomb, sunflower, grass, cilantro, mojito, jade, aquarium, lagoon, ocean, indigo, aubergine, sangria, flamingo, rose, horchata y gray) con 12 escalones cada uno (0, 5, 10, 20 … 100). Se guardan como tripletas RGB para poder aplicarles opacidad. En modo oscuro las rampas se invierten y el escalón 0 pasa a ser el más oscuro.
- **Tokens del marco.** Los `--dt_color-theme-*` no están en el CSS: el JS los calcula a partir del tema del usuario (§2.4).
- **Tokens estáticos.** Los `--dt_static_*` cubren sombra, radio, espacio, opacidad, duración, curva y tipo (§3, §4 y §6).

### 2.2 Plano de contenido, tema claro [V]

| Rol | Token | Valor | Uso · contraste sobre `#fff` |
|---|---|---|---|
| Superficie | `base-pry` / `ctr-pry` | `#ffffff` | paneles, menús, modales |
| Superficie secundaria | `base-sec` | `#f8f8f8` | hover de mensaje, encabezados de panel (estilo anterior) |
| Superficie terciaria | `base-ter` | `#eaeaea` | bloques de esqueleto, fondo de icono |
| Texto primario | `content-pry` | `#1d1c1d` | cuerpo y autores · 16.99:1 |
| Texto secundario | `content-sec` | `#454447` | descripciones · 9.67:1 |
| Texto terciario | `content-ter` | `#5e5d60` | placeholders y atajos · 6.54:1 |
| Metadatos (estilo anterior) | — | `#616061` | horas e iconos de acción · 6.26:1 |
| Tinta al 70 % (estilo anterior) | — | `#1d1c1db3` | tema del canal y etiquetas |
| Borde de control | `otl-pry` | `#7c7a7f` | inputs · 4.24:1 (cumple el 3:1 de UI) |
| Borde de botón | `otl-sec` | `#5e5d6073` (45 %) ≈ `#b6b6b7` | botón outline · ≈2:1, el texto identifica el botón |
| Divisor | `otl-ter` | `#5e5d6021` (13 %) ≈ `#eaeaea` | separadores de lista y de pestañas |
| Hairline (estilo anterior) | — | `#1d1c1d21` (13 %) ≈ `#e2e2e2` | anillo de superficies flotantes y encabezados |
| Azul | `content-hgl-1` · `base-inv-hgl-1` · `otl-hgl-1` | `#1264a3` | enlace, ítem resaltado de menú, anillo de foco · 6.22:1 |
| Verde | `base-inv-hgl-2` · `content-hgl-2` | `#007a5a` | botón primario y Enviar · blanco encima 5.34:1 |
| Amarillo | `base-inv-hgl-3` · `content-hgl-3` | `#f1b900` · `#6b5000` | resaltado; mensaje en edición `#f2c74433` |
| Rojo | `base-inv-imp` · `content-imp` | `#e01e5a` · `#c01343` | peligro, insignia roja, línea "Nuevo" · 4.66:1 / 6.15:1 |
| Fondos tenues | `base-hgl-1/2/3` · `base-imp` | `#e3f8ff` · `#e3fff3` · `#fffae0` · `#ffe8ef` | avisos y banners |
| Educación | `base-inv-education` | `#2840a9` | coachmarks |
| Velo de modal | `.c-sk-overlay` | `#00000099` (60 %) | detrás de modales |

### 2.3 Estados de interacción [V]

- **Velo con mezcla.** Se aplica `background-blend-mode: multiply` con `background-image: linear-gradient(velo, velo)` sobre el fondo que ya existe. El velo neutro es `#4544470f` (6 %) en hover y `#45444721` (13 %) presionado. Sobre colores: verde `#0a403221` / `#0a403238`, azul `#122a5921` / `#122a5938`, rojo `#59000f17` / `#59000f38`. El hover es el mismo color, sólo más oscuro.
- **Hover de fila de mensaje:** `#f8f8f8` sólido.
- **Hover de botón de icono:** velo `#1d1c1d0a` (4 %); el icono pasa de `#616061` a `#1d1c1d`.
- **Deshabilitado:** iconos en `#1d1c1d4d` (30 %); enlaces deshabilitados de la barra lateral a opacidad .64.
- **Foco, en todos los controles:** `0 0 0 1px #1264a3, 0 0 0 5px color-mix(in srgb, #1264a3 30%, transparent)` con radio 8. El borde del control se vuelve transparente. Para error se usa el mismo anillo en `#e01e5a`.

### 2.4 Marco y barra lateral: el modelo de tema de 4 roles [V]

Un tema es un objeto con cuatro roles, un brillo y dos interruptores:

| Rol (JS) | Etiqueta en Preferencias | Qué pinta |
|---|---|---|
| `primary` | System navigation | marco, panel lateral, texto sobre el marco, campos de la barra superior |
| `highlight1` | Selected items | fondo y tinta del ítem seleccionado |
| `highlight2` | Presence indication | punto de presencia activa |
| `important` | Notifications | insignias de mención y el callout de novedades |

- **Brillo e inversión.** `brightness` (de 1 a 6) elige el escalón de cada token. El marco se invierte (se vuelve oscuro con texto claro) sólo si se cumplen tres condiciones: la app está en modo claro, el brillo es mayor que 3 y el tema tiene `sidebarInverted` activo. Los modos posibles son `light`, `light-inverted-sidebar` y `dark`, cada uno con variante de alto contraste (la opción "Darker sidebars").
- **Tema por defecto.** Es Aubergine: todos los roles en la paleta aubergine salvo la presencia (jade), brillo 6 y marco invertido.
- **Fondo del marco.** Puede ser plano o tener la opción "Window gradient". El plano usa el escalón 100 (`#39063a`). El degradado pone un radial al centro (aubergine-90 `#4a154b` del 20 % a transparente en el 80 %) sobre un cónico desde 45° que alterna `#39063a` y `#4a154b` cada 25 %. Es sutil y opcional. Los temas de asistencia visual lo apagan y además subrayan los enlaces.

**Tokens resueltos de Aubergine, en modo claro con el marco invertido (configuración por defecto)**

| Elemento | Token | Valor | Contraste |
|---|---|---|---|
| Marco plano | plt-aubergine-100 | `#39063a` | — |
| Panel de barra lateral | `theme-surf-inv-sec` | `#f9edff` al 11 % ≈ `#4e1f50` | — |
| Texto de fila | `theme-content-inv-sec` | `#f6e4ff` al 90 % | 8.92:1 |
| Fila no leída | `theme-content-inv-pry` en peso 900 | `#ffffff` | 12.84:1 |
| Fila silenciada | `theme-content-inv-ter` | `#f9edff` al 60 % | 5.11:1, sigue en AA |
| Hover de fila | `theme-surf-inv-ter` | `#f9edff` al 8 % | — |
| Fila seleccionada | `theme-base-hgl-1` / `theme-content-hgl-1` | `#f9edff` / `#39063a` | 14.74:1 |
| Insignia de mención | `theme-base-imp` / `theme-content-imp` | `#eabdfb` / `#39063a` | 10.44:1 |
| Presencia activa | `theme-base-inv-hgl-2` | `#20a271` (jade-50) | — |
| Buscador y botones de la barra superior | `theme-surf-inv-pry` | `#f9edff` al 25 %, texto `#ffffff` | — |
| Hairline sobre el marco | `theme-otl-inv-pry` | `#f9edff` al 22 % | — |

Con el marco **sin invertir** (temas claros o brillo de 3 o menos) todo se voltea. El panel es blanco al 90 %, el texto es aubergine-100 al 80 % (9.29:1) y la selección es una píldora oscura (`#611f69` con `#f9edff`, 9.74:1). En ese modo el texto silenciado baja a 3.41:1, y por eso existe "Darker sidebars".

**Otros datos del motor [V]**
- **Presets.** *Single color* (Aubergine, Clementine, Banana, Jade, Lagoon, Barbra, Gray, Mood Indigo), *Vision assistive* (Tritanopia; Protanopia & Deuteranopia), *Fun and new* (12 temas), *Updated classics* (Choco Mint, CMYK, Haberdashery, Hoth, Ochin, Sweet Treat) y una colección "Jazz themes".
- **Color personalizado.** El hex se convierte en paleta con el espacio HCT de Material Color Utilities. La tinta encima es la oscura si el tono HCT es de 66 o más, y la clara si es menor. Los temas antiguos importados se reajustan para conservar el contraste.

### 2.5 Modo oscuro [V]

| Rol | Valor | Contraste |
|---|---|---|
| Superficie / contenedor | `#1a1d21` / `#212428` | — |
| Texto primario / secundario / terciario | `#f8f8f8` / `#b9babd` / `#9a9b9e` | 15.93 · 8.72 · 6.09 :1 |
| Borde de control / divisor | `#797c81` / `#797c814d` | — |
| Azul · verde · rojo | `#2ba5ce` · `#3daa7c` (relleno `#177e56`) · `#de678a` (relleno `#d3305d`) | azul 5.94:1 |
| Velo de modal | `#10121499` | — |
| Hover / presionado | `#f8f8f814` (8 %) / `#f8f8f82e` (18 %) | — |
| Marco de Aubergine | plano `#431349`; panel `#101214` al 60 % ≈ `#241229` | texto 8.01 · silenciado 5.07 · no leído 16.57 :1 |
| Selección / insignia | `#7d3986` con `#efe1f5` / `#cfa1de` con `#200221` | 5.98 · 8.98 :1 |
| Línea "Nuevo" | `#de4e2b` | — |

### 2.6 Elevación [V]

| Nivel | Sombra | Uso |
|---|---|---|
| Panel de ventana | `0 4px #0000000d, 0 0 20px #0000001a` | barra lateral y vista primaria |
| Panel secundario anidado | `0 4px 12px #0000001a` | hilo sobre la vista |
| Flotante leve | `0 0 0 1px #1d1c1d21, 0 1px 3px #00000014` | barra de acciones de mensaje, píldoras de fecha, banner de mensajes nuevos |
| Menú | `0 0 0 1px #1d1c1d21, 0 4px 12px #0000001f` | menús contextuales |
| Toast | `0 0 0 1px #1d1c1d21, 0 4px 12px #00000014`; en hover sube a `0 18px 48px #00000014` | avisos efímeros |
| Peek | `0 0 0 1px #1d1c1d21, 0 18px 48px #0000001a` | vista previa flotante |
| Modal | `0 0 0 1px #1d1c1d21, 0 18px 48px #00000059` | diálogos |
| Botón en hover | `0 1px 3px #00000019, 0 1px 2px -1px #00000019` | primario y outline |
| Escala estática | de sm `0 1px 2px #0000000c` a 2xl `0 25px 50px -12px #00000040` | — |

**Principio:** toda superficie flotante lleva un anillo de 1 px de tinta al 13 % más una sola sombra difusa. El anillo define el borde; la sombra sólo indica que la superficie flota. El contenido en reposo no lleva sombra.

### 2.7 Colores de marca (sólo referencia, no usar) [V]

Aubergine `#4a154b`, horchata `#f4ede4`, negro `#1d1c1d` y los cuatro colores del logotipo: `#36c5f0`, `#2eb67d`, `#ecb22e` y `#e01e5a`. Están en el CSS como `--dt_color-brand-core-*`. Ver §8.3.

## 3. Tipografía

### 3.1 Familia [V]

- **Interfaz:** `"Slack-Lato", "Slack-Fractions", "appleLogo", sans-serif`. Es Lato alojada por Slack en pesos 300, 400, 700 y 900, más itálicas. `appleLogo` sólo asigna U+F8FF (el glifo de Apple) a Lucida Grande, y `Slack-Fractions` cubre las fracciones.
- **Respaldo:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif` y fuentes de emoji.
- **Japonés, coreano y chino:** Noto Sans JP, KR, SC o TC según el `lang`.
- **Monoespaciada:** `Monaco, Menlo, Consolas, "Courier New", monospace`.
- **Preferencias del usuario:** se puede cambiar la fuente sólo en escritorio, y el cambio también aplica en el navegador. El tamaño se ajusta con zoom (⌘+/−), no con la fuente.

### 3.2 Escala [V]

| Token | Tamaño | Interlineado en uso |
|---|---|---|
| micro | 12px | 1.50001 → 18px |
| caption | 13px | 1.38463 → 18px |
| base | 15px | 1.46668 → 22px |
| subtitle | 18px | 1.33334 → 24px |
| title | 22px | 1.36365 → 30px |
| headline | 28px | — |

**Pesos:** 400 base, 600 semibold, 700 bold y 900 black. Los dos últimos pasan por `--custom-font-weight-*` para adaptarse a la fuente del usuario. El tracking (`--custom-font-tracking-*`) vale `inherit` por defecto, es decir, no hay espaciado extra.

### 3.3 Jerarquía por rol

| Rol | Tamaño / interlineado | Peso | Color | Estado |
|---|---|---|---|---|
| Nombre del espacio en la cabecera lateral | 18 / 24 | 900 | tinta sobre el marco | [I] |
| Encabezado de sección ("Canales", "Mensajes directos") | 15 / 28 | 400; 900 si está colapsada con no leídos | `theme-content-inv-sec` | [I] tamaño · [V] regla de no leídos |
| Ítem de barra lateral | hereda 15 / 28 | 400; 900 si no leído | §2.4 | [V] interlineado y pesos · [I] los 15 px heredados |
| Título de vista o canal | 18 / 24 | 900 | `#1d1c1d` | [V] |
| Tema del canal | 13 / 18 | 400 | `#1d1c1db3` | [V] |
| Autor del mensaje | 15 | 900 | `#1d1c1d` | [V] |
| Cuerpo del mensaje | 15 / 22 | 400 | `#1d1c1d` | [V] |
| Hora y metadatos | 12 | 400 | `#616061` | [V] |
| Etiqueta de mensaje (fijado, etc.) | 13 | 400 | `#1d1c1db3` | [V] |
| Botón chico / mediano / grande | 13 / 15 / 18 | 700 | — | [V] |
| Pestañas | 13 / 18 | 700 | `content-sec`; la activa en `content-pry` | [V] |
| Tooltip | 13 / 18 | 700 | blanco sobre `#1d1c1d` | [V] |
| Ítem de menú | 15 / 28 | 400 | `content-pry` | [V] |
| Título de modal | 22 / 30; 18 si hay subtítulo o la pantalla mide 640 px o menos | 900 | — | [V] |
| Píldora de fecha | 13 / 27 | 700 | `content-pry` | [V] |
| Etiqueta "Nuevo" | 13 | 700 | `#e01e5a` | [V] |
| Título de estado vacío | 18 / 24 | 900 | — | [V] |

### 3.4 Principios

- **Peso antes que tamaño.** 15 px cubre casi toda la interfaz, y el 900 marca identidad: quién habló, dónde estás y qué está sin leer. **[V]**
- **Interlineados con decimales** para caer en píxeles enteros (1.46668 × 15 = 22.0002). Los valores son **[V]**; la intención es **[I]**.
- **Sentence case.** En los bundles revisados no hay `uppercase` en la navegación ni en los encabezados de sección. **[I]**
- **Sin tracking** extra. **[V]**
- **Tres tintas** (primaria, secundaria y terciaria) más la tinta al 70 % para metadatos. Nunca se usa gris claro para información necesaria. **[V]**

### 3.5 Licencia y sustitutos [V]

Lato es de Łukasz Dziedzic (tyPoland) y se distribuye con la SIL Open Font License 1.1. Se puede usar, incrustar y modificar, pero "Lato" es un nombre reservado para versiones modificadas. Los archivos "Slack-Lato" viven en el CDN de Slack y no deben enlazarse ni copiarse. Para lograr la misma sensación conviene usar Lato de Google Fonts mediante `next/font/google`, en pesos 400, 700 y 900. Inter mantiene la densidad, pero se siente más fría.

## 4. Layout y dimensiones

### 4.1 Anatomía

```
+------------------------------ marco (color del tema) ------------------------------+
|  [<] [>]              [ Buscar / Saltar a ...      Cmd+K ]                    [?]   |  barra superior ~40-44px [I]
|  +----+ +----------------+ +------------------------------+ +------------------+  |
|  | WS | | Espacio      v | | # canal               49px   | | Hilo         [x] |  |
|  |----| |----------------| |------------------------------| |------------------|  |
|  |Ini.| | > Canales      | |                              | |                  |  |
|  |DMs | |   # general    | |  mensajes                    | |  respuestas      |  |
|  |Act.| |   # avisos  (2)| |                              | |                  |  |
|  |Más | | > Mensajes dir.| |                              | |                  |  |
|  |  + | |                | |  [ composer, radio 8 ]       | |  [ composer ]    |  |
|  | Yo | +----------------+ +------------------------------+ +------------------+  |
|  +----+  panel = velo        panel blanco, radio 8, sombra difusa, 4px de aire     |
+------------------------------------------------------------------------------------+
  riel ~70px [I]   lateral ~260px [I]   vista primaria             secundaria ~400px [I]
```

### 4.2 Medidas

| Elemento | Medida | Estado |
|---|---|---|
| Riel de pestañas | ≈70 px de ancho. Cada pestaña es un mosaico de ≈36 px con etiqueta de 11 a 12 px abajo. Arriba va el espacio de trabajo y abajo Crear (+) y el avatar | [I] medidas · [V] composición |
| Barra superior | ≈40 a 44 px, con historial ←/→, buscador centrado y ayuda | [V] piezas (`p-ia4_top_nav`, `p-ia4_history_buttons`, `p-top_nav__help`) · [I] alto (los modales a pantalla completa empiezan en `top: 44px`) |
| Buscador en reposo | 26 px de alto, radio 6, texto 13/22, icono de 18 px | [V] |
| Desplegable de búsqueda | ancho mínimo 520 px; filas de 40 px o más, con padding de 4 y 16 px | [V] |
| Barra lateral | ≈260 px. Se redimensiona arrastrando (asa de 8 px) o con ←/→ tras enfocarla con F6, y el ancho se guarda | [V] mecanismo · [I] valores |
| Aire entre paneles | 4 px (`margin: 0 4px`) | [V] |
| Radio de paneles | 8 px (12 px en macOS Tahoe) | [V] |
| Encabezado de vista | 49 px; padding 0 16 0 18 (12 a la derecha en el cliente nuevo); hairline inferior `#1d1c1d21`; acciones separadas 8 px | [V] |
| Fila de barra lateral | 28 px; radio 6. El contenedor tiene padding lateral de 8 px, así que la píldora queda a 8 px del borde. Padding interno 0 8 0 24 en canales y 8 en enlaces; gap 8; icono 16 × 16 | [V] (el alto sale de la variable `--sidebar_item_height`; los 28 px son el interlineado verificado) |
| Encabezado de sección | margin 0 8 · padding 0 8 · radio 4 en hover | [V] |
| Desvanecidos de scroll en la barra | 24 px arriba y abajo | [V] |
| Fila de mensaje | avatar, 8 px de separación y contenido; padding ≈8 × 20 en el canal | [V] separación y variantes (vista previa 8 × 20, hilo 8 24 8 16, vista Hilos 20 a los lados) · [I] en el canal |
| Avatar de mensaje | 36 px con radio del 22.2 % (8 px) | [I] tamaño · [V] fórmula |
| Avatar en barra lateral | 16 px, radio 4 | [V] |
| Panel lateral (hilo, perfil) | ≈380 a 420 px, redimensionable; ⌘. lo oculta | [I] ancho · [V] atajo |
| Ancho de lectura | máximo 800 px en la vista de hilos | [V] |
| Modal | 520 px (324 px si la pantalla mide 640 px o menos); a pantalla completa, máximo 1280 px | [V] |
| Peek | 360 px × 65 vh (el de Crear mide 325 px) | [V] |
| Menú | 300 px (mínimo 200; alto máximo `100vh − 62px`) | [V] |
| Tooltip | máximo 200 px (el grande 400; el de persona o canal 500) | [V] |
| Toast | máximo 350 px | [V] |
| Estado vacío | máximo 380 px (la versión extendida 420) | [V] |

### 4.3 Espaciado [V]

Los `--dt_static_space-*` son: 1 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 36 · 40 · 44 · 48 · 52 · 56 · 60 · 64 · 80 … 512 px. Es una rejilla de 4 px con pasos de 4 hasta 64. En los componentes predominan 4, 8, 12, 16, 20, 24 y 28.

### 4.4 Radios [V]

| Valor | Token | Uso |
|---|---|---|
| 2px | `radius-small` | detalles finos |
| 4px | `radius-base` | botón chico, menús (estilo anterior), icono base, hover de sección, botones de la barra superior |
| 6px | — | filas de la barra lateral, buscador superior, botón del título del canal |
| 8px | `radius-large` | paneles, modales, tooltips, toasts, inputs, botón mediano, botones de icono y de acción |
| 12px | `radius-xlarge` | barra de acciones del mensaje, botón grande, peek, grupos de lista (DMs, Más tarde) |
| 9999px | `radius-rounded` | insignias; píldoras de fecha (24 px) y callout (16 px) |
| `clamp(4px, min(22.222%, 12px), 12px)` | `radius-ia` | avatares e iconos de espacio: el 22 % del lado, acotado entre 4 y 12 |

### 4.5 Responsivo y móvil

- **Breakpoints en el CSS, por frecuencia:** 480 px o menos (46 veces), 640 o menos (34), 768 o menos (≈30), 1024 o más (11) y 1441 / 1680 (pocos). Casi todos son de páginas de marketing o administración. El cliente responde sobre todo a clases de tamaño que calcula el JS (`p-ia4_client--narrow`, `p-workspace__primary_view--small/--tiny`, `__secondary_view--tiny/--large`) y a `@container` de 240, 285, 420, 450 y 600 px. **[V]**
- **Modales:** con 640 px o menos pasan a 324 px y padding de 16. Los diálogos ocupan toda la pantalla con 600 px o menos. **[V]**
- **Ventana estrecha en escritorio:** en 2023, al achicar la ventana, DMs, Actividad y Más tarde se plegaban dentro de Más. **[V]** Esto viene del texto de ayuda de 2023; la página actual se reescribió. Hoy las pestañas del riel se pueden personalizar. **[I]**
- **Móvil:** desde 2020 hay una barra de pestañas inferior (Inicio, DMs, Menciones y reacciones, Tú) y un botón Componer, y cada conversación se abre a pantalla completa. **[V]** El conjunto actual de pestañas es **[I]**.

## 5. Componentes

### 5.1 Ítem de barra lateral [V]

| Estado | Fondo | Texto | Peso | Detalle |
|---|---|---|---|---|
| Reposo | transparente | `theme-content-inv-sec` | 400 | el icono de 16 px hereda el color de la fila |
| Hover | `theme-surf-inv-ter` (8 %) | igual | 400 | aparecen acciones (cerrar, menú) a opacidad .64 y se oculta el sufijo |
| Seleccionado | `theme-base-hgl-1` | `theme-content-hgl-1` | igual | la presencia y las etiquetas heredan el color |
| No leído | — | `theme-content-inv-pry` | 900 | el glifo `#` cambia a su variante gruesa |
| Silenciado | — | `theme-content-inv-ter` | 400 aunque tenga mensajes nuevos | sufijo a opacidad .64 |
| Con mención | — | — | — | insignia `c-badge--themed` (§5.13) |
| Arrastrando | `theme-surf-inv-pry`, opacidad .5 | — | — | líneas de inserción de 2 px |
| Foco con teclado | — | — | — | anillo de 1 px y halo de 5 px al 30 %, radio 8, separado 8 px |

- Botones de la fila (cerrar, menú de borrador): 20 × 20 con radio 4. Las acciones aparecen con `:hover` y también con `:focus-within`.
- La sangría (`padding-left`) se anima en 160 ms con la curva propia. El fondo de hover cambia al instante.

### 5.2 Encabezado de sección

- Margin 0 8, padding 0 8 y radio 4 en hover. Si la sección está colapsada y tiene no leídos, su título pasa a 900 con tinta plena. Al arrastrar secciones aparece un indicador de inserción de 2 px. **[V]**
- Chevron ▸/▾ que gira, acciones en línea (+ y ⋯) al pasar el cursor, sentence case y el mismo tamaño que las filas. **[I]**

### 5.3 Buscar / Saltar a (⌘K)

- ⌘K abre el salto a una conversación, ⌘G la búsqueda y ⌘F la búsqueda dentro de la conversación. **[V]**
- **En reposo:** un campo de 26 px sobre el marco, con fondo `theme-surf-inv-pry` y texto e icono blancos. **[V]**
- **Con foco:** anillo de 3 px del mismo velo y radio 6. **[V]**
- **Resultados:** desplegable de al menos 520 px con filas de 40 px o más (padding 4 × 16). La fila activa va en `#1264a3` con texto blanco y se mueve con ↑/↓ y Enter. Las pistas de atajo van a la derecha. El pie es de 13 px en `#616061`, con un hairline arriba. El campo expandido mide 44 px. **[V]**
- La forma de desplegable que cuelga de la barra superior, y no de modal centrado, la deduzco del CSS. **[I]**

### 5.4 Mensajes y barra de acciones al pasar el cursor

- **Fila:** avatar a la izquierda con 8 px de margen, autor en 15/900, hora en 12 px `#616061` y cuerpo en 15/22. **[V]** Los mensajes seguidos del mismo autor se agrupan sin avatar y muestran la hora al pasar el cursor. **[V]** clases · **[I]** regla de agrupado.
- **Fondos de estado:** hover `#f8f8f8`; en edición `#f2c74433`; al saltar a un mensaje, un destello amarillo `#f2c74433` de 3 s; al eliminar `#e01e5a99`; guardado o recordatorio `#1d9bd11a`; huddle en vivo jade-0. **[V]**
- **Barra de acciones:** **[V]**
  - posición absoluta en `top: -16px; right: 17px` (−28 px en mensajes agrupados);
  - fondo blanco, radio 12, padding 4 y sombra leve;
  - botones de 32 px con radio 8 e icono de 18 px en `#616061`; en hover pasan a `#1d1c1d` con velo del 4 %;
  - los iconos crecen a 1.2× en 80 ms (los emoji además giran 4°);
  - la variante compacta se desvanece en 160 ms tras esperar 320 ms y se oculta a los 480 ms, para que no parpadee;
  - con teclado, el mensaje enfocado también muestra la barra.
- Orden habitual de las acciones: reaccionar, responder en hilo, reenviar, guardar y más (⋯). **[I]**

### 5.5 Listas de maestro y detalle (DMs, Actividad, Más tarde)

- Estas listas viven en la columna lateral, sobre el marco y con tokens de tema, y abren el detalle en la vista primaria. **[V]** (`p-activity_ia4_page__item` y `p-dms_channel__meta` usan `theme-content-inv-*`.)
- **Lista agrupada en tarjetas (vista de DMs y recientes):** **[V]**
  - la lista va sobre `#1d1c1d0a`; los ítems son blancos, con padding 12 × 16 y margen lateral de 16;
  - divisores internos de 1 px `#0000001a`; el primer y el último ítem llevan radio 12;
  - hover `#f8f8f8`;
  - la vista previa se corta a 2 líneas en `#1d1c1db3` y pasa a `#1d1c1d` si no está leída;
  - los separadores de fecha van en 13/700 con padding 24 0 12 16.
- **Más tarde:** las acciones aparecen al pasar el cursor en una caja blanca flotante (radio 12, padding 4, gap 4), a 12 px de la esquina. **[V]**
- La cabecera de la columna tiene un interruptor de "sólo no leídos" (`p-unreads_toggle`). **[V]**

### 5.6 Panel lateral (hilo, perfil)

- La vista secundaria es una ruta propia (`ROUTE_FLEX_THREAD`, `ROUTE_FLEX_USER_PROFILE`, etc.), así que entra en el historial. **[V]**
- Radio 0 8 8 0. En modo oscuro lleva un borde izquierdo de 1 px. Cuando va anidado sobre la vista, usa la sombra `0 4px 12px #0000001a`. **[V]**
- El encabezado mide 12 × 16, con título en 18/900 y un hairline abajo. ⌘. lo oculta y se redimensiona con la misma asa que la barra lateral. **[V]**
- La animación de apertura la controla el JS: existe el estado `secondaryOpenAnimationViewIds`, pero su CSS no es público. **[I]**

### 5.7 Modales [V]

- **Entrada:** velo negro al 60 % en 80 ms lineal. Diálogo blanco con radio 8 y sombra de modal, que entra de `scale(.95)` con opacidad en 80 ms.
- **Medidas:** 520 px de ancho. Encabezado de 70 px o más, con padding 20 × 28. Título en 22/900. Botón de cerrar a 20 px de la esquina. Contenido con padding lateral de 28 (16 en móvil). Pie de 84 px con padding 24 × 28 y acciones a la derecha.
- **Criterios de Block Kit:**
  - interacciones cortas y que el usuario espera;
  - título y textos de botón de 24 caracteres como máximo;
  - hasta 3 vistas apiladas que conservan su estado;
  - paginar a partir de unas 6 entradas;
  - mostrar un estado de carga;
  - nunca pedir contraseñas;
  - `primary` (verde) para una sola acción por conjunto, y `danger` (rojo) con todavía más moderación;
  - textos de botón de hasta 75 caracteres, aunque se cortan cerca de los 30.

### 5.8 Toasts

- Son oscuros: fondo `#1d1c1d`, texto blanco en 15/22, radio 8, padding 12 × 16, máximo 350 px y sombra de toast. **[V]**
- Entran y salen con opacidad y `translateY(20px)` en 80 ms con la curva propia. Al pasar el cursor se pausa la animación, crece la sombra y aparece el botón de cerrar; los toasts persistentes lo muestran siempre. Los enlaces van subrayados en blanco. **[V]**
- La posición la fija el JS. **[I]**

### 5.9 Botones [V]

| Variante | Fondo | Texto | Borde | Hover | Presionado |
|---|---|---|---|---|---|
| Primario | `#007a5a` | blanco, 700 | — | velo verde 13 % y sombra de botón | velo 22 %, sin sombra |
| Peligro | `#e01e5a` | blanco, 700 | — | velo rojo 9 % y sombra | velo 22 % |
| Outline | `#ffffff` | `#1d1c1d`, 700 | 1 px `#5e5d6073` | `#f8f8f8` y sombra | `#f8f8f8` sin sombra |

| Tamaño | Alto | Radio | Texto | Padding | Ancho mínimo |
|---|---|---|---|---|---|
| Chico | 28 | 4 | 13 | 0 12 1 | 56 |
| Mediano | 36 | 8 | 15 | 0 12 1 | 80 |
| Grande | 44 | 12 | 18 / 700 | 0 16 3 | 96 |

- El color, el fondo y el borde cambian en 80 ms con la curva propia. **Los botones no se encogen al presionarse:** el estado presionado es un velo más oscuro.
- **Botones de icono:** 28, 32, 36 o 44 px, con radio 8 (pueden ser circulares). El glifo mide la mitad del lado más 2 px: 16, 18, 20 o 24.
- **Barra superior:** botones de 28 px, radio 4, padding lateral de 8 y peso 600, sobre el velo del marco.

### 5.10 Campos de texto y composer [V]

- **Input:** 36 px de alto, radio 8, borde de 1 px `#7c7a7f`, padding 4 × 12 y texto de 15 px. El placeholder va en `content-ter`. Con foco aparece el anillo azul y el borde se vuelve transparente; borde y sombra cambian en 80 ms ease-out. El chico mide 28 px (13 px de texto) y el grande 44 px (18 px). Con icono, el padding izquierdo sube a 28. Con error, el borde se vuelve rojo.
- **Composer:** radio 8 y borde de 1 px `#1d1c1d21`. La barra de formato (fondo `#f8f8f8`) y los botones secundarios sólo llegan a opacidad completa cuando el foco está dentro (`:focus-within`). Crece con `min-height` en 320 ms, y el borde y la sombra cambian en 160 ms. El botón Enviar es `#007a5a`.

### 5.11 Tooltips y pistas de teclado

- **Tooltip:** fondo `#1d1c1d`, texto blanco en 13/18 y peso 700, radio 8, padding 8 × 12 y máximo 200 px. La flecha mide 6 px y queda a 8 px del disparador. **[V]**
- **Pistas de teclado:** los menús muestran el atajo a la derecha en 13 px `content-ter`, que pasa a blanco con el ítem resaltado, y la búsqueda muestra pistas por fila. **[V]** Que los tooltips del riel incluyan su atajo es observación del producto. **[I]**

### 5.12 Avatares y presencia [V]

- **Radio proporcional** `clamp(4px, min(22.222%, 12px), 12px)`: 16 px dan radio 4, 36 px dan 8 y desde 54 px el radio es 12. Sin foto, el fondo es `#ddd`.
- **Presencia:** activa en `theme-base-inv-hgl-2` (jade) y ausente en `#616061`. En la barra lateral es un icono de 16 × 16.
- **Pila de avatares:** cada uno lleva un anillo de 2 px del color de fondo (`0 0 0 2px base-pry`) y radio 6.

### 5.13 Insignias y callouts [V]

- **Insignia:** píldora con radio 9999, peso 700 y `line-height: 1`. La circular mide 16 px de alto, con padding 0 5 y texto de 10 px. Hay una variante con ancho máximo de 25 px.
- **Variantes:** roja (`#e01e5a` con blanco), azul tenue, gris (`#f8f8f8` con `#454447`), *themed* (`theme-base-imp` con `theme-content-imp`, que en Aubergine es `#eabdfb` con `#39063a`) e inversa.
- **Callout de la barra lateral:** 18 px de alto, radio 16, texto de 10 px en negrita y padding 0 9, con los colores del rol de notificaciones.
- **Punto:** cambia con `transform` en 200 ms con la curva propia.
- **Barra superior:** insignia de 16 × 16 con texto de 11 px.

### 5.14 Menús [V]

- Contenedor blanco con radio 4 (estilo anterior), 300 px de ancho, padding vertical de 12 y sombra de menú. Filas de 28 px con texto de 15 px y padding lateral de 24. Separadores de 1 px `#1d1c1d21`, con 8 px arriba y abajo.
- El ítem resaltado (por hover o teclado) va en `#1264a3` con texto e iconos blancos; si es de peligro, en `#e01e5a`. La variante "alternate" usa un velo neutro en lugar del azul.

### 5.15 Pestañas [V]

Texto de 13/18 en 700. La pestaña inactiva va en `content-sec` y la activa en `content-pry`, con un subrayado interior de 2 px en el color del tema. La tira de pestañas lleva un hairline `otl-ter` abajo.

### 5.16 Separadores y banners [V]

- **Separador de día:** píldora de 28 px con padding 0 16, texto de 13 px en negrita (interlineado 27), radio 24 y sombra leve, centrada sobre un hairline y con 20 px de aire arriba y abajo. Desde ahí se puede saltar a una fecha.
- **Línea "Nuevo":** 1 px `#e01e5a` con la etiqueta roja de 13 px en negrita a la derecha. Puede pulsar con `0 0 5px #e01e5a`, y una vez leída baja al 50 % después de 3 s.
- **Banner de mensajes nuevos:** píldora con radio 24, padding 4 × 12, texto de 13 px y sombra leve.
- **Banner de vista:** radio 8, colocado 4 px debajo del encabezado.

### 5.17 Estados vacíos [V]

Contenido centrado de 380 px como máximo. Lleva un icono de 28 px o una ilustración de hasta 290 × 140 con 24 px de aire debajo, un título en 18/900 con 8 px de separación, una descripción y una acción.

### 5.18 Carga [V]

- **Lista de mensajes:** un patrón SVG estático de placeholders (en variantes clara, densa y oscura) que se repite en vertical. No barre ni brilla.
- **Bloques sueltos** (vistas previas, nombres, enlaces enriquecidos): fondo `base-ter` con radio 4 y un pulso de opacidad de 1 a .65 y de vuelta a 1, en 1 s ease-in-out infinito.
- **Spinner:** empieza invisible y aparece con un fundido de 200 ms sólo si la espera pasa de 400 ms.
- **Contenido que llega:** el texto enriquecido entra con un fundido de 200 ms tras 100 ms de espera; los esqueletos de documento, con un fundido de 80 ms.

### 5.19 Peek, la vista previa flotante [V]

Al pasar el cursor sobre ciertas pestañas o disparadores aparece una tarjeta de 360 px × 65 vh, con radio 12, fondo `ctr-pry` y sombra de peek. Entra deslizándose 8 px desde la izquierda en 160 ms (`cubic-bezier(.25,1,.5,1)`) con un fundido de 160 ms. Hay variantes para Inicio (muestra la barra lateral) y para Crear (325 px).

### 5.20 Asa de redimensión [V]

Es una zona de 8 px con cursor `col-resize`. Dibuja una línea de 1 px que se vuelve `#1d9bd1` (con halo de 1 px) al pasar el cursor, al arrastrar o al recibir foco. La línea aparece tras 150 ms de espera y 150 ms de transición, para no estorbar. Al arrastrar late durante 0.5 s con un halo que crece de 1 a 3 px. Colapsada mide 16 px. Incluye un input oculto para ajustarla con teclado.

## 6. Movimiento

### 6.1 Tokens [V]

| Token | Valor |
|---|---|
| `duration-short` | 80ms |
| `duration-long` | 160ms |
| `duration-longer` | 200ms |
| `duration-longest` | 240ms |
| `duration-slow` | 320ms |
| `duration-slower` | 400ms |
| `duration-slowest` | 480ms |
| `ease-default` | `cubic-bezier(.36,.19,.29,1)` |

### 6.2 Uso real [V]

Conté las declaraciones de transición en los bundles revisados:
- **Duraciones:** 80 ms aparece 209 veces, 200 ms 106, 150 ms 100, 160 ms 96 y 100 ms 84. Las de 300 ms o más son raras.
- **Curvas:** la propia aparece 209 veces sumando transiciones y animaciones, `ease-out` 170, `ease-in-out` 149 y `linear` 86. El rebote (`cubic-bezier(.34,1.56,.64,1)`) sólo aparece 4 veces.
- **Lectura:** casi todo dura lo justo para percibirse y frena suave al final. En la interfaz de trabajo nada rebota.

### 6.3 Qué se anima [V]

| Elemento | Propiedad | Duración | Curva |
|---|---|---|---|
| Botones | color, fondo, borde | 80 ms | propia |
| Inputs | borde y sombra del foco | 80 ms | ease-out |
| Velo de modal | opacidad | 80 ms | lineal |
| Diálogo | opacidad y escala de .95 a 1 | 80 ms | lineal / propia |
| Toast | opacidad y desplazamiento vertical de 20 px a 0 | 80 ms | propia |
| Ventana al cargar | opacidad | 80 ms | lineal |
| Iconos de la barra de acciones | escala de 1 a 1.2 | 80 ms | propia |
| Barra de acciones compacta, al salir | opacidad | 160 ms, tras 320 ms | propia |
| Peek | desplazamiento de −8 px a 0 y opacidad | 160 ms | (.25,1,.5,1) / (.33,1,.68,1) |
| Sangría de las filas laterales | padding-left | 160 ms | propia |
| Línea "Nuevo" | pulso de box-shadow | 160 ms | propia |
| Punto de insignia | transform | 200 ms | propia |
| Texto enriquecido que llega | opacidad | 200 ms, tras 100 ms | lineal |
| Spinner | opacidad | 200 ms, tras 400 ms | lineal |
| Composer | min-height | 320 ms | propia |
| Asa de redimensión | fondo y halo | 150 ms, tras 150 ms | — |
| Mensaje al saltar a él | fondo amarillo | 3 s, sostenido entre el 20 y el 60 % | — |
| Esqueletos | opacidad de 1 a .65 y de vuelta a 1 | 1 s, infinito | ease-in-out |

### 6.4 Qué no se anima

- El hover de las filas, tanto en la barra lateral como en los mensajes, es instantáneo. **[V]**
- La barra de acciones aparece al instante; sólo la salida de la variante compacta tiene periodo de gracia. **[V]**
- Colapsar o expandir secciones de la barra lateral es instantáneo, porque la lista es virtualizada. **[I]**
- Cambiar de vista principal no tiene transición de página; sólo el contenido nuevo hace un fundido corto. **[I]**

### 6.5 Movimiento reducido [V]

- **Media query:** hay 57 bloques `@media (prefers-reduced-motion: reduce)`, más 21 de `no-preference` para animaciones opcionales. Ponen transiciones y animaciones en `none`, o las dejan en 1 ms para que los eventos de fin de animación se sigan disparando.
- **Preferencia propia:** "Allow animations" controla emoji animados, GIF y reacciones y efectos en los huddles. Además hay clases `--a11y-reduce-animations` y `--no-animation` en las barras de acciones y en los esqueletos.
- **Temas de asistencia visual:** apagan el degradado de la ventana y subrayan los enlaces.
- **Diseño simplificado:** existe un modo más compacto y predecible, pensado para navegar con menos estímulos.

## 7. Patrones de interacción

### 7.1 Teclado [V]

Atajos en Mac; en Windows se usan Ctrl y Alt.

| Acción | Atajo |
|---|---|
| Saltar a una conversación | ⌘K |
| Buscar / buscar en la conversación | ⌘G / ⌘F |
| Historial atrás / adelante | ⌘[ / ⌘] |
| Canal anterior / siguiente | ⌥↑ / ⌥↓ |
| No leído anterior / siguiente | ⌥⇧↑ / ⌥⇧↓ |
| Mensaje no leído más reciente | ⌘J |
| Todos los no leídos | ⌘⇧A |
| Inicio · DMs · Actividad · Hilos · Más | Ctrl 1 · ⌘⇧K · ⌘⇧M · ⌘⇧T · Ctrl 0 |
| Detalles de la conversación | ⌘⇧I |
| Ocultar el panel lateral | ⌘. |
| Lista de atajos | ⌘/ |
| Marcar leída la conversación / todo | Esc / ⇧Esc |
| Marcar no leído desde un mensaje | ⌥ + clic |
| Región siguiente / anterior | F6 / ⇧F6 |
| Redimensionar la barra lateral | ← / →, tras enfocarla con F6 |
| Expandir o colapsar todas las secciones | ⌥ + clic |
| Mensaje nuevo | ⌘N |
| Con un mensaje enfocado | E editar · T o → hilo · R reaccionar · A guardar · F reenviar · P fijar · U no leído · M recordatorio · Supr borrar |
| Editar el último mensaje | ↑ con el composer vacío |

### 7.2 Regiones y foco [V]

- F6 salta entre regiones grandes y Tab se mueve dentro de la región activa. Las regiones tienen nombres funcionales, no visuales (por ejemplo, vista primaria y vista secundaria). El JS enumera barra superior, conmutador y riel de espacios, riel de pestañas, acciones primarias y secundarias, navegación, vista primaria, vista secundaria y control strip.
- El foco no se pierde al cambiar de espacio ni mientras una vista carga. Hay preferencias para lectores de pantalla, como mantener la barra siempre expandida y elegir el orden en que se anuncian los metadatos.
- Hay un único anillo de foco (1 px más halo de 5 px al 30 %) y sólo aparece al navegar con teclado (`focus-visible`).

### 7.3 Acciones que aparecen al pasar el cursor [V]

- Las acciones secundarias existen pero no ensucian, porque sólo aparecen al pasar el cursor o con el foco dentro: cerrar, menú y borrador en la barra lateral; la barra de acciones en los mensajes; la caja de acciones en Más tarde; la barra de formato en el composer.
- Regla: todo lo que aparece con hover aparece también con `:focus-within`.

### 7.4 Modelo de no leídos y menciones [V]

Hay cuatro niveles visuales, de menos a más urgente:
1. **Leído:** texto normal (`content-inv-sec`).
2. **No leído:** blanco pleno en peso 900, sin número.
3. **Mención o DM:** insignia con conteo, en el color del rol de notificaciones.
4. **Silenciado:** atenuado aunque tenga mensajes nuevos. Sólo una mención lo vuelve a destacar.

- **Dentro de la conversación:** la línea roja "Nuevo" marca el primer no leído. Esc marca todo como leído, ⌥ + clic marca como no leído desde ese mensaje y ⌘J salta al no leído más reciente.
- **Secciones:** si una sección colapsada tiene no leídos, su título se pone en 900.
- **Actividad (2026):**
  - una bandeja única con DMs, menciones, respuestas, apps, recordatorios y reacciones;
  - vistas guardadas por tipo, canal o sección;
  - diseño detallado o denso;
  - marcado masivo y recordatorios;
  - todo se procesa con teclado;
  - el modo foco quita las insignias hasta que vuelves a la bandeja.

### 7.5 Navegación sin migas de pan [V]

- La conversación no tiene migas de pan. Te orientan tres cosas: el ítem seleccionado en la barra lateral, el título del encabezado de vista (49 px) y el historial ←/→ de la barra superior (⌘[ / ⌘]).
- Las vistas secundarias son rutas, así que "atrás" funciona también con el hilo abierto.

### 7.6 Interfaz optimista

- El mensaje enviado se pinta al momento, igual que cualquier otro. Si a los 10 s el servidor no lo ha confirmado, el texto pasa a gris (`#1d1c1db3`) y aparecen los controles de reenvío, con una barra gris de 4 px a la izquierda. **[V]** El CSS tiene esa animación con 10 s de espera. El flujo exacto lo maneja el JS. **[I]**
- Reacciones, guardados y marcas de leído se reflejan al instante. **[I]**

### 7.7 Personalización [V]

Secciones propias en la barra lateral con reordenamiento por arrastre; mensajes en vista "Clean" o "Compact"; nombre completo o sólo el nombre visible; avatares en la barra lateral; tema; fuente (sólo escritorio) y zoom.

## 8. Qué hacer y qué no

### 8.1 Hacer

- Poner toda la identidad en un marco de un solo color y dejar el contenido en blanco neutro.
- Hacer que la selección sea lo de mayor contraste, el polo opuesto del panel.
- Resolver el hover y el presionado con velos del 6 % y el 13 % sobre el color existente (`multiply`).
- Jerarquizar con peso (de 400 a 700 o 900) y tres tintas, con 15 px como tamaño de trabajo.
- Usar el color sólo con significado: azul para selección y foco, verde para la acción primaria y rojo para menciones y peligro.
- Dar a cada superficie flotante un anillo de 1 px y una sombra difusa.
- Mantener el movimiento entre 80 y 160 ms con una sola curva, el spinner tras 400 ms y los esqueletos con pulso de opacidad.
- Mostrar las acciones secundarias al pasar el cursor y también con el foco.
- Dar atajos a lo frecuente (saltar, buscar, siguiente no leído, marcar leído) y mostrarlos en menús y tooltips.
- Comprobar AA incluso en el texto silenciado. Slack lo logra sobre su marco oscuro (5.11:1).

### 8.2 No hacer

- Bandas de color en los encabezados de panel: el encabezado de vista es plano, con un hairline.
- MAYÚSCULAS con tracking en la navegación o en las secciones.
- Pastillas de color en cada fila: las insignias son sólo para conteos y menciones.
- Fondos de color redondeados detrás de los iconos de fila: el icono es monocromo, de 16 px, y hereda el color del texto.
- Degradados en el contenido: en Slack el único degradado es el fondo opcional de la ventana.
- Botones que se encogen al presionar o botones de texto en forma de píldora.
- Animar el hover de las listas o usar rebotes en la interfaz de trabajo.
- Usar el color de marca como superficie dentro del contenido.
- Esconder acciones detrás del hover sin un equivalente con teclado.

### 8.3 Qué no copiar de Slack

- **Marcas.** El nombre, el logotipo (el octothorpe) y cualquier diseño que identifique a Slack son marcas. Usarlos exige seguir sus guías de marca, y para cualquier otro uso hace falta permiso escrito.
- **Aubergine como identidad.** Los tonos `#4a154b` y `#39063a`, y la combinación de los cuatro colores del logotipo (`#36c5f0`, `#2eb67d`, `#ecb22e`, `#e01e5a`), son la firma de Slack. Se copia la **estructura del modelo de tema**, no sus colores.
- **Fuente.** No enlazar ni redistribuir los archivos "Slack-Lato" del CDN de Slack. Usar Lato (OFL 1.1) de Google Fonts.
- **Nombres y personajes.** No reutilizar nombres de temas (Aubergine, Hoth, Ochin…), Slackbot, "huddle", ilustraciones, sonidos, el set de emoji ni los textos de la interfaz.
- **Código y archivos.** Los valores numéricos son hechos, pero el CSS, el JS y los SVG de Slack no se copian.
- **Apariencia de conjunto.** No clonar pantallas pixel a pixel. Tomar los principios, las métricas y los comportamientos, y vestirlos con Val'Quirico.

## 9. Traducción a Val'Quirico [P]

Nada de esta sección es dato de Slack: es su modelo aplicado a los colores que ya están en `minisitio.css` (olivo `#5d5b35`, olivo profundo `#3d3c22`, oro `#b58c42`, terracota `#922f12`, pergamino `#f6f4ec`).

### 9.1 Rampas con la curva de luminosidad de Slack

Las generé en OKLCH con la luminosidad de cada escalón de aubergine (de L .961 en el 0 a .249 en el 100), el matiz de cada color de Val'Quirico y un croma limitado a la gama sRGB. La marca cae casi justo en el escalón 70: olivo `#615f31` ≈ `#5d5b35` y terracota `#99381e` ≈ `#922f12`.

| Escalón | Olivo (h 106°) | Terracota (h 36°) | Verde (h 140°) | Oro (h 80°) |
|---|---|---|---|---|
| 0 | `#f3f3ea` | `#ffeee9` | `#ebf6e9` | `#f9f1e5` |
| 5 | `#edecdf` | `#fee5de` | `#e1f1de` | `#f5ead7` |
| 10 | `#e7e6d3` | `#ffdcd2` | `#d7ecd2` | `#f3e3c9` |
| 20 | `#d3d3b3` | `#ffbfad` | `#b8dcb0` | `#e7cca0` |
| 30 | `#c0be92` | `#ff9f84` | `#9acb8f` | `#dab577` |
| 40 | `#b0ae7c` | `#f4886b` | `#84bc78` | `#cca35c` |
| 50 | `#9e9b68` | `#e37456` | `#70aa64` | `#bb9144` |
| 60 | `#7d7a47` | `#bf5032` | `#4e8841` | `#996f18` |
| 70 | `#615f31` | `#99381e` | `#386a2c` | `#795500` |
| 80 | `#45431a` | `#741e03` | `#1f4d14` | `#563b00` |
| 90 | `#323112` | `#561604` | `#16380e` | `#402b01` |
| 100 | `#242306` | `#410b00` | `#092902` | `#2e1e00` |

### 9.2 Tema "Olivo": marco invertido (equivalente a Aubergine con brillo 6)

| Rol en Slack | Val'Quirico | Valor | Contraste |
|---|---|---|---|
| Navegación del sistema (marco) | olivo-100 plano, **sin degradado** | `#242306` | — |
| Panel de la barra lateral | olivo-0 al 11 % | ≈ `#3b3a1f` | — |
| Texto de fila | olivo-5 al 90 % | — | 8.23:1 |
| No leído o activo | blanco en 900 (o 700, ver §9.7) | `#ffffff` | 11.60:1 |
| Silenciado | olivo-0 al 60 % | — | 4.87:1 |
| Hover | olivo-0 al 8 % | ≈ `#4a492f` | — |
| Ítem seleccionado | olivo-0 con tinta olivo-100 | `#f3f3ea` / `#242306` | 14.28:1 |
| Notificaciones (insignia) | terracota-20 con terracota-100 | `#ffbfad` / `#410b00` | 10.46:1 (7.35:1 contra el panel) |
| Presencia o "al corriente" | verde-50 | `#70aa64` | 4.21:1 contra el panel (pasa el 3:1 de UI) |
| Acento de ceremonia | oro-30 sobre el marco | `#dab577` | 8.24:1; sólo para el escudo de la marca o un hito |

- **Si se mueve el color del marco,** su luminosidad OKLCH debe quedar entre 0.25 y 0.28. Con el olivo profundo actual (`#3d3c22`, L .35), el texto silenciado cae a 3.83:1 y habría que subirle la opacidad.
- **El oro nunca va como texto sobre blanco** (`#b58c42` da 3.09:1). Sobre el marco oscuro sí funciona.

### 9.3 Variante "Pergamino": marco claro (equivalente a un tema con brillo 2)

- **Valores:**
  - marco olivo-10 `#e7e6d3`, casi el `--color-nav-sunken` actual;
  - panel blanco al 90 % ≈ `#fdfcfb`;
  - texto olivo-100 al 80 % (8.27:1);
  - silenciado con olivo-100 al **62 % como mínimo** (4.56:1); Slack usa el 50 % y en este modo baja a 3.4:1;
  - selección olivo-80 `#45431a` con olivo-0 (9.09:1);
  - insignia terracota-70 `#99381e` con blanco (7.15:1).
- **Balance:** mantiene la continuidad con el riel pergamino del panel admin, pero pierde el contraste fuerte entre figura y fondo que da la sensación de Slack.

### 9.4 Plano de contenido

Se queda neutro. La rampa sin tono de Fluent que ya está en `minisitio.css` (`#ffffff`, `#fafafa` y `#f5f5f5` de superficie; `#242424`, `#424242` y `#616161` de texto; hairlines `#e0e0e0`) cumple el mismo papel que los grises de Slack. El olivo entra al contenido sólo en tres usos:
- acción primaria y foco: olivo-70 `#615f31` (blanco encima 6.58:1, anillo de 3:1 o más);
- enlaces: olivo-80 `#45431a` (10.14:1);
- peligro y "Nuevo": terracota-70 `#99381e` (7.15:1), con la línea "Nuevo" en terracota-60 `#bf5032` (4.76:1).

### 9.5 Mapa de la arquitectura del minisitio

| Slack | Minisitio |
|---|---|
| Riel: Inicio · DMs · Actividad · Más tarde · Más | Riel: Inicio · Mi patrimonio · Financiero · Atención · Val'Quirico (los grupos actuales de `minisitio-shell.tsx`). Lo que no quepa, a "Más" |
| Barra lateral con secciones | Páginas del módulo activo (por ejemplo, Financiero → Resumen financiero, Cuotas ordinarias, Cuotas extraordinarias). Encabezados en sentence case, sin el `text-[10px] uppercase tracking` actual |
| Actividad (bandeja) | `/notificaciones`: comunicados nuevos, respuestas a solicitudes y recordatorios de pago, con los 4 niveles de no leído y "marcar todo leído" |
| Más tarde | Pendientes: pagos por vencer y solicitudes abiertas |
| ⌘K, saltar a | Buscar o saltar a una propiedad, recibo, comunicado o documento |
| Encabezado de vista de 49 px | Título de la página con acciones a la derecha; sin migas si la barra lateral ya orienta |
| Panel lateral (hilo) | Detalle de una solicitud, comunicado o movimiento sin perder la lista; se cierra con Esc o ⌘. |
| Toast oscuro | Confirmaciones (solicitud enviada, datos guardados) |
| Móvil: pestañas inferiores | Debajo de 768 px, los módulos pasan a una barra inferior; la página del módulo es la lista y el detalle se abre a pantalla completa |

### 9.6 Tokens a agregar (Tailwind v4)

```css
@theme {
  /* Marco "Olivo" */
  --color-chrome: #242306;
  --color-chrome-panel: rgb(243 243 234 / 0.11);
  --color-chrome-hover: rgb(243 243 234 / 0.08);
  --color-chrome-field: rgb(243 243 234 / 0.25);
  --color-chrome-line: rgb(243 243 234 / 0.22);
  --color-chrome-ink: #ffffff;
  --color-chrome-ink-2: rgb(237 236 223 / 0.90);
  --color-chrome-ink-3: rgb(243 243 234 / 0.60);
  --color-chrome-selected: #f3f3ea;
  --color-chrome-selected-ink: #242306;
  --color-notify: #ffbfad;
  --color-notify-ink: #410b00;
  --color-presence: #70aa64;

  /* Movimiento (curva de Slack) */
  --ease-slack: cubic-bezier(.36, .19, .29, 1);

  /* Radios estilo Slack */
  --radius-row: 6px;
  --radius-control: 8px;
  --radius-float: 12px;

  /* Espaciado: siempre --space-N, NUNCA --spacing-N (rompe p-4, gap-3…) */
}
```

- **Duraciones:** con las utilidades nativas `duration-80`, `duration-160`, `duration-200` y `duration-320`. El hover de las listas va sin transición.
- **Avatares:** `border-radius: clamp(4px, min(22.222%, 12px), 12px)`.

### 9.7 Decisiones pendientes (choques con `AI_DESIGN_PROMPT.md`)

- **Peso 900.** Slack lo usa para nombres, títulos y no leídos, pero el contrato actual prohíbe `font-black`. Se puede permitir el 900 sólo en esos tres usos dentro del minisitio, o quedarse en 700; con Lato, el salto de 400 a 700 sigue siendo claro.
- **Botones.** Slack no usa píldoras ni `scale(0.95)`, y el contrato heredado de Starbucks sí. El análisis de Fluent ya llevó el admin a radios bajos; el minisitio debería ir en esa línea (4, 8 y 12).
- **Fuente.** Lato (OFL) en el layout raíz del minisitio frente a Inter en el admin. Como el minisitio tiene su propio layout raíz, no rompe la regla de un solo import de fuentes por layout.
- **Marco.** Elegir entre el marco "Olivo", más cercano a Slack, y la variante "Pergamino", con más continuidad con el admin.

## 10. Referencia rápida para agentes

- **Marco:** un color de tema y contenido blanco. Paneles con radio 8, 4 px de aire y sombra `0 4px #0000000d, 0 0 20px #0000001a`.
- **Fila de navegación:** 28 px, radio 6, separada 8 px del borde, icono monocromo de 16 px. Hover con velo del 8 %. Seleccionado en el polo opuesto, no leído en blanco 900 y silenciado al 60 %.
- **Texto:** cuerpo 15/22, secundario 13/18, metadatos 12/18, títulos de vista 18/24 en 900 y títulos de modal 22/30 en 900.
- **Tintas:** `#1d1c1d`, `#454447` y `#5e5d60` (metadatos en `#616061`); hairline `#1d1c1d21`.
- **Color con significado:** acción primaria verde `#007a5a`; foco, selección y enlace azul `#1264a3`; mención y peligro `#e01e5a`.
- **Superficies flotantes:** anillo de 1 px al 13 % más sombra (leve `0 1px 3px #00000014`, menú `0 4px 12px #0000001f`, modal `0 18px 48px #00000059`).
- **Controles:** botones de 28, 36 y 44 px con radios 4, 8 y 12; inputs de 36 px con radio 8; foco `0 0 0 1px` más halo de 5 px al 30 %.
- **Movimiento:** 80 ms para color y 160 ms para geometría, con `cubic-bezier(.36,.19,.29,1)`. Modal de escala .95 a 1; toast que sube 20 px; spinner tras 400 ms; esqueleto de 1 a .65 en 1 s; con movimiento reducido, `none` o 1 ms.
- **Teclado:** ⌘K, ⌘G, F6, Esc, ⌥⇧↑/↓, ⌘[ ⌘], ⌘. y ⌘/.

**Ejemplos de prompt para componentes [P]**

1. "Ítem de navegación del minisitio con el tema Olivo: fila de 28 px dentro de un contenedor con 8 px de padding lateral, radio 6 e icono lucide de 16 px que hereda el color. Texto de 15 px en `chrome-ink-2`. Hover en `chrome-hover`, sin transición. Activo en `chrome-selected` con tinta `chrome-selected-ink`. Con avisos sin leer, texto en `chrome-ink` (700/900) e insignia `notify` de 16 px a la derecha. Foco con anillo de 1 px y halo de 5 px."
2. "Fila de lista con acciones al pasar el cursor: fila blanca, padding 12×16, hairline inferior al 13 % y hover `#f5f5f5`. Caja de acciones flotante a 12 px de la esquina superior derecha: blanca, radio 12, padding 4, gap 4, con anillo `0 0 0 1px #1d1c1d21` y sombra `0 1px 3px #00000014`. Botones de icono de 32 px con radio 8. Visible con hover y con `:focus-within`."
3. "Modal de 520 px: velo negro al 60 % que entra en 80 ms. Contenedor blanco, radio 8 y sombra `0 0 0 1px #1d1c1d21, 0 18px 48px #00000059`. Entra de escala .95 a 1 en 80 ms con `cubic-bezier(.36,.19,.29,1)`. Encabezado de 70 px con padding 20×28 y título 22/30. Pie de 84 px con las acciones a la derecha y una sola primaria."

## 11. Huecos conocidos

- **CSS del shell no público:** el ancho del riel (≈70 px), el de la barra lateral (≈260 px) y su rango, el alto exacto de la barra superior (≈40 a 44 px), el ancho del panel lateral (≈400 px) y su animación de apertura son **[I]**.
- **Encabezado de sección:** el tamaño de la etiqueta y el chevron con su giro son **[I]**.
- **Mensajes:** el avatar de 36 px y el padding de 8 × 20 en el canal son **[I]**, por consistencia con las variantes verificadas.
- **Toasts:** la posición es **[I]**.
- **Menús:** los que revisé usan radio 4 (estilo anterior). Algunos menús del cliente nuevo podrían usar 8 o 12 **[I]**.
- **slack.design** no publica especificaciones, así que no lo usé como fuente de valores.
- **Vigencia:** los valores son del build `bv1-13` (2026-10-29). Slack despliega a diario; hay que revalidarlos antes de tratarlos como contrato.
- **Ayuda reescrita:** las páginas de ayuda de 2023 sobre las pestañas se reescribieron, y el comportamiento de plegarlas en "Más" sale del texto de 2023.

## Fuentes

**Recursos públicos de Slack, inspeccionados el 2026-10-29**
- https://app.slack.com/client (HTML de arranque sin sesión que enlaza el manifiesto)
- https://a.slack-edge.com/bv1-13/webpack.manifest.fbded25543f9def1.min.js
- https://a.slack-edge.com/bv1-13/rollup-style-plastic.5bcfd2fded7aa987.min.css (tokens `--dt_*`)
- https://a.slack-edge.com/bv1-13/modern.vendor.78042538b8ae32f4.min.css (componentes)
- https://a.slack-edge.com/bv1-13/application.d7d755bfde47fba5.min.css
- https://a.slack-edge.com/bv1-13/legacy-style-libs-lato-2-compressed-mac.512e5affaf7b0d38.min.css (Slack-Lato)
- https://a.slack-edge.com/bv1-13/js_modern_components_channel-sidebar__pillar_channel_sidebar_source_less-js_modern_components-d9b3f2.73ca4a46739c54ea.min.css
- https://a.slack-edge.com/bv1-13/js_modern_components_message-container-loading__pillar_message_container_loading_source_less--d47753.7d38d0db0d69f0c9.min.css
- https://a.slack-edge.com/bv1-13/client-dms-list-view.3d5054ed3667fe5d.min.css
- https://a.slack-edge.com/bv1-13/client-keyboard-shortcuts-view.74c80c2ff2433522.min.css
- https://a.slack-edge.com/bv1-13/modern.vendor.acdbfdea8db6dea8.min.js (motor de temas)
- https://a.slack-edge.com/bv1-13/prefs-dialog.bafcfacb4b984784.min.js (preferencias de apariencia)

**Documentación y blogs oficiales**
- https://slack.com/intl/en-gb/blog/productivity/a-redesigned-slack-built-for-focus
- https://slack.com/intl/en-au/help/articles/16764236868755-An-overview-of-Slacks-new-design
- https://slack.com/help/articles/201374536 (atajos de teclado)
- https://slack.com/help/articles/205166337-Change-your-Slack-theme
- https://slack.com/intl/en-au/help/articles/33702041349395-Change-the-font-in-Slack
- https://slack.com/help/articles/226410907-View-all-your-unread-messages
- https://slack.com/intl/zh-mo/blog/news/slack-activity-triage-for-notifications (Actividad, mayo de 2026)
- https://slack.com/intl/en-sg/blog/news/slack-updates-accessible-equitable (accesibilidad, 2022)
- https://slack.com/intl/en-in/blog/productivity/simpler-more-organized-slack-mobile-app (móvil, 2020)
- https://slack.engineering/the-gradual-design-system-how-we-built-slack-kit
- https://docs.slack.dev/reference/block-kit/block-elements/button-element
- https://docs.slack.dev/surfaces/modals
- https://docs.slack.dev/reference/views/modal-views
- https://slack.com/media-kit

**Secundarias**
- https://uit.stanford.edu/service/slack/redesign2023/sidebar
- https://venturebeat.com/business/slack-lash-slack-defends-controversial-redesign-amid-sharp-criticism
- https://en.wikipedia.org/wiki/Lato_(typeface)
- https://www.fontsquirrel.com/fonts/lato