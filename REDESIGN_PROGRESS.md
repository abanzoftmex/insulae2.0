# Redesign Progress Tracker — Insulae 2.0

Status: 🟢 Done | 🟡 In Progress | ⚪ Pending

## Canonical Routes Redesigned
- [x] `/` (Home Dashboard) 🟢 — **migrado al plano de contenido Fluent 2** (2026-08-04)
- [x] `/contactos` 🟢
- [x] `/tickets` 🟢
- [x] `/listado-zonas` 🟢
- [x] `/resumen-financiero` 🟢
- [x] `/listado-ingresos` 🟢
- [x] `/listado-estructura-otros-ingresos` 🟢
- [x] `/cobros-masivos` 🟢
- [x] `/listado-gastos` 🟢
- [x] `/presupuestos` 🟢
- [x] `/listado-estructura-presupuesto` 🟢
- [x] `/reporte-cuotas` 🟢
- [x] `/sanciones` 🟢
- [x] `/areas-privativas` 🟢
- [x] `/listado-seguridad` 🟢
- [x] `/listado-usos-suelo` 🟢
- [x] `/reglamentos` 🟢
- [x] `/directorio` 🟢
- [x] `/estructura-condominal` 🟢
- [x] `/reporte-condominio` 🟢
- [x] `/condominio` 🟢

---
### Design Guidelines Summary

⚠️ **Hay dos sistemas conviviendo.** Antes de tocar una ruta, mira cuál usa.

**A) Plano de contenido Fluent 2 / Teams** — dirección nueva, ver
`docs/fluent-teams-design-analysis.md`. Hoy sólo en `/`.
- **Superficie:** blanco + hairline `#e0e0e0`. La tarjeta en reposo **no lleva sombra**.
- **Radios:** 4px controles, 8px paneles. Sin píldoras.
- **Tipografía:** sentence case, jerarquía por peso (400/600) y rampa de gris.
  Nada de MAYÚSCULAS con `tracking-widest`.
- **Color:** olivo sólo como acento (acción primaria, seleccionado); verde/rojo
  sólo si el dato es semántico.
- **Primitivas:** `src/components/ui/fluent.tsx`.

**B) Sistema olivo (Starbucks)** — las 21 rutas de arriba y el rail de navegación.
- **Density:** 95% space usage, compact components (h-8 items), tight tracking (-0.01em).
- **Architecture:** `DataTable` for listings, `Modal` for CRUD, `Badge` for status.
- **Aesthetics:** Starbucks-inspired (Brand Green, Canvas Neutral), high-contrast "Pixel Perfect" UI.

Migrar de A ← B **una ruta a la vez**, nunca en masa. El rail se queda en el
sistema olivo a propósito: rail de marca + lienzo neutro es el patrón de Teams.
