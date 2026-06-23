"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  MessageSquare, 
  ImageIcon, 
  FileText,
  ExternalLink,
  Loader2,
  Plus,
  Trash2
} from "lucide-react";
import type { TicketRowVM, TicketResponseFormVM } from "@/modules/tickets/presentation/ticket-listing.vm";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import { getTicketResponseFormDataAction, saveTicketResponseAction, createTicketAction } from "./actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { cn } from "@/shared/utils/cn";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { generateForm86Pdf, type Form86Data } from "./pdf-generator";

const defaultForm86Valquirico: Form86Data = {
  folio: "VQ-8-6/1.2-024",
  fechaEmision: "23 de Junio de 2026",
  fechaVigencia: "23 de Diciembre de 2026",
  nombreComercial: "La Piazza Valquirico",
  razonSocial: "Comercializadora Valquirico S.A. de C.V.",
  rfc: "CVQ140512AB3",
  propietario: "Juan Pérez Gómez",
  representanteLegal: "María Elena Solís",
  registroImpi: "Registro No. 2093848",
  arrendador: "Desarrolladora Reinos S.A.",
  apol: "VQ#0P1",
  fap: "FAP-102",
  calle: "Calle de la Pila",
  barrio: "Barrio del Centro",
  m2: "120 m²",
  nivelEdificio: "Planta Baja",
  usoSuelo: "Comercial",
  sistemasPretratamiento: "Trampa de grasa de 50L",
  comodato: "No aplica",
  numMesasSillas: "12 mesas, 48 sillas",
  horariosAtencion: "Lunes a Domingo de 09:00 a 22:00",
  inicioConstruccion: "01 de Julio de 2026",
  finConstruccion: "15 de Agosto de 2026",
  costoRevision: "$5,000 MXN",
  costoInicioConstruccion: "$15,000 MXN",
  giros: [
    { clave: "REST-01", descripcion: "Restaurante de comida italiana con venta de vinos y licores." },
    { clave: "CAF-02", descripcion: "Cafetería y repostería artesanal." },
    { clave: "BOUT-03", descripcion: "Venta de artesanías y souvenirs." },
    { clave: "", descripcion: "" }
  ],
  descripcionProductos: "Servicio de alimentos preparados, pastas, pizzas a la leña, ensaladas, postres, café, refrescos y bebidas alcohólicas de baja graduación."
};

const defaultForm86Sassi: Form86Data = {
  folio: "SDV-8-6/1.2-024",
  fechaEmision: "23 de Junio de 2026",
  fechaVigencia: "23 de Diciembre de 2026",
  nombreComercial: "Sassi Bistro",
  razonSocial: "Sassi del Valle S.A. de C.V.",
  rfc: "SDV160411XY2",
  propietario: "Alejandro Rossi",
  representanteLegal: "Sofía Martínez",
  registroImpi: "Registro No. 1928374",
  arrendador: "Operadora Los Olivares S.A.",
  apol: "SDV#1A2",
  fap: "FAP-304",
  calle: "Vía de los Olivares",
  barrio: "Valle de Guadalupe",
  m2: "85 m²",
  nivelEdificio: "Piso 1, Local 4",
  usoSuelo: "Comercial / Restaurante",
  sistemasPretratamiento: "Filtro de carbón activo",
  comodato: "No aplica",
  numMesasSillas: "8 mesas, 32 sillas",
  horariosAtencion: "Miércoles a Lunes de 12:00 a 23:00",
  inicioConstruccion: "10 de Julio de 2026",
  finConstruccion: "20 de Agosto de 2026",
  costoRevision: "$4,500 MXN",
  costoInicioConstruccion: "$12,000 MXN",
  giros: [
    { clave: "REST-02", descripcion: "Bistro de cocina mediterránea y degustación de vinos." },
    { clave: "CAT-01", descripcion: "Cata de vinos y venta de quesos artesanales." },
    { clave: "", descripcion: "" },
    { clave: "", descripcion: "" }
  ],
  descripcionProductos: "Servicio de alimentos a la carta, tablas de quesos y carnes frías, degustación de vinos locales, postres y café."
};

