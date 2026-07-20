"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export type SyncRow = {
  id: string;
  concept: string;
  notes: string | null;
  accountingNote: string | null;
  amount: number;
  date: string;
  lockedAt: string | null;
  lockedBy: string | null;
  paymentMethod: string | null;
  reference: string | null;
  externalId: string | null;
  miscCatalogId: string | null;
  chargeGroupId: string | null;
  refLabel: string | null;
};

export type CatalogOption = { id: string; name: string };

const PAYMENT_METHODS = [
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CASH", label: "Efectivo" },
  { value: "CARD", label: "Tarjeta" },
  { value: "CHECK", label: "Cheque" },
  { value: "OTHER", label: "Otro" },
];

const paymentMethodLabel = (value: string | null) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value ?? "—";

const fmtMoney = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  hasActiveFilters,
  onClear,
  resultCount,
  totalCount,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-brand/15 bg-canvas/50 p-3">
      <div className="relative min-w-55 flex-1">
        <Input
          label="Buscar"
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
        <Search className="pointer-events-none absolute left-2.5 top-6.5 h-3.5 w-3.5 text-ink-soft/50" />
      </div>
      <div className="w-36">
        <Input label="Desde" type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
      </div>
      <div className="w-36">
        <Input label="Hasta" type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
      </div>
      {hasActiveFilters && (
        <Button type="button" variant="outline" size="sm" onClick={onClear} className="h-9 gap-1.5">
          <X className="h-3.5 w-3.5" /> Limpiar
        </Button>
      )}
      <span className="ml-auto self-center text-[11px] font-medium text-ink-soft/60">
        {hasActiveFilters ? `${resultCount} de ${totalCount}` : `${totalCount} en total`}
      </span>
    </div>
  );
}

