"use client";

import React, { useState, useTransition, useMemo, Fragment } from "react";
import { 
  Edit2, 
  Trash2, 
  Plus, 
  Layers,
  MapPin,
  Loader2,
  Info,
  DollarSign,
  ArrowRight
} from "lucide-react";
import type { LandUseListingVM } from "@/modules/land-uses/presentation/land-use-listing.vm";
import { getLandUseFormDataAction, saveLandUseAction } from "../actions";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/shared/utils/cn";

export function LandUseWorkbench({ initialVm }: { initialVm: LandUseListingVM }) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formName, setFormName] = useState("");
  const [formInitials, setFormInitials] = useState("");
  const [formOrder, setFormOrder] = useState("0");
  const [formWeight, setFormWeight] = useState("0");
  const [formPercentage, setFormPercentage] = useState("0");
  const [formCharges, setFormCharges] = useState<any[]>([]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialVm.rows.filter(r => !q || [r.name, r.initials].some(f => f.toLowerCase().includes(q)));
  }, [initialVm.rows, search]);

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormInitials("");
    setFormOrder(String(initialVm.rows.length + 1));
    setFormWeight("0");
    setFormPercentage("0");
    // Initialize charges based on columns (ChargeGroups)
    setFormCharges(initialVm.columns.map(c => {
      const [yearStr, ...rest] = c.key.split(":");
      return { key: c.key, year: parseInt(yearStr, 10), chargeGroupId: rest.join(":"), amount: 0, applicationMode: "PER_METER" };
    }));
    setIsModalOpen(true);
  };

  const openEditModal = async (id: string) => {
    setEditingId(id);
    setIsLoadingForm(true);
    setIsModalOpen(true);
    const data = await getLandUseFormDataAction(id);
    if (data) {
      setFormName(data.name);
      setFormInitials(data.initials || "");
      setFormOrder(String(data.order || 0));
      setFormWeight(String(data.weight || 0));
      setFormPercentage(String(data.percentage || 0));
      setFormCharges(data.charges.map(c => ({
        key: c.key,
        year: c.year,
        chargeGroupId: c.chargeGroupId,
        amount: c.amount,
        applicationMode: c.applicationMode
      })));
    }
    setIsLoadingForm(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveLandUseAction({
        id: editingId || undefined,
        name: formName,
        initials: formInitials,
        order: parseInt(formOrder),
        weight: parseFloat(formWeight),
        percentage: parseFloat(formPercentage),
        charges: formCharges.map(c => ({
          year: c.year,
          chargeGroupId: c.chargeGroupId,
          amount: parseFloat(String(c.amount || 0)),
          applicationMode: c.applicationMode
        }))
      });

      if (res.ok) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.message);
      }
    });
  };

  const updateChargeAmount = (chargeGroupId: string, amount: string) => {
    setFormCharges(prev => prev.map(c => c.chargeGroupId === chargeGroupId ? { ...c, amount } : c));
  };

  const updateChargeMode = (chargeGroupId: string, mode: string) => {
    setFormCharges(prev => prev.map(c => c.chargeGroupId === chargeGroupId ? { ...c, applicationMode: mode } : c));
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Categorías" value={initialVm.totalRows} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard label="M2 Operativos" value={initialVm.rows.reduce((acc, r) => acc + parseFloat(r.totalM2.replace(/[^0-9.]/g, '')), 0).toLocaleString()} icon={<MapPin className="h-3.5 w-3.5" />} />
        <div className="md:col-span-2 flex items-center justify-between p-3 bg-card border border-line rounded-md shadow-layered">
          <div className="flex-1 max-w-xs">
            <Input label="Buscar Uso" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o iniciales..." className="h-9" />
          </div>
          <Button onClick={openAddModal} className="h-9 px-6 text-[10px] font-black uppercase gap-2">
            <Plus className="h-4 w-4" /> Nuevo Uso
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-transparent shadow-layered mt-4">
        <CardHeader className="px-4 py-3 border-b border-line bg-card flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-brand">Matriz de Configuración por Uso</CardTitle>
          <Badge variant={initialVm.usesLandUseFormula ? "success" : "warning"}>
            Fórmula: {initialVm.usesLandUseFormula ? "ACTIVA" : "INACTIVA"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[120rem]">
              <thead>
                <tr className="h-10 bg-canvas/30 border-b border-line text-[10px] font-black uppercase tracking-widest text-ink-soft/60">
                  <th className="sticky left-0 z-30 px-4 border-r border-line bg-canvas/95 backdrop-blur-sm shadow-[2px_0_5px_rgba(0,0,0,0.02)] w-[80px]">Orden</th>
                  <th className="sticky left-[80px] z-30 px-4 border-r border-line bg-canvas/95 backdrop-blur-sm shadow-[2px_0_5px_rgba(0,0,0,0.02)] w-[240px]">Nombre</th>
                  <th className="px-4">Iniciales</th>
                  <th className="px-4 text-right">Unidades</th>
                  <th className="px-4 text-right">M2 Totales</th>
                  {initialVm.columns.map(col => (
                    <th key={col.key} className="px-4 text-center border-l border-line/30 bg-brand-mint/5 text-brand">{col.label}</th>
                  ))}
                  <th className="px-4 text-right border-l border-line">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/30">
                {filteredRows.map(row => (
                  <tr key={row.id} className="h-12 hover:bg-canvas/10 transition-colors group">
                    <td className="sticky left-0 px-4 text-[12px] font-black text-ink-soft/40 border-r border-line bg-card shadow-[2px_0_5px_rgba(0,0,0,0.02)]">{row.order}</td>
                    <td className="sticky left-[80px] px-4 text-[13px] font-bold text-brand border-r border-line bg-card shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-canvas transition-colors">{row.name}</td>
                    <td className="px-4"><Badge variant="outline" className="h-5 px-1.5">{row.initials}</Badge></td>
                    <td className="px-4 text-right text-[12px] font-bold">{row.totalAreas}</td>
                    <td className="px-4 text-right text-[12px] font-mono text-ink-soft">{row.totalM2}</td>
                    {initialVm.columns.map(col => {
                      const charge = row.charges[col.key];
                      return (
                        <td key={col.key} className="px-4 border-l border-line/30">
                          <div className="flex flex-col items-center leading-none">
                            <span className="text-[12px] font-black text-brand">{charge?.amount || "$0.00"}</span>
                            <span className="text-[8px] font-black uppercase text-ink-soft/40 tracking-tighter mt-0.5">{charge?.applicationModeLabel || "N/A"}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 text-right border-l border-line">
                       <button onClick={() => openEditModal(row.id)} className="p-1.5 rounded hover:bg-canvas text-ink-soft/40 hover:text-brand transition-standard">
                         <Edit2 className="h-4 w-4" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Uso de Suelo" : "Nuevo Uso de Suelo"}
        size="xl"
        footer={
          !isLoadingForm && (
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-black uppercase">Cancelar</Button>
              <Button 
                disabled={isPending || !formName} 
                onClick={handleSave}
                className="h-8 px-6 text-[10px] font-black uppercase"
              >
                {isPending ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </>
          )
        }
      >
        {isLoadingForm ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-brand/40">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest">Obteniendo datos...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2"><Input label="Nombre del Uso" value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
              <Input label="Iniciales" value={formInitials} onChange={(e) => setFormInitials(e.target.value)} maxLength={5} />
            </div>

            <div className="grid grid-cols-3 gap-4">
               <Input label="Orden" type="number" value={formOrder} onChange={(e) => setFormOrder(e.target.value)} />
               <Input label="Peso (Weight)" type="number" step="0.001" value={formWeight} onChange={(e) => setFormWeight(e.target.value)} />
               <Input label="Porcentaje" type="number" step="0.01" value={formPercentage} onChange={(e) => setFormPercentage(e.target.value)} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-line pb-1">
                <DollarSign className="h-3.5 w-3.5 text-brand" />
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-soft/60">Configuración de Cargos por Grupo</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {initialVm.columns.map(col => {
                  const charge = formCharges.find(c => c.chargeGroupId === col.key);
                  return (
                    <div key={col.key} className="p-3 bg-canvas/30 rounded border border-line/50 flex flex-col gap-3">
                      <p className="text-[11px] font-black text-brand uppercase truncate">{col.label}</p>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input 
                            label="Monto" 
                            type="number" 
                            step="0.01" 
                            value={charge?.amount || 0} 
                            onChange={(e) => updateChargeAmount(col.key, e.target.value)} 
                            className="h-8"
                          />
                        </div>
                        <div className="flex-1 relative">
                          <select 
                            value={charge?.applicationMode || "PER_M2"} 
                            onChange={(e) => updateChargeMode(col.key, e.target.value)}
                            className="peer h-8 w-full rounded border border-line bg-card px-2 text-[12px] font-medium outline-none appearance-none"
                          >
                            <option value="FIXED">Monto Fijo</option>
                            <option value="PER_M2">Por M2</option>
                          </select>
                          <label className="absolute left-2 -top-1.5 px-1 bg-card text-[8px] font-black uppercase tracking-widest text-brand-accent/60">Modo</label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-brand-mint/20 rounded border border-brand-mint/30 flex gap-2">
              <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-brand/70 leading-tight uppercase tracking-tight">
                Los montos configurados se aplican a todas las unidades de este uso. El sistema recalcula saldos al momento de generar la vista del reporte.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
