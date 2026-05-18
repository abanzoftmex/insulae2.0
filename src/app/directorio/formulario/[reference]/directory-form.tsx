"use client";

import { useState, useTransition } from "react";
import { 
  FileText, 
  Upload, 
  Check, 
  AlertCircle,
  Plus,
  Users,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
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
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
        kind: "project-document",
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
      const result = await saveDirectoryContactAction(reference, {
        ...formData,
        lastName: `${formData.lastNamePaterno} ${formData.lastNameMaterno}`.trim(),
      } as any);

      if (result.ok) {
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  };

  const sectionCls = "overflow-hidden rounded-card border border-line/40 bg-white shadow-sm";
  const sectionHeaderCls = "px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card";
  const sectionTitleCls = "text-[10px] font-bold uppercase tracking-widest text-white";
  const sectionBodyCls = "p-5";
  const fieldCls = "w-full h-9 px-3 rounded-sm border border-line bg-white text-sm text-ink outline-none focus:ring-1 focus:ring-brand transition-colors";
  const labelCls = "text-[10px] font-bold uppercase tracking-widest text-ink-soft";

  const indiviso = initialData.participationBlocks.find(b => b.title === "Dominio actual")?.totalPercentage.toFixed(4) || "0.0000";

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Expediente Maestro</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Directorio</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {formData.firstName} {formData.lastNamePaterno} {formData.lastNameMaterno}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={backHref}
            className="flex items-center gap-2 h-9 px-6 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
          >
            Cancelar
          </a>
          <button
            onClick={handleSave}
            disabled={isPending || isUploading}
            className="flex items-center gap-2 h-9 px-6 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-card animate-in fade-in zoom-in-95 duration-300 border",
          message.type === "success"
            ? "bg-brand-mint/20 text-brand border-brand-mint/40"
            : "bg-danger/5 text-danger border-danger/10"
        )}>
          {message.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="text-[11px] font-bold uppercase tracking-tight">{message.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Left — form sections */}
        <div className="lg:col-span-2 space-y-4">

          {/* Configuración */}
          <div className={sectionCls}>
            <div className={sectionHeaderCls}>
              <p className={sectionTitleCls}>Configuración inicial</p>
            </div>
            <div className={`${sectionBodyCls} grid grid-cols-1 sm:grid-cols-2 gap-5`}>
              <div className="space-y-1.5">
                <label className={labelCls}>Tipo de persona</label>
                <div className="flex gap-2">
                  {[
                    { value: "INDIVIDUAL", label: "Física" },
                    { value: "LEGAL_ENTITY", label: "Moral" },
                    { value: "S_A", label: "Sin Actividad" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange("userType", opt.value)}
                      className={cn(
                        "flex-1 h-9 px-2 rounded-sm text-[10px] font-bold uppercase tracking-widest border transition-colors",
                        formData.userType === opt.value
                          ? "bg-brand text-white border-brand"
                          : "bg-white text-ink-soft border-line hover:border-brand/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Requiere factura</label>
                <div className="flex gap-2">
                  {[{ value: true, label: "Sí" }, { value: false, label: "No" }].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleChange("requiresInvoice", opt.value)}
                      className={cn(
                        "flex-1 h-9 px-4 rounded-sm text-[10px] font-bold uppercase tracking-widest border transition-colors",
                        formData.requiresInvoice === opt.value
                          ? "bg-brand text-white border-brand"
                          : "bg-white text-ink-soft border-line hover:border-brand/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Rol inicial</label>
                <select
                  value={formData.initialRole}
                  onChange={(e) => handleChange("initialRole", e.target.value)}
                  className={fieldCls}
                >
                  <option value="">Seleccionar rol...</option>
                  {roleOptions.map(role => (
                    <option key={role.id} value={role.name}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Constancia fiscal (PDF)</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={cn(
                      "flex items-center justify-between h-9 px-3 rounded-sm border text-sm transition-colors",
                      isUploading ? "bg-canvas animate-pulse border-line" : "bg-white border-line"
                    )}>
                      <span className="text-[11px] text-ink-soft truncate max-w-30">
                        {formData.taxStatusPdfUrl ? "Archivo cargado" : "Elegir archivo..."}
                      </span>
                      <Upload className="w-3.5 h-3.5 text-ink-soft shrink-0" />
                    </div>
                  </div>
                  {formData.taxStatusPdfUrl && (
                    <a
                      href={formData.taxStatusPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-9 h-9 rounded-sm border border-line bg-white text-brand hover:bg-brand hover:text-white hover:border-brand transition-colors shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Información personal */}
          <div className={sectionCls}>
            <div className={sectionHeaderCls}>
              <p className={sectionTitleCls}>Información del propietario</p>
            </div>
            <div className={`${sectionBodyCls} grid grid-cols-1 sm:grid-cols-3 gap-4`}>
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
          </div>

          {/* Información de facturación */}
          <div className={sectionCls}>
            <div className={sectionHeaderCls}>
              <p className={sectionTitleCls}>Información de facturación</p>
            </div>
            <div className={`${sectionBodyCls} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
              <Input label="Nombre Comercial" value={formData.commercialName} onChange={(e) => handleChange("commercialName", e.target.value)} />
              <Input label="Razón Social" value={formData.businessName} onChange={(e) => handleChange("businessName", e.target.value)} />
              <Input label="RFC" value={formData.rfc} onChange={(e) => handleChange("rfc", e.target.value)} />
              <Input label="Teléfono Empresarial" value={formData.businessPhone} onChange={(e) => handleChange("businessPhone", e.target.value)} />
              <Input label="Email Empresarial" value={formData.businessEmail} onChange={(e) => handleChange("businessEmail", e.target.value)} />
              <div className="sm:col-span-2">
                <Input label="Dirección Fiscal" value={formData.taxAddress} onChange={(e) => handleChange("taxAddress", e.target.value)} />
              </div>
            </div>
          </div>

        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Acceso al sistema */}
          <div className="overflow-hidden rounded-card border border-brand-deep bg-brand-deep shadow-sm">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white">Acceso al sistema</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-white/40">Usuario</p>
                <p className="text-[12px] font-medium text-white truncate">{formData.personalEmail || initialData.email || "N/D"}</p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 leading-none">Nueva Contraseña</label>
                  <input type="password" className="h-9 w-full rounded-sm border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-white/20 transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 leading-none">Confirmar Contraseña</label>
                  <input type="password" className="h-9 w-full rounded-sm border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-white/20 transition-colors" />
                </div>
              </div>
              <button className="text-[10px] font-bold uppercase tracking-widest text-brand-mint hover:text-white transition-colors">
                Generar contraseña
              </button>
            </div>
          </div>

          {/* Participación */}
          <div className={sectionCls}>
            <div className={sectionHeaderCls}>
              <p className={sectionTitleCls}>Participación</p>
            </div>
            <div className={`${sectionBodyCls} grid grid-cols-2 gap-3`}>
              <div className="p-3 rounded-sm bg-canvas border border-line space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-ink-soft">Áreas</p>
                <p className="text-2xl font-bold text-brand">{initialData.assignments.length}</p>
                <Users className="w-4 h-4 text-brand/20" />
              </div>
              <div className="p-3 rounded-sm bg-brand-mint/20 border border-brand-mint/30 space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-brand/60">Indiviso</p>
                <p className="text-2xl font-bold text-brand">{indiviso}%</p>
                <Building2 className="w-4 h-4 text-brand/20" />
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between h-10 px-4 rounded-card border border-line bg-white text-[10px] font-bold uppercase tracking-widest text-brand hover:bg-brand/5 transition-colors group">
              <span>Agregar ficha de contacto</span>
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            </button>
            <button className="w-full flex items-center justify-between h-10 px-4 rounded-card border border-line bg-white text-[10px] font-bold uppercase tracking-widest text-brand hover:bg-brand/5 transition-colors group">
              <span>Agregar comercio</span>
              <Building2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </button>
          </div>

        </div>
      </div>

      {/* Participation Tables */}
      {initialData.participationBlocks.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="pb-3 border-b border-brand">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-brand">Participación en el condominio</h2>
          </div>
          {initialData.participationBlocks.map((block) => (
            <div key={block.title} className={sectionCls}>
              <div className={sectionHeaderCls}>
                <p className={sectionTitleCls}>{block.title}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-canvas border-b border-line">
                      <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-ink-soft">Tipo de entidad</th>
                      <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-ink-soft">Área privativa</th>
                      <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-ink-soft text-right">Porcentaje</th>
                      <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-ink-soft text-center">Comercios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr className="bg-brand-mint/10 font-bold">
                      <td className="px-4 py-2 text-[10px] uppercase tracking-wider text-brand">TOTAL</td>
                      <td className="px-4 py-2 text-[12px] text-brand">{block.totalAreas}</td>
                      <td className="px-4 py-2 text-right font-mono text-[12px] text-brand-accent">{block.totalPercentage.toFixed(4)}%</td>
                      <td className="px-4 py-2 text-center text-[10px] text-ink-soft">0</td>
                    </tr>
                    {block.rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-ink-soft text-[11px]">
                          Sin registros de participación en este bloque.
                        </td>
                      </tr>
                    ) : (
                      block.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-canvas/50 transition-colors">
                          <td className="px-4 py-2 text-[11px] text-ink-soft">{row.entityType}</td>
                          <td className="px-4 py-2 text-[12px] font-medium text-ink">{row.privateAreaName}</td>
                          <td className="px-4 py-2 text-right font-mono text-[12px] text-brand-accent">{row.percentage.toFixed(4)}%</td>
                          <td className="px-4 py-2 text-center text-[10px] text-ink-soft">No</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
