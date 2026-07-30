"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Upload, 
  Check, 
  AlertCircle,
  Plus,
  Users,
  Building2,
  Settings,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { cn } from "@/shared/utils/cn";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { 
  saveDirectoryContactAction, 
  updatePasswordAction,
  getRegistrationTypesAction,
  addRegistrationTypeAction,
  updateRegistrationTypeAction,
  deleteRegistrationTypeAction,
  createNestedUserAction,
  deleteNestedUserAction,
  generateTemporaryPasswordAction,
} from "./actions";
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
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [registrationTypes, setRegistrationTypes] = useState<Array<{ id: string; code: string; description: string }>>([]);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [newTypeDesc, setNewTypeDesc] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  const [children, setChildren] = useState<Array<any>>(initialData.children || []);
  const [isCreateChildOpen, setIsCreateChildOpen] = useState(false);
  const [viewingChild, setViewingChild] = useState<any | null>(null);
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastNamePaterno, setChildLastNamePaterno] = useState("");
  const [childLastNameMaterno, setChildLastNameMaterno] = useState("");
  const [childCurp, setChildCurp] = useState("");
  const [childPersonalPhone, setChildPersonalPhone] = useState("");
  const [childPersonalEmail, setChildPersonalEmail] = useState("");
  const [childBirthDate, setChildBirthDate] = useState("");
  const [childGender, setChildGender] = useState("");
  const [childRegTypeCode, setChildRegTypeCode] = useState("");
  const [isChildPending, startChildTransition] = useTransition();
  const [editingTypeDesc, setEditingTypeDesc] = useState("");

  const uniqueAssignments = Array.from(
    new Map((initialData.assignments || []).map((a) => [a.privateAreaId, a])).values()
  );

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
    birthDate: initialData.birthDate || "",
    gender: initialData.gender || "",
    apolfap: initialData.apolfap || (uniqueAssignments.length > 0 ? uniqueAssignments[0].privateAreaName : ""),
    registrationTypeCode: initialData.registrationTypeCode || "",
    registrationTypeDesc: initialData.registrationTypeDesc || "",
    idVq: initialData.idVq || "",
  });

  useEffect(() => {
    getRegistrationTypesAction(initialData.condominiumId).then((res) => {
      if (res.ok && res.data) {
        setRegistrationTypes(res.data);
      }
    });
  }, [initialData.condominiumId]);

  const handleRegTypeChange = (code: string) => {
    const matched = registrationTypes.find((t) => t.code === code);
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        registrationTypeCode: matched.code,
        registrationTypeDesc: matched.description,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        registrationTypeCode: "",
        registrationTypeDesc: "",
      }));
    }
  };

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
        if (result.idVq !== undefined) {
          setFormData((prev) => ({ ...prev, idVq: result.idVq || "" }));
        }
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  };

  const handleUpdatePassword = () => {
    if (!password) {
      setMessage({ type: "error", text: "La contraseña no puede estar vacía." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }
    setMessage(null);
    startPasswordTransition(async () => {
      const result = await updatePasswordAction(reference, password);
      if (result.ok) {
        setMessage({ type: "success", text: result.message });
        setPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  };

  const handleGenerateTempPassword = () => {
    setMessage(null);
    startPasswordTransition(async () => {
      const result = await generateTemporaryPasswordAction(reference);
      if (result.ok) {
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  };

  const [activeTab, setActiveTab] = useState<"general" | "facturacion" | "seguridad">("general");

  const sectionCls = "overflow-hidden rounded-xl border border-line bg-white shadow-sm hover:shadow-md transition-shadow duration-300";
  const sectionHeaderCls = "px-5 py-4 border-b border-line bg-canvas/30 flex items-center justify-between";
  const sectionTitleCls = "text-xs font-extrabold uppercase tracking-widest text-brand-deep flex items-center gap-2";
  const sectionBodyCls = "p-6";
  const fieldCls = "w-full h-9 px-3 rounded-md border border-line bg-white text-sm text-[#3a2f25] outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-all duration-200";
  const labelCls = "text-[10px] font-extrabold uppercase tracking-widest text-ink-soft/80";

  const legalBlock = initialData.participationBlocks.find(
    (b) => b.title.toLowerCase().includes("propietario legal") || b.title.toLowerCase().includes("legal")
  );
  const legalTotalAreas = legalBlock ? legalBlock.totalAreas : 0;
  const legalIndiviso = legalBlock ? legalBlock.totalPercentage.toFixed(4) : "0.0000";

  const computedUserId = formData.apolfap && formData.idVq && formData.registrationTypeCode
    ? `ID-${formData.apolfap.trim()}${formData.idVq.trim()}-${formData.registrationTypeCode.trim()}`
    : initialData.email;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-line">
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

      {/* Tabs Selector */}
      <div className="flex border-b border-line gap-2 overflow-x-auto pb-[1px] mb-4">
        {[
          { id: "general", label: "Información General", icon: <Users className="w-3.5 h-3.5" /> },
          { id: "facturacion", label: "Facturación", icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: "seguridad", label: "Acceso y Seguridad", icon: <Settings className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest border-b-2 -mb-[2px] transition-all duration-200 shrink-0",
              activeTab === tab.id
                ? "border-brand text-brand font-black"
                : "border-transparent text-ink-soft/60 hover:text-brand hover:border-line"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-4">

        {/* Left Column: Form Content (col-span-3) */}
        <div className="lg:col-span-3 space-y-4">

          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Configuración */}
              <div className={sectionCls}>
                <div className={cn(sectionHeaderCls, "flex items-center justify-between")}>
                  <p className={sectionTitleCls}>
                    <Settings className="w-4 h-4 text-brand" />
                    Configuración inicial
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setChildFirstName("");
                      setChildLastNamePaterno("");
                      setChildLastNameMaterno("");
                      setChildCurp("");
                      setChildPersonalPhone("");
                      setChildPersonalEmail("");
                      setChildBirthDate("");
                      setChildGender("");
                      setChildRegTypeCode("");
                      setIsCreateChildOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-600 border border-green-700 text-white text-[10px] font-extrabold uppercase tracking-wider hover:bg-green-700 hover:border-green-800 transition-all shadow-sm active:scale-95 group shrink-0"
                    title="Agregar usuario anidado"
                  >
                    <div className="h-3.5 w-3.5 rounded bg-white/20 flex items-center justify-center shrink-0">
                      <Plus className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                    <span>Agregar usuario anidado</span>
                  </button>
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
                            "flex-1 h-9 px-2 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors",
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
                            "flex-1 h-9 px-4 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors",
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
                          "flex items-center justify-between h-9 px-3 rounded-md border text-sm transition-colors",
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
                          className="flex items-center justify-center w-9 h-9 rounded-md border border-line bg-white text-brand hover:bg-brand hover:text-white hover:border-brand transition-colors shrink-0"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>ApolFap a la que pertenece</label>
                    <select
                      value={formData.apolfap}
                      onChange={(e) => handleChange("apolfap", e.target.value)}
                      className={fieldCls}
                    >
                      {uniqueAssignments.length === 0 ? (
                        <option value="">Sin áreas asignadas</option>
                      ) : (
                        uniqueAssignments.map((assignment) => (
                          <option key={assignment.privateAreaId} value={assignment.privateAreaName}>
                            {assignment.privateAreaName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>Tipo de registro (Descripción)</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.registrationTypeCode}
                        onChange={(e) => handleRegTypeChange(e.target.value)}
                        className={fieldCls}
                      >
                        <option value="">Seleccionar tipo...</option>
                        {registrationTypes.map((type) => (
                          <option key={type.id} value={type.code}>
                            {type.description} ({type.code})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsManagerOpen(true)}
                        className="h-9 px-3 bg-canvas hover:bg-canvas/80 border border-line text-ink rounded-md transition-colors flex items-center justify-center shrink-0"
                        title="Gestionar tipos"
                      >
                        <Settings className="w-4 h-4 text-ink-soft" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>Tipo de registro (Código)</label>
                    <input
                      type="text"
                      value={formData.registrationTypeCode}
                      readOnly
                      disabled
                      className={cn(fieldCls, "bg-canvas/50 text-ink-soft cursor-not-allowed")}
                      placeholder="8-XX"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>ID SDV</label>
                    <input
                      type="text"
                      value={formData.apolfap && formData.idVq && formData.registrationTypeCode
                        ? `${formData.apolfap.trim()}${formData.idVq.trim()}-${formData.registrationTypeCode.trim()}`
                        : formData.idVq || "Autogenerado al guardar..."}
                      readOnly
                      disabled
                      className={cn(fieldCls, "bg-canvas/50 text-ink-soft cursor-not-allowed font-mono")}
                      placeholder="SDV#..."
                    />
                  </div>
                </div>
              </div>

              {/* Cards de Usuarios Anidados justo debajo de Configuración Inicial */}
              {children.length > 0 && (
                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-700" />
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-green-800">
                        Usuarios Anidados Vinculados ({children.length})
                      </h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {children.map((child) => {
                      const fullChildName = [
                        child.firstName,
                        child.lastNamePaterno || child.lastName,
                        child.lastNameMaterno
                      ].filter(Boolean).join(" ").trim() || "Sin nombre";

                      const fullSdvId = formData.apolfap && child.idVq
                        ? `${formData.apolfap.trim()}${child.idVq.trim()}`
                        : child.idVq || "-";

                      return (
                        <div 
                          key={child.id}
                          className="p-5 rounded-2xl bg-[#f0e6d6]/60 border-l-4 border-green-600 border border-line/70 hover:bg-[#f0e6d6]/90 transition-all shadow-sm space-y-4"
                        >
                          {/* Header row */}
                          <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-line/40">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-green-700 font-bold text-sm">└─</span>
                                <h4 className="text-base font-extrabold text-ink">
                                  {fullChildName}
                                </h4>
                              </div>
                              <div className="pl-5 flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">ID SDV:</span>
                                <span className="font-mono text-xs font-bold text-brand-accent bg-white/70 px-2 py-0.5 rounded border border-line/40">
                                  {fullSdvId}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300 shadow-xs">
                                {child.registrationTypeDesc || child.registrationTypeCode || "Anidado"}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingChild(child)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-line text-brand hover:bg-brand hover:text-white transition-all text-xs font-bold shadow-xs"
                                  title="Ver detalles"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Ver detalles</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`¿Estás seguro de eliminar a ${fullChildName}?`)) {
                                      startChildTransition(async () => {
                                        const res = await deleteNestedUserAction(child.id);
                                        if (res.ok) {
                                          setChildren((prev) => prev.filter((c) => c.id !== child.id));
                                        }
                                      });
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-danger/30 text-danger hover:bg-danger hover:text-white transition-all text-xs font-bold shadow-xs"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Data Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pl-5">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Email Personal</span>
                              <p className="font-semibold text-ink break-all">{child.personalEmail || "-"}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Teléfono Personal</span>
                              <p className="font-semibold text-ink">{child.personalPhone || "-"}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">CURP</span>
                              <p className="font-mono font-semibold text-ink">{child.curp || "-"}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Fecha Nac. / Género</span>
                              <p className="font-semibold text-ink">
                                {[child.birthDate, child.gender].filter(Boolean).join(" · ") || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Información personal */}
              <div className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <p className={sectionTitleCls}>
                    <Users className="w-4 h-4 text-brand" />
                    Información del propietario
                  </p>
                </div>
                <div className={`${sectionBodyCls} grid grid-cols-1 sm:grid-cols-3 gap-4`}>
                  <Input label="Nombre" value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
                  <Input label="Apellido Paterno" value={formData.lastNamePaterno} onChange={(e) => handleChange("lastNamePaterno", e.target.value)} />
                  <Input label="Apellido Materno" value={formData.lastNameMaterno} onChange={(e) => handleChange("lastNameMaterno", e.target.value)} />
                  <Input label="CURP" value={formData.curp} onChange={(e) => handleChange("curp", e.target.value)} />
                  <Input label="Teléfono" value={formData.personalPhone} onChange={(e) => handleChange("personalPhone", e.target.value)} />
                  <Input label="Email Personal" value={formData.personalEmail} onChange={(e) => handleChange("personalEmail", e.target.value)} />

                  <div className="space-y-1.5">
                    <label className={labelCls}>Fecha de nacimiento</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleChange("birthDate", e.target.value)}
                      className={fieldCls}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>Género</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleChange("gender", e.target.value)}
                      className={fieldCls}
                    >
                      <option value="">Seleccionar género...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                      <option value="Sin especificar">Sin especificar</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <Input label="Dirección" value={formData.address} onChange={(e) => handleChange("address", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "facturacion" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Información de facturación */}
              <div className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <p className={sectionTitleCls}>
                    <Building2 className="w-4 h-4 text-brand" />
                    Información de facturación
                  </p>
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
          )}

          {activeTab === "seguridad" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Acceso al sistema */}
              <div className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <p className={sectionTitleCls}>
                    <Settings className="w-4 h-4 text-brand" />
                    Acceso al sistema
                  </p>
                </div>
                <div className={sectionBodyCls}>
                  <div className="space-y-6 max-w-lg">
                    <div className="space-y-1.5 max-w-sm">
                      <label className={labelCls}>Usuario</label>
                      <input 
                        type="text" 
                        readOnly 
                        disabled 
                        value={computedUserId || "N/D"} 
                        className={cn(fieldCls, "bg-canvas/50 text-[#3a2f25] cursor-not-allowed font-mono")} 
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Nueva Contraseña</label>
                        <div className="relative w-full">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className={fieldCls} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-sm text-ink-soft/40 hover:text-brand hover:bg-canvas transition-colors"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Confirmar Contraseña</label>
                        <div className="relative w-full">
                          <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            className={fieldCls} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-sm text-ink-soft/40 hover:text-brand hover:bg-canvas transition-colors"
                            aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button type="button" onClick={handleUpdatePassword} disabled={isPasswordPending} className="h-9 px-4 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:opacity-50">
                        {isPasswordPending ? "Actualizando..." : "Actualizar contraseña"}
                      </button>
                      <button type="button" onClick={handleGenerateTempPassword} disabled={isPasswordPending} className="h-9 px-4 rounded-full bg-white border border-line text-ink text-[10px] font-bold uppercase tracking-widest hover:bg-canvas transition-all disabled:opacity-50">
                        {isPasswordPending ? "Actualizando..." : "Generar y enviar contraseña provisional"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Sidebar (col-span-1) */}
        <div className="lg:col-span-1 space-y-4">
          {/* Participación */}
          <div className={sectionCls}>
            <div className={sectionHeaderCls}>
              <p className={sectionTitleCls}>
                <Users className="w-4 h-4 text-brand" />
                Participación
              </p>
            </div>
            <div className={`${sectionBodyCls} grid grid-cols-2 gap-3`}>
              <div className="p-3 rounded-lg bg-canvas border border-line space-y-1 flex flex-col justify-between">
                <p className="text-[9px] font-bold uppercase tracking-widest text-ink-soft/70">Áreas</p>
                <p className="text-2xl font-black text-[#3a2f25]">{legalTotalAreas}</p>
              </div>
              <div className="p-3 rounded-lg bg-brand-mint/10 border border-brand-mint/20 space-y-1 flex flex-col justify-between">
                <p className="text-[9px] font-bold uppercase tracking-widest text-brand/70">Indiviso</p>
                <p className="text-lg sm:text-xl font-black text-brand tracking-tight">{legalIndiviso}%</p>
              </div>
            </div>
          </div>


        </div>

      </div>


      {/* Participation Tables */}
      {initialData.participationBlocks.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="pb-3 border-b border-line">
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
                      <td className="px-4 py-2 text-center text-[10px] font-bold text-brand">
                        {Array.from(new Set(block.rows.flatMap((r) => r.commerceNames || []))).length}
                      </td>
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
                          <td className="px-4 py-2 text-center text-[11px] text-ink">
                            {row.commerceNames && row.commerceNames.length > 0 ? (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {row.commerceNames.map((name, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-mint/20 border border-brand-mint/40 text-brand text-[10px] font-bold">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-ink-soft/40 text-[10px]">No</span>
                            )}
                          </td>
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

      {/* Modal to manage registration types */}
      {isManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-card border border-line shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-line bg-canvas flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-brand-deep">Gestionar Tipos de Registro</h3>
              <button
                onClick={() => setIsManagerOpen(false)}
                className="text-ink-soft hover:text-brand text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[50vh] overflow-y-auto space-y-3">
              <div className="space-y-2">
                {registrationTypes.length === 0 ? (
                  <p className="text-center text-ink-soft text-xs py-4">No hay tipos de registro creados.</p>
                ) : (
                  registrationTypes.map((type) => (
                    <div key={type.id} className="flex items-center gap-2 border-b border-line/60 pb-2">
                      <span className="w-16 font-mono text-xs font-bold text-brand-accent bg-brand-mint/10 border border-brand-mint/20 py-1 rounded text-center shrink-0">
                        {type.code}
                      </span>
                      {editingTypeId === type.id ? (
                        <input
                          type="text"
                          value={editingTypeDesc}
                          onChange={(e) => setEditingTypeDesc(e.target.value)}
                          className="flex-1 h-8 px-2 text-sm border border-brand rounded-sm outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1 text-sm text-ink font-medium px-2">{type.description}</span>
                      )}
                      <div className="flex gap-1">
                        {editingTypeId === type.id ? (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                const desc = editingTypeDesc.trim();
                                if (desc && desc !== type.description) {
                                  const res = await updateRegistrationTypeAction(type.id, desc);
                                  if (res.ok) {
                                    setRegistrationTypes((prev) =>
                                      prev.map((t) => (t.id === type.id ? { ...t, description: desc } : t))
                                    );
                                    if (formData.registrationTypeCode === type.code) {
                                      setFormData((prev) => ({ ...prev, registrationTypeDesc: desc }));
                                    }
                                  }
                                }
                                setEditingTypeId(null);
                              }}
                              className="px-2 py-1 bg-brand text-white text-[9px] font-bold uppercase rounded-sm hover:bg-brand-accent transition-colors"
                            >
                              Ok
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTypeId(null)}
                              className="px-2 py-1 bg-canvas border border-line text-ink-soft text-[9px] font-bold uppercase rounded-sm hover:bg-line transition-colors"
                            >
                              Esc
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTypeId(type.id);
                                setEditingTypeDesc(type.description);
                              }}
                              className="text-brand hover:text-brand-accent p-1"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`¿Estás seguro de eliminar "${type.description}"?`)) {
                                  const res = await deleteRegistrationTypeAction(type.id);
                                  if (res.ok) {
                                    setRegistrationTypes((prev) => prev.filter((t) => t.id !== type.id));
                                    if (formData.registrationTypeCode === type.code) {
                                      setFormData((prev) => ({
                                        ...prev,
                                        registrationTypeCode: "",
                                        registrationTypeDesc: "",
                                      }));
                                    }
                                  }
                                }
                              }}
                              className="text-danger hover:text-danger-accent p-1"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Section */}
              <div className="pt-4 border-t border-line space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">Nueva descripción</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTypeDesc}
                    onChange={(e) => setNewTypeDesc(e.target.value)}
                    placeholder="Ej. Condómino Habitacional"
                    className="flex-1 h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const desc = newTypeDesc.trim();
                      if (!desc) return;
                      const res = await addRegistrationTypeAction(initialData.condominiumId, desc);
                      if (res.ok && res.data) {
                        setRegistrationTypes((prev) => [...prev, res.data]);
                        setNewTypeDesc("");
                      }
                    }}
                    className="h-9 px-4 bg-brand hover:bg-brand-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-canvas border-t border-line flex justify-end">
              <button
                onClick={() => setIsManagerOpen(false)}
                className="h-8 px-5 bg-white border border-line rounded-full text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal to add nested user */}
      {isCreateChildOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-card border border-line shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-line bg-canvas flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-brand-deep">Agregar Usuario Anidado</h3>
              <button
                type="button"
                onClick={() => setIsCreateChildOpen(false)}
                className="text-ink-soft hover:text-brand text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const firstName = childFirstName.trim();
                if (!firstName || !childRegTypeCode) {
                  alert("Nombre y Tipo de registro son requeridos.");
                  return;
                }
                const matched = registrationTypes.find((t) => t.code === childRegTypeCode);
                const regDesc = matched ? matched.description : "";

                startChildTransition(async () => {
                  const res = await createNestedUserAction(initialData.id, {
                    firstName,
                    lastNamePaterno: childLastNamePaterno.trim(),
                    lastNameMaterno: childLastNameMaterno.trim(),
                    curp: childCurp.trim(),
                    personalPhone: childPersonalPhone.trim(),
                    personalEmail: childPersonalEmail.trim(),
                    birthDate: childBirthDate || undefined,
                    gender: childGender || undefined,
                    registrationTypeCode: childRegTypeCode,
                    registrationTypeDesc: regDesc,
                  });
                  if (res.ok && res.data) {
                    setChildren((prev) => [...prev, res.data]);
                    setIsCreateChildOpen(false);
                  } else {
                    alert(res.message || "Error al crear el usuario anidado.");
                  }
                });
              }}
              className="p-5 space-y-4 text-left"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    Nombre(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={childFirstName}
                    onChange={(e) => setChildFirstName(e.target.value)}
                    placeholder="Ej. Juan"
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    Apellido Paterno
                  </label>
                  <input
                    type="text"
                    value={childLastNamePaterno}
                    onChange={(e) => setChildLastNamePaterno(e.target.value)}
                    placeholder="Ej. Pérez"
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    Apellido Materno
                  </label>
                  <input
                    type="text"
                    value={childLastNameMaterno}
                    onChange={(e) => setChildLastNameMaterno(e.target.value)}
                    placeholder="Ej. Gómez"
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    CURP
                  </label>
                  <input
                    type="text"
                    value={childCurp}
                    onChange={(e) => setChildCurp(e.target.value)}
                    placeholder="Ej. CURP123456"
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={childPersonalPhone}
                    onChange={(e) => setChildPersonalPhone(e.target.value)}
                    placeholder="Ej. (55) 1234-5678"
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    Email Personal
                  </label>
                  <input
                    type="email"
                    value={childPersonalEmail}
                    onChange={(e) => setChildPersonalEmail(e.target.value)}
                    placeholder="Ej. juan@correo.com"
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={childBirthDate}
                    onChange={(e) => setChildBirthDate(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    Género
                  </label>
                  <select
                    value={childGender}
                    onChange={(e) => setChildGender(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white"
                  >
                    <option value="">Seleccionar género...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                    <option value="Sin especificar">Sin especificar</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    Tipo de Registro *
                  </label>
                  <select
                    required
                    value={childRegTypeCode}
                    onChange={(e) => setChildRegTypeCode(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white"
                  >
                    <option value="">Selecciona tipo...</option>
                    {registrationTypes.map((t) => (
                      <option key={t.id} value={t.code}>
                        {t.description} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Footer / Buttons */}
              <div className="pt-4 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateChildOpen(false)}
                  className="h-8 px-5 bg-white border border-line rounded-full text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isChildPending}
                  className="h-8 px-5 bg-brand hover:bg-brand-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors disabled:opacity-50"
                >
                  {isChildPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal to view nested user details */}
      {viewingChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-card border border-line shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-line bg-canvas flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-brand-deep">Detalles de Usuario Anidado</h3>
              <button
                type="button"
                onClick={() => setViewingChild(null)}
                className="text-ink-soft hover:text-brand text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-left">
              {/* Información Personal */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-brand border-b border-line pb-1.5">Información General</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Nombre(s)</span>
                    <p className="text-sm font-semibold text-ink">{viewingChild.firstName || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Apellido Paterno</span>
                    <p className="text-sm font-semibold text-ink">{viewingChild.lastNamePaterno || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Apellido Materno</span>
                    <p className="text-sm font-semibold text-ink">{viewingChild.lastNameMaterno || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Documentación e Identidad */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-brand border-b border-line pb-1.5">Identidad y Contacto</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">CURP</span>
                    <p className="text-sm font-mono font-semibold text-ink">{viewingChild.curp || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Teléfono</span>
                    <p className="text-sm font-semibold text-ink">{viewingChild.personalPhone || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Email Personal</span>
                    <p className="text-sm font-semibold text-ink">{viewingChild.personalEmail || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Datos de Sistema */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-brand border-b border-line pb-1.5">Datos del Sistema</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">ID SDV</span>
                    <p className="text-sm font-mono font-semibold text-brand-accent">
                      {formData.apolfap && viewingChild.idVq
                        ? `${formData.apolfap.trim()}${viewingChild.idVq.trim()}`
                        : viewingChild.idVq || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Tipo de Registro</span>
                    <p className="text-sm font-semibold text-ink">
                      {viewingChild.registrationTypeDesc || viewingChild.registrationTypeCode || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Fecha de Nacimiento</span>
                    <p className="text-sm font-semibold text-ink">{viewingChild.birthDate || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Género</span>
                    <p className="text-sm font-semibold text-ink">{viewingChild.gender || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-line flex justify-end">
              <button
                type="button"
                onClick={() => setViewingChild(null)}
                className="h-8 px-5 bg-white border border-line rounded-full text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
