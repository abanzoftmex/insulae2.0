"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createIncomeAction, updateIncomeAction, deleteIncomeAction } from "../actions";
import { importIncomesAction } from "../import-actions";
import { uploadCondominiumAsset, deleteCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { read, utils } from "xlsx";
import type { IncomeRecord } from "@/modules/income";

type CatalogItem = { id: string; name: string };
type AreaItem = { id: string; name: string };
type ChargeGroupItem = { id: string; name: string; kind: string };

interface IncomeListProps {
  initialIncomes: IncomeRecord[];
  catalogs: CatalogItem[];
  chargeGroups: ChargeGroupItem[];
  areas: AreaItem[];
  condominiumSlug: string;
  projectId: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  CHECK: "Cheque",
  OTHER: "Otro",
};

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "CHECK", "OTHER"];
const ROWS_PER_PAGE = 100;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
}

function toInputDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

type ModalState = { mode: "closed" } | { mode: "create" };

export function IncomeList({ initialIncomes, catalogs, chargeGroups, areas, condominiumSlug, projectId }: IncomeListProps) {
  const router = useRouter();
  const [incomes, setIncomes] = useState<IncomeRecord[]>(initialIncomes);

  // Sync local state when server data changes (e.g. after router.refresh)
  useEffect(() => { setIncomes(initialIncomes); }, [initialIncomes]);
  const [search, setSearch] = useState("");
  const [filterCatalog, setFilterCatalog] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formConcept, setFormConcept] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("CASH");
  const [formNotes, setFormNotes] = useState("");
  const [formCatalogId, setFormCatalogId] = useState("");
  const [formChargeGroupId, setFormChargeGroupId] = useState("");
  const [formAreaId, setFormAreaId] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [formReceiptFile, setFormReceiptFile] = useState<File | null>(null);
  const [formReceiptUrl, setFormReceiptUrl] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const filteredIncomes = useMemo(() => {
    let result = incomes;

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.concept.toLowerCase().includes(term) ||
          (i.miscCatalogName ?? "").toLowerCase().includes(term) ||
          (i.privateAreaName ?? "").toLowerCase().includes(term) ||
          (i.notes ?? "").toLowerCase().includes(term),
      );
    }

    if (filterCatalog) {
      result = result.filter((i) => i.miscCatalogId === filterCatalog);
    }

    if (filterMethod) {
      result = result.filter((i) => i.paymentMethod === filterMethod);
    }

    return result;
  }, [incomes, search, filterCatalog, filterMethod]);

  // Reset page when filters change
  React.useEffect(() => { setPage(0); }, [search, filterCatalog, filterMethod]);

  const totalPages = Math.ceil(filteredIncomes.length / ROWS_PER_PAGE);
  const paginatedIncomes = useMemo(
    () => filteredIncomes.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE),
    [filteredIncomes, page],
  );

  const totalAmount = useMemo(
    () => filteredIncomes.reduce((sum, i) => sum + i.amount, 0),
    [filteredIncomes],
  );

  const filteredAreas = useMemo(() => {
    if (!areaSearch.trim()) return areas.slice(0, 20);
    const term = areaSearch.toLowerCase();
    return areas.filter((a) => a.name.toLowerCase().includes(term)).slice(0, 20);
  }, [areas, areaSearch]);

  function resetForm() {
    setFormDate("");
    setFormConcept("");
    setFormAmount("");
    setFormMethod("CASH");
    setFormNotes("");
    setFormCatalogId("");
    setFormChargeGroupId("");
    setFormAreaId("");
    setAreaSearch("");
    setFormReceiptFile(null);
    setFormReceiptUrl("");
  }

  function openCreate() {
    resetForm();
    setFormDate(new Date().toISOString().split("T")[0]);
    setModal({ mode: "create" });
  }

  async function handleReceiptUpload(file: File) {
    setUploadingReceipt(true);
    try {
      const result = await uploadCondominiumAsset({ file, condominiumSlug, projectId, kind: "income-receipt" });
      setFormReceiptUrl(result.url);
    } catch {
      alert("Error al subir comprobante");
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = utils.sheet_to_json(ws, { header: 1 });
      const rows = raw.slice(1).filter((r) => r.some((c: any) => c != null && c !== "")).map((r) => ({
        miscCatalogId: String(r[0] ?? "").trim() || undefined,
        chargeGroupId: String(r[1] ?? "").trim() || undefined,
        date: String(r[2] ?? ""),
        amount: parseFloat(String(r[3] ?? "0")),
        paymentMethod: String(r[4] ?? "CASH"),
        concept: String(r[5] ?? ""),
        notes: String(r[6] ?? "") || undefined,
      }));
      const res = await importIncomesAction(rows);
      if (res.success) {
        setImportResult({ imported: res.imported ?? 0, errors: res.errors ?? [] });
        router.refresh();
      } else {
        alert("Error: " + res.error);
      }
    } catch { alert("Error al procesar archivo"); }
    finally { setImporting(false); if (importFileRef.current) importFileRef.current.value = ""; }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const input = {
      date: formDate,
      concept: formConcept,
      amount: parseFloat(formAmount),
      paymentMethod: formMethod,
      notes: formNotes || undefined,
      miscCatalogId: formCatalogId || undefined,
      chargeGroupId: formChargeGroupId || undefined,
      privateAreaId: formAreaId || undefined,
    };

    try {
      const res = await createIncomeAction(input);

      if (res?.success) {
        setModal({ mode: "closed" });
        router.refresh();
      } else {
        alert("Error: " + (res?.error ?? "Desconocido"));
      }
    } catch {
      alert("Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este ingreso? Esta acción es permanente y no se puede deshacer.")) return;
    // Delete receipt from Firebase Storage if it exists
    const income = incomes.find((i) => i.id === id);
    if (income?.receiptUrl) {
      await deleteCondominiumAsset(income.receiptUrl);
    }
    const res = await deleteIncomeAction(id);
    if (res.success) {
      setIncomes((prev) => prev.filter((i) => i.id !== id));
    } else {
      alert("Error: " + res.error);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-[ui-serif] text-3xl text-[#2f221a]">Ingresos</h1>
          <p className="text-[#9a6a4a] text-sm mt-1 uppercase tracking-widest font-medium">
            Registro y gestión de ingresos
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/listado-ingresos/plantilla" className="border border-[#ccb49c]/40 text-[#6d422a] px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#f8efe3]/50 transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Plantilla
          </a>
          <label className={`border border-[#ccb49c]/40 text-[#6d422a] px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#f8efe3]/50 transition-all flex items-center gap-2 cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            {importing ? "Importando..." : "Importar"}
            <input ref={importFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
          </label>
          <button type="button" onClick={openCreate} className="bg-[#5a7b56] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#4a6b46] transition-all shadow-lg shadow-green-900/10 active:scale-95 flex items-center gap-2 uppercase tracking-wider">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Nuevo ingreso
          </button>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className={`rounded-2xl border p-4 text-sm ${importResult.errors.length > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-green-50 border-green-200 text-green-800"}`}>
          <p className="font-semibold">✓ {importResult.imported} ingresos importados exitosamente</p>
          {importResult.errors.length > 0 && <ul className="mt-2 space-y-0.5 text-xs">{importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}</ul>}
          <button onClick={() => setImportResult(null)} className="mt-2 text-xs underline">Cerrar</button>
        </div>
      )}

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#ccb49c]/30 p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Total registros</p>
          <p className="font-[ui-serif] text-2xl text-[#2f221a] mt-1">{filteredIncomes.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#ccb49c]/30 p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Monto total</p>
          <p className="font-[ui-serif] text-2xl text-[#5a7b56] mt-1">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#ccb49c]/30 p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Categorías</p>
          <p className="font-[ui-serif] text-2xl text-[#2f221a] mt-1">{catalogs.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#ccb49c]/30 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a6a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="Buscar por concepto, categoría, propiedad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30 transition-all"
            />
          </div>
          <select
            value={filterCatalog}
            onChange={(e) => setFilterCatalog(e.target.value)}
            className="bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30"
          >
            <option value="">Todas las categorías</option>
            {catalogs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30"
          >
            <option value="">Formas de pago</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <section className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f8efe3]/50 border-b border-[#ccb49c]/30">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Categoría</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Concepto</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Forma de pago</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Propiedad</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold text-right">Monto</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Fecha</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ccb49c]/10">
              {paginatedIncomes.map((income) => (
                <tr key={income.id} className="hover:bg-[#fcf9f5]/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#2f221a] font-medium">{income.chargeGroupName ?? income.miscCatalogName ?? "—"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#5f4b3f] max-w-[200px] truncate block">{income.concept}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f8efe3]/70 text-xs font-medium text-[#6d422a]">
                      {PAYMENT_METHOD_LABELS[income.paymentMethod ?? ""] ?? "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#9a6a4a]">{income.privateAreaName ?? "Sin propiedad"}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-[#5a7b56]">{formatCurrency(income.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#5f4b3f]">{formatDate(income.date)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/listado-ingresos/${income.id}`}
                        className="bg-white border border-[#ccb49c]/40 text-[#d2a35a] hover:text-[#b8862e] p-2 rounded-xl transition-all hover:shadow-md active:scale-95 inline-flex"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(income.id)}
                        className="bg-white border border-[#ccb49c]/40 text-[#ccb49c] hover:text-red-500 hover:border-red-200 p-2 rounded-xl transition-all hover:shadow-md active:scale-95"
                        title="Eliminar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredIncomes.length === 0 && (
          <div className="p-16 text-center">
            <div className="bg-[#f8efe3]/30 inline-flex p-6 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccb49c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <p className="text-[#9a6a4a] italic text-sm">No se encontraron ingresos con los filtros seleccionados.</p>
          </div>
        )}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-10 h-10 rounded-xl border border-[#ccb49c]/40 flex items-center justify-center text-[#6d422a] hover:bg-[#f8efe3]/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                page === i
                  ? "bg-[#2f221a] text-white shadow-lg"
                  : "border border-[#ccb49c]/40 text-[#6d422a] hover:bg-[#f8efe3]/50"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="w-10 h-10 rounded-xl border border-[#ccb49c]/40 flex items-center justify-center text-[#6d422a] hover:bg-[#f8efe3]/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      )}

      {/* Modal */}
      {modal.mode !== "closed" && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <button
            type="button"
            onClick={() => setModal({ mode: "closed" })}
            className="absolute inset-0 bg-[#23170f]/55 backdrop-blur-sm"
            aria-label="Cerrar"
          />
          <div className="relative bg-white rounded-3xl border border-[#ccb49c]/30 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 mx-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-[ui-serif] text-2xl text-[#2f221a]">Nuevo ingreso</h2>
                <p className="text-xs text-[#9a6a4a] uppercase tracking-widest mt-1">Información general</p>
              </div>
              <button
                type="button"
                onClick={() => setModal({ mode: "closed" })}
                className="rounded-full border border-[#ccb49c]/40 bg-[#fcf9f5] p-2 text-[#9a6a4a] hover:text-[#2f221a] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoría */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Categoría</label>
                  <select
                    value={formCatalogId}
                    onChange={(e) => setFormCatalogId(e.target.value)}
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30"
                  >
                    <option value="">Sin categoría específica</option>
                    {catalogs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de cuota (opcional) */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Tipo de cuota (opcional)</label>
                  <select
                    value={formChargeGroupId}
                    onChange={(e) => setFormChargeGroupId(e.target.value)}
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30"
                  >
                    <option value="">Sin tipo de cuota específico</option>
                    {chargeGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#9a6a4a] mt-1">Si selecciona un tipo de cuota, este ingreso aparecerá en la sección correspondiente del resumen financiero.</p>
                </div>

                {/* Forma de pago */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Forma de pago</label>
                  <select
                    required
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fecha */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Fecha</label>
                  <input type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30" />
                </div>
                {/* Monto */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Monto</label>
                  <input type="number" required step="0.01" min="0" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30" />
                </div>
              </div>

              {/* Propiedad (autocomplete) */}
              <div className="relative">
                <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Propiedad (opcional)</label>
                <input
                  type="text"
                  value={areaSearch}
                  onChange={(e) => {
                    setAreaSearch(e.target.value);
                    setShowAreaDropdown(true);
                    if (!e.target.value.trim()) setFormAreaId("");
                  }}
                  onFocus={() => setShowAreaDropdown(true)}
                  placeholder="Buscar propiedad por nombre o clave..."
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30"
                />
                {formAreaId && (
                  <button
                    type="button"
                    onClick={() => { setFormAreaId(""); setAreaSearch(""); }}
                    className="absolute right-3 top-[calc(50%+4px)] text-[#ccb49c] hover:text-red-400 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                )}
                {showAreaDropdown && filteredAreas.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-[#ccb49c]/40 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredAreas.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => {
                          setFormAreaId(area.id);
                          setAreaSearch(area.name);
                          setShowAreaDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f8efe3]/50 transition-colors ${
                          formAreaId === area.id ? "bg-[#f8efe3] font-semibold text-[#2f221a]" : "text-[#5f4b3f]"
                        }`}
                      >
                        {area.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Concepto</label>
                <textarea
                  required
                  rows={3}
                  value={formConcept}
                  onChange={(e) => setFormConcept(e.target.value)}
                  placeholder="Descripción del ingreso"
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30 resize-none"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Notas (opcional)</label>
                <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas adicionales"
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30" />
              </div>



              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#ccb49c]/20">
                <button
                  type="button"
                  onClick={() => setModal({ mode: "closed" })}
                  className="px-6 py-2.5 rounded-xl border border-[#ccb49c]/40 text-sm font-medium text-[#6d422a] hover:bg-[#f8efe3]/50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#2f221a] text-white px-8 py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#4a3a2e] transition-all shadow-lg shadow-[#2f221a]/20 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Crear ingreso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
