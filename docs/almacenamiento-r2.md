# Archivos en Cloudflare R2

Desde 2026-10-29 (rama `feat/minisitio-integrado`) los archivos de insulae2.0 viven en
Cloudflare R2, en el bucket privado `insulae-valquirico`: logos del condominio, reglamentos,
imágenes y PDF de comunicados, convocatorias, respuestas de tickets, comprobantes de ingresos y
gastos, constancias fiscales, imágenes de áreas privativas y documentos de presupuesto.
Sustituye a Firebase Storage (`insulae2-0.firebasestorage.app`): el código ya no usa el SDK
de Firebase ni las variables `NEXT_PUBLIC_FIREBASE_*`.

## Cómo funciona

| Operación | Qué pasa |
|---|---|
| Subir | `uploadCondominiumAsset()` (misma interfaz que antes) llama a la server action `createUploadTargetAction`, que valida sesión del panel, permiso de escritura en el módulo del tipo de archivo, tamaño (≤ 25 MB) y tipo (PDF o imagen). Devuelve una URL prefirmada de PUT válida 10 min, con tipo, tamaño, nombre y caché firmados, y el navegador sube directo a R2. Las funciones de Vercel cortan los cuerpos en 4.5 MB, y ya hay archivos de 5 MB. |
| Ver / descargar | La base guarda `/api/archivos/<clave>`. `GET /api/archivos/<clave>` responde 302 a una URL prefirmada de 1 h; `?descargar=1&nombre=<nombre>` fuerza la descarga con ese nombre. |
| Borrar | `deleteCondominiumAsset(url)` llama a `deleteStoredAssetAction`. Solo acepta los tipos que las pantallas borran (comprobantes de ingresos y gastos, imágenes de áreas privativas) y exige permiso de editar o eliminar en su módulo. Si algún registro todavía usa el archivo, no lo borra. |
| Servidor | El logo de los PDF del minisitio y la descarga forzada de adjuntos leen de R2 por clave (`getObject`, `presignGetUrl`), sin pasar por HTTP. Correos, WhatsApp y vistas previas convierten la URL en absoluta con el host de la petición (`absoluteFileUrl`). |

- **Claves.** Las nuevas: `condominiums/<slug>/projects/<proyecto o módulo>/<tipo>/<uuid>/<archivo>`. Las migradas conservan su ruta de Firebase: `…/<tipo>/<marca de tiempo>-<archivo>`. `ProjectDocument.storageBucket` vale `r2` para estos documentos.
- **URLs relativas.** `/api/archivos/...` funciona igual en local, en previews y en producción, que comparten la base. Los nombres sueltos de la 1.0 (`1-1-1759425818.pdf`, `/imagenes/notificaciones/...`) siguen resolviéndose contra sistemasabanza. Las vistas comprueban primero `isUsableFileUrl()`, porque esas rutas legacy también empiezan con `/`.
- **Sin sesión, a propósito.** La ruta no pide sesión: los enlaces van en correos y los usa el minisitio, cuya cookie solo viaja bajo `/minisitio`. Es el mismo modelo que los enlaces con token de Firebase. El bucket no se puede listar y las claves nuevas llevan un UUID.
- **Código.** `src/shared/infrastructure/storage/`: `storage-paths.ts` (claves y URLs, sin secretos), `r2.ts` (solo servidor), `storage-actions.ts` y `storage-client.ts`. La ruta está en `src/app/api/archivos/[...key]/route.ts`.

## Variables de entorno

Solo de servidor; nunca con prefijo `NEXT_PUBLIC_`. En Vercel van en Production y Preview.

| Variable | |
|---|---|
| `R2_ACCOUNT_ID` | Cuenta de Cloudflare (arma el endpoint si no se define `R2_ENDPOINT`). |
| `R2_ENDPOINT` | Opcional: `https://<cuenta>.r2.cloudflarestorage.com`. |
| `R2_BUCKET` | `insulae-valquirico`. |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Token de API de R2 (S3) **limitado al bucket**: permiso "Object Read & Write" solo en `insulae-valquirico`. |
| `R2_UPLOAD_ORIGINS` | Opcional, solo para `storage:configure-r2-cors`: orígenes que pueden subir (por defecto, todos). |

