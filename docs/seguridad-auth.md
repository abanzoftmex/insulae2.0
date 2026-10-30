# Autenticación y cuentas: cómo funciona y qué cuidar

Estado al 2026-10-29. Resume las reglas de login, contraseñas, sesiones y permisos del panel
(`src/app/(admin)`) y del minisitio (`src/app/(minisitio)`), y lo que hay que tener en cuenta al
desplegar.

## Contraseñas

- Se guardan con scrypt y sal propia (`src/shared/application/auth/password-hash.ts`): `scrypt$15$8$1$<sal>$<hash>`.
- Los formatos viejos (SHA-256 sin sal y MD5) se siguen aceptando al iniciar sesión, y al entrar se reemplazan por scrypt (`password-login.ts`).
- Ya no se compara en texto plano: con eso el hash guardado servía como contraseña.

**El cambio a scrypt no tiene vuelta atrás.** El código anterior no sabe leer `scrypt$…`.

- **Antes de que producción corra este código,** no iniciar sesión con cuentas reales desde local ni desde previews: comparten la base, y la cuenta quedaría con un hash que producción no reconoce.
- **Después del despliegue,** corregir hacia adelante en lugar de hacer Instant Rollback. Quien haya entrado desde entonces no podría iniciar sesión en la versión anterior; se recupera con "¿Olvidaste tu contraseña?".

## Búsqueda por correo

- `findUserIdsByEmail()` busca de forma exacta, salvo mayúsculas (`src/shared/infrastructure/db/user-email-lookup.ts`).
- Prisma traduce `equals` con `mode: "insensitive"` a ILIKE, donde `_` y `%` son comodines. Nunca usarlo para buscar correos.
- Los correos (restablecimiento, etc.) se envían a la dirección guardada que coincidió, nunca a la tecleada.

## Sesiones

- Las cookies del panel (`insulae_session`) y del minisitio (`minisitio_session`) llevan una huella HMAC de la contraseña (`sv`).
- `readAdminSession()` y `readVerifiedCondominoSession()` / `requireCondominoSession()` la comparan con la base.
- Cambiar o restablecer la contraseña, o desactivar la cuenta, cierra todas sus sesiones.
- Las sesiones sin `sv` se rechazan: al desplegar esto, todos vuelven a iniciar sesión una vez.
- El middleware solo revisa la firma. Una cookie firmada pero revocada se borra en `/api/auth/salir`, adonde mandan `requireAdminSession()` y `requirePageAccess()`, para no entrar en un bucle entre `/login` y `/`.
- Los tokens de restablecimiento (`admin-reset-2`, `reset-2`) son de un solo uso: llevan la huella `pv` de la contraseña. Tampoco sirven como sesión.
- Se rechazan los del formato anterior, que siguen emitiendo los despliegues viejos.

## Límite de intentos

`src/shared/infrastructure/db/auth-throttle.ts`, tabla `AuthThrottle` (migración `20261029230000_auth_throttle`).

| Acción | Reglas |
|---|---|
| Login (panel y minisitio comparten contadores) | 5 por correo+IP y 30 por IP cada 15 min; 50 por correo cada hora |
| "¿Olvidaste tu contraseña?" | 5 por correo y 10 por IP cada hora (al pasarse se responde igual, sin enviar) |
| Cambio de contraseña con sesión | 5 cada 15 min por cuenta |
| Modo superadmin | 5 por IP cada 15 min y 20 en total cada hora |

- Cada intento se cuenta antes de verificar, con un `INSERT … ON CONFLICT … RETURNING` atómico.
- El tope por correo es alto a propósito: quien conoce un correo puede agotarlo y bloquear a esa persona.
- **Hasta aplicar la migración no se limita nada** (avisa una vez en el log). Para aplicarla: `npx prisma migrate deploy`. Solo crea la tabla.

## Mensajes del login

Mientras no se verifica la contraseña, todo error da el mismo mensaje y tarda lo mismo: siempre se hace al menos una verificación scrypt. "Cuenta inactiva" solo aparece si la contraseña coincidió.

## Directorio (`src/shared/application/auth/account-guards.ts`)

Con el permiso del Directorio no se puede tomar una cuenta con acceso al panel ni darse permisos.

- **Cuentas con acceso al panel.** Cambiar su contraseña o contraseña provisional, sus correos, tipo o rol inicial, o darla de baja (a ella o a sus usuarios anidados), exige el permiso de **modificar Roles**. El privilegio se calcula por roles aunque la cuenta esté inactiva.
- **Tipo ADMIN.** Darlo, o tocar la cuenta de sistema, solo lo hace otra cuenta ADMIN.
- **Rol inicial.** Dar a cualquier cuenta un rol que abre el panel exige Roles. Si el rol inicial no cambió, no se manda al repositorio, que si lo recibe borra y recrea los `UserRole`.
- **Contacto inexistente.** Si no existe con el id recibido, no se guarda nada.

## Asambleas

`registerVoteAction` y `toggleAttendanceAction`:

- **Quién marca:** el operador (Convocatorias con permiso de modificar) marca cualquier puesto o invitado de la convocatoria. Un participante solo los que representa (`assembly-representation.ts`), y solo mientras la asamblea siga abierta.
- **Concurrencia:** cada registro lee y escribe con la fila bloqueada (`SELECT … FOR UPDATE`), para que dos votos simultáneos no se pisen.

## Rutas `/api`

El middleware no cubre `/api`. Cada route handler protege lo suyo, por ejemplo con `apiAccessDenied(módulo)` de `guards.ts`. `/api/archivos` es pública a propósito (ver `docs/almacenamiento-r2.md`).
