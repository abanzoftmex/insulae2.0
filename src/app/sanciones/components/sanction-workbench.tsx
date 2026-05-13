"use client";

import React, { useState, useTransition, useMemo } from "react";
import { 
  Edit2, 
  Trash2, 
  Plus, 
  Scale,
  Info,
  Layers,
  Gavel
} from "lucide-react";
import type { Sanction } from "@/modules/sanction/domain/sanction.types";
import { createSanctionAction, updateSanctionAction, deleteSanctionAction } from "../actions";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

interface WorkbenchProps {
  initialSanctions: Sanction[];
}

export function SanctionWorkbench({ initialSanctions }: WorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formName, setFormName] = useState("");
  const [formArticle, setFormArticle] = useState("");

  const filteredSanctions = useMemo(() => {
    const term = search.toLowerCase().trim();
    return initialSanctions.filter(s => 
      !term || [s.name, s.article || ""].some(f => f.toLowerCase().includes(term))
    );
  }, [initialSanctions, search]);

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormArticle("");
    setIsModalOpen(true);
  };

  const openEditModal = (sanction: Sanction) => {
    setEditingId(sanction.id);
    setFormName(sanction.name);
    setFormArticle(sanction.article || "");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload = { name: formName, article: formArticle || null };
      const res = editingId 
        ? await updateSanctionAction({ ...payload, id: editingId })
        : await createSanctionAction(payload);

      if (res.success) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este tipo de sanción?")) return;
    startTransition(async () => {
      const res = await deleteSanctionAction(id);
      if (res.success) window.location.reload();
      else alert(res.error);
    });
  };

  const columns: DataTableColumn<Sanction>[] = [
    {
      header: "Descripción de la Sanción",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant="brand" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest shrink-0">
            Sanción
          </Badge>
          <span className="font-bold text-sm text-ink">{row.name}</span>
        </div>
      )
    },
    {
      header: "Fundamento Legal",
      accessorKey: "article",
      cell: (row) => row.article ? (
        <Badge variant="warning" className="rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide normal-case gap-1.5">
          <Scale className="h-3.5 w-3.5 opacity-60 shrink-0" />
          {row.article}
        </Badge>
      ) : (
        <span className="text-[10px] text-ink-soft/30 italic">Sin asignar</span>
      )
    },
    {
      header: "Acción",
      accessorKey: "id",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEditModal(row)} className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => handleDelete(row.id)} disabled={isPending} className="h-8 w-8 flex items-center justify-center rounded-full bg-danger/15 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <StatCard accent="brand" label="Tipos de Sanción" value={initialSanctions.length} icon={<Gavel className="h-3.5 w-3.5" />} />
      </div>

      <DataTable
        title="Configuración de Sanciones"
        count={filteredSanctions.length}
        data={filteredSanctions}
        columns={columns}
        onSearch={setSearch}
        onAdd={openAddModal}
        addLabel="Nueva Sanción"
      />

      <div className="p-4 bg-canvas/40 border border-line/30 rounded-md mt-4 flex gap-3">
        <Info className="h-4 w-4 text-brand-accent shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-ink-soft/60 leading-tight uppercase tracking-tight">Guía de administración</p>
          <p className="text-[11px] text-ink-soft/70 leading-relaxed italic">
            El catálogo de sanciones define los cargos aplicables por infracciones al reglamento. 
            Es vital incluir el fundamento legal (artículo) para dar validez jurídica al cobro.
          </p>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Sanción" : "Nueva Sanción"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-bold uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !formName} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-bold uppercase"
            >
              {isPending ? "Guardando..." : "Guardar Registro"}
            </Button>
          </>
        }
      >
        <div className="space-y-5 pt-2">
          <Input 
            label="Nombre / Descripción de la Infracción" 
            value={formName} 
            onChange={(e) => setFormName(e.target.value)} 
            placeholder="Ej. Ruido excesivo después de las 11:00 PM"
          />

          <Input 
            label="Artículo de Referencia (Reglamento)" 
            value={formArticle} 
            onChange={(e) => setFormArticle(e.target.value)} 
            placeholder="Ej. Artículo 45, Inciso B"
          />

          <div className="p-3 bg-brand-deep/2 border border-line rounded italic text-[11px] text-ink-soft/60">
            Los nombres cortos y claros facilitan la lectura en el estado de cuenta del residente.
          </div>
        </div>
      </Modal>
    </>
  );
}
