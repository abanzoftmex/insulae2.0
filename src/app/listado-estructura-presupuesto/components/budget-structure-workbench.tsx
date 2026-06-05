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
import { StatCard } from "@/components/ui/stat-card";
import { useRouter } from "next/navigation";

interface WorkbenchProps {
  initialGroups: BudgetGroupVM[];
  year: number;
}



export function BudgetStructureWorkbench({ initialGroups, year }: WorkbenchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const term = search.toLowerCase().trim();
    return initialGroups.filter(g => !term || g.name.toLowerCase().includes(term));
  }, [initialGroups, search]);

  const openAddModal = () => {
    router.push("/listado-estructura-presupuesto/grupo/nuevo");
  };

  const openEditModal = (group: BudgetGroupVM) => {
    router.push(`/listado-estructura-presupuesto/grupo/${group.id}`);
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
          <span className="text-[9px] font-bold uppercase text-ink-soft/40 tracking-widest">{row.category}</span>
        </div>
      )
    },
    {
      header: "Conceptos / Partidas",
      accessorKey: "concepts",
      cell: (row) => (
        <div className="flex flex-wrap gap-1 max-w-100">
          {row.concepts.map(c => (
            <Badge key={c.id} variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
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
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors"
            title="Editar"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDeleteGroup(row.id)}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
        <StatCard accent="brand" label={`Grupos definidos • ${year}`} value={initialGroups.length} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard accent="cyan" label="Total de Partidas" value={initialGroups.reduce((s, g) => s + g.concepts.length, 0)} icon={<Layers className="h-3.5 w-3.5" />} />
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
    </>
  );
}
