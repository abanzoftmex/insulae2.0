"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previewMassChargesAction, createMassChargesAction } from "../actions";
import { PreviewMassChargeResult, TargetType } from "@/modules/charge/domain/mass-charge.types";

const MESES = [
  { val: 1, label: "Enero" },
  { val: 2, label: "Febrero" },
  { val: 3, label: "Marzo" },
  { val: 4, label: "Abril" },
  { val: 5, label: "Mayo" },
  { val: 6, label: "Junio" },
  { val: 7, label: "Julio" },
  { val: 8, label: "Agosto" },
  { val: 9, label: "Septiembre" },
  { val: 10, label: "Octubre" },
  { val: 11, label: "Noviembre" },
  { val: 12, label: "Diciembre" },
];

export function MassChargeWizard({
  condominiumId,
  zones,
  chargeGroups,
}: {
  condominiumId: string;
  zones: string[];
  chargeGroups: { id: string; name: string; legacyId: number | null }[];
}) {
  const router = useRouter();
  
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
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());

  // Step 3 State
  const [saving, setSaving] = useState(false);
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

  const handlePreview = async () => {
    if (!zone || !chargeGroupId || !concept.trim()) {
      alert("Por favor complete Barrio, Tipo de cobro y Concepto.");
      return;
    }
    if (selectedMonths.length === 0) {
      alert("Seleccione al menos un mes.");
      return;
    }

    setLoadingPreview(true);
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
    setLoadingPreview(false);

    if (res.success && res.data) {
      setPreviewData(res.data);
      // Auto-select those that will be charged
      const toSelect = new Set<string>();
      res.data.properties.forEach((p) => {
        if (p.willCharge) toSelect.add(p.privateAreaId);
      });
      setSelectedPropertyIds(toSelect);
    } else {
      setErrorMsg(res.error || "Error obteniendo vista previa");
    }
  };

  const toggleProperty = (id: string, willCharge: boolean) => {
    if (!willCharge) return; // Disallow selecting skipped ones manually to avoid 0$ charges
    const newSet = new Set(selectedPropertyIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedPropertyIds(newSet);
  };

  const toggleAllProperties = () => {
    if (!previewData) return;
    const chargableIds = previewData.properties.filter(p => p.willCharge).map(p => p.privateAreaId);
    if (selectedPropertyIds.size === chargableIds.length) {
      setSelectedPropertyIds(new Set());
    } else {
      setSelectedPropertyIds(new Set(chargableIds));
    }
  };

  const handleConfirm = async () => {
    if (selectedPropertyIds.size === 0) {
      alert("No hay propiedades seleccionadas para cobrar.");
      return;
    }
    if (!previewData) return;

    setSaving(true);
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
    setSaving(false);

    if (res.success) {
      setSavedSuccess({ created: res.created || 0 });
    } else {
      setErrorMsg(res.error || "Error guardando los cobros masivos.");
    }
  };

  if (savedSuccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl border border-[#ccb49c]/30 p-10 text-center space-y-4 shadow-sm">
          <div className="inline-flex bg-green-100 p-4 rounded-full text-green-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h1 className="font-[ui-serif] text-3xl text-[#2f221a]">¡Completado!</h1>
          <p className="text-[#6d422a] text-lg">
            Se generaron <strong>{savedSuccess.created}</strong> registros de cobro exitosamente.
          </p>
          <div className="pt-8">
            <button
              onClick={() => {
                setSavedSuccess(null);
                setPreviewData(null);
                setSelectedMonths([]);
                setConcept("");
              }}
              className="bg-[#5a7b56] hover:bg-[#4a6b46] text-white px-8 py-3 rounded-xl font-medium transition-colors"
            >
              Realizar otro cobro masivo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate dynamic totals for preview
  const selectedCount = selectedPropertyIds.size;
  const selectedTotalAmount = previewData
    ? previewData.properties
        .filter((p) => selectedPropertyIds.has(p.privateAreaId))
        .reduce((acc, p) => acc + p.totalAmount, 0)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/resumen-financiero"
          className="border border-[#ccb49c]/40 p-2.5 rounded-xl text-[#6d422a] hover:bg-[#f8efe3]/50 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="font-[ui-serif] text-3xl text-[#2f221a]">Cobros Masivos (Futuros)</h1>
          <p className="text-[#9a6a4a] text-sm mt-1 uppercase tracking-widest font-medium">
            Generación por lote de cargos
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
          Error: {errorMsg}
        </div>
      )}

      {/* Step 1: Config */}
      {!previewData && (
        <div className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm overflow-hidden">
          <div className="bg-[#fcf9f5] px-8 py-5 border-b border-[#ccb49c]/20">
            <h2 className="font-[ui-serif] text-xl text-[#2f221a] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a7b56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Paso 1: Configuración
            </h2>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#6d422a]">Barrio</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 text-[#2f221a] outline-none focus:border-[#5a7b56] transition-colors"
                >
                  {zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#6d422a]">Tipo de Destino</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as TargetType)}
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 text-[#2f221a] outline-none focus:border-[#5a7b56] transition-colors"
                >
                  <option value="COMERCIO">Comercio</option>
                  <option value="PROPIETARIO">Propietario</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#6d422a]">Tipo de Cobro</label>
                <select
                  value={chargeGroupId}
                  onChange={(e) => setChargeGroupId(e.target.value)}
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 text-[#2f221a] outline-none focus:border-[#5a7b56] transition-colors"
                >
                  {chargeGroups.map((cg) => (
                    <option key={cg.id} value={cg.id}>{cg.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-sm font-semibold text-[#6d422a]">Concepto (Texto en el estado de cuenta)</label>
                <input
                  type="text"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej. Cuota de mantenimiento Enero 2026"
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 text-[#2f221a] outline-none focus:border-[#5a7b56] transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#6d422a]">Año</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 text-[#2f221a] outline-none focus:border-[#5a7b56] transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#6d422a]">Día de inicio / vigencia</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={startDay}
                    onChange={(e) => setStartDay(Number(e.target.value))}
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 text-[#2f221a] outline-none focus:border-[#5a7b56] transition-colors"
                  />
                  <span className="text-[#ccb49c] font-bold">/</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 text-[#2f221a] outline-none focus:border-[#5a7b56] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[#6d422a]">Meses a Aplicar</label>
                <button
                  type="button"
                  onClick={toggleAllMonths}
                  className="text-xs font-semibold text-[#5a7b56] bg-[#f2f8eb] px-3 py-1.5 rounded-lg hover:bg-[#d6ebc2] transition-colors"
                >
                  {selectedMonths.length === 12 ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {MESES.map((m) => {
                  const isSelected = selectedMonths.includes(m.val);
                  return (
                    <label
                      key={m.val}
                      className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#5a7b56] border-[#5a7b56] text-white"
                          : "bg-white border-[#ccb49c]/40 text-[#6d422a] hover:bg-[#f8efe3]/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={() => toggleMonth(m.val)}
                      />
                      <span className="text-sm font-medium">{m.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#ccb49c]/20 flex justify-end">
              <button
                type="button"
                onClick={handlePreview}
                disabled={loadingPreview}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                {loadingPreview ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
                Generar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Confirm */}
      {previewData && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm overflow-hidden">
            <div className="bg-[#2f221a] px-8 py-5 flex items-center justify-between">
              <h2 className="font-[ui-serif] text-xl text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a7b56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Paso 2: Vista Previa y Confirmación
              </h2>
              <button
                onClick={() => setPreviewData(null)}
                className="text-white/60 hover:text-white transition-colors text-sm font-medium"
              >
                Volver a configurar
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Resumen Numeros */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#fcf9f5] border border-[#ccb49c]/30 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#2f221a]">{previewData.summary.totalProperties}</p>
                  <p className="text-xs text-[#9a6a4a] mt-1 uppercase tracking-wider font-semibold">Total propiedades</p>
                </div>
                <div className="bg-[#f2f8eb] border border-[#d6ebc2] rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#4a6b46]">{selectedCount}</p>
                  <p className="text-xs text-[#5a7b56] mt-1 uppercase tracking-wider font-semibold">Seleccionadas</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{previewData.summary.skippedCount}</p>
                  <p className="text-xs text-amber-600 mt-1 uppercase tracking-wider font-semibold">Omitidas</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">${selectedTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-blue-600 mt-1 uppercase tracking-wider font-semibold">Total Seleccionado</p>
                </div>
              </div>

              {/* Notice */}
              {previewData.summary.skippedCount > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                  <p className="text-sm text-amber-800">
                    <strong className="font-semibold">Nota:</strong> Se omiten automáticamente {previewData.summary.skippedCount} propiedad(es) que {previewData.targetType === 'PROPIETARIO' ? 'tienen comercio activo (evita duplicación de cobro)' : 'no tienen comercio activo o no tienen tarifa predefinida en su Área.'}
                  </p>
                </div>
              )}

              {/* Table */}
              <div className="border border-[#ccb49c]/30 rounded-2xl overflow-hidden">
                <div className="bg-[#fcf9f5] px-4 py-3 border-b border-[#ccb49c]/30 flex justify-between items-center">
                  <h3 className="font-semibold text-[#2f221a] text-sm">Detalle por Propiedad</h3>
                  <button
                    onClick={toggleAllProperties}
                    className="text-xs font-semibold text-[#2563eb] hover:underline"
                  >
                    Seleccionar/Deseleccionar aplicables
                  </button>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#ebe0d3] text-[#6d422a] sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-10 text-center"></th>
                        <th className="px-4 py-3 font-semibold">Propiedad</th>
                        <th className="px-4 py-3 font-semibold">Estado Comercio</th>
                        <th className="px-4 py-3 font-semibold">Condición</th>
                        <th className="px-4 py-3 font-semibold text-right">Monto / mes</th>
                        <th className="px-4 py-3 font-semibold text-right">Total ({previewData.months.length} m)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ccb49c]/10 bg-white">
                      {previewData.properties.map((p) => {
                        const isSelected = selectedPropertyIds.has(p.privateAreaId);
                        const rowClass = p.willCharge 
                          ? (isSelected ? "bg-[#f2f8eb] hover:bg-[#e7f3dd]" : "hover:bg-[#fcf9f5]") 
                          : "bg-gray-50 opacity-75";

                        return (
                          <tr key={p.privateAreaId} className={`transition-colors ${rowClass}`}>
                            <td className="px-4 py-3 text-center">
                              {p.willCharge ? (
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 cursor-pointer accent-[#5a7b56]"
                                  checked={isSelected}
                                  onChange={() => toggleProperty(p.privateAreaId, p.willCharge)}
                                />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#2f221a]">{p.privateAreaName}</td>
                            <td className="px-4 py-3">
                              {p.hasCommerce ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {p.commerceName || "Comercio Activo"}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">Sin comercio</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs ${p.willCharge ? 'text-[#5a7b56]' : 'text-amber-600'}`}>
                                {p.reason}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-[#6d422a]">
                              {p.willCharge ? `$${p.amountPerMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-[#2f221a]">
                              {p.willCharge ? `$${p.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#fcf9f5] px-4 py-4 border-t border-[#ccb49c]/30 flex justify-between items-center">
                  <span className="font-semibold text-[#6d422a]">TOTAL A CARGAR:</span>
                  <span className="text-xl font-bold text-[#2f221a]">
                    ${selectedTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

            </div>

            {/* Sticky Footer Confirm */}
            <div className="bg-gray-50 border-t border-[#ccb49c]/20 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6d422a]">Se aplicarán los cargos a las propiedades marcadas con <strong className="text-[#5a7b56]">palomita verde</strong>.</p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPreviewData(null)}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl font-medium text-[#6d422a] border border-[#ccb49c]/40 hover:bg-[#fcf9f5] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={saving || selectedCount === 0}
                  className="bg-[#5a7b56] hover:bg-[#4a6b46] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                  {saving ? "Procesando..." : "Confirmar y Generar Cargos"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