export function SyncTable({
  title,
  description,
  rows,
  entityType,
  refColumnLabel,
  catalogs,
  chargeGroups,
}: {
  title: string;
  description: string;
  rows: SyncRow[];
  entityType: "incomes" | "expenses";
  refColumnLabel: string;
  // Solo aplica a "incomes" — categoría y grupo financiero de Insulae para
  // asignar al cobro antes de ejecutarlo (un cobro de Luca no trae ninguno).
  catalogs?: CatalogOption[];
  chargeGroups?: CatalogOption[];
}) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<Record<string, string>>({});
  const [miscCatalogId, setMiscCatalogId] = useState<Record<string, string>>(
    () => Object.fromEntries(rows.filter((r) => r.miscCatalogId).map((r) => [r.id, r.miscCatalogId as string]))
  );
  const [chargeGroupId, setChargeGroupId] = useState<Record<string, string>>(
    () => Object.fromEntries(rows.filter((r) => r.chargeGroupId).map((r) => [r.id, r.chargeGroupId as string]))
  );
  const showIncomeAssignment = entityType === "incomes" && !!catalogs && !!chargeGroups;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const hasActiveFilters = search.trim().length > 0 || dateFrom.length > 0 || dateTo.length > 0;
  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const haystack = [r.refLabel, r.concept, r.notes, r.accountingNote, r.reference]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [rows, search, dateFrom, dateTo]);

  const pending = filteredRows.filter((r) => !r.lockedAt);
  const executed = filteredRows.filter((r) => r.lockedAt);

  const execute = async (row: SyncRow) => {
    const method = paymentMethod[row.id] || "TRANSFER";
    setBusyId(row.id);
    setErrorById((prev) => ({ ...prev, [row.id]: "" }));
    try {
      const res = await fetch(`/api/${entityType}/${row.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: method,
          reference: reference[row.id] || null,
          ...(showIncomeAssignment
            ? { miscCatalogId: miscCatalogId[row.id] || null, chargeGroupId: chargeGroupId[row.id] || null }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorById((prev) => ({ ...prev, [row.id]: data.status || data.error || `Error ${res.status}` }));
        return;
      }
      router.refresh();
    } catch (err) {
      setErrorById((prev) => ({ ...prev, [row.id]: err instanceof Error ? err.message : "Error de red" }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={`Buscar por ${refColumnLabel.toLowerCase()}, concepto o referencia…`}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          resultCount={filteredRows.length}
          totalCount={rows.length}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand/15 text-left text-[11px] uppercase tracking-wide text-ink-soft/70">
                <th className="py-2 pr-3">{refColumnLabel}</th>
                <th className="py-2 pr-3">Concepto</th>
                <th className="py-2 pr-3">Nota interna</th>
                <th className="py-2 pr-3">Nota contable</th>
                <th className="py-2 pr-3 text-right">Monto</th>
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Forma de pago</th>
                <th className="py-2 pr-3">Referencia</th>
                {showIncomeAssignment && <th className="py-2 pr-3">Categoría</th>}
                {showIncomeAssignment && <th className="py-2 pr-3">Grupo Financiero</th>}
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr>
                  <td colSpan={showIncomeAssignment ? 11 : 9} className="py-6 text-center text-ink-soft/60">
                    {hasActiveFilters
                      ? "Ningún pendiente coincide con el filtro."
                      : "No hay nada pendiente de validar."}
                  </td>
                </tr>
              )}
              {pending.map((row) => (
                <tr key={row.id} className="border-b border-brand/10 align-top">
                  <td className="py-2 pr-3 font-medium">{row.refLabel}</td>
                  <td className="py-2 pr-3">{row.concept}</td>
                  <td className="py-2 pr-3 text-ink-soft">{row.notes || "—"}</td>
                  <td className="py-2 pr-3 text-ink-soft">{row.accountingNote || "—"}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmtMoney.format(row.amount)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{row.date}</td>
                  <td className="py-2 pr-3">
                    <select
                      className="form-input rounded-sm border border-brand/20 bg-white px-2 py-1 text-xs"
                      value={paymentMethod[row.id] || "TRANSFER"}
                      onChange={(e) => setPaymentMethod((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="form-input rounded-sm border border-brand/20 bg-white px-2 py-1 text-xs w-32"
                      placeholder="Opcional"
                      value={reference[row.id] || ""}
                      onChange={(e) => setReference((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </td>
                  {showIncomeAssignment && (
                    <td className="py-2 pr-3">
                      <select
                        className="form-input rounded-sm border border-brand/20 bg-white px-2 py-1 text-xs"
                        value={miscCatalogId[row.id] || ""}
                        onChange={(e) => setMiscCatalogId((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      >
                        <option value="">Sin categoría</option>
                        {catalogs!.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  {showIncomeAssignment && (
                    <td className="py-2 pr-3">
                      <select
                        className="form-input rounded-sm border border-brand/20 bg-white px-2 py-1 text-xs"
                        value={chargeGroupId[row.id] || ""}
                        onChange={(e) => setChargeGroupId((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      >
                        <option value="">Sin grupo</option>
                        {chargeGroups!.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="py-2 pr-3">
                    {(() => {
                      // Categoría y grupo financiero son obligatorios para ejecutar
                      // un cobro — un ingreso de Luca no trae ninguno propio de
                      // Insulae, así que hay que elegirlos aquí antes de confirmar.
                      const missingAssignment = showIncomeAssignment && (!miscCatalogId[row.id] || !chargeGroupId[row.id]);
                      return (
                        <>
                          <Button
                            size="sm"
                            disabled={busyId === row.id || missingAssignment}
                            onClick={() => execute(row)}
                          >
                            {busyId === row.id ? "Ejecutando…" : "Ejecutar"}
                          </Button>
                          {missingAssignment && (
                            <p className="mt-1 text-[11px] text-ink-soft/60">Elige categoría y grupo financiero.</p>
                          )}
                        </>
                      );
                    })()}
                    {errorById[row.id] && (
                      <p className="mt-1 text-[11px] text-danger">{errorById[row.id]}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {executed.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft/70">Ejecutados</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand/15 text-left text-[11px] uppercase tracking-wide text-ink-soft/70">
                    <th className="py-2 pr-3">{refColumnLabel}</th>
                    <th className="py-2 pr-3">Concepto</th>
                    <th className="py-2 pr-3">Nota interna</th>
                    <th className="py-2 pr-3">Nota contable</th>
                    <th className="py-2 pr-3 text-right">Monto</th>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Forma de pago</th>
                    <th className="py-2 pr-3">Referencia</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {executed.map((row) => (
                    <tr key={row.id} className="border-b border-brand/10 align-top">
                      <td className="py-2 pr-3 font-medium">{row.refLabel}</td>
                      <td className="py-2 pr-3">{row.concept}</td>
                      <td className="py-2 pr-3 text-ink-soft">{row.notes || "—"}</td>
                      <td className="py-2 pr-3 text-ink-soft">{row.accountingNote || "—"}</td>
                      <td className="py-2 pr-3 text-right font-mono">{fmtMoney.format(row.amount)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{row.date}</td>
                      <td className="py-2 pr-3">{paymentMethodLabel(row.paymentMethod)}</td>
                      <td className="py-2 pr-3">{row.reference || "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="success">Ejecutado</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type RejectedRow = {
  id: string;
  entityType: string;
  externalId: string;
  errorMessage: string | null;
  receivedAt: string;
  concept: string | null;
  amount: string | null;
};

// Variante ligera para dentro del desplegable "Historial": misma tabla, sin
// el Card ni el título "Rechazados" (el <details> padre ya da el contexto),
// y la insignia dice "Archivado" en vez de "Rechazado" — ya no requiere
// atención, solo queda como registro.
export function RejectedHistoryTable({ rows }: { rows: RejectedRow[] }) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const hasActiveFilters = search.trim().length > 0 || dateFrom.length > 0 || dateTo.length > 0;
  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const haystack = [r.concept, r.errorMessage, r.entityType === "INCOME" ? "cobro" : "gasto"]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      const receivedDate = r.receivedAt.slice(0, 10);
      if (dateFrom && receivedDate < dateFrom) return false;
      if (dateTo && receivedDate > dateTo) return false;
      return true;
    });
  }, [rows, search, dateFrom, dateTo]);

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-ink-soft/60">Aún no hay rechazos archivados.</p>;
  }

  return (
    <div className="space-y-4 pt-3">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por concepto o motivo…"
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        resultCount={filteredRows.length}
        totalCount={rows.length}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand/15 text-left text-[11px] uppercase tracking-wide text-ink-soft/70">
              <th className="py-2 pr-3">Tipo</th>
              <th className="py-2 pr-3">Concepto</th>
              <th className="py-2 pr-3 text-right">Monto</th>
              <th className="py-2 pr-3">Motivo</th>
              <th className="py-2 pr-3">Recibido</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-soft/60">
                  Ningún archivado coincide con el filtro.
                </td>
              </tr>
            )}
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-b border-brand/10 align-top">
                <td className="py-2 pr-3">{row.entityType === "INCOME" ? "Cobro" : "Gasto"}</td>
                <td className="py-2 pr-3">{row.concept || "—"}</td>
                <td className="py-2 pr-3 text-right font-mono">{row.amount ? fmtMoney.format(Number(row.amount)) : "—"}</td>
                <td className="py-2 pr-3">{row.errorMessage || "Rechazado"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{row.receivedAt.slice(0, 10)}</td>
                <td className="py-2 pr-3">
                  <Badge variant="outline">Archivado</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RejectedTable({ rows }: { rows: RejectedRow[] }) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const hasActiveFilters = search.trim().length > 0 || dateFrom.length > 0 || dateTo.length > 0;
  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const haystack = [r.concept, r.errorMessage, r.entityType === "INCOME" ? "cobro" : "gasto"]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      const receivedDate = r.receivedAt.slice(0, 10);
      if (dateFrom && receivedDate < dateFrom) return false;
      if (dateTo && receivedDate > dateTo) return false;
      return true;
    });
  }, [rows, search, dateFrom, dateTo]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rechazados</CardTitle>
        <CardDescription>
          Luca mandó estos movimientos pero Insulae no pudo procesarlos — normalmente porque falta mapear un código
          de propiedad o de partida presupuestal. No se creó ningún registro a medias.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por concepto o motivo…"
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          resultCount={filteredRows.length}
          totalCount={rows.length}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand/15 text-left text-[11px] uppercase tracking-wide text-ink-soft/70">
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Concepto</th>
                <th className="py-2 pr-3 text-right">Monto</th>
                <th className="py-2 pr-3">Motivo</th>
                <th className="py-2 pr-3">Recibido</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-soft/60">
                    Ningún rechazo coincide con el filtro.
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-brand/10 align-top">
                  <td className="py-2 pr-3">{row.entityType === "INCOME" ? "Cobro" : "Gasto"}</td>
                  <td className="py-2 pr-3">{row.concept || "—"}</td>
                  <td className="py-2 pr-3 text-right font-mono">{row.amount ? fmtMoney.format(Number(row.amount)) : "—"}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="danger">{row.errorMessage || "Rechazado"}</Badge>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{row.receivedAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
