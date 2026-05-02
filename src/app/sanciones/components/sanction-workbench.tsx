"use client";

import React, { useState, useTransition, useMemo } from "react";
import { 
  Edit2, 
  Trash2, 
  Plus, 
  Scale,
  Gavel,
  Info,
  Layers
} from "lucide-react";
import type { Sanction } from "@/modules/sanction/domain/sanction.types";
import { createSanctionAction, updateSanctionAction, deleteSanctionAction } from "../actions";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
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
          <Gavel className="h-3.5 w-3.5 text-brand/30" />
          <span className="font-bold text-brand">{row.name}</span>
        </div>
      )
    },
    {
      header: "Fundamento Legal",
      accessorKey: "article",
      cell: (row) => row.article ? (
        <Badge variant="brand" className="normal-case py-0 h-5 px-2 bg-brand/5 border-brand/10">
          <Scale className="h-2.5 w-2.5 mr-1 opacity-50" />
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
          {initialSanctions.length} Tipos de sanciones
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="success">Catálogo Operativo</Badge>
        </div>
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
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-black uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !formName} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-black uppercase"
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

          <div className="p-3 bg-brand-deep/[0.02] border border-line rounded italic text-[11px] text-ink-soft/60">
            Los nombres cortos y claros facilitan la lectura en el estado de cuenta del residente.
          </div>
        </div>
      </Modal>
    </>
  );
}
