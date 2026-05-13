"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  MessageSquare, 
  ImageIcon, 
  FileText,
  ExternalLink,
  Loader2
} from "lucide-react";
import type { TicketRowVM, TicketResponseFormVM } from "@/modules/tickets/presentation/ticket-listing.vm";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { getTicketResponseFormDataAction, saveTicketResponseAction } from "./actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { cn } from "@/shared/utils/cn";

interface TicketsWorkbenchProps {
  initialRows: TicketRowVM[];
  condominiumSlug: string;
}

export function TicketsWorkbench({ initialRows, condominiumSlug }: TicketsWorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [formData, setFormData] = useState<TicketResponseFormVM | null>(null);
  
  // Form State
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<string>("");
  const [responseImageUrl, setResponseImageUrl] = useState<string | null>(null);
  const [responsePdfUrl, setResponsePdfUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialRows.filter(r => !q || [r.ticketNumber, r.title, r.residentName, r.departmentName].some(f => f.toLowerCase().includes(q)));
  }, [initialRows, search]);

  const openResponseModal = async (id: string) => {
    setIsLoadingForm(true);
    setIsModalOpen(true);
    const data = await getTicketResponseFormDataAction(id);
    if (data) {
      setFormData(data);
      setResponse(data.snapshot.response || "");
      setStatus(data.snapshot.status);
      setResponseImageUrl(data.snapshot.responseImageUrl);
      setResponsePdfUrl(data.snapshot.responsePdfUrl);
    }
    setIsLoadingForm(false);
  };

  const handleUpload = async (file: File, type: 'image' | 'pdf') => {
    setUploading(type);
    try {
      const res = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId: "tickets",
        kind: type === 'image' ? "ticket-response-image" : "ticket-response-pdf"
      });
      if (type === 'image') setResponseImageUrl(res.url);
      else setResponsePdfUrl(res.url);
    } catch (e) {
      alert("Error al subir archivo");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = () => {
    if (!formData) return;
    startTransition(async () => {
      const res = await saveTicketResponseAction({
        id: formData.snapshot.id,
        response,
        status: status as any,
        responseImageUrl,
        responsePdfUrl
      });
      if (res.ok) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.message);
      }
    });
  };

  const columns: DataTableColumn<TicketRowVM>[] = [
    {
      header: "Ticket",
      accessorKey: "ticketNumber",
      cell: (row) => <span className="font-mono font-bold text-base text-brand-accent">#{row.ticketNumber}</span>
    },
    {
      header: "Asunto",
      accessorKey: "title",
      cell: (row) => (
        <div className="max-w-60">
          <p className="font-bold text-sm leading-tight">{row.title}</p>
          <p className="text-xs text-ink-soft uppercase tracking-tighter mt-0.5">{row.departmentName}</p>
        </div>
      )
    },
    {
      header: "Residente",
      accessorKey: "residentName",
      cell: (row) => <span className="text-sm font-medium">{row.residentName}</span>
    },
    {
      header: "Fecha",
      accessorKey: "openedAtLabel",
      cell: (row) => <span className="text-xs text-ink-soft">{row.openedAtLabel}</span>
    },
    {
      header: "Estado",
      accessorKey: "statusLabel",
      cell: (row) => (
        <Badge variant={row.statusTone === "open" ? "success" : "default"} className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
          {row.statusLabel}
        </Badge>
      )
    },
    {
      header: "Acción",
      accessorKey: "id",
      align: "right",
      cell: (row) => (
        <Button 
          variant="dark" 
          size="sm" 
          onClick={() => openResponseModal(row.id)}
          className="h-8 px-4 text-[10px] font-bold uppercase gap-1.5 rounded-full shadow-md shadow-brand-deep/25"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Atender
        </Button>
      )
    }
  ];

  return (
    <>
      <DataTable
        title="Mesa de Ayuda"
        count={filteredRows.length}
        data={filteredRows}
        columns={columns}
        onSearch={setSearch}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData ? `Ticket #${formData.snapshot.ticketNumber}` : "Cargando..."}
        size="lg"
        footer={
          formData && !isLoadingForm && (
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-bold uppercase">Cancelar</Button>
              <Button 
                disabled={isPending || !!uploading || !response} 
                onClick={handleSave}
                className="h-8 px-6 text-[10px] font-bold uppercase"
              >
                {isPending ? "Guardando..." : "Guardar Respuesta"}
              </Button>
            </>
          )
        }
      >
        {isLoadingForm ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-brand/40">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Obteniendo detalles...</p>
          </div>
        ) : formData && (
          <div className="space-y-5">
            {/* Info Section */}
            <div className="bg-canvas/50 rounded-lg p-3 border border-line/50 grid grid-cols-2 gap-y-3 gap-x-6">
              <div>
                <p className="text-xs font-bold uppercase text-ink-soft/70 tracking-widest">Residente</p>
                <p className="text-sm font-bold text-ink leading-tight">{formData.snapshot.residentName}</p>
                <p className="text-xs text-ink-soft">{formData.snapshot.residentEmail || "Sin email"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-ink-soft/70 tracking-widest">Departamento</p>
                <p className="text-sm font-bold text-brand leading-tight">{formData.snapshot.departmentName}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-line/30">
                <p className="text-xs font-bold uppercase text-ink-soft/70 tracking-widest mb-1">Descripción del Problema</p>
                <p className="text-sm font-medium text-ink bg-card p-2.5 rounded border border-line/30 italic">
                  &quot;{formData.snapshot.description}&quot;
                </p>
              </div>
            </div>

            {/* Response Section */}
            <div className="space-y-4">
              <Textarea 
                label="Respuesta Operativa" 
                value={response} 
                onChange={(e) => setResponse(e.target.value)} 
                className="min-h-30"
              />

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-ink-soft/70 tracking-widest">Cambiar Estado</p>
                <div className="flex flex-wrap gap-2">
                  {formData.statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all uppercase tracking-tighter",
                        status === opt.value 
                          ? "bg-brand text-white border-brand shadow-lg scale-105" 
                          : "bg-card text-ink-soft border-line hover:border-brand/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Evidence */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-line/50">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-ink-soft/70 tracking-widest">Evidencia Visual</p>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id="img-upload" 
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'image')}
                    />
                    <label 
                      htmlFor="img-upload" 
                      className="flex items-center justify-center gap-2 h-9 border border-dashed border-line rounded-md cursor-pointer hover:bg-canvas transition-colors text-[10px] font-bold uppercase text-brand-accent"
                    >
                      {uploading === 'image' ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      {responseImageUrl ? "Cambiar Imagen" : "Subir Imagen"}
                    </label>
                    {responseImageUrl && (
                      <a href={responseImageUrl} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold text-brand hover:underline">
                        <ExternalLink className="h-3 w-3" /> Ver imagen
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-ink-soft/70 tracking-widest">Documento PDF</p>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      className="hidden" 
                      id="pdf-upload" 
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'pdf')}
                    />
                    <label 
                      htmlFor="pdf-upload" 
                      className="flex items-center justify-center gap-2 h-9 border border-dashed border-line rounded-md cursor-pointer hover:bg-canvas transition-colors text-[10px] font-bold uppercase text-brand-accent"
                    >
                      {uploading === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      {responsePdfUrl ? "Cambiar PDF" : "Subir PDF"}
                    </label>
                    {responsePdfUrl && (
                      <a href={responsePdfUrl} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold text-brand hover:underline">
                        <ExternalLink className="h-3 w-3" /> Ver PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
