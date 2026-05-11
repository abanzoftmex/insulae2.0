"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  User as UserIcon, 
  Building2, 
  FileText, 
  Upload, 
  ChevronLeft, 
  Check, 
  AlertCircle,
  Plus,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { saveDirectoryContactAction } from "./actions";
import type { DirectoryContactParticipation } from "@/modules/directory/domain/directory";

interface DirectoryFormProps {
  reference: string;
  condominiumSlug: string;
  initialData: DirectoryContactParticipation;
  roleOptions: Array<{ id: string; name: string }>;
  backHref: string;
}

export function DirectoryForm({
  reference,
  condominiumSlug,
  initialData,
  roleOptions,
  backHref,
}: DirectoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    userType: initialData.userType,
    requiresInvoice: initialData.requiresInvoice,
    firstName: initialData.firstName || "",
    lastNamePaterno: initialData.lastNamePaterno || "",
    lastNameMaterno: initialData.lastNameMaterno || "",
    curp: initialData.curp || "",
    personalPhone: initialData.personalPhone || initialData.phone || "",
    personalEmail: initialData.personalEmail || initialData.email || "",
    address: initialData.address || "",
    commercialName: initialData.commercialName || "",
    businessName: initialData.businessName || "",
    rfc: initialData.rfc || "",
    businessPhone: initialData.businessPhone || "",
    businessEmail: initialData.businessEmail || "",
    taxAddress: initialData.taxAddress || "",
    taxStatusPdfUrl: initialData.taxStatusPdfUrl || "",
    initialRole: initialData.initialRole || "",
  });

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setMessage({ type: "error", text: "Solo se permiten archivos PDF." });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const uploaded = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId: "directory",
        kind: "project-document", // Using project-document as a fallback or could add tax-status-pdf
      });

      handleChange("taxStatusPdfUrl", uploaded.url);
      setMessage({ type: "success", text: "Constancia fiscal cargada correctamente." });
    } catch (error) {
      console.error("[DirectoryForm] upload failed", error);
      setMessage({ type: "error", text: "No se pudo subir el archivo." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      // Map back to lastName if needed, or just send the individual fields
      const result = await saveDirectoryContactAction(reference, {
        ...formData,
        lastName: `${formData.lastNamePaterno} ${formData.lastNameMaterno}`.trim(),
      } as any);

      if (result.ok) {
        setMessage({ type: "success", text: result.message });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute left-[-10%] top-[-10%] h-[40rem] w-[40rem] rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute right-[-5%] top-[20%] h-[35rem] w-[35rem] rounded-full bg-brand-accent/5 blur-3xl" />
      </div>

      {/* Form Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-brand-mint/20 text-brand border-brand-mint/30 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {formData.userType === "LEGAL_ENTITY" ? "Persona Moral" : "Persona Física"}
            </Badge>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft/40">
              Expediente Maestro
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold text-brand tracking-tight">
            {formData.firstName} {formData.lastNamePaterno} {formData.lastNameMaterno}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild className="rounded-full h-11 px-6 text-[11px] font-bold uppercase tracking-widest hover:bg-white/50">
            <a href={backHref}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Cancelar
            </a>
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending || isUploading}
            className="rounded-full h-11 px-8 text-[11px] font-bold uppercase tracking-widest bg-brand-accent shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/30 active-scale"
          >
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </header>

      {/* Main Form Content */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Configuration Section */}
          <Card className="rounded-[2.5rem] border border-brand/10 bg-white/80 backdrop-blur-md p-8 shadow-xl shadow-brand/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            
            <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-ink-soft/40 mb-8 flex items-center gap-2">
              <span className="w-6 h-px bg-brand/20" /> Configuración Inicial
            </h2>

            <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 block ml-1">Tipo de Persona</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "INDIVIDUAL", label: "Física" },
                    { value: "LEGAL_ENTITY", label: "Moral" },
                    { value: "S_A", label: "Sin Actividad" }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleChange("userType", opt.value)}
                      className={cn(
                        "flex-1 min-w-[70px] py-3 px-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                        formData.userType === opt.value 
                          ? "bg-brand text-white border-brand shadow-md shadow-brand/20" 
                          : "bg-white text-ink-soft border-line hover:border-brand/30"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 block ml-1">Requiere Factura</label>
                <div className="flex gap-2">
                  {[
                    { value: true, label: "Sí" },
                    { value: false, label: "No" }
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => handleChange("requiresInvoice", opt.value)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                        formData.requiresInvoice === opt.value 
                          ? "bg-brand text-white border-brand shadow-md shadow-brand/20" 
                          : "bg-white text-ink-soft border-line hover:border-brand/30"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-1 space-y-4">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 block ml-1">Rol Inicial</label>
                 <div className="relative bg-white rounded-2xl">
                   <select 
                     value={formData.initialRole}
                     onChange={(e) => handleChange("initialRole", e.target.value)}
                     className="w-full h-11 rounded-2xl border border-line bg-transparent px-4 text-[13px] font-medium text-ink focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/10 outline-none appearance-none transition-standard"
                   >
                     <option value="">Seleccionar rol...</option>
                     {roleOptions.map(role => (
                       <option key={role.id} value={role.name}>{role.name}</option>
                     ))}
                   </select>
                 </div>
              </div>

              <div className="sm:col-span-1 space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 block ml-1">Constancia Fiscal (PDF)</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 bg-white rounded-2xl">
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={cn(
                      "flex items-center justify-between h-11 px-4 rounded-2xl border text-[12px] font-medium transition-standard",
                      isUploading ? "bg-canvas animate-pulse" : "bg-transparent border-line"
                    )}>
                      <span className="truncate max-w-[150px]">
                        {formData.taxStatusPdfUrl ? "Archivo cargado" : "Elegir archivo..."}
                      </span>
                      <Upload className="w-4 h-4 text-brand-accent/50" />
                    </div>
                  </div>
                  {formData.taxStatusPdfUrl && (
                    <Button variant="outline" size="sm" asChild className="rounded-xl h-11 w-11 p-0 border-brand/20 text-brand hover:bg-brand/5">
                      <a href={formData.taxStatusPdfUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Personal Info Section */}
          <Card className="rounded-[2.5rem] border border-brand/10 bg-white/80 backdrop-blur-md p-8 shadow-xl shadow-brand/5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-ink-soft/40 mb-8 flex items-center gap-2">
              <span className="w-6 h-px bg-brand/20" /> Información General del Propietario
            </h2>

            <div className="grid gap-6 sm:grid-cols-3">
              <Input label="Nombre" value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
              <Input label="Apellido Paterno" value={formData.lastNamePaterno} onChange={(e) => handleChange("lastNamePaterno", e.target.value)} />
              <Input label="Apellido Materno" value={formData.lastNameMaterno} onChange={(e) => handleChange("lastNameMaterno", e.target.value)} />
              <Input label="CURP" value={formData.curp} onChange={(e) => handleChange("curp", e.target.value)} />
              <Input label="Teléfono" value={formData.personalPhone} onChange={(e) => handleChange("personalPhone", e.target.value)} />
              <Input label="Email Personal" value={formData.personalEmail} onChange={(e) => handleChange("personalEmail", e.target.value)} />
              <div className="sm:col-span-3">
                <Input label="Dirección" value={formData.address} onChange={(e) => handleChange("address", e.target.value)} />
              </div>
            </div>
          </Card>

          {/* Billing Info Section */}
          <Card className="rounded-[2.5rem] border border-brand/10 bg-white/80 backdrop-blur-md p-8 shadow-xl shadow-brand/5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-ink-soft/40 mb-8 flex items-center gap-2">
              <span className="w-6 h-px bg-brand/20" /> Información de Facturación
            </h2>

            <div className="grid gap-6 sm:grid-cols-2">
              <Input label="Nombre Comercial" value={formData.commercialName} onChange={(e) => handleChange("commercialName", e.target.value)} />
              <Input label="Razón Social" value={formData.businessName} onChange={(e) => handleChange("businessName", e.target.value)} />
              <Input label="RFC" value={formData.rfc} onChange={(e) => handleChange("rfc", e.target.value)} />
              <Input label="Teléfono Empresarial" value={formData.businessPhone} onChange={(e) => handleChange("businessPhone", e.target.value)} />
              <Input label="Email Empresarial" value={formData.businessEmail} onChange={(e) => handleChange("businessEmail", e.target.value)} />
              <div className="sm:col-span-2">
                <Input label="Dirección Fiscal" value={formData.taxAddress} onChange={(e) => handleChange("taxAddress", e.target.value)} />
              </div>
            </div>
          </Card>

          {/* Bottom Feedback */}
          {message && (
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-2xl animate-in fade-in zoom-in-95 duration-300",
              message.type === "success" ? "bg-brand-mint/30 text-brand border border-brand-mint/50" : "bg-danger/5 text-danger border border-danger/10"
            )}>
              {message.type === "success" ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-[13px] font-semibold tracking-tight">{message.text}</span>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
           {/* System Access Card */}
           <Card className="rounded-[2.5rem] border border-brand-deep/10 bg-brand-deep p-8 text-white shadow-2xl shadow-brand-deep/20">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 mb-6 flex items-center gap-2">
                <span className="w-4 h-px bg-white/20" /> Acceso al Sistema
              </h3>
              
              <div className="space-y-8">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/30">Usuario</p>
                  <p className="text-[15px] font-medium truncate">{formData.personalEmail || initialData.email || "N/D"}</p>
                </div>
                
                <div className="space-y-8">
                  <div className="bg-brand-deep rounded-md pt-2">
                    <Input 
                      type="password" 
                      label="Nueva Contraseña" 
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-white/30 focus:ring-white/10" 
                    />
                  </div>
                  <div className="bg-brand-deep rounded-md pt-2">
                    <Input 
                      type="password" 
                      label="Confirmar Contraseña" 
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-white/30 focus:ring-white/10" 
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <button className="text-[11px] font-bold uppercase tracking-widest text-brand-mint hover:text-white transition-colors">
                    Generar Contraseña
                  </button>
                </div>
              </div>
           </Card>

           {/* Participation Summary */}
           <Card className="rounded-[2.5rem] border border-brand/10 bg-white/60 backdrop-blur-sm p-8 shadow-lg shadow-brand/5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-soft/40 mb-6 flex items-center gap-2">
                <span className="w-4 h-px bg-brand/20" /> Participación
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-canvas/50 flex justify-between items-end">
                   <div>
                     <p className="text-[10px] uppercase text-ink-soft/50 mb-1">Áreas Vinculadas</p>
                     <p className="text-3xl font-bold text-brand">{initialData.assignments.length}</p>
                   </div>
                   <Users className="w-6 h-6 text-brand/20" />
                </div>
                
                <div className="p-4 rounded-2xl bg-brand-mint/20 border border-brand-mint/30 flex justify-between items-end">
                   <div>
                     <p className="text-[10px] uppercase text-brand/60 mb-1">Indiviso Total</p>
                     <p className="text-3xl font-bold text-brand">
                       {initialData.participationBlocks.find(b => b.title === "Dominio actual")?.totalPercentage.toFixed(4) || "0.00"}%
                     </p>
                   </div>
                   <Building2 className="w-6 h-6 text-brand/20" />
                </div>
              </div>
           </Card>

           {/* Quick Actions */}
           <div className="grid gap-3">
              <button className="w-full h-14 rounded-[1.25rem] border border-brand/10 bg-white px-6 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-brand hover:bg-brand/5 transition-standard active-scale group">
                <span>Agregar ficha de contacto</span>
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              </button>
              <button className="w-full h-14 rounded-[1.25rem] border border-brand/10 bg-white px-6 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-brand hover:bg-brand/5 transition-standard active-scale group">
                <span>Agregar comercio</span>
                <Building2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
           </div>
        </div>
      </div>

      {/* Participation Tables Section */}
      <section className="space-y-12 pt-12 pb-20">
        <div className="flex flex-col items-center text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-semibold text-brand">
            ¿Dónde y cómo participa este contacto dentro del sistema?
          </h2>
          <div className="w-20 h-1 bg-brand-accent/20 rounded-full" />
        </div>

        <div className="grid gap-12">
          {initialData.participationBlocks.map((block) => (
            <div key={block.title} className="space-y-4">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.3em] text-brand/60 text-center">{block.title}</h3>
              <Card className="rounded-3xl border border-brand/10 bg-white/70 backdrop-blur-sm overflow-hidden shadow-xl shadow-brand/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-mint/10 text-[10px] font-bold uppercase tracking-[0.15em] text-brand">
                        <th className="px-8 py-4 border-b border-brand/5">Tipo de entidad</th>
                        <th className="px-8 py-4 border-b border-brand/5">Areas Privativas</th>
                        <th className="px-8 py-4 border-b border-brand/5 text-right">Porcentaje</th>
                        <th className="px-8 py-4 border-b border-brand/5 text-center">Comercios</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand/5">
                      {/* Total Row */}
                      <tr className="bg-brand-mint/5 font-bold">
                        <td className="px-8 py-4 text-[11px] uppercase tracking-wider text-brand">TOTAL</td>
                        <td className="px-8 py-4 text-[13px] text-brand">{block.totalAreas}</td>
                        <td className="px-8 py-4 text-right font-mono text-[13px] text-brand-accent">
                          {block.totalPercentage.toFixed(4)}%
                        </td>
                        <td className="px-8 py-4 text-center text-[11px] text-ink-soft/40">0</td>
                      </tr>
                      {/* Data Rows */}
                      {block.rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-12 text-center text-ink-soft/40 italic text-sm">
                            Sin registros de participación en este bloque.
                          </td>
                        </tr>
                      ) : (
                        block.rows.map((row, idx) => (
                          <tr key={idx} className="group hover:bg-brand-mint/5 transition-colors">
                            <td className="px-8 py-4 text-[12px] text-ink-soft/60">{row.entityType}</td>
                            <td className="px-8 py-4 text-[13px] font-medium text-brand">{row.privateAreaName}</td>
                            <td className="px-8 py-4 text-right font-mono text-[13px] font-medium text-brand-accent/80">
                              {row.percentage.toFixed(4)}%
                            </td>
                            <td className="px-8 py-4 text-center">
                              <span className="text-[11px] font-medium text-ink-soft/30">No</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Invitados Especiales (Placeholder for now as per prev context) */}
      <Card className="rounded-[2.5rem] border border-dashed border-brand/20 bg-transparent p-12 text-center">
         <div className="mx-auto w-16 h-16 rounded-full bg-brand/5 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-brand/20" />
         </div>
         <h3 className="text-sm font-bold text-brand uppercase tracking-widest mb-2">Invitados Especiales</h3>
         <p className="text-[12px] text-ink-soft/50 max-w-sm mx-auto mb-6">
           Administra las personas externas vinculadas a este expediente maestro. Próximamente disponible.
         </p>
         <Button variant="outline" className="rounded-full border-brand/20 text-brand hover:bg-brand/5">
           <Plus className="w-4 h-4 mr-2" /> Agregar Invitado
         </Button>
      </Card>
    </div>
  );
}
