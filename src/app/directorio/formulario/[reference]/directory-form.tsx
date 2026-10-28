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
  Store,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  unlinkCommerceFromPersonAction,
  saveCommerceForPersonAction,
} from "./actions";
import type { DirectoryContactParticipation, LinkedCommerce } from "@/modules/directory/domain/directory";

interface DirectoryFormProps {
  reference: string;
  condominiumSlug: string;
  initialData: DirectoryContactParticipation;
  roleOptions: Array<{ id: string; name: string }>;
  backHref: string;
  contactOptions?: Array<{ id: string; name: string }>;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function DirectoryForm({
  reference,
  condominiumSlug,
  initialData,
  roleOptions,
  backHref,
  contactOptions = [],
  canCreate = true,
  canUpdate = true,
  canDelete = true,
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
  const [childApolfap, setChildApolfap] = useState("");
  const [isChildPending, startChildTransition] = useTransition();
  const [editingTypeDesc, setEditingTypeDesc] = useState("");

  const uniqueAssignments = Array.from(
    new Map((initialData.assignments || []).map((a) => [a.privateAreaId, a])).values()
  );

  const [linkedCommerces, setLinkedCommerces] = useState<LinkedCommerce[]>(initialData.linkedCommerces || []);
  const [isCommercePending, startCommerceTransition] = useTransition();
  const [isAddCommerceOpen, setIsAddCommerceOpen] = useState(false);
  const [newCommerceData, setNewCommerceData] = useState({
    name: "",
    businessName: "",
    rfc: "",
    phone: "",
    email: "",
    administrativeContactUserId: "",
    operativeContactUserId: "",
  });
  const [editingCommerceId, setEditingCommerceId] = useState<string | null>(null);
  const [editingCommerceValues, setEditingCommerceValues] = useState<Record<string, {
    name: string;
    businessName: string;
    rfc: string;
    phone: string;
    email: string;
    administrativeContactUserId: string;
    operativeContactUserId: string;
  }>>({});

  useEffect(() => {
    setLinkedCommerces(initialData.linkedCommerces || []);
    const initialMap: Record<string, any> = {};
    (initialData.linkedCommerces || []).forEach((c) => {
      initialMap[c.id] = {
        name: c.name || "",
        businessName: c.businessName || "",
        rfc: c.rfc || "",
        phone: c.phone || "",
        email: c.email || "",
        administrativeContactUserId: c.administrativeContact?.id || "",
        operativeContactUserId: c.operativeContact?.id || "",
      };
    });
    setEditingCommerceValues(initialMap);
  }, [initialData.linkedCommerces]);

  const handleUnlinkCommerce = (userCommerceId: string, commerceName: string) => {
    if (!confirm(`¿Estás seguro de que deseas desvincular el comercio "${commerceName}" de esta persona? El comercio y sus demás relaciones en el sistema no se eliminarán.`)) {
      return;
    }
    startCommerceTransition(async () => {
      const res = await unlinkCommerceFromPersonAction(userCommerceId);
      if (res.ok) {
        setLinkedCommerces((prev) => prev.filter((c) => c.id !== userCommerceId));
        setMessage({ type: "success", text: res.message });
        router.refresh();
      } else {
        setMessage({ type: "error", text: res.message });
      }
    });
  };

  const handleSaveNewCommerce = () => {
    if (!newCommerceData.name.trim()) {
      alert("Por favor ingrese el nombre comercial.");
      return;
    }
    startCommerceTransition(async () => {
      const res = await saveCommerceForPersonAction({
        userId: initialData.id,
        name: newCommerceData.name,
        businessName: newCommerceData.businessName,
        rfc: newCommerceData.rfc,
        phone: newCommerceData.phone,
        email: newCommerceData.email,
        administrativeContactUserId: newCommerceData.administrativeContactUserId || null,
        operativeContactUserId: newCommerceData.operativeContactUserId || null,
      });
      if (res.ok) {
        setMessage({ type: "success", text: res.message });
        setIsAddCommerceOpen(false);
        setNewCommerceData({
          name: "",
          businessName: "",
          rfc: "",
          phone: "",
          email: "",
          administrativeContactUserId: "",
          operativeContactUserId: "",
        });
        router.refresh();
      } else {
        setMessage({ type: "error", text: res.message });
      }
    });
  };

  const handleSaveEditCommerce = (commerceItem: LinkedCommerce) => {
    const values = editingCommerceValues[commerceItem.id];
    if (!values || !values.name.trim()) {
      alert("El nombre comercial no puede estar vacío.");
      return;
    }
    startCommerceTransition(async () => {
      const res = await saveCommerceForPersonAction({
        userId: initialData.id,
        userCommerceId: commerceItem.id,
        commerceId: commerceItem.commerceId,
        name: values.name,
        businessName: values.businessName,
        rfc: values.rfc,
        phone: values.phone,
        email: values.email,
        administrativeContactUserId: values.administrativeContactUserId || null,
        operativeContactUserId: values.operativeContactUserId || null,
      });
      if (res.ok) {
        setMessage({ type: "success", text: res.message });
        setEditingCommerceId(null);
        router.refresh();
      } else {
        setMessage({ type: "error", text: res.message });
      }
    });
  };

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
    registrationTypeCode: initialData.registrationTypeCode || "8-01",
    registrationTypeDesc: initialData.registrationTypeDesc || "Condómino",
    idVq: initialData.idVq || "",
    apolfap: initialData.apolfap || (uniqueAssignments.length > 0 ? uniqueAssignments[0].privateAreaName : ""),
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
    if (!canUpdate) return;
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
    if (!canUpdate) return;
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
    if (!canUpdate) return;
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
  const fieldCls = "w-full h-9 px-3 rounded-md border border-line bg-white text-sm text-[#3a2f25] outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed";
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
          {!canUpdate && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Modo sólo lectura
            </span>
          )}
          <a
            href={backHref}
            className="flex items-center gap-2 h-9 px-6 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
          >
            {canUpdate ? "Cancelar" : "Volver"}
          </a>
          {canUpdate && (
            <button
              onClick={handleSave}
              disabled={isPending || isUploading}
              className="flex items-center gap-2 h-9 px-6 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          )}
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
                  {canCreate && (
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
                  )}
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
                          disabled={!canUpdate}
                          onClick={() => canUpdate && handleChange("userType", opt.value)}
                          className={cn(
                            "flex-1 h-9 px-2 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors disabled:cursor-not-allowed",
                            formData.userType === opt.value
                              ? "bg-brand text-white border-brand"
                              : "bg-white text-ink-soft border-line hover:border-brand/40",
                            !canUpdate && formData.userType !== opt.value && "opacity-60"
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
                          disabled={!canUpdate}
                          onClick={() => canUpdate && handleChange("requiresInvoice", opt.value)}
                          className={cn(
                            "flex-1 h-9 px-4 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors disabled:cursor-not-allowed",
                            formData.requiresInvoice === opt.value
                              ? "bg-brand text-white border-brand"
                              : "bg-white text-ink-soft border-line hover:border-brand/40",
                            !canUpdate && formData.requiresInvoice !== opt.value && "opacity-60"
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
                      disabled={!canUpdate}
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
                          disabled={!canUpdate}
                          onChange={handleFileUpload}
                          className={cn(
                            "absolute inset-0 w-full h-full opacity-0 z-10",
                            canUpdate ? "cursor-pointer" : "cursor-not-allowed"
                          )}
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
                      disabled={!canUpdate}
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
                        disabled={!canUpdate}
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
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => setIsManagerOpen(true)}
                          className="h-9 px-3 bg-canvas hover:bg-canvas/80 border border-line text-ink rounded-md transition-colors flex items-center justify-center shrink-0"
                          title="Gestionar tipos"
                        >
                          <Settings className="w-4 h-4 text-ink-soft" />
                        </button>
                      )}
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

              {/* Cards de Usuarios Anidados pertenecientes a la ApolFap seleccionada */}
              {(() => {
                const currentArea = formData.apolfap;
                const activeAreaChildren = children.filter((child) =>
                  child.apolfap ? child.apolfap === currentArea : !currentArea || currentArea === initialData.apolfap
                );

                return (
                  <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-700" />
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-green-800">
                          Usuarios Anidados Vinculados {currentArea ? `(${currentArea})` : ""} ({activeAreaChildren.length})
                        </h3>
                      </div>
                    </div>

                    {activeAreaChildren.length === 0 ? (
                      <div className="p-4 rounded-xl bg-canvas/40 border border-dashed border-line text-center text-ink-soft text-xs">
                        No hay usuarios anidados vinculados a la área <span className="font-bold text-ink">{currentArea || "seleccionada"}</span>.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeAreaChildren.map((child) => {
                          const fullChildName = [
                            child.firstName,
                            child.lastNamePaterno || child.lastName,
                            child.lastNameMaterno
                          ].filter(Boolean).join(" ").trim() || "Sin nombre";

                          const childApol = child.apolfap || currentArea || "";
                          const fullSdvId = childApol && child.idVq
                            ? `${childApol.trim()}${child.idVq.trim()}`
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
                                    {canDelete && (
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
                                    )}
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
                    )}
                  </div>
                );
              })()}

              {/* Información personal */}
              <div className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <p className={sectionTitleCls}>
                    <Users className="w-4 h-4 text-brand" />
                    Información del propietario
                  </p>
                </div>
                <div className={`${sectionBodyCls} grid grid-cols-1 sm:grid-cols-3 gap-4`}>
                  <Input label="Nombre" disabled={!canUpdate} value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
                  <Input label="Apellido Paterno" disabled={!canUpdate} value={formData.lastNamePaterno} onChange={(e) => handleChange("lastNamePaterno", e.target.value)} />
                  <Input label="Apellido Materno" disabled={!canUpdate} value={formData.lastNameMaterno} onChange={(e) => handleChange("lastNameMaterno", e.target.value)} />
                  <Input label="CURP" disabled={!canUpdate} value={formData.curp} onChange={(e) => handleChange("curp", e.target.value)} />
                  <Input label="Teléfono" disabled={!canUpdate} value={formData.personalPhone} onChange={(e) => handleChange("personalPhone", e.target.value)} />
                  <Input label="Email Personal" disabled={!canUpdate} value={formData.personalEmail} onChange={(e) => handleChange("personalEmail", e.target.value)} />

                  <div className="space-y-1.5">
                    <label className={labelCls}>Fecha de nacimiento</label>
                    <input
                      type="date"
                      disabled={!canUpdate}
                      value={formData.birthDate}
                      onChange={(e) => handleChange("birthDate", e.target.value)}
                      className={fieldCls}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>Género</label>
                    <select
                      value={formData.gender}
                      disabled={!canUpdate}
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
                    <Input label="Dirección" disabled={!canUpdate} value={formData.address} onChange={(e) => handleChange("address", e.target.value)} />
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
                  <Input label="Nombre Comercial" disabled={!canUpdate} value={formData.commercialName} onChange={(e) => handleChange("commercialName", e.target.value)} />
                  <Input label="Razón Social" disabled={!canUpdate} value={formData.businessName} onChange={(e) => handleChange("businessName", e.target.value)} />
                  <Input label="RFC" disabled={!canUpdate} value={formData.rfc} onChange={(e) => handleChange("rfc", e.target.value)} />
                  <Input label="Teléfono Empresarial" disabled={!canUpdate} value={formData.businessPhone} onChange={(e) => handleChange("businessPhone", e.target.value)} />
                  <Input label="Email Empresarial" disabled={!canUpdate} value={formData.businessEmail} onChange={(e) => handleChange("businessEmail", e.target.value)} />
                  <div className="sm:col-span-2">
                    <Input label="Dirección Fiscal" disabled={!canUpdate} value={formData.taxAddress} onChange={(e) => handleChange("taxAddress", e.target.value)} />
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
                            disabled={!canUpdate}
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
                            disabled={!canUpdate}
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
                    {canUpdate && (
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button type="button" onClick={handleUpdatePassword} disabled={isPasswordPending} className="h-9 px-4 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:opacity-50">
                          {isPasswordPending ? "Actualizando..." : "Actualizar contraseña"}
                        </button>
                        <button type="button" onClick={handleGenerateTempPassword} disabled={isPasswordPending} className="h-9 px-4 rounded-full bg-white border border-line text-ink text-[10px] font-bold uppercase tracking-widest hover:bg-canvas transition-all disabled:opacity-50">
                          {isPasswordPending ? "Actualizando..." : "Generar y enviar contraseña provisional"}
                        </button>
                      </div>
                    )}
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


      {/* Comercios con los que cuenta */}
      <div className="space-y-4 pt-4">
        <div className="pb-3 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-brand" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-brand">
              Comercios con los que cuenta ({linkedCommerces.length})
            </h2>
          </div>
          {canUpdate && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAddCommerceOpen}
                onChange={(e) => setIsAddCommerceOpen(e.target.checked)}
                className="rounded border-[#c59b27] text-brand focus:ring-brand h-4 w-4 accent-[#c59b27]"
              />
              <span className="text-xs font-semibold text-ink-soft hover:text-brand transition-colors">
                Agregar comercio
              </span>
            </label>
          )}
        </div>

        {/* Formulario para agregar comercio */}
        {isAddCommerceOpen && (
          <div className="p-5 rounded-xl border border-[#c59b27]/60 bg-white shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-line/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand">Nuevo comercio para vincular</h3>
              <span className="text-[10px] text-ink-soft">Complete los datos del comercio</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Nombre comercial *</label>
                <Input
                  value={newCommerceData.name}
                  onChange={(e) => setNewCommerceData({ ...newCommerceData, name: e.target.value })}
                  placeholder="Ej. Baños del Centro"
                  className="h-9 border-[#c59b27]/40 focus:border-brand"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Razón social</label>
                <Input
                  value={newCommerceData.businessName}
                  onChange={(e) => setNewCommerceData({ ...newCommerceData, businessName: e.target.value })}
                  placeholder="Ej. Administradora Val'Quirico A.C."
                  className="h-9 border-[#c59b27]/40 focus:border-brand"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">RFC</label>
                <Input
                  value={newCommerceData.rfc}
                  onChange={(e) => setNewCommerceData({ ...newCommerceData, rfc: e.target.value })}
                  placeholder="Ej. AVA1706221G3"
                  className="h-9 border-[#c59b27]/40 focus:border-brand uppercase"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Teléfono</label>
                <Input
                  value={newCommerceData.phone}
                  onChange={(e) => setNewCommerceData({ ...newCommerceData, phone: e.target.value })}
                  placeholder="Ej. 2223622750"
                  className="h-9 border-[#c59b27]/40 focus:border-brand"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Email</label>
                <Input
                  value={newCommerceData.email}
                  onChange={(e) => setNewCommerceData({ ...newCommerceData, email: e.target.value })}
                  placeholder="Ej. finanzas@valquirico.com"
                  className="h-9 border-[#c59b27]/40 focus:border-brand"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Contacto administrativo</label>
                <select
                  value={newCommerceData.administrativeContactUserId}
                  onChange={(e) => setNewCommerceData({ ...newCommerceData, administrativeContactUserId: e.target.value })}
                  className="w-full h-9 rounded-md border border-[#c59b27]/40 bg-white px-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Seleccionar contacto...</option>
                  {contactOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Contacto operativo</label>
                <select
                  value={newCommerceData.operativeContactUserId}
                  onChange={(e) => setNewCommerceData({ ...newCommerceData, operativeContactUserId: e.target.value })}
                  className="w-full h-9 rounded-md border border-[#c59b27]/40 bg-white px-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Seleccionar contacto...</option>
                  {contactOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  disabled={isCommercePending}
                  onClick={handleSaveNewCommerce}
                  className="h-9 px-4 bg-brand hover:bg-brand-accent text-white text-xs font-bold uppercase tracking-wider flex-1"
                >
                  Guardar comercio
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddCommerceOpen(false)}
                  className="h-9 px-3 text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Cuadrícula de comercios vinculados */}
        {linkedCommerces.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-line text-ink-soft text-xs">
            Sin comercios vinculados actualmente a este contacto.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {linkedCommerces.map((commerce) => {
              const isEditing = editingCommerceId === commerce.id;
              const vals = editingCommerceValues[commerce.id] || {
                name: commerce.name,
                businessName: commerce.businessName || "",
                rfc: commerce.rfc || "",
                phone: commerce.phone || "",
                email: commerce.email || "",
                administrativeContactUserId: commerce.administrativeContact?.id || "",
                operativeContactUserId: commerce.operativeContact?.id || "",
              };

              return (
                <div
                  key={commerce.id}
                  className="bg-white border border-[#c59b27]/70 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 relative hover:border-[#c59b27] transition-all"
                >
                  <div className="space-y-3">
                    {/* Nombre comercial */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Nombre comercial</label>
                      <div className="relative">
                        <Input
                          disabled={!isEditing}
                          value={vals.name}
                          onChange={(e) => {
                            setEditingCommerceValues((prev) => ({
                              ...prev,
                              [commerce.id]: { ...vals, name: e.target.value },
                            }));
                          }}
                          className={cn(
                            "h-8 text-xs font-semibold pr-7 border-[#c59b27]/40 rounded-lg",
                            !isEditing && "bg-[#faf9f6] text-ink cursor-default"
                          )}
                        />
                        {vals.name && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
                        )}
                      </div>
                    </div>

                    {/* Razón social */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Razón social</label>
                      <div className="relative">
                        <Input
                          disabled={!isEditing}
                          value={vals.businessName}
                          onChange={(e) => {
                            setEditingCommerceValues((prev) => ({
                              ...prev,
                              [commerce.id]: { ...vals, businessName: e.target.value },
                            }));
                          }}
                          placeholder="Sin razón social"
                          className={cn(
                            "h-8 text-xs font-medium pr-7 border-[#c59b27]/40 rounded-lg",
                            !isEditing && "bg-[#faf9f6] text-ink cursor-default"
                          )}
                        />
                        {vals.businessName && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
                        )}
                      </div>
                    </div>

                    {/* RFC */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">RFC</label>
                      <div className="relative">
                        <Input
                          disabled={!isEditing}
                          value={vals.rfc}
                          onChange={(e) => {
                            setEditingCommerceValues((prev) => ({
                              ...prev,
                              [commerce.id]: { ...vals, rfc: e.target.value },
                            }));
                          }}
                          placeholder="Sin RFC"
                          className={cn(
                            "h-8 text-xs font-mono uppercase pr-7 border-[#c59b27]/40 rounded-lg",
                            !isEditing && "bg-[#faf9f6] text-ink cursor-default"
                          )}
                        />
                        {vals.rfc && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
                        )}
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Teléfono</label>
                      <div className="relative">
                        <Input
                          disabled={!isEditing}
                          value={vals.phone}
                          onChange={(e) => {
                            setEditingCommerceValues((prev) => ({
                              ...prev,
                              [commerce.id]: { ...vals, phone: e.target.value },
                            }));
                          }}
                          placeholder="Sin teléfono"
                          className={cn(
                            "h-8 text-xs pr-7 border-[#c59b27]/40 rounded-lg",
                            !isEditing && "bg-[#faf9f6] text-ink cursor-default"
                          )}
                        />
                        {vals.phone && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Email</label>
                      <div className="relative">
                        <Input
                          disabled={!isEditing}
                          value={vals.email}
                          onChange={(e) => {
                            setEditingCommerceValues((prev) => ({
                              ...prev,
                              [commerce.id]: { ...vals, email: e.target.value },
                            }));
                          }}
                          placeholder="Sin email"
                          className={cn(
                            "h-8 text-xs pr-7 border-[#c59b27]/40 rounded-lg",
                            !isEditing && "bg-[#faf9f6] text-ink cursor-default"
                          )}
                        />
                        {vals.email && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
                        )}
                      </div>
                    </div>

                    {/* Contacto administrativo */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Contacto administrativo</label>
                      {isEditing ? (
                        <select
                          value={vals.administrativeContactUserId}
                          onChange={(e) => {
                            setEditingCommerceValues((prev) => ({
                              ...prev,
                              [commerce.id]: { ...vals, administrativeContactUserId: e.target.value },
                            }));
                          }}
                          className="w-full h-8 rounded-lg border border-[#c59b27]/40 bg-white px-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          <option value="">Seleccionar contacto...</option>
                          {contactOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="h-8 px-2.5 flex items-center justify-between rounded-lg border border-[#c59b27]/40 bg-[#faf9f6] text-xs text-ink truncate">
                          <span className="truncate">{commerce.administrativeContact?.name || "Sin contacto"}</span>
                          {commerce.administrativeContact && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Contacto operativo */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Contacto operativo</label>
                      {isEditing ? (
                        <select
                          value={vals.operativeContactUserId}
                          onChange={(e) => {
                            setEditingCommerceValues((prev) => ({
                              ...prev,
                              [commerce.id]: { ...vals, operativeContactUserId: e.target.value },
                            }));
                          }}
                          className="w-full h-8 rounded-lg border border-[#c59b27]/40 bg-white px-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          <option value="">Seleccionar contacto...</option>
                          {contactOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="h-8 px-2.5 flex items-center justify-between rounded-lg border border-[#c59b27]/40 bg-[#faf9f6] text-xs text-ink truncate">
                          <span className="truncate">{commerce.operativeContact?.name || "Sin contacto"}</span>
                          {commerce.operativeContact && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    {canUpdate && (
                      isEditing ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isCommercePending}
                            onClick={() => handleSaveEditCommerce(commerce)}
                            className="flex-1 h-7 text-[10px] font-bold uppercase bg-brand hover:bg-brand-accent text-white"
                          >
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingCommerceId(null)}
                            className="h-7 text-[10px] px-2"
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCommerceId(commerce.id)}
                          className="flex-1 h-7 text-[10px] font-bold uppercase border-brand/30 text-brand hover:bg-brand hover:text-white"
                        >
                          <Edit3 className="w-3 h-3 mr-1" /> Editar
                        </Button>
                      )
                    )}

                    {canUpdate && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isCommercePending}
                        onClick={() => handleUnlinkCommerce(commerce.id, commerce.name)}
                        className="h-7 px-3 bg-[#bfa255] hover:bg-[#a6893e] text-white text-[10px] font-bold uppercase gap-1 shrink-0"
                        title="Desvincular comercio de esta persona"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Participation Tables */}
      {initialData.participationBlocks.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="pb-3 border-b border-line">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-brand">Participación en el condominio</h2>
          </div>
          {initialData.participationBlocks.map((block) => {
            const isInitialOwnerBlock =
              block.title === "Propietario Inicial" || block.title.toLowerCase().includes("inicial");

            return (
              <div key={block.title} className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <p className={sectionTitleCls}>
                    {isInitialOwnerBlock ? "Propietario inicial (BLOCKCHAIN) Historia" : block.title}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-canvas border-b border-line">
                        <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-ink-soft">Tipo de entidad</th>
                        <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-ink-soft">Área privativa</th>
                        <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-ink-soft text-right">Porcentaje</th>
                        {!isInitialOwnerBlock && (
                          <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-ink-soft text-center">Comercios</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      <tr className="bg-brand-mint/10 font-bold">
                        <td className="px-4 py-2 text-[10px] uppercase tracking-wider text-brand">TOTAL</td>
                        <td className="px-4 py-2 text-[12px] text-brand">{block.totalAreas}</td>
                        <td className="px-4 py-2 text-right font-mono text-[12px] text-brand-accent">{block.totalPercentage.toFixed(4)}%</td>
                        {!isInitialOwnerBlock && (
                          <td className="px-4 py-2 text-center text-[10px] font-bold text-brand">
                            {Array.from(new Set(block.rows.flatMap((r) => r.commerceNames || []))).length}
                          </td>
                        )}
                      </tr>
                      {block.rows.length === 0 ? (
                        <tr>
                          <td colSpan={isInitialOwnerBlock ? 3 : 4} className="px-4 py-8 text-center text-ink-soft text-[11px]">
                            Sin registros de participación en este bloque.
                          </td>
                        </tr>
                      ) : (
                        block.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-canvas/50 transition-colors">
                            <td className="px-4 py-2 text-[11px] text-ink-soft">{row.entityType}</td>
                            <td className="px-4 py-2 text-[12px] font-medium text-ink">{row.privateAreaName}</td>
                            <td className="px-4 py-2 text-right font-mono text-[12px] text-brand-accent">{row.percentage.toFixed(4)}%</td>
                            {!isInitialOwnerBlock && (
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
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
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
                    apolfap: childApolfap || formData.apolfap,
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
                <div className="space-y-1.5 col-span-1 sm:col-span-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft leading-none">
                    ApolFap a la que pertenece *
                  </label>
                  <select
                    required
                    value={childApolfap || formData.apolfap || ""}
                    onChange={(e) => setChildApolfap(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-line rounded-sm outline-none focus:border-brand bg-white font-medium"
                  >
                    {uniqueAssignments.length === 0 ? (
                      <option value={formData.apolfap || ""}>
                        {formData.apolfap || "Sin área específica"}
                      </option>
                    ) : (
                      uniqueAssignments.map((assignment) => (
                        <option key={assignment.privateAreaId} value={assignment.privateAreaName}>
                          {assignment.privateAreaName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

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