Sin las `R2_*`, la app arranca pero falla al subir o abrir un archivo.

El token que se usó el 2026-10-29 para la copia y el CORS es de administrador de la cuenta: ve
todos los buckets. No debe ir a Vercel. Para Vercel, crear en Cloudflare (R2 → Manage API
tokens) uno con "Object Read & Write" solo para `insulae-valquirico`. El de administrador
solo hace falta para `storage:configure-r2-cors`; conviene rotarlo, porque se compartió en
una conversación.

## CORS del bucket

`npm run storage:configure-r2-cors -- --apply` (aplicado el 2026-10-29):

- GET/HEAD desde cualquier origen. Una petición que la app redirige a R2 llega con `Origin: null`, y eso solo lo admite el comodín. Cada URL va firmada de todos modos.
- PUT desde `R2_UPLOAD_ORIGINS` o, si no se define, desde cualquier origen. La URL prefirmada fija clave, tipo y tamaño, y caduca a los 10 minutos.

## Migración de los archivos de Firebase

**Estado al 2026-10-29:**

- Los 50 objetos de Firebase (42.8 MB) están copiados a R2 con la misma clave y verificados por MD5.
- La base todavía guarda URLs de Firebase: 25 referencias en logos, reglamentos, comunicados, una convocatoria y una respuesta de ticket.
- 1 referencia no se puede migrar: `Income` 9f4b1bf8, `…/income-receipt/1777241223309-ghf.pdf`, ya no existe en Firebase.

`src/scripts/migrate-storage-firebase-to-r2.ts`:

```bash
npm run storage:migrate-to-r2 -- --service-account ./ruta/cuenta-firebase.json            # simulación
npm run storage:migrate-to-r2 -- --copy  --service-account ./ruta/cuenta-firebase.json     # copia lo que falte
npm run storage:migrate-to-r2 -- --apply --app-url https://<producción> --service-account ./ruta/cuenta-firebase.json  # copia y reescribe la base
npm run storage:migrate-to-r2 -- --rollback .storage-migration/urls-firebase-<fecha>.json  # deshace la reescritura
```

- Es idempotente: solo copia objetos ausentes o distintos (por MD5) y solo reescribe valores que sigan apuntando a Firebase.
- Una URL se reescribe únicamente si su objeto está en R2 con el mismo MD5.
- `--apply` deja un respaldo en `.storage-migration/` (ignorado por git; contiene los enlaces viejos con su token) y aplica todo en una transacción.
- Avisa si alguna columna fuera del catálogo menciona Firebase.

### Orden del cambio en producción

1. En Vercel, definir las `R2_*` en Production, con el token limitado al bucket. En Preview, hasta después del paso 4: ver la advertencia de abajo.
2. Correr `--copy` justo antes de desplegar y desplegar esta rama. Hasta el paso 4 la base sigue con URLs de Firebase, que funcionan mientras Firebase esté activo.
3. Redirigir o apagar el minisitio independiente (`insulae-minisitio.vercel.app`). Ya pierde su API con el despliegue, y con las URLs nuevas tampoco resolvería los archivos.
4. `npm run storage:migrate-to-r2 -- --apply --app-url https://<dominio de producción> --service-account <ruta>`. Primero comprueba que la app desplegada ya sirve `/api/archivos` desde R2 (si no, no toca la base); luego copia lo subido a Firebase después del último `--copy` y reescribe las URLs.
5. Verificar: la simulación debe decir `Total a reescribir: 0`, y deben abrir los reglamentos, los comunicados y el logo del panel y del minisitio.
6. Apagar Firebase Storage, borrar la clave de la cuenta de servicio en Google Cloud y el archivo JSON local.

**No correr `--apply` antes del despliegue.** El código de `main` no conoce `/api/archivos` y dejaría sin archivos a producción.

