"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateIncomeAction } from "../actions";
import { uploadCondominiumAsset, deleteCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import type { IncomeRecord } from "@/modules/income";

type CatalogItem = { id: string; name: string };
type AreaItem = { id: string; name: string };
type ChargeGroupItem = { id: string; name: string; kind: string };

interface Props {
  income: IncomeRecord;
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

function toInputDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

export function IncomeEditPage({ income, catalogs, chargeGroups, areas, condominiumSlug, projectId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formDate, setFormDate] = useState(toInputDate(income.date));
  const [formConcept, setFormConcept] = useState(income.concept);
  const [formAmount, setFormAmount] = useState(String(income.amount));
  const [formMethod, setFormMethod] = useState(income.paymentMethod ?? "CASH");
  const [formNotes, setFormNotes] = useState(income.notes ?? "");
  const [formCatalogId, setFormCatalogId] = useState(income.miscCatalogId ?? "");
  const [formChargeGroupId, setFormChargeGroupId] = useState(income.chargeGroupId ?? "");
  const [formAreaId, setFormAreaId] = useState(income.privateAreaId ?? "");
  const [areaSearch, setAreaSearch] = useState(income.privateAreaName ?? "");
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);

  const [receiptUrl, setReceiptUrl] = useState(income.receiptUrl ?? "");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  // Track original URL to know when to clean up Firebase Storage
  const originalReceiptUrl = income.receiptUrl ?? "";

  const filteredAreas = useMemo(() => {
    if (!areaSearch.trim()) return areas.slice(0, 20);
    const term = areaSearch.toLowerCase();
    return areas.filter((a) => a.name.toLowerCase().includes(term)).slice(0, 20);
  }, [areas, areaSearch]);

  function handleFileSelect(file: File) {
    setReceiptFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === "string") {
          setReceiptPreview(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let finalReceiptUrl = receiptUrl || undefined;

    // Upload receipt if new file selected
    if (receiptFile) {
      setUploading(true);
      try {
        const res = await uploadCondominiumAsset({
          file: receiptFile,
          condominiumSlug,
          projectId,
          kind: "income-receipt",
        });
        finalReceiptUrl = res.url;
      } catch {
        alert("Error al subir comprobante");
        setSaving(false);
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    // Delete old file from Firebase Storage if receipt was removed or replaced
    const oldUrl = originalReceiptUrl;
    const willHaveNewUrl = !!finalReceiptUrl;
    const receiptChanged = oldUrl && (oldUrl !== finalReceiptUrl);
    if (receiptChanged) {
      await deleteCondominiumAsset(oldUrl);
    }

    try {
      const res = await updateIncomeAction(income.id, {
        date: formDate,
        concept: formConcept,
        amount: parseFloat(formAmount),
        paymentMethod: formMethod,
        notes: formNotes || undefined,
        receiptUrl: finalReceiptUrl,
        miscCatalogId: formCatalogId || undefined,
        chargeGroupId: formChargeGroupId || undefined,
        privateAreaId: formAreaId || undefined,
      });

      if (res?.success) {
        router.push("/listado-ingresos");
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

  // Determine the image to display
  const displayImageUrl = receiptPreview || (receiptUrl && !receiptFile ? receiptUrl : null);

  // Firebase URLs look like: .../file.pdf?alt=media&token=...
  // endsWith(".pdf") fails because of query params, so we check the path portion
  function urlIsPdf(url: string | null): boolean {
    if (!url) return false;
    try {
      const pathname = new URL(url).pathname;
      return pathname.toLowerCase().endsWith(".pdf") || decodeURIComponent(pathname).toLowerCase().includes(".pdf");
    } catch {
      return url.toLowerCase().includes(".pdf");
    }
  }
  const isPdf = urlIsPdf(receiptUrl) || receiptFile?.type === "application/pdf";

  // Extract filename from Firebase URL for display
  function extractFilename(url: string | null): string {
    if (!url) return "";
    try {
      const pathname = decodeURIComponent(new URL(url).pathname);
      const segments = pathname.split("/");
      return segments[segments.length - 1] || "archivo";
    } catch {
      return "archivo";
    }
  }
  const existingFilename = receiptUrl ? extractFilename(receiptUrl) : "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/listado-ingresos"
          className="border border-[#ccb49c]/40 p-2.5 rounded-xl text-[#6d422a] hover:bg-[#f8efe3]/50 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="font-[ui-serif] text-3xl text-[#2f221a]">Editar ingreso</h1>
          <p className="text-[#9a6a4a] text-sm mt-1 uppercase tracking-widest font-medium">
            {income.chargeGroupName ?? income.miscCatalogName ?? "Sin categoría"} — {toInputDate(income.date)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Form fields */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm p-8 space-y-5">
              <h2 className="font-[ui-serif] text-xl text-[#2f221a] mb-2">Información general</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoría */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Categoría</label>
                  <select value={formCatalogId} onChange={(e) => setFormCatalogId(e.target.value)}
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30">
                    <option value="">Sin categoría específica</option>
                    {catalogs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Tipo de cuota */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Tipo de cuota (opcional)</label>
                  <select value={formChargeGroupId} onChange={(e) => setFormChargeGroupId(e.target.value)}
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30">
                    <option value="">Sin tipo de cuota específico</option>
                    {chargeGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                {/* Forma de pago */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Forma de pago</label>
                  <select required value={formMethod} onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30">
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                  </select>
                </div>

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

              {/* Propiedad */}
              <div className="relative">
                <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Propiedad (opcional)</label>
                <input type="text" value={areaSearch}
                  onChange={(e) => { setAreaSearch(e.target.value); setShowAreaDropdown(true); if (!e.target.value.trim()) setFormAreaId(""); }}
                  onFocus={() => setShowAreaDropdown(true)}
                  placeholder="Buscar propiedad por nombre o clave..."
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30" />
                {formAreaId && (
                  <button type="button" onClick={() => { setFormAreaId(""); setAreaSearch(""); }}
                    className="absolute right-3 top-[calc(50%+4px)] text-[#ccb49c] hover:text-red-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                )}
                {showAreaDropdown && filteredAreas.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-[#ccb49c]/40 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredAreas.map((area) => (
                      <button key={area.id} type="button"
                        onClick={() => { setFormAreaId(area.id); setAreaSearch(area.name); setShowAreaDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f8efe3]/50 transition-colors ${formAreaId === area.id ? "bg-[#f8efe3] font-semibold text-[#2f221a]" : "text-[#5f4b3f]"}`}>
                        {area.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Concepto</label>
                <textarea required rows={3} value={formConcept} onChange={(e) => setFormConcept(e.target.value)} placeholder="Descripción del ingreso"
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30 resize-none" />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1.5">Notas (opcional)</label>
                <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas adicionales"
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 text-sm text-[#2f221a] focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30" />
              </div>
            </section>

            {/* Action buttons */}
            <div className="flex justify-between items-center">
              <Link href="/listado-ingresos" className="px-6 py-2.5 rounded-xl border border-[#ccb49c]/40 text-sm font-medium text-[#6d422a] hover:bg-[#f8efe3]/50 transition-all">
                ← Regresar al listado
              </Link>
              <button type="submit" disabled={saving || uploading}
                className="bg-[#2f221a] text-white px-8 py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#4a3a2e] transition-all shadow-lg shadow-[#2f221a]/20 disabled:opacity-50">
                {uploading ? "Subiendo comprobante..." : saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>

          {/* Right column — Comprobante */}
          <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm p-6 space-y-4">
              <h2 className="font-[ui-serif] text-xl text-[#2f221a]">Comprobante</h2>

              {/* Upload area */}
              <label className="block border-2 border-dashed border-[#ccb49c]/40 rounded-2xl p-6 text-center cursor-pointer hover:border-[#d2a35a]/60 hover:bg-[#f8efe3]/30 transition-all group">
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-[#f8efe3] rounded-full p-3 group-hover:bg-[#e8d5c0] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9a6a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  </div>
                  <p className="text-sm text-[#6d422a] font-medium">
                    {receiptFile ? receiptFile.name : existingFilename ? existingFilename : "Subir comprobante"}
                  </p>
                  <p className="text-[10px] text-[#9a6a4a]">Imagen o PDF • Máx. 10MB</p>
                </div>
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </label>

              {/* Clear button */}
              {(receiptUrl || receiptFile) && (
                <button type="button"
                  onClick={() => { setReceiptFile(null); setReceiptUrl(""); setReceiptPreview(null); }}
                  className="w-full text-center text-xs text-red-400 hover:text-red-500 transition-colors py-1">
                  Eliminar comprobante
                </button>
              )}

              {/* Preview */}
              {displayImageUrl && !isPdf && (
                <div className="rounded-2xl overflow-hidden border border-[#ccb49c]/30 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={displayImageUrl} alt="Comprobante" className="w-full h-auto object-contain max-h-[600px] bg-[#f8efe3]/20" />
                </div>
              )}

              {isPdf && (receiptUrl || receiptFile) && (
                <div className="rounded-2xl border border-[#ccb49c]/30 p-6 text-center bg-[#fcf9f5]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9a6a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p className="text-sm text-[#6d422a] font-medium">Documento PDF</p>
                  {receiptUrl && (
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-[#5a7b56] underline hover:text-[#4a6b46] transition-colors">
                      Abrir en nueva pestaña
                    </a>
                  )}
                </div>
              )}

              {!displayImageUrl && !isPdf && !receiptFile && (
                <div className="rounded-2xl border border-[#ccb49c]/20 p-10 text-center bg-[#fcf9f5]/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccb49c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  <p className="text-xs text-[#ccb49c] italic">Sin comprobante adjunto</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
