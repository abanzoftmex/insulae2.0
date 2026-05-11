# AI Design Prompt — Insulae 2.0 (Valquirico) Condominium Admin
## Implementation Reference (Proven Working)

This document is the **working contract** for implementing and extending the UI of this Next.js 16 App Router condominium administration platform. It reflects what was actually built and verified — not aspirational targets. Read end-to-end before touching any file. The visual token source is `DESIGN.md`; this document adds the implementation layer on top.

---

## 1. Critical: Tailwind v4 Spacing Fix

**Do this first or everything will look wrong.**

In Tailwind v4, any CSS variable named `--spacing-N` inside `@theme` **overrides** the corresponding utility class (`p-4`, `gap-3`, `h-9`, etc.). The previous implementation accidentally used `--spacing-N` names for design tokens, which made `p-4 = 2.4rem = 38px` instead of the standard `1rem = 16px`.

**The fix (already applied in `globals.css`):** design tokens are named `--space-N`, not `--spacing-N`. Standard Tailwind utility classes (`p-4`, `gap-3`, etc.) now use default Tailwind values.

**Rule for any future custom spacing tokens:** always use `--space-N` (or any prefix other than `--spacing-N`) inside `@theme`.

---

## 2. Token Setup (`src/app/globals.css`)

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-canvas: #f2f0eb;       /* Neutral Warm — page canvas */
  --color-canvas-2: #edebe9;     /* Ceramic — alternate canvas */
  --color-card: #ffffff;         /* Card surface */
  --color-brand: #006241;        /* Starbucks Green — headings, active nav */
  --color-brand-accent: #00754A; /* Green Accent — CTAs, focus rings */
  --color-brand-deep: #1E3932;   /* House Green — deep surfaces */
  --color-brand-uplift: #2b5148;
  --color-brand-mint: #d4e9e2;   /* mint tint — success states */
  --color-gold: #cba258;
  --color-gold-soft: #faf6ee;
  --color-ink: rgb(0 0 0 / 0.87);
  --color-ink-soft: rgb(0 0 0 / 0.58);
  --color-line: rgb(0 0 0 / 0.06);  /* hairline borders */
  --color-danger: #c82014;

  --radius-card: 12px;
  --radius-pill: 9999px;
  --shadow-card: 0 0 0.5px rgb(0 0 0 / 0.14), 0 1px 1px rgb(0 0 0 / 0.24);

  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;

  /* Design reference tokens — --space-N, NOT --spacing-N */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 32px;
  --space-6: 40px;
  --space-7: 48px;
  --space-8: 56px;
  --space-9: 64px;
}

@layer base {
  body {
    background-color: var(--color-canvas);
    color: var(--color-ink);
    -webkit-font-smoothing: antialiased;
  }
  * { border-color: var(--color-line); }
}

@utility transition-standard {
  transition-property: all;
  transition-timing-function: ease;
  transition-duration: 200ms;
}

