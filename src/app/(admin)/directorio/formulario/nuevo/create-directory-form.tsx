"use client";

import { useState, useTransition } from "react";
import { FileText, Upload, Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { cn } from "@/shared/utils/cn";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { createFullDirectoryContactAction } from "./actions";

interface CreateDirectoryFormProps {
  condominiumSlug: string;
  roleOptions: Array<{ id: string; name: string }>;
  backHref: string;
}

export function CreateDirectoryForm({
  condominiumSlug,
  roleOptions,
  backHref,
}: CreateDirectoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    userType: "INDIVIDUAL" as "INDIVIDUAL" | "LEGAL_ENTITY" | "S_A",
    requiresInvoice: false,
    firstName: "",
    lastNamePaterno: "",
    lastNameMaterno: "",
    curp: "",
    personalPhone: "",
    personalEmail: "",
    address: "",
    commercialName: "",
    businessName: "",
    rfc: "",
    businessPhone: "",
    businessEmail: "",
    taxAddress: "",
    taxStatusPdfUrl: "",
    initialRole: "",
    password: "",
    confirmPassword: "",
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
      console.error("[CreateDirectoryForm] upload failed", error);
      setMessage({ type: "error", text: "No se pudo subir el archivo." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    setMessage(null);
    
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }

    startTransition(async () => {
      const result = await createFullDirectoryContactAction({
        ...formData,
        lastName: `${formData.lastNamePaterno} ${formData.lastNameMaterno}`.trim(),
      });

      if (result.ok) {
        setMessage({ type: "success", text: result.message });
        if (result.id) {
          window.location.href = `/directorio/formulario/${result.id}`;
        }
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

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Nuevo Registro</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Directorio</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Crear un nuevo expediente de contacto
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
            {isPending ? "Guardando..." : "Guardar Registro"}
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
                <p className="text-[12px] font-medium text-white truncate">{formData.personalEmail || "N/D"}</p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 leading-none">Nueva Contraseña</label>
                  <div className="relative w-full">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Escribe la contraseña..." 
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="h-9 w-full rounded-sm border border-white/10 bg-white/5 pl-3 pr-9 text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-white/20 transition-colors" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-sm text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 leading-none">Confirmar Contraseña</label>
                  <div className="relative w-full">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Confirma la contraseña..." 
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      className="h-9 w-full rounded-sm border border-white/10 bg-white/5 pl-3 pr-9 text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-white/20 transition-colors" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-sm text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-card border border-brand-mint/40 bg-brand-mint/10">
            <p className="text-[11px] font-bold text-brand leading-relaxed text-center">
              Podrás agregar Fichas de contacto y Comercios vinculados después de crear este registro principal.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
