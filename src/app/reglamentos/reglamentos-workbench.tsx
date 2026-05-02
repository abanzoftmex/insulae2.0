"use client";

import React, { useState, useTransition, useMemo } from "react";
import { 
  FileText, 
  Plus, 
  ExternalLink, 
  Edit2, 
  Trash2, 
  FileDown, 
  Upload, 
  Loader2,
  Layers,
  Info
} from "lucide-react";
import type { RegulationDirectoryVM, RegulationDocumentVM } from "@/modules/regulations/presentation/regulation-directory.vm";
import { 
  createRegulationDocumentAction, 
  updateRegulationDocumentAction, 
  archiveRegulationDocumentAction 
} from "./actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/shared/utils/cn";

export function ReglamentosWorkbench({ directory }: { directory: RegulationDirectoryVM }) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<any>("REGLAMENTO_GRAL");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const filteredDocuments = useMemo(() => {
    const term = search.toLowerCase().trim();
    return directory.documents.filter(d => {
      const byType = typeFilter === "all" || d.documentType === typeFilter;
      const bySearch = !term || d.name.toLowerCase().includes(term);
      return byType && bySearch;
    });
  }, [directory.documents, search, typeFilter]);

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormType("REGLAMENTO_GRAL");
    setFormFileUrl("");
    setIsModalOpen(true);
  };

  const openEditModal = (doc: RegulationDocumentVM) => {
    setEditingId(doc.id);
    setFormName(doc.name);
    setFormType(doc.documentType);
    setFormFileUrl(doc.publicUrl);
    setIsModalOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadCondominiumAsset({
        file,
        condominiumSlug: directory.condominiumSlug,
        projectId: "regulations",
        kind: "project-document"
      });
      setFormFileUrl(res.url);
    } catch {
      alert("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload = {
        id: editingId || undefined,
        name: formName,
        documentType: formType,
        fileUrl: formFileUrl
      };

      const res = editingId 
        ? await updateRegulationDocumentAction(payload)
        : await createRegulationDocumentAction(payload);

      if (res.ok) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Archivar este documento? Ya no será visible para los residentes.")) return;
    startTransition(async () => {
      const res = await archiveRegulationDocumentAction(id);
      if (res.ok) window.location.reload();
      else alert(res.message);
    });
  };

  const columns: DataTableColumn<RegulationDocumentVM>[] = [
    {
      header: "Documento",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded bg-brand/5 flex items-center justify-center text-brand shrink-0 border border-brand/5">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
             <p className="font-bold truncate leading-tight">{row.name}</p>
             <p className="text-[10px] text-ink-soft/40 uppercase tracking-widest font-black mt-0.5">{row.uploadedAtLabel}</p>
          </div>
        </div>
      )
    },
    {
      header: "Tipo",
      accessorKey: "documentTypeLabel",
      cell: (row) => (
        <Badge variant={row.documentType === "REGULATION" ? "brand" : "outline"} className="h-5 px-2">
          {row.documentTypeLabel}
        </Badge>
      )
    },
    {
      header: "Archivo",
      accessorKey: "fileUrl",
      cell: (row) => (
        <a 
          href={row.publicUrl}
          target="_blank" 
          rel="noreferrer" 
          className="inline-flex items-center gap-1 text-[11px] font-black text-brand-accent hover:underline uppercase tracking-tight"
        >
          Visualizar <ExternalLink className="h-2.5 w-2.5" />
        </a>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Documentos Totales" value={directory.totalDocuments} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard label="Reglamentos" value={directory.totalRegulations} icon={<FileText className="h-3.5 w-3.5" />} />
        <StatCard label="Documentos Internos" value={directory.totalInternalDocuments} icon={<Info className="h-3.5 w-3.5" />} />
      </div>

      <div className="flex items-center justify-between gap-4 mt-2">
         <div className="flex items-center gap-2">
            <Button 
              variant={typeFilter === "all" ? "primary" : "outline"} 
              size="sm" 
              onClick={() => setTypeFilter("all")}
              className="h-7 text-[10px] uppercase font-black"
            >
              Todos
            </Button>
            <Button 
              variant={typeFilter === "REGLAMENTO_GRAL" ? "primary" : "outline"} 
              size="sm" 
              onClick={() => setTypeFilter("REGLAMENTO_GRAL")}
              className="h-7 text-[10px] uppercase font-black"
            >
              Reglamentos
            </Button>
            <Button 
              variant={typeFilter === "DOCUMENTO_INTERNO" ? "primary" : "outline"} 
              size="sm" 
              onClick={() => setTypeFilter("DOCUMENTO_INTERNO")}
              className="h-7 text-[10px] uppercase font-black"
            >
              Internos
            </Button>
         </div>
      </div>

      <DataTable
        title="Repositorio de Documentos"
        count={filteredDocuments.length}
        data={filteredDocuments}
        columns={columns}
        onSearch={setSearch}
        onAdd={openAddModal}
        addLabel="Nuevo Documento"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Documento" : "Subir Documento"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-black uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !formName || !formFileUrl} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-black uppercase"
            >
              {isPending ? "Procesando..." : "Guardar Documento"}
            </Button>
          </>
        }
      >
        <div className="space-y-6 pt-2">
          <Input 
            label="Título del Documento" 
            value={formName} 
            onChange={(e) => setFormName(e.target.value)} 
            placeholder="Ej. Reglamento de Convivencia v2"
          />

          <div className="relative">
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as any)}
              className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
            >
              <option value="REGLAMENTO_GRAL">Reglamento General (Público)</option>
              <option value="DOCUMENTO_INTERNO">Documento Interno / Manual</option>
            </select>
            <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60">Categoría</label>
          </div>

          <div className="pt-2 border-t border-line/50">
             <p className="text-[10px] font-black uppercase text-ink-soft/40 tracking-widest mb-3">Archivo Digital (PDF)</p>
             {formFileUrl ? (
               <div className="flex items-center justify-between p-3 bg-canvas/40 rounded-lg border border-line/50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand" />
                    <span className="text-[12px] font-bold text-ink truncate max-w-[200px]">{formName || "Archivo cargado"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <a href={formFileUrl} target="_blank" className="p-1.5 rounded hover:bg-canvas text-brand transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>
                     <button onClick={() => setFormFileUrl("")} className="p-1.5 rounded hover:bg-danger/10 text-danger transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
               </div>
             ) : (
               <label className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line rounded-xl cursor-pointer hover:bg-canvas transition-colors group">
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin text-brand/40" /> : <Upload className="h-6 w-6 text-brand/20 group-hover:text-brand transition-colors" />}
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-brand-accent">Click para subir PDF</p>
                    <p className="text-[9px] font-bold text-ink-soft/40 uppercase tracking-tighter">Máximo 10MB</p>
                  </div>
                  <input type="file" className="hidden" accept="application/pdf" onChange={handleUpload} />
               </label>
             )}
          </div>

          <div className="p-3 bg-brand-deep/[0.02] border border-line rounded flex gap-2">
            <Info className="h-4 w-4 text-brand-accent shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-ink-soft/60 leading-tight uppercase tracking-tight">
              Los reglamentos generales son visibles en la sección informativa del portal de residentes. Los documentos internos solo son accesibles para administración.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