@utility active-scale {
  &:active { transform: scale(0.95); }
}
```

Use these in code as Tailwind classes: `bg-canvas`, `text-ink`, `bg-card`, `text-brand`, `text-brand-accent`, `border-line`, `rounded-card`, `rounded-pill`, `shadow-card`.

---

## 3. Font Setup (`src/app/layout.tsx`)

```tsx
import { Inter } from "next/font/google";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
```

Apply on `<html>` with `${inter.variable}`. Body: `font-sans tracking-[-0.01em]`. Inter replaces SoDoSans (proprietary). The tight tracking is mandatory.

---

## 4. Shell Layout (`src/app/app-shell.tsx`)

**No persistent header.** The sidebar carries navigation and brand. Mobile gets a thin sticky top bar (hamburger + brand name only, `lg:hidden`).

### Sidebar dimensions
- Expanded: `w-[264px]`
- Collapsed: `w-[72px]` (icon-only)
- Main content offset: `lg:pl-[264px]` / `lg:pl-[72px]`

### Main content padding
```tsx
<main className="flex-1 p-4 md:p-6 lg:py-8 lg:px-10 max-w-[1440px] w-full mx-auto">
```
This gives: 16px mobile / 24px tablet / 32px×40px desktop. Per design spec.

### Nav item height
`h-10` = 40px exactly. Use this, not `h-9` (36px) or anything else.

### Sub-menu items
`h-8` = 32px. Indented with `ml-4 pl-3 border-l border-line`.

### Active nav item
```
bg-[#f2f0eb] text-brand font-semibold
```
With a `3px` left accent bar: `absolute left-0 w-[3px] h-5 bg-brand-accent rounded-full`

### Hover state
```
hover:bg-[#f5f4f0]
```
Do NOT use `hover:bg-canvas` — `#f5f4f0` is slightly darker than the canvas and reads as hover correctly.

### Section labels
```tsx
<p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-soft/40">
```

### Icons
Always `style={{ width: 16, height: 16 }}` with `strokeWidth={1.5}`. Use inline style, not Tailwind width/height classes, to avoid any spacing override ambiguity.

### Sidebar state (Zustand)
`src/stores/ui-sidebar.store.ts` — `useSidebarStore` with `isCollapsed` (persisted to `localStorage` key `insulae.ui.sidebar`) and `isMobileOpen` (transient). Use `useHydratedSidebar()` hook to avoid SSR/hydration mismatch.

### Footer
Just the collapse toggle button. No status indicators.

---

## 5. Page Canvas Rules

- Page background: `bg-canvas` (`#f2f0eb`) — never white
- Cards: `bg-card` (`#ffffff`) with `rounded-card` + `shadow-card`
- Body text: `text-ink` (`rgba(0,0,0,0.87)`) — never pure black
- Headings (brand moments): `text-brand` (`#006241`)
- Secondary text: `text-ink-soft` (`rgba(0,0,0,0.58)`)
- Hairlines: `border-line` (`rgba(0,0,0,0.06)`)

---

## 6. Home Dashboard (`src/app/page.tsx`)

### Layout structure
```
Page header (title + subtitle)
  space-y-6
4-up StatCard grid (grid-cols-2 lg:grid-cols-4 gap-3)
  space-y-6 (included in parent space-y-6)
2/3 + 1/3 split (grid-cols-1 lg:grid-cols-3 gap-3)
  left: Actividad Financiera chart card (lg:col-span-2)
  right: Tickets recientes list card
3-up QuickAction cards (grid-cols-1 md:grid-cols-3 gap-3)
```

### StatCard anatomy
```tsx
<Card className="p-4">
  <div className="flex items-start justify-between mb-3">
    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft/60">{label}</p>
    <span className="p-1.5 rounded-md bg-canvas text-brand-accent/50">{icon}</span>
  </div>
  <div className="flex items-end justify-between">
    <span className="text-[26px] font-bold text-brand leading-none tracking-tight">{value}</span>
    {trend && <span className={...}>{trend.up ? "↑" : "↓"} {trend.label}</span>}
  </div>
</Card>
```
Trend chip: up = `bg-brand-mint/40 text-brand`, down = `bg-danger/10 text-danger`.

### Financial chart
Uses `recharts` (installed: `^3.8.1`). Component: `src/components/ui/financial-chart.tsx`.
- `AreaChart` with two `Area` series: ingresos (green `#00754A`) and gastos (red `#c82014`)
- Gradient fills with `stopOpacity` 0.15 → 0
- `strokeWidth={1.5}`, `dot={false}`
- Custom `Tooltip` with `bg-card border border-line rounded-lg`
- `ResponsiveContainer` at `height={160}`
- Data type: `{ month: string, ingresos: number, gastos: number }[]`

Map from VM: `financialSummary?.months.map(m => ({ month: m.monthLabel.slice(0,3), ingresos: m.totalIncomeValue, gastos: m.totalExpensesValue }))`

**Required VM field additions** (`financial-summary.vm.ts`): `totalIncomeValue: number` and `totalExpensesValue: number` on `FinancialSummaryMonthVM`, populated from `month.totalIncome` and `month.totalExpenses` (domain numeric values).

### QuickAction card
Horizontal layout: 32px icon container + title inline, then description, then CTA with arrow. Container size: `style={{ width: 32, height: 32 }}` — use explicit style to avoid class ambiguity.

```tsx
<div className="flex items-center gap-3 mb-3">
  <span className="inline-flex items-center justify-center rounded-lg bg-canvas text-brand-accent
                   group-hover:bg-brand-mint/30 transition-standard"
        style={{ width: 32, height: 32 }}>
    {icon}  {/* icon: style={{ width: 16, height: 16 }} strokeWidth={1.5} */}
  </span>
  <h3 className="text-[13px] font-semibold text-brand">{title}</h3>
</div>
<p className="text-[12px] text-ink-soft leading-relaxed mb-4">{description}</p>
<span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-accent
                 group-hover:gap-1.5 transition-all">
  {cta} <ArrowRight style={{ width: 12, height: 12 }} />
</span>
```

---

## 7. Card Component (`src/components/ui/card.tsx`)

```tsx
<div className={cn("rounded-card bg-card text-ink shadow-layered", className)}>
```
`shadow-layered` is a `@utility` in globals.css applying `--shadow-card`. Card fills are always white. No color-tinted cards in back-office context.

---

## 8. Button Component (`src/components/ui/button.tsx`)

Uses `cva`. All variants share `rounded-pill` (9999px radius) and `active-scale` (scale 0.95 on press). Key variants:
- `primary`: `bg-brand-accent text-white`
- `outline`: `border border-brand-accent text-brand-accent`
- `ghost`: `hover:bg-canvas text-ink`
- `destructive`: `bg-danger text-white`

Sizes: `sm` = `h-8 px-3 text-xs`, `md` = `h-10 px-4`, `lg` = `h-12 px-6 text-base`.

---

## 9. Typography Scale

| Role | Class | Renders |
|------|-------|---------|
| Page title | `text-xl font-bold text-brand tracking-tight` | 20px/700 brand green |
| Section subtitle | `text-[13px] text-ink-soft` | 13px secondary |
| Card section label | `text-[11px] font-semibold uppercase tracking-widest text-ink-soft` | 11px uppercase |
| Nav item | `text-[13px] font-medium` | 13px |
| Sub-nav item | `text-[12px]` | 12px |
| Section label | `text-[10px] font-semibold uppercase tracking-widest text-ink-soft/40` | 10px |
| Body in card | `text-[13px]` or `text-sm` | 13-14px |
| Small label | `text-[12px] text-ink-soft` | 12px |
| Micro label | `text-[11px] text-ink-soft/60` | 11px |

**Do not use `font-black` (weight 900)** — the strongest weight in UI is **`font-bold` (700)** (uppercase labels, table headers, etc.); use **`font-semibold` (600)** when you want less emphasis.

**Never use `uppercase tracking-tighter`** on headings — use `tracking-tight` or default.

---

## 10. Spacing Reference (Standard Tailwind, now fixed)

After the `--spacing-N` → `--space-N` rename, standard Tailwind values apply:

| Class | Value |
|-------|-------|
| `p-2` | 8px |
| `p-3` | 12px |
| `p-4` | 16px |
| `p-5` | 20px |
| `p-6` | 24px |
| `p-8` | 32px |
| `p-10` | 40px |
| `gap-3` | 12px |
| `gap-4` | 16px |
| `space-y-4` | 16px |
| `space-y-6` | 24px |
| `h-8` | 32px |
| `h-10` | 40px |
| `h-12` | 48px |

Use these as your mental model. If a value looks too large, check that no `--spacing-N` tokens were accidentally re-introduced.

---

## 11. Icon Usage Rules

1. Always use `lucide-react` icons
2. Always set size with `style={{ width: N, height: N }}` — NOT `className="w-4 h-4"` for critical layout icons (avoids spacing-scale ambiguity)
3. Always `strokeWidth={1.5}` — not the default 2
4. Nav icons: 16×16. Stat card icons: 14×14. Quick-action icons: 16×16. Chart placeholders: 20×20.

---

## 12. What NOT to do

- **No gradients** anywhere in the app shell or page bodies
- **No blurred glow blobs** or `radial-gradient` decorative backgrounds
- **No pure white** page canvas — always `bg-canvas`
- **No pure black** text — always `text-ink`
- **No `--spacing-N` tokens** in `@theme` (breaks utility classes)
- **No inline forms** on listing pages — all CRUD in modals
- **No `font-black` (900)** on UI text — **`font-bold` (700)** is the ceiling for weight
- **No component libraries** (shadcn/ui, Radix, Headless UI, etc.) — Tailwind only
- **No per-page font imports** — only the root `layout.tsx` Inter import

---

## 13. File/Folder Conventions

```
src/
  app/
    globals.css          — tokens + utilities (do not add --spacing-N here)
    layout.tsx           — Inter font, AppShell wrapper
    app-shell.tsx        — sidebar + mobile top bar (no persistent header)
    page.tsx             — home dashboard
  components/
    ui/
      button.tsx         — cva variants, rounded-pill, active-scale
      card.tsx           — rounded-card bg-card shadow-layered
      stat-card.tsx      — dashboard KPI card
      financial-chart.tsx — recharts AreaChart component (client)
  stores/
    ui-sidebar.store.ts  — Zustand sidebar state + useHydratedSidebar
  shared/
    utils/cn.ts          — clsx + twMerge helper
```

Stores use localStorage prefix `insulae.ui.*`. New stores follow same pattern.

---

## 15. Master Profile Pattern (Ficha Maestra)

For detail/profile views (e.g., Directory, Property detail):

1. **Background**: Use `blur-3xl` decorative blobs (`bg-brand/10` and `bg-brand-accent/08`) positioned absolutely to create depth.
2. **Layout**: `grid gap-8 lg:grid-cols-3`.
3. **Sections**: Group related info into `rounded-[2rem] border border-brand/30 bg-[#fffdfa] p-8` containers.
4. **InfoItem**: Use a small component for label/value pairs:
   - Label: `text-[10px] font-bold uppercase tracking-[0.15em] text-ink-soft/60`
   - Value: `text-base font-medium text-brand` (or `text-ink`)
5. **Tables**: Inside sections, use `overflow-hidden rounded-[2rem]`. Headers: `bg-[#fdf8f2]`. Rows: `odd:bg-white even:bg-[#fdfbf9]`.

---

## 16. Known Gaps / Future Work

- `SoDoSans` → **Inter** substitute (applied)
- `Lander Tall` serif → used in Master Profile as `Cormorant Garamond`
- `Kalam` script → not used
- DataTable primitive → standard listing layout pending
- Modal primitive → standard CRUD flows pending
