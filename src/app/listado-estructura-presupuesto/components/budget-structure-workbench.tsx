"use client";

import React, { useState, useTransition, useMemo } from "react";
import { 
  Edit2, 
  Trash2, 
  Plus, 
  Layers,
  X,
  GripVertical,
  Info
} from "lucide-react";
import type { BudgetGroupVM } from "@/modules/budget/domain/budget-structure.types";
import { 
  deleteBudgetGroupAction, 
  deleteBudgetConceptAction, 
  saveBudgetGroupAction 
} from "../../presupuestos/actions";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/utils/cn";

interface WorkbenchProps {
  initialGroups: BudgetGroupVM[];
  year: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  ADMINISTRATION: "Administración",
  MAINTENANCE: "Mantenimiento",
  SECURITY: "Seguridad",
  INFRASTRUCTURE: "Infraestructura",
  EXTRAORDINARY: "Extraordinario",
  OTHER: "Otros"
};

export function BudgetStructureWorkbench({ initialGroups, year }: WorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("MAINTENANCE");
  const [formConcepts, setFormConcepts] = useState<{ id: string; name: string }[]>([]);

  const filteredGroups = useMemo(() => {
    const term = search.toLowerCase().trim();
    return initialGroups.filter(g => !term || g.name.toLowerCase().includes(term));
  }, [initialGroups, search]);

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormCategory("MAINTENANCE");
    setFormConcepts([]);
    setIsModalOpen(true);
  };

  const openEditModal = (group: BudgetGroupVM) => {
    setEditingId(group.id);
    setFormName(group.name);
    setFormCategory(group.category);
    setFormConcepts(group.concepts.map(c => ({ id: c.id, name: c.name })));
    setIsModalOpen(true);
  };

  const handleAddConcept = () => {
    setFormConcepts([...formConcepts, { id: "", name: "" }]);
  };

  const handleRemoveConcept = (index: number) => {
    const concept = formConcepts[index];
    if (concept.id) {
       if(!confirm("¿Eliminar concepto permanentemente?")) return;
       startTransition(async () => {
         const res = await deleteBudgetConceptAction(concept.id);
         if(res.success) setFormConcepts(prev => prev.filter((_, i) => i !== index));
         else alert(res.error);
       });
    } else {
      setFormConcepts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleConceptChange = (index: number, name: string) => {
    const next = [...formConcepts];
    next[index].name = name;
    setFormConcepts(next);
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveBudgetGroupAction({
        id: editingId || undefined,
        year,
        name: formName,
        category: formCategory,
        concepts: formConcepts.map(c => ({ id: c.id || undefined, name: c.name }))
      });

      if (res.success) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  };

  const handleDeleteGroup = (id: string) => {
    if (!confirm("¿Eliminar este grupo y todos sus conceptos? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      const res = await deleteBudgetGroupAction(id);
      if (res.success) window.location.reload();
      else alert(res.error);
    });
  };

  const columns: DataTableColumn<BudgetGroupVM>[] = [
    {
      header: "Grupo Presupuestal",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-brand">{row.name}</span>
          <span className="text-[9px] font-bold uppercase text-ink-soft/40 tracking-widest">{CATEGORY_LABELS[row.category] || row.category}</span>
        </div>
      )
    },
    {
      header: "Conceptos / Partidas",
      accessorKey: "concepts",
      cell: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[400px]">
          {row.concepts.map(c => (
            <Badge key={c.id} variant="outline" className="bg-canvas/30 py-0 px-1.5 h-4 normal-case font-medium text-ink-soft">
              {c.name}
            </Badge>
          ))}
          {row.concepts.length === 0 && <span className="text-[10px] text-ink-soft/30 italic">Sin conceptos</span>}
        </div>
      )
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
          <button onClick={() => handleDeleteGroup(row.id)} className="p-1.5 rounded hover:bg-danger/10 text-ink-soft/40 hover:text-danger transition-standard">
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
          {initialGroups.length} Grupos definidos para {year}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="brand">Estructura Editable</Badge>
        </div>
      </div>

      <DataTable
        title="Catálogo de Estructura"
        count={filteredGroups.length}
        data={filteredGroups}
        columns={columns}
        onSearch={setSearch}
        onAdd={openAddModal}
        addLabel="Nuevo Grupo"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Configurar Grupo" : "Nuevo Grupo"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-bold uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !formName} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-bold uppercase"
            >
              {isPending ? "Guardando..." : "Guardar Estructura"}
            </Button>
          </>
        }
      >
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre del Grupo" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej. Gastos de Limpieza" />
            <div className="relative">
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
              <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-bold uppercase tracking-widest text-brand-accent/60">Categoría Contable</label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60">Conceptos / Partidas</p>
              <button onClick={handleAddConcept} className="text-[9px] font-bold text-brand-accent flex items-center gap-1 uppercase hover:underline">
                <Plus className="h-3 w-3" /> Agregar Partida
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {formConcepts.map((concept, idx) => (
                <div key={idx} className="flex items-center gap-2 group/row">
                  <div className="h-9 w-8 flex items-center justify-center bg-canvas/30 rounded border border-dashed border-line text-ink-soft/20">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={concept.name}
                      onChange={(e) => handleConceptChange(idx, e.target.value)}
                      placeholder="Nombre del concepto..."
                      className="h-9 w-full bg-card border border-line rounded px-3 text-[13px] font-medium focus:border-brand-accent outline-none transition-colors"
                    />
                  </div>
                  <button onClick={() => handleRemoveConcept(idx)} className="h-9 w-9 flex items-center justify-center rounded hover:bg-danger/10 text-ink-soft/30 hover:text-danger transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {formConcepts.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center bg-canvas/20 rounded-lg border border-dashed border-line/50">
                  <Plus className="h-6 w-6 text-ink-soft/20 mb-1" />
                  <p className="text-[10px] font-bold text-ink-soft/40 uppercase">Sin partidas asignadas</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-brand-mint/20 rounded border border-brand-mint/30 flex gap-2">
            <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-brand/70 leading-tight uppercase tracking-tight">
              Los cambios en los nombres de los conceptos se reflejarán en todos los meses del presupuesto {year}. 
              Eliminar conceptos con datos previos puede afectar el histórico.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