interface TicketsWorkbenchProps {
  initialRows: TicketRowVM[];
  condominiumSlug: string;
  departments: { id: string; name: string }[];
  privateAreas: { id: string; name: string }[];
}

export function TicketsWorkbench({ initialRows, condominiumSlug, departments, privateAreas }: TicketsWorkbenchProps) {
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

  // PDF Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isGeneratingForTicket, setIsGeneratingForTicket] = useState(false);
  const [pdfData, setPdfData] = useState<Form86Data>(
    (PROJECT_SCOPE.condominiumCode as string) === "sassi" ? defaultForm86Sassi : defaultForm86Valquirico
  );
  const [pdfActiveTab, setPdfActiveTab] = useState<"general" | "dates_costs" | "location_specs" | "giros_products">("general");

  const handleDownloadPdf = async () => {
    try {
      const condo = (PROJECT_SCOPE.condominiumCode as string) === "sassi" ? "sassi" : "valquirico";
      await generateForm86Pdf(pdfData, condo);
    } catch (e) {
      alert("Error al generar PDF: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleGenerateForTicketClick = () => {
    if (!formData) return;
    setIsGeneratingForTicket(true);
    setPdfData(prev => ({
      ...prev,
      propietario: formData.snapshot.residentName || prev.propietario,
    }));
    setIsPdfModalOpen(true);
  };

  const handlePdfModalClose = () => {
    setIsPdfModalOpen(false);
    setIsGeneratingForTicket(false);
  };

  const handleGenerateAndAttach = async () => {
    setUploading('pdf');
    try {
      const condo = (PROJECT_SCOPE.condominiumCode as string) === "sassi" ? "sassi" : "valquirico";
      const blob = await generateForm86Pdf(pdfData, condo, true);
      const file = new File([blob], `Forma_8-6_1.2_${pdfData.folio || "ticket"}.pdf`, { type: "application/pdf" });
      
      const res = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId: "tickets",
        kind: "ticket-response-pdf"
      });
      
      setResponsePdfUrl(res.url);
      setIsPdfModalOpen(false);
      setIsGeneratingForTicket(false);
      alert("PDF generado y adjuntado al ticket exitosamente.");
    } catch (e) {
      alert("Error al generar o subir PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploading(null);
    }
  };

  const handleAddGiro = () => {
    if (pdfData.giros.length >= 4) {
      alert("El formato PDF soporta un máximo de 4 giros comerciales.");
      return;
    }
    setPdfData(prev => ({
      ...prev,
      giros: [...prev.giros, { clave: "", descripcion: "" }]
    }));
  };

  const handleRemoveGiro = (index: number) => {
    setPdfData(prev => {
      const updated = prev.giros.filter((_, i) => i !== index);
      return { ...prev, giros: updated };
    });
  };

  const handleGiroChange = (index: number, field: "clave" | "descripcion", value: string) => {
    setPdfData(prev => {
      const updated = [...prev.giros];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, giros: updated };
    });
  };

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    title: "",
    description: "",
    departmentId: "",
    privateAreaId: "",
  });

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

      // Pre-populate PDF Form fields based on condo
      const isSassi = (PROJECT_SCOPE.condominiumCode as string) === "sassi";
      const baseDefaults = isSassi ? defaultForm86Sassi : defaultForm86Valquirico;
      const docFolio = isSassi 
        ? `SDV-8-6/1.2-${data.snapshot.ticketNumber}` 
        : `VQ-8-6/1.2-${data.snapshot.ticketNumber}`;
      
      setPdfData({
        ...baseDefaults,
        folio: docFolio,
        propietario: data.snapshot.residentName || baseDefaults.propietario,
      });
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
      let finalPdfUrl = responsePdfUrl;
      
      setUploading('pdf');
      try {
        const condo = (PROJECT_SCOPE.condominiumCode as string) === "sassi" ? "sassi" : "valquirico";
        // Generate PDF and upload it (download set to false so it does it silently on save, or true if download wanted. Silently is cleaner as user just saves response).
        const blob = await generateForm86Pdf(pdfData, condo, false);
        const file = new File([blob], `Forma_8-6_1.2_${pdfData.folio || "ticket"}.pdf`, { type: "application/pdf" });
        
        const uploadRes = await uploadCondominiumAsset({
          file,
          condominiumSlug,
          projectId: "tickets",
          kind: "ticket-response-pdf"
        });
        finalPdfUrl = uploadRes.url;
      } catch (e) {
        alert("Error al generar o subir PDF: " + (e instanceof Error ? e.message : String(e)));
        setUploading(null);
        return;
      }
      setUploading(null);

      const res = await saveTicketResponseAction({
        id: formData.snapshot.id,
        response,
        status: status as any,
        responseImageUrl,
        responsePdfUrl: finalPdfUrl
      });
      if (res.ok) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.message);
      }
    });
  };

  const handleCreateSave = () => {
    if (!createData.title) {
      alert("El título es obligatorio");
      return;
    }
    startTransition(async () => {
      const res = await createTicketAction(createData);
      if (res.ok) {
        setIsCreateOpen(false);
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
      <div className="flex justify-end mb-4">
        <Button 
          variant="primary" 
          onClick={() => setIsPdfModalOpen(true)}
          className="h-9 px-4 text-[11px] font-bold uppercase gap-1.5 rounded-full shadow-md shadow-brand-deep/10"
        >
          <FileText className="h-4 w-4" />
          Generar PDF Forma 8-6/1.2
        </Button>
      </div>

      <DataTable
        title="Mesa de Ayuda"
        count={filteredRows.length}
        data={filteredRows}
        columns={columns}
        onSearch={setSearch}
        onAdd={() => setIsCreateOpen(true)}
        addLabel="Nuevo Ticket"
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
                {isPending || uploading === 'pdf' ? "Guardando y Generando PDF..." : "Guardar Respuesta"}
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
              {/* Evidence */}
              <div className="pt-2 border-t border-line/50">
                <div className="space-y-2 max-w-md">
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
              </div>

              {/* Formulario Forma 8-6/1.2 (Se autogenerará como PDF al guardar) */}
              <div className="space-y-3 pt-4 border-t border-line/50">
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand">
                  Formulario Forma 8-6/1.2 (Se autogenerará como PDF al guardar)
                </p>

                {/* Tabs header */}
                <div className="flex border-b border-line gap-2 overflow-x-auto pb-1">
                  {(["general", "dates_costs", "location_specs", "giros_products"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPdfActiveTab(tab)}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-bold uppercase border-b-2 transition-all whitespace-nowrap",
                        pdfActiveTab === tab 
                          ? "border-brand text-brand" 
                          : "border-transparent text-ink-soft hover:text-brand/80"
                      )}
                    >
                      {tab === "general" && "Datos Generales"}
                      {tab === "dates_costs" && "Fechas y Costos"}
                      {tab === "location_specs" && "Ubicación y Specs"}
                      {tab === "giros_products" && "Giros y Productos"}
                    </button>
                  ))}
                </div>

                {/* Tab contents */}
                <div className="pt-2 max-h-96 overflow-y-auto pr-1">
                  {pdfActiveTab === "general" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input 
                        label="Folio" 
                        value={pdfData.folio} 
                        onChange={e => setPdfData(prev => ({ ...prev, folio: e.target.value }))} 
                      />
                      <Input 
                        label="Nombre Comercial" 
                        value={pdfData.nombreComercial} 
                        onChange={e => setPdfData(prev => ({ ...prev, nombreComercial: e.target.value }))} 
                      />
                      <Input 
                        label="Razón Social" 
                        value={pdfData.razonSocial} 
                        onChange={e => setPdfData(prev => ({ ...prev, razonSocial: e.target.value }))} 
                      />
                      <Input 
                        label="RFC" 
                        value={pdfData.rfc} 
                        onChange={e => setPdfData(prev => ({ ...prev, rfc: e.target.value }))} 
                      />
                      <Input 
                        label="Propietario" 
                        value={pdfData.propietario} 
                        onChange={e => setPdfData(prev => ({ ...prev, propietario: e.target.value }))} 
                      />
                      <Input 
                        label="Representante Legal" 
                        value={pdfData.representanteLegal} 
                        onChange={e => setPdfData(prev => ({ ...prev, representanteLegal: e.target.value }))} 
                      />
                      <Input 
                        label="Registro IMPI" 
                        value={pdfData.registroImpi} 
                        onChange={e => setPdfData(prev => ({ ...prev, registroImpi: e.target.value }))} 
                      />
                      <Input 
                        label="Arrendador" 
                        value={pdfData.arrendador} 
                        onChange={e => setPdfData(prev => ({ ...prev, arrendador: e.target.value }))} 
                      />
                    </div>
                  )}

                  {pdfActiveTab === "dates_costs" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input 
                        label="Fecha de Emisión" 
                        value={pdfData.fechaEmision} 
                        onChange={e => setPdfData(prev => ({ ...prev, fechaEmision: e.target.value }))} 
                      />
                      <Input 
                        label="Fecha de Vigencia" 
                        value={pdfData.fechaVigencia} 
                        onChange={e => setPdfData(prev => ({ ...prev, fechaVigencia: e.target.value }))} 
                      />
                      <Input 
                        label="Inicio de Construcción" 
                        value={pdfData.inicioConstruccion} 
                        onChange={e => setPdfData(prev => ({ ...prev, inicioConstruccion: e.target.value }))} 
                      />
                      <Input 
                        label="Fin de Construcción" 
                        value={pdfData.finConstruccion} 
                        onChange={e => setPdfData(prev => ({ ...prev, finConstruccion: e.target.value }))} 
                      />
                      <Input 
                        label="Costo por Revisión" 
                        value={pdfData.costoRevision} 
                        onChange={e => setPdfData(prev => ({ ...prev, costoRevision: e.target.value }))} 
                      />
                      <Input 
                        label="Costo por Inicio de Construcción" 
                        value={pdfData.costoInicioConstruccion} 
                        onChange={e => setPdfData(prev => ({ ...prev, costoInicioConstruccion: e.target.value }))} 
                      />
                    </div>
                  )}

                  {pdfActiveTab === "location_specs" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input 
                        label="APOL" 
                        value={pdfData.apol} 
                        onChange={e => setPdfData(prev => ({ ...prev, apol: e.target.value }))} 
                      />
                      <Input 
                        label="FAP" 
                        value={pdfData.fap} 
                        onChange={e => setPdfData(prev => ({ ...prev, fap: e.target.value }))} 
                      />
                      <Input 
                        label="Calle" 
                        value={pdfData.calle} 
                        onChange={e => setPdfData(prev => ({ ...prev, calle: e.target.value }))} 
                      />
                      <Input 
                        label="Barrio" 
                        value={pdfData.barrio} 
                        onChange={e => setPdfData(prev => ({ ...prev, barrio: e.target.value }))} 
                      />
                      <Input 
                        label="M2" 
                        value={pdfData.m2} 
                        onChange={e => setPdfData(prev => ({ ...prev, m2: e.target.value }))} 
                      />
                      <Input 
                        label="Nivel Edificio" 
                        value={pdfData.nivelEdificio} 
                        onChange={e => setPdfData(prev => ({ ...prev, nivelEdificio: e.target.value }))} 
                      />
                      <Input 
                        label="Uso de Suelo" 
                        value={pdfData.usoSuelo} 
                        onChange={e => setPdfData(prev => ({ ...prev, usoSuelo: e.target.value }))} 
                      />
                      <Input 
                        label="Sistemas de Pretratamiento" 
                        value={pdfData.sistemasPretratamiento} 
                        onChange={e => setPdfData(prev => ({ ...prev, sistemasPretratamiento: e.target.value }))} 
                      />
                      <Input 
                        label="Comodato" 
                        value={pdfData.comodato} 
                        onChange={e => setPdfData(prev => ({ ...prev, comodato: e.target.value }))} 
                      />
                      <Input 
                        label="Número de Mesas y Sillas" 
                        value={pdfData.numMesasSillas} 
                        onChange={e => setPdfData(prev => ({ ...prev, numMesasSillas: e.target.value }))} 
                      />
                      <div className="col-span-1 md:col-span-2">
                        <Textarea 
                          label="Horarios de Atención" 
                          value={pdfData.horariosAtencion} 
                          onChange={e => setPdfData(prev => ({ ...prev, horariosAtencion: e.target.value }))} 
                          className="min-h-16"
                        />
                      </div>
                    </div>
                  )}

                  {pdfActiveTab === "giros_products" && (
                    <div className="space-y-3">
                      <div className="space-y-2 border border-line p-3 rounded bg-canvas/30">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                            Giro(s) Comercial(es) Asignado(s) <span className="text-[9px] font-normal text-brand">(Máximo 4)</span>
                          </p>
                          {pdfData.giros.length < 4 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleAddGiro}
                              className="h-7 text-[9px] px-2 uppercase font-bold"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Agregar Giro
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {pdfData.giros.map((giro, idx) => (
                            <div key={idx} className="flex gap-2 items-end border-b border-line/40 pb-2 last:border-0 last:pb-0">
                              <div className="w-20 shrink-0">
                                <Input 
                                  label={`Clave ${idx + 1}`}
                                  value={giro.clave}
                                  placeholder="REST-01"
                                  onChange={e => handleGiroChange(idx, "clave", e.target.value)}
                                />
                              </div>
                              <div className="flex-1">
                                <Input 
                                  label={`Descripción ${idx + 1}`}
                                  value={giro.descripcion}
                                  placeholder="Giro..."
                                  onChange={e => handleGiroChange(idx, "descripcion", e.target.value)}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveGiro(idx)}
                                className="h-9 px-2.5 rounded-md"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Textarea 
                        label="Descripción de Productos y/o Servicios que ofrece" 
                        value={pdfData.descripcionProductos} 
                        onChange={e => setPdfData(prev => ({ ...prev, descripcionProductos: e.target.value }))} 
                        className="min-h-16"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Nuevo Ticket de Soporte"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-8 text-[10px] font-bold uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !createData.title} 
              onClick={handleCreateSave}
              className="h-8 px-6 text-[10px] font-bold uppercase bg-brand text-white hover:bg-brand-accent transition-colors"
            >
              {isPending ? "Guardando..." : "Crear Ticket"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input 
            label="Asunto / Título *" 
            value={createData.title}
            onChange={(e) => setCreateData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ej: Fuga de agua, Problema de acceso..."
          />
          <Textarea 
            label="Descripción" 
            value={createData.description}
            onChange={(e) => setCreateData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Detalles adicionales del problema..."
            className="min-h-24"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">Departamento</label>
              <select
                value={createData.departmentId}
                onChange={(e) => setCreateData(prev => ({ ...prev, departmentId: e.target.value }))}
                className="w-full h-9 px-3 rounded-sm border border-line bg-white text-sm text-ink outline-none focus:ring-1 focus:ring-brand transition-colors"
              >
                <option value="">(Sin asignar)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">Área Privativa</label>
              <select
                value={createData.privateAreaId}
                onChange={(e) => setCreateData(prev => ({ ...prev, privateAreaId: e.target.value }))}
                className="w-full h-9 px-3 rounded-sm border border-line bg-white text-sm text-ink outline-none focus:ring-1 focus:ring-brand transition-colors"
              >
                <option value="">(Ninguna)</option>
                {privateAreas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPdfModalOpen}
        onClose={handlePdfModalClose}
        title="Generador de PDF - Forma 8-6/1.2"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={handlePdfModalClose} className="h-8 text-[10px] font-bold uppercase">
              Cancelar
            </Button>
            {isGeneratingForTicket ? (
              <Button 
                disabled={uploading === 'pdf'}
                onClick={handleGenerateAndAttach}
                className="h-8 px-6 text-[10px] font-bold uppercase bg-brand text-white hover:bg-brand-accent transition-colors"
              >
                {uploading === 'pdf' ? "Adjuntando..." : "Generar y Adjuntar a Ticket"}
              </Button>
            ) : (
              <Button 
                onClick={handleDownloadPdf}
                className="h-8 px-6 text-[10px] font-bold uppercase bg-brand text-white hover:bg-brand-accent transition-colors"
              >
                Descargar PDF
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-tight text-ink-soft mb-2">
            Configure los datos para la plantilla oficial de Aprobación de Proyecto.
          </p>
          
          {/* Tabs header */}
          <div className="flex border-b border-line gap-2 overflow-x-auto pb-1">
            {(["general", "dates_costs", "location_specs", "giros_products"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setPdfActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase border-b-2 transition-all whitespace-nowrap",
                  pdfActiveTab === tab 
                    ? "border-brand text-brand" 
                    : "border-transparent text-ink-soft hover:text-brand/80"
                )}
              >
                {tab === "general" && "Datos Generales"}
                {tab === "dates_costs" && "Fechas y Costos"}
                {tab === "location_specs" && "Ubicación y Specs"}
                {tab === "giros_products" && "Giros y Productos"}
              </button>
            ))}
          </div>

          {/* Tab contents */}
          <div className="pt-2">
            {pdfActiveTab === "general" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Folio" 
                  value={pdfData.folio} 
                  onChange={e => setPdfData(prev => ({ ...prev, folio: e.target.value }))} 
                />
                <Input 
                  label="Nombre Comercial" 
                  value={pdfData.nombreComercial} 
                  onChange={e => setPdfData(prev => ({ ...prev, nombreComercial: e.target.value }))} 
                />
                <Input 
                  label="Razón Social" 
                  value={pdfData.razonSocial} 
                  onChange={e => setPdfData(prev => ({ ...prev, razonSocial: e.target.value }))} 
                />
                <Input 
                  label="RFC" 
                  value={pdfData.rfc} 
                  onChange={e => setPdfData(prev => ({ ...prev, rfc: e.target.value }))} 
                />
                <Input 
                  label="Propietario" 
                  value={pdfData.propietario} 
                  onChange={e => setPdfData(prev => ({ ...prev, propietario: e.target.value }))} 
                />
                <Input 
                  label="Representante Legal" 
                  value={pdfData.representanteLegal} 
                  onChange={e => setPdfData(prev => ({ ...prev, representanteLegal: e.target.value }))} 
                />
                <Input 
                  label="Registro IMPI" 
                  value={pdfData.registroImpi} 
                  onChange={e => setPdfData(prev => ({ ...prev, registroImpi: e.target.value }))} 
                />
                <Input 
                  label="Arrendador" 
                  value={pdfData.arrendador} 
                  onChange={e => setPdfData(prev => ({ ...prev, arrendador: e.target.value }))} 
                />
              </div>
            )}

            {pdfActiveTab === "dates_costs" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Fecha de Emisión" 
                  value={pdfData.fechaEmision} 
                  onChange={e => setPdfData(prev => ({ ...prev, fechaEmision: e.target.value }))} 
                />
                <Input 
                  label="Fecha de Vigencia" 
                  value={pdfData.fechaVigencia} 
                  onChange={e => setPdfData(prev => ({ ...prev, fechaVigencia: e.target.value }))} 
                />
                <Input 
                  label="Inicio de Construcción" 
                  value={pdfData.inicioConstruccion} 
                  onChange={e => setPdfData(prev => ({ ...prev, inicioConstruccion: e.target.value }))} 
                />
                <Input 
                  label="Fin de Construcción" 
                  value={pdfData.finConstruccion} 
                  onChange={e => setPdfData(prev => ({ ...prev, finConstruccion: e.target.value }))} 
                />
                <Input 
                  label="Costo por Revisión" 
                  value={pdfData.costoRevision} 
                  onChange={e => setPdfData(prev => ({ ...prev, costoRevision: e.target.value }))} 
                />
                <Input 
                  label="Costo por Inicio de Construcción" 
                  value={pdfData.costoInicioConstruccion} 
                  onChange={e => setPdfData(prev => ({ ...prev, costoInicioConstruccion: e.target.value }))} 
                />
              </div>
            )}

            {pdfActiveTab === "location_specs" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="APOL" 
                  value={pdfData.apol} 
                  onChange={e => setPdfData(prev => ({ ...prev, apol: e.target.value }))} 
                />
                <Input 
                  label="FAP" 
                  value={pdfData.fap} 
                  onChange={e => setPdfData(prev => ({ ...prev, fap: e.target.value }))} 
                />
                <Input 
                  label="Calle" 
                  value={pdfData.calle} 
                  onChange={e => setPdfData(prev => ({ ...prev, calle: e.target.value }))} 
                />
                <Input 
                  label="Barrio" 
                  value={pdfData.barrio} 
                  onChange={e => setPdfData(prev => ({ ...prev, barrio: e.target.value }))} 
                />
                <Input 
                  label="M2" 
                  value={pdfData.m2} 
                  onChange={e => setPdfData(prev => ({ ...prev, m2: e.target.value }))} 
                />
                <Input 
                  label="Nivel Edificio" 
                  value={pdfData.nivelEdificio} 
                  onChange={e => setPdfData(prev => ({ ...prev, nivelEdificio: e.target.value }))} 
                />
                <Input 
                  label="Uso de Suelo" 
                  value={pdfData.usoSuelo} 
                  onChange={e => setPdfData(prev => ({ ...prev, usoSuelo: e.target.value }))} 
                />
                <Input 
                  label="Sistemas de Pretratamiento" 
                  value={pdfData.sistemasPretratamiento} 
                  onChange={e => setPdfData(prev => ({ ...prev, sistemasPretratamiento: e.target.value }))} 
                />
                <Input 
                  label="Comodato" 
                  value={pdfData.comodato} 
                  onChange={e => setPdfData(prev => ({ ...prev, comodato: e.target.value }))} 
                />
                <Input 
                  label="Número de Mesas y Sillas" 
                  value={pdfData.numMesasSillas} 
                  onChange={e => setPdfData(prev => ({ ...prev, numMesasSillas: e.target.value }))} 
                />
                <div className="col-span-1 md:col-span-2">
                  <Textarea 
                    label="Horarios de Atención" 
                    value={pdfData.horariosAtencion} 
                    onChange={e => setPdfData(prev => ({ ...prev, horariosAtencion: e.target.value }))} 
                    className="min-h-16"
                  />
                </div>
              </div>
            )}

            {pdfActiveTab === "giros_products" && (
              <div className="space-y-4">
                <div className="space-y-2 border border-line p-3 rounded bg-canvas/30">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                      Giro(s) Comercial(es) Asignado(s) <span className="text-[9px] font-normal text-brand">(Máximo 4)</span>
                    </p>
                    {pdfData.giros.length < 4 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddGiro}
                        className="h-7 text-[9px] px-2 uppercase font-bold"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Agregar Giro
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pdfData.giros.map((giro, idx) => (
                      <div key={idx} className="flex gap-2 items-end border-b border-line/40 pb-2 last:border-0 last:pb-0">
                        <div className="w-24 shrink-0">
                          <Input 
                            label={`Clave ${idx + 1}`}
                            value={giro.clave}
                            placeholder="Ej: REST-01"
                            onChange={e => handleGiroChange(idx, "clave", e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Input 
                            label={`Descripción ${idx + 1}`}
                            value={giro.descripcion}
                            placeholder="Descripción del giro..."
                            onChange={e => handleGiroChange(idx, "descripcion", e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveGiro(idx)}
                          className="h-9 px-2.5 rounded-md"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Textarea 
                  label="Descripción de Productos y/o Servicios que ofrece" 
                  value={pdfData.descripcionProductos} 
                  onChange={e => setPdfData(prev => ({ ...prev, descripcionProductos: e.target.value }))} 
                  className="min-h-20"
                />
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
