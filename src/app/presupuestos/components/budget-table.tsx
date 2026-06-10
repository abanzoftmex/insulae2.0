"use client";

import React, { Fragment, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { BudgetVM } from "@/modules/budget";
import { updateBudgetAmountAction, createBudgetAmountAction, updateUnitCostAction, updateMonthUnitsAction, updateSupplierUrlAction } from "../actions";
import { cn } from "@/shared/utils/cn";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Link as LinkIcon, Trash2, Plus, Upload, X, Loader2 } from "lucide-react";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";

function formatMXN(num: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatMXNFull(num: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(num);
}

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const groupTitles: Record<string, string> = {
  ADMINISTRATION: "Administración",
  MAINTENANCE: "Mantenimiento",
  SECURITY: "Seguridad",
  INFRASTRUCTURE: "Infraestructura",
  EXTRAORDINARY: "Extraordinarios",
  OTHER: "Otros"
};

// Sticky column widths
const COL_CONCEPTO = 200;
const COL_COSTO_UNIT = 110;
const COL_ANNUAL = 110;
const COL_PROVEEDOR = 110;

// Sticky left offsets
const LEFT_CONCEPTO = 0;
const LEFT_COSTO = COL_CONCEPTO; // 200
const LEFT_PPTO = LEFT_COSTO + COL_COSTO_UNIT; // 310
const LEFT_EJERC = LEFT_PPTO + COL_ANNUAL; // 420
const LEFT_SALDO = LEFT_EJERC + COL_ANNUAL; // 530
const LEFT_PROVEEDOR = LEFT_SALDO + COL_ANNUAL; // 640

export default function BudgetTable({ 
  vm, 
  condominiumSlug, 
  projectId 
}: { 
  vm: BudgetVM; 
  condominiumSlug: string; 
  projectId: string; 
}) {
  const isClosed = vm.status === "CLOSED";
  const router = useRouter();

  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [uploadingConceptId, setUploadingConceptId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingConceptIdRef = useRef<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const conceptId = uploadingConceptIdRef.current;
    if (!file || !conceptId) return;

    try {
      const res = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId,
        kind: "budget-document"
      });

      const actionRes = await updateSupplierUrlAction(vm.year, conceptId, res.url);
      if (actionRes && !actionRes.success) {
        alert("Error al guardar en base de datos: " + actionRes.error);
      }
      router.refresh();
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Error al subir el archivo: " + (error?.message || error));
    } finally {
      uploadingConceptIdRef.current = null;
      setUploadingConceptId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveLink = async (conceptId: string, url: string) => {
    try {
      let finalUrl = url.trim();
      if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
        finalUrl = "https://" + finalUrl;
      }
      const actionRes = await updateSupplierUrlAction(vm.year, conceptId, finalUrl || null);
      if (actionRes && !actionRes.success) {
        alert("Error al guardar el enlace: " + actionRes.error);
      }
      router.refresh();
    } catch (error: any) {
      console.error("Save link error:", error);
      alert("Error al guardar el enlace: " + (error?.message || error));
    }
  };

  const handleClearUrl = async (conceptId: string) => {
    if (confirm("¿Seguro que deseas eliminar el proveedor/documento?")) {
      const actionRes = await updateSupplierUrlAction(vm.year, conceptId, null);
      if (actionRes && !actionRes.success) {
        alert("Error al eliminar: " + actionRes.error);
      }
      router.refresh();
    }
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>, conceptId: string, month: number, monthId?: string) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) val = 0;

    const original = parseFloat(e.target.dataset.original || "0");
    if (val === original) return;

    if (monthId) {
      await updateBudgetAmountAction(vm.year, monthId, val);
    } else {
      if (!vm.id) return;
      await createBudgetAmountAction(vm.year, vm.id, conceptId, month, val);
    }
    e.target.dataset.original = val.toString();
  };

  const handleUnitCostBlur = async (e: React.FocusEvent<HTMLInputElement>, conceptId: string) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) val = 0;

    const original = parseFloat(e.target.dataset.original || "0");
    if (val === original) return;

    await updateUnitCostAction(vm.year, conceptId, val);
    e.target.dataset.original = val.toString();
  };

  const handleUnitsBlur = async (e: React.FocusEvent<HTMLInputElement>, conceptId: string, month: number) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) val = 0;

    const original = parseFloat(e.target.dataset.original || "0");
    if (val === original) return;

    await updateMonthUnitsAction(vm.year, conceptId, month, val);
    e.target.dataset.original = val.toString();
  };

  const stickyHeaderBase = "z-30 px-4 border-r border-line bg-[#f2f0eb] shadow-[2px_0_5px_rgba(0,0,0,0.02)]";
  const stickyCellBase = "z-10 px-4 border-r border-line bg-card shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-canvas/5 transition-colors";
  const stickyFootBase = "z-10 px-4 border-r border-line bg-[#f6f4f0] shadow-[2px_0_5px_rgba(0,0,0,0.02)]";

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileUpload}
      />
      {vm.groups.map((group) => {
        const groupName = groupTitles[group.groupData] || group.groupData;
        
        return (
          <Card key={group.groupId} className="overflow-hidden border-transparent shadow-layered">
            <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand-deep/5 flex flex-row items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-[13px] font-bold uppercase text-brand">
                  {groupName}
                </CardTitle>
                {group.groupSubname && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/50 leading-none">
                    {group.groupSubname}
                  </span>
                )}
              </div>
              {isClosed && <Badge variant="danger" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">Lectura Protegida</Badge>}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-480">
                  <thead>
                    <tr className="h-9 bg-canvas/30 border-b border-line text-[10px] font-bold uppercase tracking-tighter text-ink-soft/70">
                      {/* Sticky: Concepto */}
                      <th className={cn("sticky", stickyHeaderBase)} style={{ left: LEFT_CONCEPTO, width: COL_CONCEPTO, minWidth: COL_CONCEPTO, maxWidth: COL_CONCEPTO }}>Concepto</th>
                      {/* Sticky: Costo Unitario */}
                      <th className={cn("sticky text-right", stickyHeaderBase, "px-2 text-brand")} style={{ left: LEFT_COSTO, width: COL_COSTO_UNIT, minWidth: COL_COSTO_UNIT, maxWidth: COL_COSTO_UNIT }}>Costo Unitario</th>
                      {/* Sticky: Anual Presupuesto */}
                      <th className={cn("sticky text-right", stickyHeaderBase, "text-brand")} style={{ left: LEFT_PPTO, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>Anual Presupuesto</th>
                      {/* Sticky: Anual Ejercido */}
                      <th className={cn("sticky text-right", stickyHeaderBase, "text-brand")} style={{ left: LEFT_EJERC, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>Anual Ejercido</th>
                      {/* Sticky: Anual Saldo */}
                      <th className={cn("sticky text-right", stickyHeaderBase, "text-brand")} style={{ left: LEFT_SALDO, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>Anual Saldo</th>
                      {/* Sticky: Proveedor */}
                      <th className={cn("sticky text-center", stickyHeaderBase, "text-brand")} style={{ left: LEFT_PROVEEDOR, width: COL_PROVEEDOR, minWidth: COL_PROVEEDOR, maxWidth: COL_PROVEEDOR }}>Proveedor</th>
                      {/* Monthly columns: Presupuesto, Unidades, Ejercido */}
                      {monthNames.map((m) => (
                        <Fragment key={m}>
                          <th className="px-3 text-right border-r border-line/30 font-bold opacity-60 min-w-[130px]">Presupuesto {m}</th>
                          <th className="px-3 text-right border-r border-line/30 font-bold opacity-70 bg-brand-deep/3 min-w-[80px]">Unidades {m}</th>
                          <th className="px-3 text-right border-r border-line font-bold opacity-80 bg-canvas/20 min-w-[120px]">Ejercido {m}</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/30">
                    {/* Concept Rows */}
                    {group.concepts.map((concept) => (
                      <tr key={concept.conceptId} className="h-10 hover:bg-canvas/10 transition-colors group">
                        {/* Sticky: Concepto */}
                        <td className={cn("sticky text-[12px] font-bold text-ink-soft", stickyCellBase)} style={{ left: LEFT_CONCEPTO, width: COL_CONCEPTO, minWidth: COL_CONCEPTO, maxWidth: COL_CONCEPTO }}>
                          {concept.conceptName}
                        </td>
                        {/* Sticky: Costo Unitario (editable) */}
                        <td className={cn("sticky", stickyCellBase, "px-2")} style={{ left: LEFT_COSTO, width: COL_COSTO_UNIT, minWidth: COL_COSTO_UNIT, maxWidth: COL_COSTO_UNIT }}>
                          {isClosed ? (
                            <div className="px-2 py-1 text-right text-[11px] font-mono text-ink-soft/40 italic">
                              {concept.unitCost != null ? formatMXN(concept.unitCost) : "—"}
                            </div>
                          ) : (
                            <div className="relative flex items-center">
                              <span className="absolute left-2 text-[10px] font-bold text-ink-soft/50">$</span>
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={concept.unitCost ?? ""}
                                data-original={concept.unitCost ?? 0}
                                onBlur={(e) => handleUnitCostBlur(e, concept.conceptId)}
                                className="w-full h-7 bg-amber-50/50 border border-amber-200/40 rounded pl-5 pr-2 text-right text-[11px] font-mono font-bold focus:bg-card focus:border-brand-accent/30 outline-none transition-all"
                              />
                            </div>
                          )}
                        </td>
                        {/* Sticky: Anual Presupuesto */}
                        <td className={cn("sticky text-right font-bold text-[12px] text-ink", stickyCellBase)} style={{ left: LEFT_PPTO, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>{formatMXN(concept.budgeted)}</td>
                        {/* Sticky: Anual Ejercido */}
                        <td className={cn("sticky text-right font-medium text-[12px] text-ink-soft", stickyCellBase)} style={{ left: LEFT_EJERC, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>{formatMXN(concept.generated)}</td>
                        {/* Sticky: Anual Saldo */}
                        <td className={cn("sticky text-right font-bold text-[12px]", stickyCellBase, concept.balance >= 0 ? "text-brand" : "text-danger")} style={{ left: LEFT_SALDO, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>
                          {formatMXN(concept.balance)}
                        </td>
                        {/* Sticky: Proveedor */}
                        <td 
                          className={cn(
                            "sticky text-center", 
                            stickyCellBase,
                            activePopover === concept.conceptId && "z-40"
                          )} 
                          style={{ left: LEFT_PROVEEDOR, width: COL_PROVEEDOR, minWidth: COL_PROVEEDOR, maxWidth: COL_PROVEEDOR }}
                        >
                          <div className="flex items-center justify-center gap-1.5 h-full">
                            {concept.supplierUrl ? (
                              <>
                                <a
                                  href={concept.supplierUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Ver archivo / link"
                                  className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-mint/25 text-brand hover:bg-brand-mint/40 transition-colors"
                                >
                                  {concept.supplierUrl.includes("firebasestorage") ? (
                                    <FileText className="h-3.5 w-3.5" />
                                  ) : (
                                    <LinkIcon className="h-3.5 w-3.5" />
                                  )}
                                </a>
                                {!isClosed && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearUrl(concept.conceptId)}
                                    className="flex items-center justify-center w-7 h-7 rounded-full text-ink-soft/40 hover:text-danger hover:bg-danger/10 transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </>
                            ) : isClosed ? (
                              <span className="text-ink-soft/30 font-medium">—</span>
                            ) : uploadingConceptId === concept.conceptId ? (
                              <Loader2 className="h-4 w-4 animate-spin text-brand" />
                            ) : (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePopover(activePopover === concept.conceptId ? null : concept.conceptId);
                                    setLinkValue("");
                                  }}
                                  className="h-6 px-2 rounded-full border border-line hover:border-brand-accent hover:text-brand-accent text-[9px] font-bold uppercase tracking-widest text-ink-soft transition-colors flex items-center gap-1"
                                >
                                  <Plus className="h-2.5 w-2.5" /> Agregar
                                </button>
                                {activePopover === concept.conceptId && (
                                  <div className="absolute left-0 mt-1.5 p-3 w-[220px] bg-white border border-line shadow-layered rounded-card text-left space-y-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="flex items-center justify-between border-b border-line pb-1.5">
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-ink">Proveedor</span>
                                      <button type="button" onClick={() => setActivePopover(null)} className="text-ink-soft hover:text-ink">
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    <div className="space-y-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          uploadingConceptIdRef.current = concept.conceptId;
                                          setUploadingConceptId(concept.conceptId);
                                          fileInputRef.current?.click();
                                          setActivePopover(null);
                                        }}
                                        className="w-full h-8 px-3 flex items-center justify-center gap-2 rounded bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors"
                                      >
                                        <Upload className="h-3.5 w-3.5" />
                                        Subir PDF
                                      </button>
                                      <div className="flex items-center gap-2 my-2 text-ink-soft/40">
                                        <div className="h-px bg-line flex-1" />
                                        <span className="text-[9px] font-bold uppercase">O bien</span>
                                        <div className="h-px bg-line flex-1" />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-ink-soft/70">Enlace Web</label>
                                        <div className="flex gap-1">
                                          <input
                                            type="text"
                                            placeholder="https://ejemplo.com"
                                            value={linkValue}
                                            onChange={(e) => setLinkValue(e.target.value)}
                                            className="h-7 px-2 border border-line rounded text-xs flex-1 outline-none bg-white focus:border-brand-accent transition-colors"
                                          />
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await handleSaveLink(concept.conceptId, linkValue);
                                              setActivePopover(null);
                                            }}
                                            className="h-7 px-2.5 bg-brand-deep text-white rounded text-[10px] font-bold uppercase hover:bg-brand transition-colors"
                                          >
                                            OK
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* Monthly columns */}
                        {concept.months.map((m) => (
                          <Fragment key={m.month}>
                            {/* Ppto Mes */}
                            <td className="px-2 py-1.5 min-w-[130px] border-r border-line/30">
                              {isClosed ? (
                                <div className="px-2 py-1 text-right text-[11px] font-mono text-ink-soft/40 italic">
                                  {formatMXN(m.budgeted)}
                                </div>
                              ) : (
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-[10px] font-bold text-ink-soft/50">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    defaultValue={m.budgeted || ""}
                                    data-original={m.budgeted}
                                    onBlur={(e) => handleBlur(e, concept.conceptId, m.month, m.budgetMonthId)}
                                    className="w-full h-7 bg-canvas/30 border border-transparent rounded pl-5 pr-2 text-right text-[11px] font-mono font-bold focus:bg-card focus:border-brand-accent/30 outline-none transition-all"
                                  />
                                </div>
                              )}
                            </td>
                            {/* Unidades Mes (editable) */}
                            <td className="px-2 py-1.5 min-w-[80px] border-r border-line/30 bg-brand-deep/2">
                              {isClosed ? (
                                <div className="px-2 py-1 text-right text-[11px] font-mono text-ink-soft/40 italic">
                                  {m.units != null ? m.units : "—"}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={m.units ?? ""}
                                  data-original={m.units ?? 0}
                                  onBlur={(e) => handleUnitsBlur(e, concept.conceptId, m.month)}
                                  className="w-full h-7 bg-brand-deep/4 border border-brand-deep/10 rounded px-2 text-right text-[11px] font-mono font-bold focus:bg-card focus:border-brand-accent/30 outline-none transition-all"
                                />
                              )}
                            </td>
                            {/* Ejerc Mes */}
                            <td className="px-3 text-right text-[11px] font-mono text-ink-soft/60 border-r border-line bg-canvas/10 italic min-w-[120px]">
                              {formatMXN(m.generated)}
                            </td>
                          </Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="h-10 bg-brand-deep/3 border-t border-line">
                      {/* Sticky: Total Concepto */}
                      <td className={cn("sticky font-bold text-[12px] uppercase text-brand", stickyFootBase)} style={{ left: LEFT_CONCEPTO, width: COL_CONCEPTO, minWidth: COL_CONCEPTO, maxWidth: COL_CONCEPTO }}>
                        Total {groupName}
                      </td>
                      {/* Sticky: Costo Unitario (empty for total) */}
                      <td className={cn("sticky", stickyFootBase, "px-2")} style={{ left: LEFT_COSTO, width: COL_COSTO_UNIT, minWidth: COL_COSTO_UNIT, maxWidth: COL_COSTO_UNIT }}></td>
                      {/* Sticky: Anual Presupuesto */}
                      <td className={cn("sticky text-right font-bold text-[13px] text-brand", stickyFootBase)} style={{ left: LEFT_PPTO, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>{formatMXN(group.budgeted)}</td>
                      {/* Sticky: Anual Ejercido */}
                      <td className={cn("sticky text-right font-bold text-[13px] text-brand", stickyFootBase)} style={{ left: LEFT_EJERC, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>{formatMXN(group.generated)}</td>
                      {/* Sticky: Anual Saldo */}
                      <td className={cn("sticky text-right font-bold text-[13px]", stickyFootBase, group.balance >= 0 ? "text-brand" : "text-danger")} style={{ left: LEFT_SALDO, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>
                        {formatMXN(group.balance)}
                      </td>
                      {/* Sticky: Proveedor */}
                      <td className={cn("sticky", stickyFootBase)} style={{ left: LEFT_PROVEEDOR, width: COL_PROVEEDOR, minWidth: COL_PROVEEDOR, maxWidth: COL_PROVEEDOR }}></td>
                      
                      {monthNames.map((m, index) => {
                        const monthNumber = index + 1;
                        const monthBudgeted = group.concepts.reduce((sum, c) => sum + (c.months.find(x => x.month === monthNumber)?.budgeted || 0), 0);
                        const monthUnits = group.concepts.reduce((sum, c) => sum + (c.months.find(x => x.month === monthNumber)?.units || 0), 0);
                        const monthGenerated = group.concepts.reduce((sum, c) => sum + (c.months.find(x => x.month === monthNumber)?.generated || 0), 0);
                        
                        return (
                          <Fragment key={m}>
                            <td className="px-2 py-1 text-right text-[12px] font-mono font-bold text-brand border-r border-line/30 min-w-[130px]">{formatMXN(monthBudgeted)}</td>
                            <td className="px-2 py-1 text-right text-[12px] font-mono font-bold text-brand/70 border-r border-line/30 bg-brand-deep/2 min-w-[80px]">{monthUnits || "—"}</td>
                            <td className="px-3 py-1 text-right text-[12px] font-mono font-bold text-brand border-r border-line bg-canvas/10 min-w-[120px]">{formatMXN(monthGenerated)}</td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="overflow-hidden border-transparent shadow-layered mt-6">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-480">
            <tfoot>
              <tr className="h-12 bg-brand-deep text-white">
                <td className="sticky px-4 font-bold uppercase text-[13px] border-r border-white/10 bg-brand-deep shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ left: LEFT_CONCEPTO, width: COL_CONCEPTO, minWidth: COL_CONCEPTO, maxWidth: COL_CONCEPTO }}>Total General</td>
                <td className="sticky px-2 text-right border-r border-white/10 bg-brand-deep shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ left: LEFT_COSTO, width: COL_COSTO_UNIT, minWidth: COL_COSTO_UNIT, maxWidth: COL_COSTO_UNIT }}></td>
                <td className="sticky px-4 text-right font-bold text-[14px] border-r border-white/10 bg-brand-deep shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ left: LEFT_PPTO, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>{formatMXNFull(vm.totalBudgeted)}</td>
                <td className="sticky px-4 text-right font-bold text-[14px] border-r border-white/10 bg-brand-deep shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ left: LEFT_EJERC, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>{formatMXNFull(vm.totalGenerated)}</td>
                <td className="sticky px-4 text-right font-bold text-[14px] border-r border-white/10 bg-brand-deep shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ left: LEFT_SALDO, width: COL_ANNUAL, minWidth: COL_ANNUAL, maxWidth: COL_ANNUAL }}>{formatMXNFull(vm.totalBalance)}</td>
                <td className="sticky px-4 text-right border-r border-white/10 bg-brand-deep shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ left: LEFT_PROVEEDOR, width: COL_PROVEEDOR, minWidth: COL_PROVEEDOR, maxWidth: COL_PROVEEDOR }}></td>
                
                {monthNames.map((m, index) => {
                  const monthNumber = index + 1;
                  let totalMonthBudgeted = 0;
                  let totalMonthUnits = 0;
                  let totalMonthGenerated = 0;
                  vm.groups.forEach(group => {
                    group.concepts.forEach(c => {
                      totalMonthBudgeted += (c.months.find(x => x.month === monthNumber)?.budgeted || 0);
                      totalMonthUnits += (c.months.find(x => x.month === monthNumber)?.units || 0);
                      totalMonthGenerated += (c.months.find(x => x.month === monthNumber)?.generated || 0);
                    });
                  });

                  return (
                    <Fragment key={m}>
                      <td className="px-2 py-1 text-right text-[12px] font-mono font-bold text-white/90 border-r border-white/10 min-w-[130px]">{formatMXNFull(totalMonthBudgeted)}</td>
                      <td className="px-2 py-1 text-right text-[12px] font-mono font-bold text-white/60 border-r border-white/10 min-w-[80px] bg-white/5">{totalMonthUnits || "—"}</td>
                      <td className="px-3 py-1 text-right text-[12px] font-mono font-bold text-white/90 border-r border-white/10 bg-white/5 min-w-[120px]">{formatMXNFull(totalMonthGenerated)}</td>
                    </Fragment>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
// Badge is imported at the top of the file
