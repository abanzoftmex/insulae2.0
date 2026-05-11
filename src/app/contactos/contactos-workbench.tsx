"use client";

import { useMemo, useState, useTransition } from "react";
import { 
  Edit2, 
  Trash2, 
  Phone, 
  Mail
} from "lucide-react";
import {
  createContactAction,
  deleteContactAction,
  updateContactAction,
  type ContactEntryInput,
} from "./actions";
import type {
  ContactDirectoryEntryVM,
  ContactDirectoryTypeVM,
} from "@/modules/contacts/presentation/contact-directory.vm";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";
import { ExternalLinkButton } from "@/components/ui/external-link-button";

interface ContactosWorkbenchProps {
  types: ContactDirectoryTypeVM[];
  entries: ContactDirectoryEntryVM[];
}

function createEmptyForm(types: ContactDirectoryTypeVM[]): ContactEntryInput {
  return {
    typeId: types[0]?.id ?? "",
    name: "",
    value: "",
    linkUrl: "",
    target: "SAME_TAB",
    sortOrder: "0",
  };
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export function ContactosWorkbench({ types, entries }: ContactosWorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContactEntryInput>(createEmptyForm(types));

  const filteredEntries = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((e) => {
      const byType = typeFilter === "all" || e.typeId === typeFilter;
      const bySearch = !q || [e.name, e.value, e.typeName].some(f => f.toLowerCase().includes(q));
      return byType && bySearch;
    });
  }, [entries, search, typeFilter]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(createEmptyForm(types));
    setIsModalOpen(true);
  };

  const openEditModal = (entry: ContactDirectoryEntryVM) => {
    setEditingId(entry.id);
    setFormData({
      id: entry.id,
      typeId: entry.typeId,
      name: entry.name,
      value: entry.value,
      linkUrl: entry.linkUrl,
      target: entry.linkTarget,
      sortOrder: String(entry.sortOrder),
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload = { ...formData, linkUrl: normalizeUrl(formData.linkUrl) };
      const res = editingId 
        ? await updateContactAction({ ...payload, id: editingId })
        : await createContactAction(payload);
      
      if (res.ok) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este contacto?")) return;
    startTransition(async () => {
      const res = await deleteContactAction(id);
      if (res.ok) window.location.reload();
      else alert(res.message);
    });
  };

  const columns: DataTableColumn<ContactDirectoryEntryVM>[] = [
    {
      header: "Tipo",
      accessorKey: "typeName",
      cell: (row) => (
        <Badge variant={row.typeId === "phone" ? "success" : "brand"} className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
          {row.typeName}
        </Badge>
      )
    },
    {
      header: "Nombre",
      accessorKey: "name",
      cell: (row) => <span className="font-bold">{row.name}</span>
    },
    {
      header: "Dato / Valor",
      accessorKey: "value",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.value.includes("@") ? <Mail className="h-3.5 w-3.5 text-ink-soft/60" /> : <Phone className="h-3.5 w-3.5 text-ink-soft/60" />}
          <span className="text-[11px] font-medium text-ink-soft">{row.value}</span>
        </div>
      )
    },
    {
      header: "Enlace",
      accessorKey: "linkUrl",
      cell: (row) => row.linkUrl ? (
        <ExternalLinkButton href={row.linkUrl} label="Ir" />
      ) : <span className="text-ink-soft/50 text-[10px]">—</span>
    },
    {
      header: "Orden",
      accessorKey: "sortOrder",
      align: "center",
      cell: (row) => <span className="text-[11px] font-medium text-ink-soft/70">{row.sortOrder}</span>
    },
    {
      header: "Acciones",
      accessorKey: "id",
      align: "right",
      cell: (row) => (
        <RowActions onEdit={() => openEditModal(row)} onDelete={() => handleDelete(row.id)} />
      )
    }
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button 
            variant={typeFilter === "all" ? "primary" : "outline"} 
            size="sm" 
            onClick={() => setTypeFilter("all")}
            className="h-7 text-[10px] uppercase font-bold"
          >
            Todos
          </Button>
          {types.map(t => (
            <Button 
              key={t.id}
              variant={typeFilter === t.id ? "primary" : "outline"} 
              size="sm" 
              onClick={() => setTypeFilter(t.id)}
              className="h-7 text-[10px] uppercase font-bold whitespace-nowrap"
            >
              {t.name}
            </Button>
          ))}
        </div>
      </div>

      <DataTable
        title="Directorio de Contactos"
        count={filteredEntries.length}
        data={filteredEntries}
        columns={columns}
        onSearch={setSearch}
        onAdd={openAddModal}
        addLabel="Nuevo Contacto"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Contacto" : "Nuevo Contacto"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-bold uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !formData.name || !formData.value} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-bold uppercase"
            >
              {isPending ? "Guardando..." : (editingId ? "Guardar Cambios" : "Crear Contacto")}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <select
                value={formData.typeId}
                onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none"
              >
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-bold uppercase tracking-widest text-brand-accent/60">Categoría</label>
            </div>
            <Input 
              label="Orden" 
              type="number"
              value={formData.sortOrder} 
              onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })} 
            />
          </div>
          
          <Input 
            label="Nombre del Contacto" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
          
          <Input 
            label="Dato (Email, Teléfono, etc.)" 
            value={formData.value} 
            onChange={(e) => setFormData({ ...formData, value: e.target.value })} 
          />

          <div className="space-y-3 pt-2 border-t border-line/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/40">Acción de Enlace (Opcional)</p>
            <Input 
              label="URL de Enlace" 
              placeholder="https://"
              value={formData.linkUrl} 
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })} 
            />
            <div className="relative">
              <select
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value as any })}
                className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none"
              >
                <option value="SAME_TAB">Abrir en misma pestaña</option>
                <option value="NEW_TAB">Abrir en nueva pestaña</option>
              </select>
              <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-bold uppercase tracking-widest text-brand-accent/60">Destino</label>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
