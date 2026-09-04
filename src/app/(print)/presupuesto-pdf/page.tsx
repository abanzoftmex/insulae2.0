import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import React from "react";
import { getBudgetByYearUseCase } from "@/modules/budget";
import { prisma } from "@/shared/infrastructure/db/prisma";

export const dynamic = "force-dynamic";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function pct(generated: number, budgeted: number) {
  if (budgeted <= 0) return 0;
  return Math.min((generated / budgeted) * 100, 100);
}

// ─── Design tokens ──────────────────────────────────────────────────────────

const C = {
  brand:      "#1a5c3a",
  brandLight: "#e8f5ee",
  brandBdr:   "rgba(26,92,58,0.2)",
  cyan:       "#0891b2",
  cyanLight:  "#ecfeff",
  cyanBdr:    "rgba(8,145,178,0.2)",
  lime:       "#4d7c0f",
  limeLight:  "#f7fee7",
  limeBdr:    "rgba(77,124,15,0.2)",
  danger:     "#dc2626",
  g100:       "#f3f4f6",
  g200:       "#e5e7eb",
  g400:       "#9ca3af",
  g500:       "#6b7280",
  g600:       "#4b5563",
  g800:       "#1f2937",
} as const;

type Accent = "brand" | "cyan";
const ACCENT = {
  brand: { fg: C.brand, light: C.brandLight, bdr: C.brandBdr },
  cyan:  { fg: C.cyan,  light: C.cyanLight,  bdr: C.cyanBdr  },
} as const;

// ─── Sub-components ─────────────────────────────────────────────────────────

function Bar({ value, color, height = 5 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ width: "100%", height, background: C.g200, borderRadius: 9999, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 9999 }} />
    </div>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <div style={{ width: 50, height: 4, background: C.g200, borderRadius: 9999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 9999 }} />
      </div>
      <span style={{ fontSize: 7.5, color, fontWeight: 700 }}>{value.toFixed(0)}%</span>
    </div>
  );
}

function KpiCard({ label, budgeted, generated, fg, bg, bdr }: {
  label: string; budgeted: number; generated: number;
  fg: string; bg: string; bdr: string;
}) {
  const p = pct(generated, budgeted);
  const over = generated > budgeted;
  const balance = budgeted - generated;
  return (
    <div style={{ background: bg, borderRadius: 14, padding: "16px 18px", border: `1.5px solid ${bdr}` }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, color: fg, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 23, fontWeight: 900, color: fg, lineHeight: 1, letterSpacing: -0.5 }}>{fmt(budgeted)}</div>
      <div style={{ fontSize: 9.5, color: C.g500, marginTop: 6 }}>
        Ejercido:&nbsp;<strong style={{ color: over ? C.danger : fg }}>{fmt(generated)}</strong>
      </div>
      <div style={{ fontSize: 9.5, color: C.g500, marginTop: 2 }}>
        Disponible:&nbsp;<strong style={{ color: balance < 0 ? C.danger : C.g600 }}>{fmt(balance)}</strong>
      </div>
      <Bar value={p} color={over ? C.danger : fg} />
      <div style={{ fontSize: 8, color: over ? C.danger : C.g400, textAlign: "right", marginTop: 3, fontWeight: 700 }}>
        {p.toFixed(0)}% ejecutado
      </div>
    </div>
  );
}

function SummaryBanner({ label, sub, budgeted, generated, fg }: {
  label: string; sub: string; budgeted: number; generated: number; fg: string;
}) {
  const over = generated > budgeted;
  return (
    <div style={{ background: fg, color: "#fff", borderRadius: "10px 10px 0 0", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 8, opacity: 0.65, marginTop: 1, textTransform: "uppercase", letterSpacing: 1 }}>{sub}</div>
      </div>
      <div style={{ display: "flex", gap: 28 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 8, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>Total Presupuesto</div>
          <div style={{ fontSize: 15, fontWeight: 900 }}>{fmt(budgeted)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 8, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>Total Ejercido</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: over ? "#fca5a5" : "#bbf7d0" }}>{fmt(generated)}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ card, accent }: {
  card: { title: string; subtitle?: string; budgeted: number; generated: number };
  accent: Accent;
}) {
  const { fg, bdr } = ACCENT[accent];
  const p = pct(card.generated, card.budgeted);
  const over = card.generated > card.budgeted;
  return (
    <div className="avoid-break" style={{ border: `1.5px solid ${bdr}`, borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
      <div style={{ fontSize: 8, fontWeight: 800, color: C.g400, letterSpacing: 1.5, textTransform: "uppercase", lineHeight: 1.35, minHeight: 24 }}>{card.title}</div>
      {card.subtitle && <div style={{ fontSize: 7.5, color: C.g400, marginTop: 2, lineHeight: 1.3 }}>{card.subtitle}</div>}
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 8, color: C.g400, textTransform: "uppercase", fontWeight: 700 }}>Presupuesto</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.g800 }}>{fmt(card.budgeted)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 }}>
        <span style={{ fontSize: 8, color: C.g400, textTransform: "uppercase", fontWeight: 700 }}>Ejercido</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: over ? C.danger : fg }}>{fmt(card.generated)}</span>
      </div>
      <Bar value={p} color={over ? C.danger : fg} />
      <div style={{ fontSize: 7.5, color: over ? C.danger : C.g400, textAlign: "right", marginTop: 3, fontWeight: 700 }}>
        {p.toFixed(0)}% ejecutado
      </div>
    </div>
  );
}

