import React from "react";
import { getBudgetByYearUseCase } from "@/modules/budget";
import { prisma } from "@/shared/infrastructure/db/prisma";

export const dynamic = "force-dynamic";

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

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: "100%", height: 5, background: "#e5e7eb", borderRadius: 9999, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 9999 }} />
    </div>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <div style={{ width: 48, height: 4, background: "#e5e7eb", borderRadius: 9999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 9999 }} />
      </div>
      <span style={{ fontSize: 7.5, color, fontWeight: 700 }}>{value.toFixed(0)}%</span>
    </div>
  );
}

const C = {
  brand: "#1a5c3a",
  brandLight: "#e8f5ee",
  brandBorder: "rgba(26,92,58,0.18)",
  cyan: "#0891b2",
  cyanLight: "#ecfeff",
  cyanBorder: "rgba(8,145,178,0.18)",
  lime: "#4d7c0f",
  limeLight: "#f7fee7",
  limeBorder: "rgba(77,124,15,0.18)",
  danger: "#dc2626",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray800: "#1f2937",
} as const;

type AccentKey = "brand" | "cyan";

const ACCENT = {
  brand: { fg: C.brand, light: C.brandLight, border: C.brandBorder },
  cyan:  { fg: C.cyan,  light: C.cyanLight,  border: C.cyanBorder  },
} as const;

function KpiCard({ label, budgeted, generated, accentKey }: { label: string; budgeted: number; generated: number; accentKey: AccentKey | "lime" }) {
  const balance = budgeted - generated;
  const p = pct(generated, budgeted);
  const over = generated > budgeted;
  const fg   = accentKey === "brand" ? C.brand : accentKey === "cyan" ? C.cyan : C.lime;
  const bg   = accentKey === "brand" ? C.brandLight : accentKey === "cyan" ? C.cyanLight : C.limeLight;
  const bdr  = accentKey === "brand" ? C.brandBorder : accentKey === "cyan" ? C.cyanBorder : C.limeBorder;

  return (
    <div style={{ background: bg, borderRadius: 14, padding: "16px 18px", border: `1.5px solid ${bdr}` }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, color: fg, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: fg, lineHeight: 1, letterSpacing: -0.5 }}>{fmt(budgeted)}</div>
      <div style={{ fontSize: 9.5, color: C.gray500, marginTop: 5 }}>
        Ejercido:&nbsp;
        <strong style={{ color: over ? C.danger : fg }}>{fmt(generated)}</strong>
      </div>
      <div style={{ fontSize: 9.5, color: C.gray500, marginTop: 1 }}>
        Disponible:&nbsp;
        <strong style={{ color: balance < 0 ? C.danger : C.gray600 }}>{fmt(balance)}</strong>
      </div>
      <ProgressBar value={p} color={over ? C.danger : fg} />
      <div style={{ fontSize: 8, color: over ? C.danger : C.gray400, textAlign: "right", marginTop: 3, fontWeight: 700 }}>
        {p.toFixed(0)}% ejecutado
      </div>
    </div>
  );
}

function SummaryCardMini({ card, accentKey }: { card: { title: string; subtitle?: string; budgeted: number; generated: number }; accentKey: AccentKey }) {
  const p = pct(card.generated, card.budgeted);
  const over = card.generated > card.budgeted;
  const { fg, light, border } = ACCENT[accentKey];
  return (
    <div className="avoid-break" style={{ border: `1.5px solid ${border}`, borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
      <div style={{ fontSize: 8, fontWeight: 800, color: C.gray400, letterSpacing: 1.5, textTransform: "uppercase", lineHeight: 1.3, minHeight: 24 }}>{card.title}</div>
      {card.subtitle && <div style={{ fontSize: 7.5, color: C.gray400, marginTop: 2, letterSpacing: 0.5, lineHeight: 1.3 }}>{card.subtitle}</div>}
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 8, color: C.gray400, textTransform: "uppercase", fontWeight: 700 }}>Presupuesto</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.gray800 }}>{fmt(card.budgeted)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 }}>
        <span style={{ fontSize: 8, color: C.gray400, textTransform: "uppercase", fontWeight: 700 }}>Ejercido</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: over ? C.danger : fg }}>{fmt(card.generated)}</span>
      </div>
      <ProgressBar value={p} color={over ? C.danger : fg} />
      <div style={{ fontSize: 7.5, color: over ? C.danger : C.gray400, textAlign: "right", marginTop: 3, fontWeight: 700 }}>
        {p.toFixed(0)}% ejecutado
      </div>
    </div>
  );
}

