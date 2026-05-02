"use client";

import React, { useState, useTransition } from "react";
import { 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Calendar,
  MapPin,
  CheckCircle,
  X,
  Loader2,
  Info
} from "lucide-react";
import { previewMassChargesAction, createMassChargesAction } from "../actions";
import { PreviewMassChargeResult, TargetType } from "@/modules/charge/domain/mass-charge.types";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/shared/utils/cn";

const MESES = [
  { val: 1, label: "ENE" },
  { val: 2, label: "FEB" },
  { val: 3, label: "MAR" },
  { val: 4, label: "ABR" },
  { val: 5, label: "MAY" },
  { val: 6, label: "JUN" },
  { val: 7, label: "JUL" },
  { val: 8, label: "AGO" },
  { val: 9, label: "SEP" },
  { val: 10, label: "OCT" },
  { val: 11, label: "NOV" },
  { val: 12, label: "DIC" },
];

export function MassChargeWorkbench({
  condominiumId,
  zones,
  chargeGroups,
}: {
  condominiumId: string;
  zones: string[];
  chargeGroups: { id: string; name: string; legacyId: number | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  
  // Step 1 State
  const [zone, setZone] = useState(zones[0] || "");
  const [targetType, setTargetType] = useState<TargetType>("COMERCIO");
  const [chargeGroupId, setChargeGroupId] = useState(chargeGroups[0]?.id || "");
  const [concept, setConcept] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDay, setStartDay] = useState(1);
  const [dueDay, setDueDay] = useState(10);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // Step 2 State
  const [previewData, setPreviewData] = useState<PreviewMassChargeResult | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());

  // Step 3 State (Success)
  const [savedSuccess, setSavedSuccess] = useState<{ created: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const toggleAllMonths = () => {
    if (selectedMonths.length === 12) setSelectedMonths([]);
    else setSelectedMonths(MESES.map((m) => m.val));
  };

  const handlePreview = () => {
    if (!zone || !chargeGroupId || !concept.trim()) {
      alert("Complete Barrio, Tipo y Concepto.");
      return;
    }
    if (selectedMonths.length === 0) {
      alert("Seleccione al menos un mes.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const res = await previewMassChargesAction({
        condominiumId,
        zone,
        chargeGroupId,
        targetType,
        months: selectedMonths,
        year,
        concept: concept.trim(),
        startDay,
        dueDay,
      });

      if (res.success && res.data) {
        setPreviewData(res.data);
        const toSelect = new Set<string>();
        res.data.properties.forEach((p) => { if (p.willCharge) toSelect.add(p.privateAreaId); });
        setSelectedPropertyIds(toSelect);
      } else {
        setErrorMsg(res.error || "Error en vista previa");
      }
    });
  };

  const toggleProperty = (id: string, willCharge: boolean) => {
    if (!willCharge) return;
    const newSet = new Set(selectedPropertyIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedPropertyIds(newSet);
  };

  const toggleAllProperties = () => {
    if (!previewData) return;
    const chargableIds = previewData.properties.filter(p => p.willCharge).map(p => p.privateAreaId);
    if (selectedPropertyIds.size === chargableIds.length) setSelectedPropertyIds(new Set());
    else setSelectedPropertyIds(new Set(chargableIds));
  };

  const handleConfirm = () => {
    if (selectedPropertyIds.size === 0) return;
    if (!previewData) return;

    startTransition(async () => {
      setErrorMsg(null);
      const res = await createMassChargesAction(
        {
          condominiumId,
          chargeGroupId,
          concept: previewData.concept,
          year: previewData.year,
          months: previewData.months,
          startDay: previewData.startDay,
          dueDay: previewData.dueDay,
          selectedPrivateAreaIds: Array.from(selectedPropertyIds),
        },
        previewData.properties
      );

      if (res.success) setSavedSuccess({ created: res.created || 0 });
      else setErrorMsg(res.error || "Error al generar cobros");
    });
  };

  if (savedSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500">
        <div className="h-16 w-16 rounded-full bg-brand-mint flex items-center justify-center text-brand mb-6 shadow-lg shadow-brand/10">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-brand uppercase tracking-tight">Proceso Completado</h1>
        <p className="text-ink-soft text-sm mt-2">Se generaron exitosamente <strong>{savedSuccess.created}</strong> cargos.</p>
        <Button 
          className="mt-8 h-10 px-8 text-[11px] font-black uppercase"
          onClick={() => { setSavedSuccess(null); setPreviewData(null); setSelectedMonths([]); setConcept(""); }}
        >
          Nuevo Proceso
        </Button>
      </div>
    );
  }

  const selectedCount = selectedPropertyIds.size;
  const selectedTotal = previewData
    ? previewData.properties.filter(p => selectedPropertyIds.has(p.privateAreaId)).reduce((acc, p) => acc + p.totalAmount, 0)
    : 0;

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-md flex items-center gap-2 text-danger text-[12px] font-bold uppercase">
          <AlertTriangle className="h-4 w-4" />
          Error: {errorMsg}
        </div>
      )}

      {/* STEP 1: Config */}
      {!previewData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-layered border-transparent">
              <CardHeader className="px-4 py-3 border-b border-line bg-card">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-ink-soft/60">Configuración de Lote</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <select value={zone} onChange={(e) => setZone(e.target.value)} className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium outline-none appearance-none focus:ring-2 focus:ring-brand-accent/20">
                      {zones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                    <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60">Barrio</label>
                  </div>
                  <div className="relative">
                    <select value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)} className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium outline-none appearance-none focus:ring-2 focus:ring-brand-accent/20">
                      <option value="COMERCIO">Comercio</option>
                      <option value="PROPIETARIO">Propietario</option>
                    </select>
                    <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60">Destino</label>
                  </div>
                  <div className="relative">
                    <select value={chargeGroupId} onChange={(e) => setChargeGroupId(e.target.value)} className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium outline-none appearance-none focus:ring-2 focus:ring-brand-accent/20">
                      {chargeGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
                    </select>
                    <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60">Tipo de Cobro</label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Input label="Concepto en Estado de Cuenta" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Cuota Mantenimiento Enero" />
                  </div>
                  <Input label="Año" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Día Inicio" type="number" value={startDay} onChange={(e) => setStartDay(Number(e.target.value))} />
                    <Input label="Día Vence" type="number" value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink-soft/40">Meses a Aplicar</p>
                    <button onClick={toggleAllMonths} className="text-[9px] font-black text-brand-accent hover:underline uppercase">Alternar Todos</button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {MESES.map(m => (
                      <button key={m.val} onClick={() => toggleMonth(m.val)} className={cn(
                        "h-8 rounded text-[11px] font-black transition-all border",
                        selectedMonths.includes(m.val) ? "bg-brand text-white border-brand shadow-sm" : "bg-card text-ink-soft border-line hover:border-brand/40"
                      )}>{m.label}</button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-brand-deep text-white border-transparent shadow-layered overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-brand-uplift flex items-center justify-center">
                    <Zap className="h-5 w-5 text-brand-mint" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase text-sm tracking-tight">Acción Masiva</h3>
                    <p className="text-[11px] text-brand-mint/60 font-bold uppercase">Validación en tiempo real</p>
                  </div>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between text-[12px] border-b border-white/10 pb-2">
                    <span className="text-white/60">Destino</span>
                    <span className="font-bold">{targetType}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] border-b border-white/10 pb-2">
                    <span className="text-white/60">Meses seleccionados</span>
                    <span className="font-bold">{selectedMonths.length}</span>
                  </div>
                </div>
                <Button 
                  className="w-full h-11 bg-brand-accent hover:bg-brand-accent/90 text-white font-black uppercase text-[11px] gap-2 active-scale"
                  onClick={handlePreview}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Generar Vista Previa
                </Button>
              </CardContent>
            </Card>
            
            <div className="p-4 bg-canvas border border-line rounded-md">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-brand-accent shrink-0 mt-0.5" />
                <p className="text-[11px] text-ink-soft/70 leading-relaxed italic">
                  Este proceso no genera cargos inmediatos. Se mostrará una lista detallada para confirmar propiedad por propiedad antes de procesar.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STEP 2: Preview */
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="h-8 px-0 text-ink-soft hover:text-ink font-bold text-[11px] uppercase gap-1" onClick={() => setPreviewData(null)}>
              <X className="h-3.5 w-3.5" /> Volver a Configurar
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] font-black text-ink-soft/40 uppercase tracking-widest leading-none">Total Seleccionado</p>
                <p className="text-lg font-black text-brand leading-tight">
                  {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(selectedTotal)}
                </p>
              </div>
              <Button 
                className="h-10 px-8 bg-brand-accent text-white font-black uppercase text-[11px] gap-2"
                onClick={handleConfirm}
                disabled={isPending || selectedCount === 0}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Confirmar y Generar {selectedCount} Cargos
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCard label="Total Propiedades" value={previewData.summary.totalProperties} icon={<MapPin className="h-3.5 w-3.5" />} />
            <StatCard label="Para Cobrar" value={selectedCount} icon={<CheckCircle2 className="h-3.5 w-3.5" />} className="bg-brand-mint/20 border-brand-mint/30" />
            <StatCard label="Omitidas" value={previewData.summary.skippedCount} icon={<AlertTriangle className="h-3.5 w-3.5" />} className="bg-danger/[0.03] border-danger/10" />
            <StatCard label="Meses" value={previewData.months.length} icon={<Calendar className="h-3.5 w-3.5" />} />
          </div>

          <Card className="overflow-hidden border-transparent shadow-layered">
            <CardHeader className="px-4 py-3 border-b border-line bg-card flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-brand">Detalle por Propiedad</CardTitle>
              <button onClick={toggleAllProperties} className="text-[9px] font-black text-brand-accent hover:underline uppercase">Alternar Selección</button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-20 bg-canvas/90 backdrop-blur-sm border-b border-line text-[10px] font-black uppercase tracking-widest text-ink-soft/70">
                    <tr>
                      <th className="px-4 w-10"></th>
                      <th className="px-4 py-3">Propiedad</th>
                      <th className="px-4 py-3">Estatus Comercio</th>
                      <th className="px-4 py-3">Condición</th>
                      <th className="px-4 py-3 text-right">Monto Mensual</th>
                      <th className="px-4 py-3 text-right">Total ({previewData.months.length}m)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/30">
                    {previewData.properties.map(p => {
                      const isSelected = selectedPropertyIds.has(p.privateAreaId);
                      return (
                        <tr key={p.privateAreaId} className={cn(
                          "h-11 transition-colors",
                          !p.willCharge ? "bg-canvas/30 opacity-60" : isSelected ? "bg-brand-mint/10" : "hover:bg-canvas/10"
                        )}>
                          <td className="px-4 text-center">
                            {p.willCharge && (
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => toggleProperty(p.privateAreaId, p.willCharge)}
                                className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand-accent/20 cursor-pointer"
                              />
                            )}
                          </td>
                          <td className="px-4 text-[12px] font-bold text-ink">{p.privateAreaName}</td>
                          <td className="px-4">
                            {p.hasCommerce ? (
                              <Badge variant="success">{p.commerceName || "Activo"}</Badge>
                            ) : (
                              <Badge variant="default">Sin Comercio</Badge>
                            )}
                          </td>
                          <td className="px-4 text-[11px] font-medium text-ink-soft italic">{p.reason}</td>
                          <td className="px-4 text-right font-mono text-[11px] text-ink-soft">${p.amountPerMonth.toLocaleString('en-US')}</td>
                          <td className="px-4 text-right font-black text-brand text-[13px]">${p.totalAmount.toLocaleString('en-US')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
