# Análisis de sistema de diseño — Fluent 2 (Microsoft Teams)

Aplicado por primera vez en `/` (dashboard de bienvenida) el 2026-08-04.
Complementa a `DESIGN.md` (análisis Starbucks) y `AI_DESIGN_PROMPT.md` (contrato
de implementación). **No lo sustituye:** conviven en capas, ver §5.

---

## 1. Por qué Fluent aquí

El dashboard anterior tenía el look genérico de "dashboard de IA": hero con
gradiente de marca, todo en MAYÚSCULAS con `tracking-widest`, pastillas de color
en cada fila y cabeceras de tarjeta como bandas saturadas. Eso no es un sistema:
es decoración aplicada uniformemente, y compite con el dato.

Fluent 2 es el sistema de una herramienta de trabajo. Su tesis es la contraria:
la superficie desaparece para que el contenido lea. Por eso es la referencia
correcta para una consola de administración condominal.

## 2. Tokens verificados

Valores tomados de `@fluentui/tokens` en el repo `microsoft/fluentui`
(`src/global/colors.ts` y `src/alias/lightColor.ts`), no de memoria.

### Rampa neutra — es acromática por definición

`grey[N]` donde **N es el porcentaje de luminancia**. Esto importa: no hay tinte
azul ni cálido. Cualquier gris "de marca" que se cuele rompe el sistema.

| Alias | Global | Hex | Uso |
|---|---|---|---|
| `colorNeutralBackground1` | `white` | `#ffffff` | tarjetas, paneles |
| `colorNeutralBackground2` | `grey[98]` | `#fafafa` | cabeceras, zebra |
| `colorNeutralBackground3` | `grey[96]` | `#f5f5f5` | hover de fila |
| `colorNeutralBackground4` | `grey[94]` | `#f0f0f0` | chips neutros |
| `colorNeutralForeground1` | `grey[14]` | `#242424` | texto primario |
| `colorNeutralForeground2` | `grey[26]` | `#424242` | secundario, iconos |
| `colorNeutralForeground3` | `grey[38]` | `#616161` | metadatos, labels |
| `colorNeutralForeground4` | `grey[44]` | `#707070` | deshabilitado |
| `colorNeutralStroke1` | `grey[82]` | `#d1d1d1` | borde de control |
| `colorNeutralStroke2` | `grey[88]` | `#e0e0e0` | **borde de tarjeta** |
| `colorNeutralStroke3` | `grey[94]` | `#f0f0f0` | divisor entre filas |

Estados compartidos: rojo `#d13438`, verde `#107c10`, amarillo `#fde300`.

> El brand por defecto de Fluent es azul `#0078d4`; Teams lo sustituye por su
> morado. **Nosotros sustituimos por el olivo de la marca** — ver §5.

### Radios — `src/global/borderRadius.ts`

`none 0` · `small 2px` · `medium 4px` · `large 6px` · `xlarge 8px` · `circular 10000px`

Es un sistema de **radio bajo**: 4px es el caballo de batalla y 8px el techo para
superficies. No hay píldoras fuera del badge circular de conteo. Esto por sí solo
explica buena parte de la diferencia entre "herramienta" y "app de consumo" — el
diseño anterior usaba 12px y `rounded-full` en todo.

### Elevación

Halo ambiental fijo de 2px + capa "key" que crece con el nivel
(`shadow2/4/8/16`). Valores de la rampa publicada de elevación de Fluent
(ambiente `rgb(0 0 0 / .12)`, key `rgb(0 0 0 / .14)`); no se pudieron leer del
fuente porque la ruta del archivo de sombras cambió de sitio en el repo.

**La regla que más cambia el aspecto:** una tarjeta en reposo **no lleva sombra**.
La define el hairline `#e0e0e0`. La sombra sólo aparece al elevar de verdad
(flyout, diálogo, el segmento seleccionado de un control). Poner sombra en todo
es lo que hace que un panel se vea pegado encima en vez de formar parte del plano.