**No subir archivos desde local ni desde previews mientras producción corra `main`.** Ambos comparten la base de producción. Un archivo subido desde la rama guarda `/api/archivos/...`, que `main` no sabe servir, y quedaría roto en producción hasta el despliegue. Por eso Preview recibe las `R2_*` después del corte.

### Rollback

- **Antes del paso 4** volver a `main` (Instant Rollback de Vercel) no cuesta nada: la base sigue con URLs de Firebase.
- **Después del paso 4**, mejor corregir hacia adelante. Si hay que volver a `main`, primero `npm run storage:migrate-to-r2 -- --rollback <respaldo>`. Ojo: lo que se haya subido después del despliegue solo existe en R2 con URLs `/api/archivos/...`, y `main` no lo puede mostrar.

## Riesgos y pendientes conocidos

- **ETL y backfills de la 1.0.** `backfill-tickets-from-legacy`, `backfill-project-legacy-fields`, `backfill-announcements` y los `update` de `promote-from-staging` reescriben columnas de archivos con valores de la 1.0 si se vuelven a correr. No correrlos contra producción sin revisarlos.
- **Archivos huérfanos.** Los archivos reemplazados quedan en R2, como pasaba en Firebase. Los comprobantes de ingresos y gastos y las imágenes de áreas privativas ahora se borran después de guardar, no antes.
- **Control de acceso.** Cualquiera con el enlace puede abrir el archivo, igual que con Firebase. Los objetos migrados no llevan UUID, solo marca de tiempo y nombre, y no hay constancias ni comprobantes vigentes entre ellos. Para exigir sesión en comprobantes o constancias haría falta validar en la ruta, más una ruta gemela bajo `/minisitio` por la cookie.
- **Enlaces ya enviados.** Los enlaces de Firebase mandados por correo o WhatsApp dejan de abrir cuando se apague Firebase.

## Verificación hecha (2026-10-29)

- Copia de los 50 objetos con Content-MD5; los 50 se sirven por `/api/archivos` (302 → R2) con el mismo MD5, tipo y CORS. Los intentos de `..` y las claves fuera de `condominiums/` dan 404 o se normalizan dentro del prefijo.
- Server actions contra el dev server:
  - Subida PUT real: R2 rechaza otro tipo u otro tamaño y conserva el nombre con acentos.
  - El servidor rechaza HTML, tipos mezclados (`image/png, text/html`), archivos de 0 B o de más de 25 MB y tipos desconocidos. El SVG se firma como descarga.
  - Borrado: funciona con un comprobante sin uso. Rechaza un reglamento (tipo no borrable), el comprobante que el ingreso 9f4b1bf8 todavía referencia y las URLs ajenas.
  - Un usuario sin permisos no puede subir ni borrar, y sin sesión la petición se manda al login.
- Guardas de `--apply`: sin `--app-url`, con un host inalcanzable o con uno que no es la app (404), se detiene antes de tocar la base. Contra el dev server, la comprobación confirma la redirección a R2.
- Revisión independiente de 5 revisores, con 2 verificadores por hallazgo. Se corrigieron:
  - el borrado, que antes bastaba con permiso de "crear" o de otro módulo;
  - las URLs guardadas con otros esquemas (`javascript:`) o fuera de `condominiums/`;
  - la lista de tipos permitidos;
  - una recopia fallida, que ya no reescribe la URL;
  - la exportación del presupuesto a Excel, que ahora usa URL completa.
- Logo de los PDF del minisitio: se lee de R2 para URLs `/api/archivos`, absolutas y antiguas de Firebase. Rechaza PDF, hosts ajenos y claves inexistentes.
- HTML de 19 pantallas (panel, minisitio y públicas) con la base simulada ya migrada: todos los archivos salen como `/api/archivos/...`, sin prefijos legacy pegados. El aviso de privacidad legacy conserva su ruta de la 1.0.
- `tsc`, `eslint` (0 errores) y `next build` (Turbopack). El HTML de las 19 pantallas también responde 200 con la base real, que aún tiene las URLs de Firebase.
- No se probó en navegador: el navegador conectado no alcanza el servidor local. El CORS se verificó con peticiones de preflight y con `Origin: null`.
