# Legacy actions map for Areas Privativas (AP/FAP)

## Source of truth found in legacy

- Main render: `insulae/listado_apolesDinamico.php`
- Dynamic FAP JS flows: `insulae/assets-list-apoles/components-dynamic-rows.js`
- Create FAP endpoint: `insulae/assets-list-apoles/create-new-apoleMAR.php`
- Delete FAP endpoint: `insulae/assets-list-apoles/delete-apole-from-sub-project.php`

## Actions currently implemented in Insulae 2.0 (phase 1)

These are the five actions requested and mapped 1:1 to legacy routes:

1. Edit base (pencil icon)
   - `/areas-privativas/formulario-apol?id=<legacyId>`
2. Edit images (image icon)
   - `/areas-privativas/formulario-apol-imagenes?id=<legacyId>`
3. Owner payments (pill button)
   - `/areas-privativas/listado-pagos?id=<legacyId>&opc=2`
4. Commerce payments (pill button)
   - `/areas-privativas/listado-pagos?id=<legacyId>&opc=1`
5. Rentals (store icon)
   - `/areas-privativas/listado-arrendamientos?id=<legacyId>`

## Pages implemented (current scope)

- `src/app/areas-privativas/formulario-apol/page.tsx`
- `src/app/areas-privativas/formulario-apol-imagenes/page.tsx`
- `src/app/areas-privativas/listado-pagos/page.tsx`
- `src/app/areas-privativas/listado-arrendamientos/page.tsx`

## Rule parity currently applied

- Actions are enabled only when `legacyId` exists.
- Rentals action is disabled when `legacyStatusId === 2` (legacy dormido behavior).
- Same action contract is used for AP and FAP rows.

## Hexagonal design in Insulae 2.0

Module: `src/modules/private-area-actions`

- Domain
  - `private-area-legacy-actions.ts`
  - `private-area-legacy-actions.resolver.ts`
- Application
  - `get-private-area-legacy-actions.use-case.ts`
- Infrastructure
  - `legacy-private-area-actions.resolver.ts`
- Composition root
  - `index.ts`

This lets us evolve behavior without touching UI rendering logic.

## Legacy actions detected but not yet implemented in UI (phase 2)

- Add FAP (AP parent only)
- Fusion AP (when AP has children)
- Delete FAP (child rows)

These flows in legacy depend on dynamic JS/AJAX behavior and backend side effects, not only navigation links.

## Notes about images page

- Legacy `formulario_apol_imagenes.php` depends on `AREAS_PRIVATIVAS_IMAGENES` plus AJAX endpoints.
- In Insulae 2.0 route is created and integrated in navigation.
- Persistence model for private area images is intentionally pending to avoid coupling while payments/form/rentals stay fully operational.