### Tipografía

Segoe UI en Windows; aquí seguimos con Inter, que es un sustituto correcto.
Rampa: 12 (caption) · 14 (body) · 16 (subtitle2) · 20 (subtitle1) · 28 (title2).
Pesos: 400 regular y 600 semibold — nada más.

**Sentence case siempre.** La jerarquía la cargan el tamaño, el peso y la rampa
de gris. Nunca el `letter-spacing`: las MAYÚSCULAS espaciadas son la firma visual
del dashboard decorativo.

## 3. Reglas de composición

1. **El borde define, la sombra no.**
2. **Sentence case**, jerarquía por peso y gris.
3. **El color es información.** El acento de marca es para la acción primaria y
   el estado seleccionado. Verde y rojo sólo cuando el dato es semántico. Un
   estado neutro se pinta neutro — por eso "En proceso" y "Cerrado" van en gris.
4. **Cabecera de panel = texto plano + divisor**, con la acción secundaria a la
   derecha (el "See all" de Teams). Nunca una banda de color.

   Ojo con la excepción: el **banner de página** (uno solo, arriba del todo) sí
   va en color de marca sólido — es el patrón de cabecera de los productos de
   Microsoft. Lo que no es Fluent es el *gradiente* de varias paradas, las
   pastillas y las sombras sobre el texto. Y sigue siendo uno por página: si
   cada panel lleva su banda, vuelve el efecto decorativo.
   Contraste sobre `#5d5b35`: blanco 6.97:1, blanco/90 ≈5.9:1, blanco/80 ≈5.1:1.
   **Blanco/80 es el piso** — por debajo, el texto de 12px cae bajo AA.
5. **Iconos monocromos** al color del texto (`fg-2`/`fg-3`). Nada de chips de
   color redondeados por fila.
6. **Densidad honesta:** fila de lista ~56px, fila de comando ~44px, KPI 28px de
   cifra. `tabular-nums` en toda cifra que se actualice, o la fila "baila".

## 4. Implementación

- Tokens: `src/app/globals.css`, bloque "Plano de contenido" (aditivo — no toca
  la rampa de marca ni la del rail).
  Clases resultantes: `bg-surface{,-2,-3,-4}`, `text-fg{,-2,-3,-4}`,
  `border-stroke{,-2,-3}`, `rounded-{ctrl,surface,panel}`, `shadow-{2,4,8,16}`,
  `text-success`, `text-critical`.
- Primitivas: `src/components/ui/fluent.tsx` — `Surface`, `SurfaceHeader`,
  `Metric`, `StatusBadge`, `ActionRow`, `PrimaryLink`, `SubtleLink`, `EmptyState`.
- Consumidor de referencia: `src/app/page.tsx`.

## 5. Convivencia con el sistema olivo

No es una sustitución, es una **arquitectura de dos capas**, y es exactamente lo
que hace Teams: rail de marca + lienzo de trabajo neutro.

| Capa | Sistema | Dónde |
|---|---|---|
| Rail / navegación | olivo "pergamino" (`--color-nav-*`) | `app-shell.tsx` |
| Plano de contenido | rampa neutra Fluent | `/` (y lo que se migre) |
| Acento | olivo de marca `#5d5b35` | acción primaria, estado seleccionado |

El olivo **nunca es superficie** dentro del contenido; sólo acento. Las 21 rutas
listadas en `REDESIGN_PROGRESS.md` siguen en el sistema anterior: migrar de una
en una, no en masa.

## 6. Color de datos

La serie categórica ya validada en `/estadisticas` manda. Para ingresos vs
egresos: olivo `#8a8619` y azul `#2563eb` — se distinguen por tono **y** por
luminancia, así que sobreviven al daltonismo rojo-verde.

**No usar verde/rojo para ingresos vs egresos** por muy semántico que suene: es
justo el par que se colapsa en la deficiencia de color más común.