function GroupTable({
  group,
  year,
  accentKey,
}: {
  group: { groupId: string; groupData: string; budgeted: number; generated: number; balance: number; concepts: { conceptId: string; conceptName: string; budgeted: number; generated: number; balance: number }[] };
  year: number;
  accentKey: AccentKey;
}) {
  const { fg, light } = ACCENT[accentKey];
  return (
    <div className="avoid-break" style={{ marginBottom: 18 }}>
      {/* Group header */}
      <div style={{
        background: light,
        borderLeft: `4px solid ${fg}`,
        padding: "8px 14px",
        borderRadius: "0 8px 8px 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 2,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: fg, textTransform: "uppercase", letterSpacing: 1 }}>{group.groupData}</span>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Presupuesto", val: group.budgeted, col: fg },
            { label: "Ejercido", val: group.generated, col: group.generated > group.budgeted ? C.danger : fg },
            { label: "Saldo", val: group.balance, col: group.balance < 0 ? C.danger : C.gray800 },
          ].map(({ label, val, col }) => (
            <div key={label} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 7.5, color: C.gray400, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: col }}>{fmt(val)}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
        <thead>
          <tr style={{ background: C.gray100 }}>
            {["Concepto", `Presupuestado ${year}`, `Gastado ${year}`, "Saldo Actual", "Ejecución"].map((h, i) => (
              <th
                key={h}
                style={{
                  padding: "5px 10px",
                  textAlign: i === 0 ? "left" : i === 4 ? "center" : "right",
                  fontWeight: 800,
                  color: C.gray600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontSize: 8,
                  borderBottom: `1px solid ${C.gray200}`,
                  width: i === 4 ? 68 : undefined,
                }}
              >{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {group.concepts.map((concept, cIdx) => {
            const p = pct(concept.generated, concept.budgeted);
            const over = concept.generated > concept.budgeted;
            return (
              <tr key={concept.conceptId} style={{ background: cIdx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "5px 10px", fontWeight: 600, color: C.gray800, borderBottom: `1px solid ${C.gray200}` }}>{concept.conceptName}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", color: C.gray600, borderBottom: `1px solid ${C.gray200}` }}>{fmt(concept.budgeted)}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", color: over ? C.danger : C.gray600, fontWeight: over ? 700 : 400, borderBottom: `1px solid ${C.gray200}` }}>{fmt(concept.generated)}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700, color: concept.balance < 0 ? C.danger : C.gray800, borderBottom: `1px solid ${C.gray200}` }}>{fmt(concept.balance)}</td>
                <td style={{ padding: "5px 10px", borderBottom: `1px solid ${C.gray200}` }}>
                  <MiniBar value={p} color={over ? C.danger : fg} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: fg }}>
            <td style={{ padding: "6px 10px", fontWeight: 800, color: "#fff", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 }}>Total {group.groupData}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, color: "#fff" }}>{fmt(group.budgeted)}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, color: "#fff" }}>{fmt(group.generated)}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, color: "#fff" }}>{fmt(group.balance)}</td>
            <td style={{ padding: "6px 10px" }} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default async function BudgetPrintPage(props: { searchParams: Promise<{ anio?: string }> }) {
  const searchParams = await props.searchParams;
  const currentYear = new Date().getFullYear();
  const year = parseInt(searchParams.anio ?? "", 10) || currentYear;

  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return <div style={{ padding: 40, fontSize: 24, fontWeight: 700 }}>No hay condominios activos</div>;

  const vm = await getBudgetByYearUseCase.execute(condo.id, year);

  const ordinaryCards = vm.summaryCards.filter(c =>
    c.title.toUpperCase().includes("ORDINARIO") && !c.title.toUpperCase().includes("EXTRA"),
  );
  const extraordinaryCards = vm.summaryCards.filter(c =>
    c.title.toUpperCase().includes("EXTRA"),
  );

  const sumOrdBudgeted  = ordinaryCards.reduce((a, c) => a + c.budgeted, 0);
  const sumOrdGenerated = ordinaryCards.reduce((a, c) => a + c.generated, 0);
  const sumExtBudgeted  = extraordinaryCards.reduce((a, c) => a + c.budgeted, 0);
  const sumExtGenerated = extraordinaryCards.reduce((a, c) => a + c.generated, 0);

  const isExtra = (name: string) => {
    const n = name.toUpperCase();
    return n.includes("EXTRA") || n.includes("EXTRAORDINARIO") || n.includes("EXTRAORDINARIA");
  };

  const ordinaryGroups      = vm.groups.filter(g => !isExtra(g.groupData));
  const extraordinaryGroups = vm.groups.filter(g => isExtra(g.groupData));

  const dateStr = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="print-root" style={{ padding: "24px 28px 48px" }}>
      {/* Auto-print (fires only in browser) */}
      <script dangerouslySetInnerHTML={{ __html: "if (typeof window !== 'undefined') window.onload = () => setTimeout(() => window.print(), 500);" }} />

      {/* ── TOP BAR (screen only) ── */}
      <div className="no-print" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20, padding: "12px 16px",
        background: "#f3f4f6", borderRadius: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: 1 }}>
          Vista previa — Presupuesto {year}
        </span>
        <button
          onClick={() => window.print()}
          style={{
            padding: "8px 22px", background: C.brand, color: "#fff",
            border: "none", borderRadius: 9999, fontWeight: 800, fontSize: 12,
            cursor: "pointer", letterSpacing: 0.5, textTransform: "uppercase",
          }}
        >
          ⬇ Descargar PDF
        </button>
      </div>

      {/* ── HEADER ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 28, paddingBottom: 16, borderBottom: `3px solid ${C.brand}`,
      }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.brand, letterSpacing: -1, lineHeight: 1 }}>
            Presupuesto {year}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gray400, letterSpacing: 3, marginTop: 4, textTransform: "uppercase" }}>
            {condo.name}
          </div>
          <div style={{
            marginTop: 8, display: "inline-block",
            background: C.brandLight, color: C.brand,
            padding: "3px 12px", borderRadius: 9999,
            fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
          }}>
            Planeación Financiera Anual
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.brand, letterSpacing: 1 }}>{condo.name.toUpperCase()}</div>
          <div style={{ fontSize: 9, color: C.gray400, marginTop: 3, letterSpacing: 1.5, textTransform: "uppercase" }}>Sistema Condominal | Impresión</div>
          <div style={{ fontSize: 10, color: C.gray600, marginTop: 6, fontWeight: 600 }}>{dateStr}</div>
        </div>
      </div>

      {/* ── KPI CARDS CONSOLIDADAS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 32 }}>
        <KpiCard label={`Ordinario ${year}`} budgeted={sumOrdBudgeted} generated={sumOrdGenerated} accentKey="brand" />
        <KpiCard label={`Extraordinario ${year}`} budgeted={sumExtBudgeted} generated={sumExtGenerated} accentKey="cyan" />
        <KpiCard label="Total Consolidado" budgeted={vm.totalBudgeted} generated={vm.totalGenerated} accentKey="lime" />
      </div>

      {/* ── SUMMARY MINI-CARDS: ORDINARIO ── */}
      {ordinaryCards.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          {/* Banner */}
          <div style={{
            background: C.brand, color: "#fff",
            borderRadius: "10px 10px 0 0", padding: "9px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Presupuesto Ordinario (Total)</div>
              <div style={{ fontSize: 8, opacity: 0.65, marginTop: 1, textTransform: "uppercase", letterSpacing: 1 }}>Suma de todos los conceptos de esta categoría</div>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 8, opacity: 0.65, letterSpacing: 1, textTransform: "uppercase" }}>Total Presupuesto</div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{fmt(sumOrdBudgeted)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 8, opacity: 0.65, letterSpacing: 1, textTransform: "uppercase" }}>Total Ejercido</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: sumOrdGenerated > sumOrdBudgeted ? "#fca5a5" : "#bbf7d0" }}>{fmt(sumOrdGenerated)}</div>
              </div>
            </div>
          </div>
          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingTop: 10 }}>
            {ordinaryCards.map((card, idx) => (
              <SummaryCardMini key={idx} card={card} accentKey="brand" />
            ))}
          </div>
        </div>
      )}

      {/* ── SUMMARY MINI-CARDS: EXTRAORDINARIO ── */}
      {extraordinaryCards.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            background: C.cyan, color: "#fff",
            borderRadius: "10px 10px 0 0", padding: "9px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Presupuesto Extraordinario (Total)</div>
              <div style={{ fontSize: 8, opacity: 0.65, marginTop: 1, textTransform: "uppercase", letterSpacing: 1 }}>Suma de todos los conceptos de esta categoría</div>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 8, opacity: 0.65, letterSpacing: 1, textTransform: "uppercase" }}>Total Presupuesto</div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{fmt(sumExtBudgeted)}</div>
              </div>
              <div style={{ display: "right" }}>
                <div style={{ fontSize: 8, opacity: 0.65, letterSpacing: 1, textTransform: "uppercase" }}>Total Ejercido</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: sumExtGenerated > sumExtBudgeted ? "#fca5a5" : "#bbf7d0" }}>{fmt(sumExtGenerated)}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingTop: 10 }}>
            {extraordinaryCards.map((card, idx) => (
              <SummaryCardMini key={idx} card={card} accentKey="cyan" />
            ))}
          </div>
        </div>
      )}

      {/* ── DETALLE ORDINARIO ── */}
      {ordinaryGroups.length > 0 && (
        <div className="page-break" style={{ marginBottom: 32 }}>
          {/* Section heading */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 8, borderBottom: `2px solid ${C.brand}` }}>
            <div style={{ width: 6, height: 22, background: C.brand, borderRadius: 3 }} />
            <div style={{ fontSize: 13, fontWeight: 900, color: C.brand, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Presupuesto Ordinario — Detalle por Concepto
            </div>
          </div>
          {ordinaryGroups.map((group, gIdx) => (
            <GroupTable key={`ord-${group.groupId || gIdx}`} group={group} year={year} accentKey="brand" />
          ))}
        </div>
      )}

      {/* ── DETALLE EXTRAORDINARIO ── */}
      {extraordinaryGroups.length > 0 && (
        <div className="page-break" style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 8, borderBottom: `2px solid ${C.cyan}` }}>
            <div style={{ width: 6, height: 22, background: C.cyan, borderRadius: 3 }} />
            <div style={{ fontSize: 13, fontWeight: 900, color: C.cyan, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Presupuesto Extraordinario — Detalle por Concepto
            </div>
          </div>
          {extraordinaryGroups.map((group, gIdx) => (
            <GroupTable key={`ext-${group.groupId || gIdx}`} group={group} year={year} accentKey="cyan" />
          ))}
        </div>
      )}

      {/* ── GRAN TOTAL ── */}
      <div style={{
        background: C.brand, borderRadius: 14, padding: "16px 22px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24,
      }}>
        <div style={{ color: "#fff", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5 }}>
          Gran Total Consolidado {year}
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {[
            { label: "Total Presupuesto", val: vm.totalBudgeted, col: "#fff" },
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

      {/* ── FOOTER ── */}
      <div style={{
        textAlign: "center", paddingTop: 12, borderTop: `1px solid ${C.gray200}`,
        color: C.gray400, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase",
      }}>
        Documento generado automáticamente · {condo.name} · Sistema Condominal · {dateStr}
      </div>
    </div>
  );
}
