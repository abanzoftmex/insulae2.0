"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Map as MapIcon,
  Loader2,
  Info
} from "lucide-react";
import type { ZoneRowVM } from "@/modules/zones/presentation/zone-listing.vm";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getZoneFormDataAction, saveZoneAction } from "./actions";

interface ZonesWorkbenchProps {
  initialRows: ZoneRowVM[];
}

export function ZonesWorkbench({ initialRows }: ZonesWorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialRows.filter(r => !q || [r.name, r.initials].some(f => f.toLowerCase().includes(q)));
  }, [initialRows, search]);

  const openAddModal = () => {
    setEditingId(null);
    setName("");
    setInitials("");
    setIsModalOpen(true);
  };

  const openEditModal = async (id: string) => {
    setEditingId(id);
    setIsLoadingForm(true);
    setIsModalOpen(true);
    const data = await getZoneFormDataAction(id);
    if (data) {
      setName(data.name);
      setInitials(data.initials || "");
    }
    setIsLoadingForm(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveZoneAction({
        id: editingId || undefined,
        name,
        initials
      });
      if (res.ok) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.message);
      }
    });
  };

  const columns: DataTableColumn<ZoneRowVM>[] = [
    {
      header: "Barrio",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <MapIcon className="h-3.5 w-3.5 text-brand/30" />
          <span className="font-bold">{row.name}</span>
        </div>
      )
    },
    {
      header: "Iniciales",
      accessorKey: "initials",
      cell: (row) => (
        <Badge variant="brand">
          {row.initials}
        </Badge>
      )
    },
    {
      header: "Subzonas",
      accessorKey: "activeSubzones",
      align: "center",
      cell: (row) => (
        <span className="px-2 py-0.5 rounded bg-canvas text-[11px] font-bold text-ink-soft/70">
          {row.activeSubzones}
        </span>
      )
    },
    {
      header: "Acción",
      accessorKey: "id",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button 
            onClick={() => openEditModal(row.id)}
            className="p-1.5 rounded hover:bg-canvas text-ink-soft/40 hover:text-brand transition-standard"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          {row.canDelete && (
            <button 
              className="p-1.5 rounded hover:bg-danger/10 text-ink-soft/40 hover:text-danger transition-standard"
              onClick={() => alert("Eliminación disponible en la siguiente versión")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <DataTable
        title="Catálogo de Barrios"
        count={filteredRows.length}
        data={filteredRows}
        columns={columns}
        onSearch={setSearch}
        onAdd={openAddModal}
        addLabel="Nuevo Barrio"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Barrio" : "Nuevo Barrio"}
        footer={
          !isLoadingForm && (
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-bold uppercase">Cancelar</Button>
              <Button 
                disabled={isPending || !name} 
                onClick={handleSave}
                className="h-8 px-6 text-[10px] font-bold uppercase"
              >
                {isPending ? "Guardando..." : "Guardar Barrio"}
              </Button>
            </>
          )
        }
      >
        {isLoadingForm ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-brand/40">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Cargando datos...</p>
          </div>
        ) : (
          <div className="space-y-5">
            <Input 
              label="Nombre del Barrio" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ej. Barrio de la Luz"
            />
            <Input 
              label="Iniciales" 
              value={initials} 
              onChange={(e) => setInitials(e.target.value)} 
              placeholder="Ej. BL"
              maxLength={5}
            />

            <div className="flex gap-2 p-3 bg-canvas/40 rounded-md border border-line/30">
              <Info className="h-4 w-4 text-brand-accent shrink-0 mt-0.5" />
              <p className="text-[11px] text-ink-soft/70 leading-relaxed italic">
                Las iniciales se utilizan para códigos internos y reportes rápidos. Recomendado 2 o 3 caracteres.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