function GroupTable({ group, year, accent }: {
  group: {
    groupId: string; groupData: string;
    budgeted: number; generated: number; balance: number;
    concepts: { conceptId: string; conceptName: string; budgeted: number; generated: number; balance: number }[];
  };
  year: number;
  accent: Accent;
}) {
  const { fg, light } = ACCENT[accent];
  return (
    <div className="avoid-break" style={{ marginBottom: 18 }}>
      {/* Group header */}
      <div style={{
        background: light, borderLeft: `4px solid ${fg}`,
        padding: "8px 14px", borderRadius: "0 8px 8px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: fg, textTransform: "uppercase", letterSpacing: 1 }}>{group.groupData}</span>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Presupuesto", val: group.budgeted,  col: fg },
            { label: "Ejercido",    val: group.generated, col: group.generated > group.budgeted ? C.danger : fg },
            { label: "Saldo",       val: group.balance,   col: group.balance < 0 ? C.danger : C.g800 },
          ].map(({ label, val, col }) => (
            <div key={label} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 7.5, color: C.g400, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: col }}>{fmt(val)}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
        <thead>
          <tr style={{ background: C.g100 }}>
            {["Concepto", `Presupuestado ${year}`, `Gastado ${year}`, "Saldo Actual", "Ejecución"].map((h, i) => (
              <th key={h} style={{
                padding: "5px 10px",
                textAlign: i === 0 ? "left" : i === 4 ? "center" : "right",
                fontWeight: 800, color: C.g600, textTransform: "uppercase",
                letterSpacing: 0.5, fontSize: 8, borderBottom: `1px solid ${C.g200}`,
                width: i === 4 ? 68 : undefined,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {group.concepts.map((concept, cIdx) => {
            const p = pct(concept.generated, concept.budgeted);
            const over = concept.generated > concept.budgeted;
            return (
              <tr key={concept.conceptId} style={{ background: cIdx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "5px 10px", fontWeight: 600, color: C.g800, borderBottom: `1px solid ${C.g200}` }}>{concept.conceptName}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", color: C.g600, borderBottom: `1px solid ${C.g200}` }}>{fmt(concept.budgeted)}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", color: over ? C.danger : C.g600, fontWeight: over ? 700 : 400, borderBottom: `1px solid ${C.g200}` }}>{fmt(concept.generated)}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700, color: concept.balance < 0 ? C.danger : C.g800, borderBottom: `1px solid ${C.g200}` }}>{fmt(concept.balance)}</td>
                <td style={{ padding: "5px 10px", borderBottom: `1px solid ${C.g200}` }}>
                  <MiniBar value={p} color={over ? C.danger : fg} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: fg }}>
            <td style={{ padding: "6px 10px", fontWeight: 800, color: "#fff", textTransform: "uppercase", fontSize: 9 }}>Total {group.groupData}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, color: "#fff" }}>{fmt(group.budgeted)}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, color: "#fff" }}>{fmt(group.generated)}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, color: "#fff" }}>{fmt(group.balance)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PresupuestoPdfPage(props: { searchParams: Promise<{ anio?: string }> }) {
  await requirePageAccess(MODULES.PRESUPUESTO);

  const searchParams = await props.searchParams;
  const year = parseInt(searchParams.anio ?? "", 10) || new Date().getFullYear();

  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return <div style={{ padding: 40, fontSize: 20, fontWeight: 700 }}>No hay condominios activos.</div>;

  const vm = await getBudgetByYearUseCase.execute(condo.id, year);

  const isExtra = (name: string) => {
    const n = name.toUpperCase();
    return n.includes("EXTRA") || n.includes("EXTRAORDINARIO") || n.includes("EXTRAORDINARIA");
  };

  const ordCards = vm.summaryCards.filter(c => !isExtra(c.title));
  const extCards = vm.summaryCards.filter(c => isExtra(c.title));
  const ordGroups = vm.groups.filter(g => !isExtra(g.groupData));
  const extGroups = vm.groups.filter(g => isExtra(g.groupData));

  const sumOrdB = ordCards.reduce((a, c) => a + c.budgeted, 0);
  const sumOrdG = ordCards.reduce((a, c) => a + c.generated, 0);
  const sumExtB = extCards.reduce((a, c) => a + c.budgeted, 0);
  const sumExtG = extCards.reduce((a, c) => a + c.generated, 0);

  const dateStr = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="print-root" style={{ padding: "24px 28px 48px" }}>
      {/* Auto-print on load */}
      <script dangerouslySetInnerHTML={{ __html: "window.onload = () => setTimeout(() => window.print(), 500);" }} />

      {/* Screen-only top bar */}
      <div className="no-print" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20, padding: "12px 18px", background: C.g100, borderRadius: 12,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.g600, textTransform: "uppercase", letterSpacing: 1 }}>
          Vista previa — Presupuesto {year}
        </span>
        <button
          onClick={() => window.print()}
          style={{
            padding: "9px 24px", background: C.brand, color: "#fff",
            border: "none", borderRadius: 9999, fontWeight: 800, fontSize: 12,
            cursor: "pointer", letterSpacing: 0.5, textTransform: "uppercase",
          }}
        >
          ⬇ Descargar / Imprimir PDF
        </button>
      </div>

      {/* ── Header ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 28, paddingBottom: 16, borderBottom: `3px solid ${C.brand}`,
      }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.brand, letterSpacing: -1, lineHeight: 1 }}>Presupuesto {year}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.g400, letterSpacing: 3, marginTop: 5, textTransform: "uppercase" }}>{condo.name}</div>
          <div style={{ marginTop: 8, display: "inline-block", background: C.brandLight, color: C.brand, padding: "3px 12px", borderRadius: 9999, fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
            Planeación Financiera Anual
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.brand, letterSpacing: 1 }}>{condo.name.toUpperCase()}</div>
          <div style={{ fontSize: 9, color: C.g400, marginTop: 3, letterSpacing: 1.5, textTransform: "uppercase" }}>Sistema Condominal | Impresión</div>
          <div style={{ fontSize: 10, color: C.g600, marginTop: 6, fontWeight: 600 }}>{dateStr}</div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 32 }}>
        <KpiCard label={`Ordinario ${year}`}      budgeted={sumOrdB}         generated={sumOrdG}         fg={C.brand} bg={C.brandLight} bdr={C.brandBdr} />
        <KpiCard label={`Extraordinario ${year}`} budgeted={sumExtB}         generated={sumExtG}         fg={C.cyan}  bg={C.cyanLight}  bdr={C.cyanBdr}  />
        <KpiCard label="Total Consolidado"         budgeted={vm.totalBudgeted} generated={vm.totalGenerated} fg={C.lime}  bg={C.limeLight}  bdr={C.limeBdr}  />
      </div>

      {/* ── Summary Cards: Ordinario ── */}
      {ordCards.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SummaryBanner
            label="Presupuesto Ordinario (Total)"
            sub="Suma de todos los conceptos de esta categoría"
            budgeted={sumOrdB} generated={sumOrdG} fg={C.brand}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingTop: 10 }}>
            {ordCards.map((card, i) => <SummaryCard key={i} card={card} accent="brand" />)}
          </div>
        </div>
      )}

      {/* ── Summary Cards: Extraordinario ── */}
      {extCards.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SummaryBanner
            label="Presupuesto Extraordinario (Total)"
            sub="Suma de todos los conceptos de esta categoría"
            budgeted={sumExtB} generated={sumExtG} fg={C.cyan}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingTop: 10 }}>
            {extCards.map((card, i) => <SummaryCard key={i} card={card} accent="cyan" />)}
          </div>
        </div>
      )}

      {/* ── Detalle Ordinario ── */}
      {ordGroups.length > 0 && (
        <div className="page-break" style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 8, borderBottom: `2px solid ${C.brand}` }}>
            <div style={{ width: 6, height: 22, background: C.brand, borderRadius: 3 }} />
            <div style={{ fontSize: 13, fontWeight: 900, color: C.brand, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Presupuesto Ordinario — Detalle por Concepto
            </div>
          </div>
          {ordGroups.map((g, i) => <GroupTable key={`ord-${g.groupId || i}`} group={g} year={year} accent="brand" />)}
        </div>
      )}

      {/* ── Detalle Extraordinario ── */}
      {extGroups.length > 0 && (
        <div className="page-break" style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 8, borderBottom: `2px solid ${C.cyan}` }}>
            <div style={{ width: 6, height: 22, background: C.cyan, borderRadius: 3 }} />
            <div style={{ fontSize: 13, fontWeight: 900, color: C.cyan, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Presupuesto Extraordinario — Detalle por Concepto
            </div>
          </div>
          {extGroups.map((g, i) => <GroupTable key={`ext-${g.groupId || i}`} group={g} year={year} accent="cyan" />)}
        </div>
      )}

      {/* ── Gran Total ── */}
      <div style={{ background: C.brand, borderRadius: 14, padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ color: "#fff", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5 }}>
          Gran Total Consolidado {year}
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {[
            { label: "Total Presupuesto", val: vm.totalBudgeted,  col: "#fff" },
            { label: "Total Ejercido",    val: vm.totalGenerated, col: vm.totalGenerated > vm.totalBudgeted ? "#fca5a5" : "#bbf7d0" },
            { label: "Saldo Disponible",  val: vm.totalBalance,   col: vm.totalBalance < 0 ? "#fca5a5" : "#bbf7d0" },
          ].map(({ label, val, col }) => (
            <div key={label} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: col }}>{fmt(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", paddingTop: 12, borderTop: `1px solid ${C.g200}`, color: C.g400, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase" }}>
        Documento generado automáticamente · {condo.name} · Sistema Condominal · {dateStr}
      </div>
    </div>
  );
}
