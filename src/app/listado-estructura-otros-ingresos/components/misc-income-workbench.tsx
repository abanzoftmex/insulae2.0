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
  const [formGroupId, setFormChargeGroupId] = useState(ordinaryGroup.id);
  const [formOrder, setFormOrder] = useState("0");

  const filteredConcepts = useMemo(() => {
    const term = search.toLowerCase().trim();
    return initialConcepts.filter(c => !term || c.name.toLowerCase().includes(term));
  }, [initialConcepts, search]);

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormChargeGroupId(ordinaryGroup.id);
    setFormOrder(String(initialConcepts.length));
    setIsModalOpen(true);
  };

  const openEditModal = (concept: MiscIncomeConcept) => {
    setEditingId(concept.id);
    setFormName(concept.name);
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
      header: "Categoría Base",
      accessorKey: "chargeGroupId",
      cell: (row) => (
        <Badge variant={row.chargeGroupId === ordinaryGroup.id ? "brand" : "warning"}>
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
      header: "Acción",
      accessorKey: "id",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEditModal(row)} className="p-1.5 rounded hover:bg-canvas text-ink-soft/40 hover:text-brand transition-standard">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded hover:bg-danger/10 text-ink-soft/40 hover:text-danger transition-standard">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-7 px-3 flex items-center justify-center rounded bg-brand/5 border border-brand/10 text-brand text-[9px] font-black uppercase tracking-tighter">
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
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-black uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !formName} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-black uppercase"
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
            <div className="relative">
              <select
                value={formGroupId}
                onChange={(e) => setFormChargeGroupId(e.target.value)}
                className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
              >
                <option value={ordinaryGroup.id}>Ordinaria</option>
                <option value={extraordinaryGroup.id}>Extraordinaria</option>
              </select>
              <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60">Categoría Base</label>
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
              <p className="text-[9px] font-black uppercase text-ink-soft/60 tracking-widest">Información de clasificación</p>
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
