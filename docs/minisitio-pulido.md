# Pulido del portal de condóminos (`/minisitio`)

Encargo (2026-10-30): una barra lateral única y cuidada al detalle, con animaciones sutiles al nivel de Monday o Airbnb; un buscador global en el encabezado; y un recorrido por todas las vistas mejorando su UX/UI.

**Regla:** las distribuciones aprobadas (f7953bc) no se cambian. Se pule la ejecución: espaciado, jerarquía, estados, accesibilidad y movimiento. Si una mejora exige mover bloques o cambiar la navegación, se pregunta antes.

## Barra lateral — hecho

Se conservan el rail pergamino, los cinco módulos (Inicio, Mi patrimonio, Financiero, Atención y Val'Quirico), sus ítems y nombres, el colapso a íconos y Mi Perfil y Cerrar Sesión al pie.

Archivos:
- `components/minisitio/minisitio-sidebar.tsx`: la barra lateral;
- `nav-config.ts`: la fuente única del menú, el buscador y los títulos;
- `tooltip.tsx`: las etiquetas flotantes.

**Geometría.** La canaleta es de 12 px, la pared del módulo de 4 px y la sangría del ítem de 9 px. Con eso, el ícono de 18 px queda en x = 25…43 y su centro (34) coincide con el centro del rail colapsado de 68 px. Al colapsar, los íconos no se mueven: solo se recortan y se desvanecen las etiquetas.
- Filas de 36 px, radio 8. Los subítems miden 32 px o más y pueden ocupar dos líneas, así "Reporte de Cuotas Extraordinarias" no se trunca.
- La guía del submenú cae sobre el centro del ícono del grupo.
- El avatar del pie comparte ese mismo centro.

**Movimiento.**
- El ítem activo es una tarjeta blanca con un marcador dorado que se desliza al destino nuevo (`layoutId` y un resorte casi crítico, sin rebote).
- En hover, el ítem se aclara hacia ese blanco: entra en 75 ms y sale en 200 ms.
- Las etiquetas salen en 100 ms y vuelven con 75 ms de retraso.
- La marca cruza el lockup con el sello cuadrado sin moverse de su sitio.
- Las etiquetas del rail colapsado aparecen con 380 ms de retraso; mientras se recorre el menú, son instantáneas.
- Con "reducir movimiento" nada se desplaza.

**Detalles.**
- Los títulos de módulo van en mayúscula solo al inicio, sin tracking.
- Se quitaron las marcas de agua de los módulos, que eran ruido decorativo.
- Los módulos son medio escalón más claros (`--color-nav-well`).
- Un grupo arranca abierto si contiene la pantalla actual. Si está plegado, el propio grupo lleva el indicador.
- Con el rail colapsado, un grupo abre un submenú flotante junto a su ícono: se navega con ↑/↓ y se cierra con Esc.
- La lista difumina sus bordes solo cuando hay módulos ocultos y desplaza a la vista la pantalla actual.
- La pestaña para colapsar asoma del borde del rail al pasar el cursor (antes era un botón del pie). En pantallas táctiles siempre se ve.
- El avatar muestra las iniciales del condómino.
- En el celular, el cajón toma el foco, se cierra con Esc y bloquea el scroll de atrás.

## Buscador global — hecho

- `components/minisitio/global-search.tsx`: campo del encabezado y paleta;
- `_actions/search.ts`: el índice;
- `search-hit.tsx`: el resaltado en la pantalla de destino.

**Qué encuentra:**
- pantallas, Mi Perfil y Notificaciones;
- las propiedades y los comercios del condómino (con un punto si tienen saldo vencido);
- sus solicitudes;
- los comunicados (también por su texto), los documentos (se abren en otra pestaña) y los teléfonos (el número ya se ve en el resultado).

**Cómo se usa:**
- Se abre con Ctrl/⌘ K, con "/" o con el campo del encabezado. En el celular, una lupa abre la paleta a pantalla completa.
- Busca sin acentos ni mayúsculas, exige todas las palabras y resalta las coincidencias. El grupo con la mejor coincidencia sube.
- Sin texto muestra "Recientes" (de este dispositivo) e "Ir a".
- El índice se pide una vez (y al acercar el cursor al campo), dura 5 minutos y se filtra en el navegador.
- Comunicados, teléfonos y solicitudes se abren con `?id=`. La pantalla lleva el elemento a la vista y lo enmarca un momento en dorado (`data-search-id` en la tarjeta).

## Vistas — pendiente, en este orden

| # | Vista | Estado |
|---|---|---|
| 1 | Bienvenida | hecho: mismo orden de bloques; mayúsculas con tracking fuera; íconos iguales a los del menú; rejilla de 4 columnas solo desde 1280 px (en 1024 eran de 160 px); botones dorados con contraste AA (`warning`); tarjetas de comunicado operables con teclado y abiertas en `SidePanel` (foco atrapado, Esc); la categoría "3" se lee "Propietarios y Comercios"; no se repite una descripción igual al título; teléfonos agrupados 3-3-4 y llamables; aviso de privacidad sin la caja azul |
| 2 | Panel de Control | hecho: el encabezado decía "Dashboard" y el menú "Panel de Control" (ahora igual en los dos); azules, verdes y morados genéricos → paleta del portal (vencido, al corriente, neutros); `bg-opacity-*` no existe en Tailwind 4 y pintaba sólidas la insignia de tipo de usuario y las métricas; métricas de Propiedades y Comercios como enlaces con flecha; tarjetas con alto propio; esqueleto en vez de spinner. Global: el spinner era azul y parpadeaba; ahora es olivo y aparece a los 400 ms |
| 3 | Mis Propiedades, detalle y estado de cuenta | listado y detalle hechos (estado de cuenta pendiente, va con el de comercios). Piezas compartidas nuevas: `ui/page-banner.tsx` (encabezado olivo con métricas; la cifra se ajusta por container query y ya no se corta), `ui/list-controls.tsx` (buscador con conteo y Esc, estado vacío, botones), `status-badge` con la paleta del portal y punto, `view-toggle` con pastilla que se desliza. Tabla: encabezados legibles, cifras a la derecha con `tabular-nums`, primera columna fija al desplazar, filas de 1 línea (antes 5), sin repetir clave = nombre, totales en `tfoot` fijo. Detalle: el % de indiviso **inventaba 0.0417 %** cuando el dato era 0 (corregido); sin fuente monoespaciada; galería con botones visibles (eran blanco sobre blanco por `bg-opacity-*`) y teclado que sí funciona |
| 4 | Mis Comercios, detalle y estado de cuenta | hecho. Listado con el encabezado y el buscador compartidos; la columna Estado decía "Sin estado" en todas las filas (se pasaba un objeto a StatusBadge) y ahora muestra Al corriente / Pendiente / Vencido / A favor. Detalle: "Área Privativa", "Zona", "Saldo Total" y "Monto Vencido" leían campos que ya no existen y salían N/A y $0.00 fijos; ahora usan el área, el barrio y los saldos que sí llegan; el Estado era una pastilla vacía y ahora dice Activo/Inactivo; las migas pasaron al encabezado como en Propiedades. Los dos estados de cuenta (propiedad y comercio) comparten `_components/estado-cuenta/statement-ui.tsx`: secciones sin bandas en MAYÚSCULAS, sin fuente monoespaciada, tabla de movimientos completa en 1440 px (encabezados largos en dos líneas), color solo cuando la cifra significa algo, acciones con íconos en vez de emojis. Modal compartido `ui/modal.tsx` (foco atrapado, Esc, regreso del foco, hoja inferior en el celular) y `Toast`: "Solicitar ayuda" y "Enviar por Email" lo usan; el de comercio dejó el azul; los `alert()` del envío por correo pasaron a errores en línea y aviso de éxito. Pestaña Reglamentos con la paleta del portal |
| 5 | Comunicados | hecho: mismo orden (encabezado, filtros por público, tarjetas); filtros con pastilla que se desliza y conteo, sin azul/verde/morado; tarjetas sin banda degradada ni `grayscale` (el vencido se marca con su insignia y tono atenuado, y ya no apaga el resalte del buscador); no se repite una descripción igual al título; el botón de compartir no hacía nada: ahora usa la hoja nativa del celular o copia el enlace directo (`?id=`); visor de imagen con Esc y botón visible (`bg-opacity-*` dejaba el fondo sólido); esqueleto de carga |
| 6 | Solicitudes y reportes | hecho: mismo orden (encabezado con "Nueva Solicitud", pestañas, lista desplegable); pestañas con pastilla que se desliza y conteos; el detalle se despliega con su alto real; verde `#006241` y azul fuera, paleta del portal; alta con el modal compartido (el mismo de "Solicitar ayuda", con `title` y `onCreated`); los `alert()` de la respuesta pasaron a error bajo el campo y aviso de éxito; `?id=` abre la solicitud en su pestaña (también si está cerrada) y desplegada |
| 7 | Reportes: resumen financiero, cuotas ordinarias y extraordinarias, estado de resultados, reporte general | hechos los cinco. Resumen financiero, estado de resultados y reporte general: sin MAYÚSCULAS con tracking ni fuente monoespaciada en las cifras; KPI con la pieza `KpiCard` (los `StatCard` del panel traían íconos sólidos de cinco colores); el balance negativo se lee en teja; selectores de año y modo con la pastilla del portal; botones grises (`bg-gray-600`) y "Exportar PDF" rojo pasaron a primario olivo y secundario; tarjetas con radio y borde del portal (eran esquinas rectas); naranjas y verdes sueltos a vencido/al corriente; las tablas aisladas (`isolate`) para que sus columnas fijas no tapen el encabezado al desplazar; en el reporte general un saldo de $0.00 ya no se pinta en rojo. Piezas compartidas (`_reportes/report-chrome.tsx`, `financial-cards.tsx`, `ui/paginator.tsx`): sin MAYÚSCULAS con tracking ni textos de 8–10 px; barra de filtros con cabecera clara (era banda olivo); KPI con ícono en tono suave; leyenda y celdas P/C con la paleta del portal; el paginador pintaba los 59 números en círculos y ahora muestra una ventana (1 2 3 4 5 … 59) con Anterior/Siguiente; la tabla a sangre usaba márgenes de -40 px y se salía por la derecha (ahora coinciden con el relleno del contenido) |
| 8 | Documentos condominales, Números de emergencia, Experiencias, Aviso de privacidad | hecho. Documentos: fila completa como enlace (antes solo el botón), sin azul. Números de emergencia: sin los chips de 8 colores; los teléfonos se agrupan 3-3-4 y se pueden marcar (`tel:`), los correos abren `mailto:`. Experiencias: la banda dorada tenía texto blanco a 2.37:1 (ahora `warning`, 5.02:1); con todo vencido salían tres cajas "Sin experiencias adicionales" y ahora un estado vacío con "Ver eventos pasados"; imagen a 4:5 con título y estado siempre visibles (antes solo al pasar el cursor); la tarjeta abre el PDF o la imagen (tenía cursor de enlace y no hacía nada). Aviso de privacidad: se restauró `aviso-privacidad-texto.tsx` (de fc84ea9) que reconstruye títulos, secciones e incisos del texto plano; columna de 70 caracteres; también en el modal de aceptación y en `/privacy` |
| 9 | Mi Perfil y Notificaciones | hecho. Notificaciones: tarjetas neutras con filo olivo (eran azules), la categoría "3" se lee "Propietarios y Comercios", no se repite el mensaje igual al título, "notificaciónes" corregido. Mi Perfil: "Subir PDF" azul pasó a crema de la marca; el interruptor de factura ahora es `role="switch"` con nombre y estado. Pendiente de decisión: los paneles "todas las asignaciones" y "comercios" existen pero nada los abre (venía así del minisitio) |

Notas tomadas en el recorrido:

## Revisión de conjunto (2026-10-30)

- Las 19 pantallas del portal, en 390, 768 y 1024 px: sin desborde horizontal (el único, 4 px en Reporte General en el celular, quedó corregido) y sin errores de consola.
- Un solo `h1` por pantalla (el del encabezado del portal); los títulos internos son `h2`.
- `eslint` limpio en todo el minisitio y `tsc` sin errores propios (solo los conocidos de `@abanzoftmex/luca-insulae-contract`, que falta en local). No se corrió `next build`.

## Bienvenida: comunicados y ayuda (2026-10-30)

Segunda pasada pedida por el usuario, con prioridad en diseño, color y SVG. Los bloques siguen en el mismo lugar.

- **Ilustraciones** en `components/minisitio/valquirico-art.tsx`, con los colores del sello y de las fachadas (cantera, teja, ocre, olivo):
  - `ValquiricoVista`: torres almenadas, la puerta de arco, el campanario con reloj y la Malinche detrás. La bandera ondea y la campana se mece al pasar el cursor (clases `vq-flag`, `vq-bell` y `vq-scene` en minisitio.css; quietas con movimiento reducido).
  - `ComunicadoCover`: portada de un aviso sin imagen (celosía de arcos y silueta del pueblo). El tono sale del id.
- **Últimos Comunicados** (`(portal)/_bienvenida/ultimos-comunicados.tsx`): el más reciente destacado y los otros cuatro en lista con miniatura vertical.
  - Las imágenes son carteles verticales: el destacado muestra el cartel entero sobre su versión desenfocada (antes se recortaba a 16:9 y quedaba solo el centro).
  - Fecha en ficha sobre la portada, "Nuevo" si tiene menos de 7 días, marca de PDF.
  - Debajo de 1280 px, el destacado va con la portada al lado del texto y la lista en dos columnas.
- **¿Necesitas ayuda?** (`(portal)/_bienvenida/ayuda-contacto.tsx`):
  - Tarjeta de la administración con la ilustración, la dirección con "Cómo llegar" y los canales con su color: teléfono olivo, WhatsApp verde, correo ocre.
  - Directorio agrupado por el nombre del contacto: Emergencias (en teja), Casetas de vigilancia, Experiencias y Más teléfonos.
  - Arriba, si en este momento es horario de atención (hora de Val'Quirico; no contempla días festivos).
  - Cierra con la invitación a levantar una solicitud.
- **Dato a revisar:** la imagen de "13va Asamblea General Ordinaria" en R2 es un WebP de 894 bytes completamente negro: quedó así en la migración, no es del diseño.

## Resumen financiero y rail con el estilo de la ilustración (2026-10-30)

- **KPIs** (`_reportes/report-chrome.tsx`, `KpiCard`, compartida con los reportes de cuotas): la cifra se encimaba con el ícono en seis columnas. Ahora la etiqueta y el ícono van arriba y la cifra abajo a todo el ancho, con tamaño por unidades de contenedor (`clamp(17px, 11.5cqi, 24px)`).
- **Tablas del resumen** (`compact-financial-table.tsx`):
  - el `Card` compartido con `border-stroke-2` solo ponía el color del borde, no el borde: ahora es una sección con borde real;
  - `border-separate` en vez de `border-collapse`, para que el borde de la columna fija viaje con ella;
  - fondos opacos (mezcla del tono con blanco) en las celdas fijas: ya no se ven las cifras a través;
  - "$0.00" atenuado, negativos en teja, encabezados de fila como `th scope="row"`.
- **Rail** (`minisitio-sidebar.tsx`), sin cambiar su distribución:
  - cada módulo tiene un color de la ilustración (`NavTone` en nav-config.ts: Inicio olivo, Mi patrimonio teja, Financiero ocre, Atención verde, Val'Quirico vino del logotipo);
  - el color se ve en la marca junto al título, en el ícono al pasar el cursor y en el ícono y el marcador del activo. En reposo los íconos son neutros, e Inicio conserva el marcador dorado;
  - el pueblo (`ValquiricoVista`, bandera solo al pasar el cursor) va al final del menú, dentro del desplazamiento: si sobra alto se asienta sobre la cuenta y, si no, queda después del último módulo, sin quitarle espacio a las opciones. Se pliega con el rail.

## Reportes Condominales homologados con el panel (2026-10-30)

El cliente pidió que Resumen Financiero, Cuotas Ordinarias y Cuotas Extraordinarias del portal se vean como sus equivalentes del panel (Financiero → Resumen, Cuotas Ordinarias y Cuotas Extraordinarias). Para esas tres pantallas se deshace el pulido de la fila 7: vuelven las MAYÚSCULAS, la banda olivo de filtros, los `StatCard` y los colores del panel.

- **Piezas compartidas** (`_reportes/report-chrome.tsx`, `financial-cards.tsx`, `resumen-financiero/compact-financial-table.tsx`, `ui/paginator.tsx`): mismas clases que `src/app/(admin)/reporte-cuotas/page.tsx` y `resumen-financiero/page.tsx`. Solo las usan estas tres pantallas.
- **Resumen**: agrega la tarjeta "Actividad Financiera" con `FinancialChart`, que en el portal faltaba. Usa las mismas series que el panel y una altura fija de 280 px, porque el componente toma la altura de su contenedor. Los egresos y el saldo ordinarios usan los tonos rojo y dorado del panel (`TABLE_TONE.ordinaryExpense` / `ordinaryBalance`).
- **Cuotas**: agrega la columna fija "Ubicación" (`PrivateArea.zone`, "Centro" si no hay dato, igual que el panel) y el campo "Buscar" con Filtrar y ✕ (busca por nombre o clave; la consulta ya lo soportaba).
- **Diferencias que se mantienen**:
  - sin la columna "Acciones" ni los botones Exportar, Plantilla, Seguridad y Reporte, que son del administrador;
  - KPI del Resumen en seis columnas solo desde 2xl, porque el contenido del portal es más angosto;
  - el paginador conserva la ventana de páginas;
  - las celdas fijas son opacas (el mismo tono mezclado con blanco);
  - las tablas usan `border-separate`;
  - columnas y años salen de las consultas del portal; la estructura de datos del panel no cambió.
- **Revisado en pantalla lado a lado (2026-10-31)**, en local con la cuenta demo, que el minisitio deja entrar como propietario. Se ajustó:
  - el selector de años del Resumen va del más reciente al más antiguo, como el panel;
  - el "Corte" del Resumen muestra la hora de la consulta en lugar de "No disponible";
  - los subtítulos de cuotas dicen "Listado de áreas privativas con estado de cuotas…", como el panel.
- **Los datos no coinciden con el panel**, porque el portal usa sus propias consultas (`financials.queries`, `reports.queries`) y el panel los módulos `financial-summary` y `fee-report`:
  - en el Resumen, el portal clasifica "Cartera vencida 2017-2024" y "Cuotas ordinarias" dentro de Otros ingresos, y le faltan renglones ("Cuota única STC", "Sanción");
  - por eso los KPI de 2025 no cuadran: ingresos ordinarios 17.6 M frente a 27.2 M, y egresos 42.8 M frente a 32.9 M;
  - en cuotas, el portal lista 1745 unidades (incluye fracciones, con claves repetidas) y el ciclo 2024–2026; el panel lista 1185 áreas principales y el ciclo 2025–2026;
  - en extraordinarias, el portal separa Condóminos y Comercios en dos columnas; el panel usa una sola.
- **En el panel**, la gráfica "Actividad Financiera" del Resumen mide 0 px de alto y no se ve, porque `FinancialChart` toma la altura de su contenedor y ahí no tiene una.

## Pendientes de decisión del usuario

- Reportes Condominales: decidir si el portal toma los datos de los módulos del panel para que las cifras coincidan.

- Panel de Control: la métrica "Saldo Pendiente" muestra el saldo **vencido** (igual que producción).
- Detalle de comercio: "Saldo Total" se toma del saldo pendiente (el campo viejo ya no existe).
- Reporte General: dice "1745 áreas con adeudos" con muchas filas en $0.00, y muestra todas las áreas a cualquier propietario.
- Notificaciones dice "de hoy" aunque lista avisos de otras fechas (texto heredado).
- Mi Perfil: los paneles de asignaciones y comercios no tienen botón que los abra.
- Sin commit: los cambios están en el árbol de trabajo de `feat/minisitio-integrado`.

## Cómo verificar

- Capturas con Chrome headless en `next dev -p 3199 -H 127.0.0.1` (ver la memoria `minisitio-ux-slack`).
- Al editar componentes de cliente hay que reiniciar el servidor, porque Turbopack deja el SSR viciado.
- `shot.mjs` acepta `hover:x,y` y `mclick:x,y` para estados de hover.
