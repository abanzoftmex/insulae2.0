"use client";

import React, { useState, useMemo, useTransition } from "react";
import { 
  Edit2, 
  Trash2, 
  Layers,
  ArrowUpDown,
  Info
} from "lucide-react";
import { saveMiscIncomeCatalogAction, deleteMiscIncomeConceptAction } from "../actions";
import type { MiscIncomeConcept } from "@/modules/misc-income";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/utils/cn";

const MONTHS = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - 2 + i));

interface MiscIncomeWorkbenchProps {
  initialConcepts: MiscIncomeConcept[];
  ordinaryGroup: { id: string; name: string };
  extraordinaryGroup: { id: string; name: string };
}

export function MiscIncomeWorkbench({ 
  initialConcepts, 
  ordinaryGroup, 
  extraordinaryGroup 
}: MiscIncomeWorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formName, setFormName] = useState("");
  const [formQuotaStart, setFormQuotaStart] = useState("");
  const [formQuotaEnd, setFormQuotaEnd] = useState("");
  const [formGroupId, setFormChargeGroupId] = useState(ordinaryGroup.id);
  const [formOrder, setFormOrder] = useState("0");

  const filteredConcepts = useMemo(() => {
    const term = search.toLowerCase().trim();
    return initialConcepts.filter(c => !term || c.name.toLowerCase().includes(term));
  }, [initialConcepts, search]);

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormQuotaStart("");
    setFormQuotaEnd("");
    setFormChargeGroupId(ordinaryGroup.id);
    setFormOrder(String(initialConcepts.length));
    setIsModalOpen(true);
  };

  const openEditModal = (concept: MiscIncomeConcept) => {
    const toInputMonth = (d: Date | null) => {
      if (!d) return "";
      const date = new Date(d);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    };
    setEditingId(concept.id);
    setFormName(concept.name);
    setFormQuotaStart(toInputMonth(concept.quotaPeriodStart || null));
    setFormQuotaEnd(toInputMonth(concept.quotaPeriodEnd || null));
    setFormChargeGroupId(concept.chargeGroupId ?? "");
    setFormOrder(String(concept.order));
    setIsModalOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      // The backend expects an array of concepts for saveMiscIncomeCatalogAction
      // If we are editing, we send the updated concept. 
      // If we are creating, we send the new one (id is empty).
      // For simplicity, we just send the single updated/new concept wrapped in an array.
      // The current action logic seems to handle partial updates if ID is provided.
      
      const payload: MiscIncomeConcept[] = [
        {
          id: editingId || "",
          name: formName,
          quotaPeriodStart: formQuotaStart ? new Date(`${formQuotaStart}-01T00:00:00Z`) : null,
          quotaPeriodEnd: formQuotaEnd ? new Date(`${formQuotaEnd}-01T00:00:00Z`) : null,
          chargeGroupId: formGroupId,
          order: parseInt(formOrder),
          isActive: true
        }
      ];

      const res = await saveMiscIncomeCatalogAction(payload);

      if (res.success) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este concepto?")) return;
    startTransition(async () => {
      const res = await deleteMiscIncomeConceptAction(id);
      if (res.success) window.location.reload();
      else alert(res.error);
    });
  };

  const columns: DataTableColumn<MiscIncomeConcept>[] = [
    {
      header: "Concepto",
      accessorKey: "name",
      cell: (row) => <span className="font-bold">{row.name}</span>
    },
    {
      header: "Periodo de Cuota",
      accessorKey: "quotaPeriodStart", // using this for unique key instead of id
      cell: (row) => {
        if (!row.quotaPeriodStart && !row.quotaPeriodEnd) return <span className="text-[11px] font-medium text-ink-soft/80">-</span>;
        
        const formatM = (d: Date | null) => {
          if (!d) return "";
          return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d));
        };
        const startStr = formatM(row.quotaPeriodStart || null);
        const endStr = formatM(row.quotaPeriodEnd || null);
        
        let text = "";
        if (startStr && endStr) text = `${startStr} a ${endStr}`;
        else if (startStr) text = `Desde ${startStr}`;
        else if (endStr) text = `Hasta ${endStr}`;

        return <span className="text-[11px] font-medium text-ink-soft/80 capitalize">{text}</span>;
      }
    },
    {
      header: "Categoría Base",
      accessorKey: "chargeGroupId",
      cell: (row) => (
        <Badge
          variant={row.chargeGroupId === ordinaryGroup.id ? "brand" : "warning"}
          className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest"
        >
          {row.chargeGroupId === ordinaryGroup.id ? "Ordinaria" : "Extraordinaria"}
        </Badge>
      )
    },
    {
      header: "Orden",
      accessorKey: "order",
      align: "center",
      cell: (row) => <span className="text-[11px] font-bold text-ink-soft/60">{row.order}</span>
    },
    {
      header: "Acciones",
      accessorKey: "id",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors"
            title="Editar"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-danger/15 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-7 px-3 flex items-center justify-center rounded bg-brand/5 border border-brand/10 text-brand text-[9px] font-bold uppercase tracking-tighter">
          <Layers className="h-3 w-3 mr-1.5 opacity-50" />
          {initialConcepts.length} Conceptos configurados
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="success">Estructura Activa</Badge>
        </div>
      </div>

      <DataTable
        title="Catálogo de Otros Ingresos"
        count={filteredConcepts.length}
        data={filteredConcepts}
        columns={columns}
        onSearch={setSearch}
        onAdd={openAddModal}
        addLabel="Nuevo Concepto"
      />

      <div className="flex items-center gap-2 p-3 bg-canvas/40 border border-line/30 rounded-md mt-4">
        <Info className="h-4 w-4 text-brand-accent shrink-0" />
        <p className="text-[10px] font-bold text-ink-soft/60 leading-tight uppercase tracking-tight">
          Los conceptos definidos aquí estarán disponibles para el registro de ingresos manuales. 
          Cada concepto debe pertenecer a una categoría base para su correcta clasificación contable.
        </p>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Concepto" : "Nuevo Concepto"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-bold uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !formName} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-bold uppercase"
            >
              {isPending ? "Guardando..." : "Guardar Concepto"}
            </Button>
          </>
        }
      >
        <div className="space-y-5 pt-2">
          <Input 
            label="Nombre del Concepto" 
            value={formName} 
            onChange={(e) => setFormName(e.target.value)} 
            placeholder="Ej. Cuota de TAG / Control"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-brand-accent/60 ml-2">Mes Inicial (Opcional)</label>
              <div className="flex gap-2">
                <select
                  value={formQuotaStart ? formQuotaStart.split("-")[1] : ""}
                  onChange={(e) => {
                    const y = formQuotaStart ? formQuotaStart.split("-")[0] : new Date().getFullYear();
                    setFormQuotaStart(e.target.value ? `${y}-${e.target.value}` : "");
                  }}
                  className="h-9 flex-1 rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none"
                >
                  <option value="">Mes</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select
                  value={formQuotaStart ? formQuotaStart.split("-")[0] : ""}
                  onChange={(e) => {
                    const m = formQuotaStart ? formQuotaStart.split("-")[1] : "01";
                    setFormQuotaStart(e.target.value && formQuotaStart ? `${e.target.value}-${m}` : e.target.value ? `${e.target.value}-01` : "");
                  }}
                  className="h-9 w-24 rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none"
                >
                  <option value="">Año</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-brand-accent/60 ml-2">Mes Final (Opcional)</label>
              <div className="flex gap-2">
                <select
                  value={formQuotaEnd ? formQuotaEnd.split("-")[1] : ""}
                  onChange={(e) => {
                    const y = formQuotaEnd ? formQuotaEnd.split("-")[0] : new Date().getFullYear();
                    setFormQuotaEnd(e.target.value ? `${y}-${e.target.value}` : "");
                  }}
                  className="h-9 flex-1 rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none"
                >
                  <option value="">Mes</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select
                  value={formQuotaEnd ? formQuotaEnd.split("-")[0] : ""}
                  onChange={(e) => {
                    const m = formQuotaEnd ? formQuotaEnd.split("-")[1] : "01";
                    setFormQuotaEnd(e.target.value && formQuotaEnd ? `${e.target.value}-${m}` : e.target.value ? `${e.target.value}-01` : "");
                  }}
                  className="h-9 w-24 rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none"
                >
                  <option value="">Año</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <select
                value={formGroupId}
                onChange={(e) => setFormChargeGroupId(e.target.value)}
                className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
              >
                <option value={ordinaryGroup.id}>Ordinaria</option>
                <option value={extraordinaryGroup.id}>Extraordinaria</option>
              </select>
              <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-bold uppercase tracking-widest text-brand-accent/60">Categoría Base</label>
            </div>
            <Input 
              label="Orden de Visualización" 
              type="number" 
              value={formOrder} 
              onChange={(e) => setFormOrder(e.target.value)} 
            />
          </div>

          <div className="p-3 bg-canvas/30 rounded border border-line/50">
            <div className="flex items-center gap-2 mb-1.5">
              <ArrowUpDown className="h-3 w-3 text-ink-soft/40" />
              <p className="text-[9px] font-bold uppercase text-ink-soft/60 tracking-widest">Información de clasificación</p>
            </div>
            <p className="text-[11px] text-ink-soft/70 leading-relaxed italic">
              La categoría base determina en qué sección del <strong>Resumen Financiero</strong> se agrupará este concepto.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
