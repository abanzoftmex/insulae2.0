"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Save, 
  Upload, 
  FileText, 
  Loader2,
  ExternalLink,
  Info,
  Settings,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

import {
  type UpdateCondominioSettingsInput,
  updateCondominioSettingsAction,
} from "./actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/shared/utils/cn";

type AssetFieldKey =
  | "condominiumLogoUrl"
  | "condominiumImageUrl"
  | "footerLogoUrl"
  | "privacyNoticePdfUrl";

type AssetKind = "condominium-logo" | "condominium-image" | "footer-logo" | "privacy-pdf";

interface CondominioEditorProps {
  initialValues: UpdateCondominioSettingsInput;
  condominiumSlug: string;
}

function toNumericString(value: string): string {
  if (!value || value === "Sin definir" || value === "--") return "";
  return value.replaceAll(",", "").replaceAll(" m2", "").trim();
}

function normalizeAssetLabel(field: AssetFieldKey): string {
  switch (field) {
    case "condominiumLogoUrl": return "Logotipo Principal";
    case "condominiumImageUrl": return "Imagen de Portada";
    case "footerLogoUrl": return "Logo de Pie de Página";
    case "privacyNoticePdfUrl": return "Aviso de Privacidad (PDF)";
    default: return "Archivo";
  }
}

export function CondominioEditor({ initialValues, condominiumSlug }: CondominioEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<UpdateCondominioSettingsInput>({
    ...initialValues,
    startYear: toNumericString(initialValues.startYear),
    condominiumFormatId: toNumericString(initialValues.condominiumFormatId),
    totalM2: toNumericString(initialValues.totalM2),
    totalApoles: toNumericString(initialValues.totalApoles),
    commonAreasM2: toNumericString(initialValues.commonAreasM2),
  });
  const [message, setMessage] = useState<string>("");
  const [uploadingField, setUploadingField] = useState<AssetFieldKey | null>(null);

  const assets = useMemo(() => [
    { key: "condominiumLogoUrl" as const, accept: "image/*", kind: "condominium-logo" as const },
    { key: "condominiumImageUrl" as const, accept: "image/*", kind: "condominium-image" as const },
    { key: "footerLogoUrl" as const, accept: "image/*", kind: "footer-logo" as const },
    { key: "privacyNoticePdfUrl" as const, accept: "application/pdf", kind: "privacy-pdf" as const },
  ], []);

  const onInput = (field: keyof UpdateCondominioSettingsInput, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onUpload = async (field: AssetFieldKey, file: File | null, kind: AssetKind) => {
    if (!file) return;
    setMessage("");
    setUploadingField(field);
    try {
      const uploaded = await uploadCondominiumAsset({ file, condominiumSlug, projectId: form.projectId || "default", kind });
      setForm((prev) => ({ ...prev, [field]: uploaded.url }));
      setMessage(`${normalizeAssetLabel(field)} actualizado.`);
    } catch (e) {
      setMessage("Error al subir archivo.");
    } finally {
      setUploadingField(null);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    startTransition(async () => {
      const res = await updateCondominioSettingsAction(form);
      setMessage(res.message);
      if (res.ok) router.refresh();
    });
  };

  return (
    <Card className="shadow-layered border-transparent overflow-hidden bg-card">
      <CardHeader className="px-5 py-4 border-b border-brand/40 bg-brand rounded-t-card">
        <div className="flex items-center gap-3">
           <div className="h-9 w-9 rounded-lg bg-brand-deep flex items-center justify-center text-white">
              <Settings className="h-5 w-5" />
           </div>
           <div>
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-white">Editor Maestro de Parámetros</CardTitle>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-none mt-0.5">Control de metadatos, assets y leyendas legales</p>
           </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-8">
          {/* Section 1: Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-1">
               <span className="h-2 w-2 rounded-full bg-brand" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Identidad y Formato</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Nombre del Proyecto" value={form.projectName} onChange={(e) => onInput("projectName", e.target.value)} />
              <Input label="Siglas" value={form.projectInitials} onChange={(e) => onInput("projectInitials", e.target.value)} />
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Formato Legal</label>
                <select 
                  value={form.condominiumFormatId} 
                  onChange={(e) => onInput("condominiumFormatId", e.target.value)}
                  className="h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium outline-none appearance-none focus:ring-2 focus:ring-brand-accent/20"
                >
                  <option value="1">Vertical</option>
                  <option value="2">Horizontal</option>
                  <option value="3">Mixto</option>
                </select>
              </div>
              <Input label="Año de Arranque" type="number" value={form.startYear} onChange={(e) => onInput("startYear", e.target.value)} />
            </div>
          </div>

          {/* Section 2: Technical Metrics */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-1">
               <span className="h-2 w-2 rounded-full bg-brand" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Métricas de Inventario</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <Input label="Total M2 Terreno" type="number" step="0.01" value={form.totalM2} onChange={(e) => onInput("totalM2", e.target.value)} />
               <Input label="Total APoLes" type="number" value={form.totalApoles} onChange={(e) => onInput("totalApoles", e.target.value)} />
               <Input label="M2 Áreas Comunes" type="number" step="0.01" value={form.commonAreasM2} onChange={(e) => onInput("commonAreasM2", e.target.value)} />
               <Input label="Desarrollador" value={form.developedBy} onChange={(e) => onInput("developedBy", e.target.value)} />
            </div>
            <div className="flex items-center gap-6 pt-2">
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={form.usesLandUseFormula} onChange={(e) => onInput("usesLandUseFormula", e.target.checked)} className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand-accent/20" />
                  <span className="text-[11px] font-bold uppercase text-ink-soft/60 group-hover:text-brand transition-colors">Activar Fórmula Uso Suelo</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={form.hasVccc} onChange={(e) => onInput("hasVccc", e.target.checked)} className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand-accent/20" />
                  <span className="text-[11px] font-bold uppercase text-ink-soft/60 group-hover:text-brand transition-colors">Activar Manejo VCCC</span>
               </label>
            </div>
          </div>

          {/* Section 3: Legal & Texts */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-1">
               <span className="h-2 w-2 rounded-full bg-brand" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Contenidos y Textos Legales</p>
            </div>
            <div className="flex flex-col gap-4">
               <RichTextEditor label="Sintesis de Aviso de Privacidad (Corta)" value={form.projectDescription} onChange={(html) => onInput("projectDescription", html)} minHeight="120px" />
               <RichTextEditor label="Cuerpo del Aviso de Privacidad" value={form.privacyNoticeText} onChange={(html) => onInput("privacyNoticeText", html)} minHeight="160px" />
               <RichTextEditor label="Pie de Recibos (Izquierdo)" value={form.footerLeft} onChange={(html) => onInput("footerLeft", html)} minHeight="120px" />
               <RichTextEditor label="Pie de Recibos (Derecho)" value={form.footerRight} onChange={(html) => onInput("footerRight", html)} minHeight="120px" />
            </div>
          </div>

          {/* Section 4: Assets */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 border-b border-line pb-1">
               <span className="h-2 w-2 rounded-full bg-brand" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Recursos Digitales (Assets)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {assets.map((asset) => {
                const value = form[asset.key] as string;
                const isUploading = uploadingField === asset.key;
                const hasFile = value && value.startsWith("http");

                return (
                  <div key={asset.key} className="p-3 bg-canvas/30 rounded-lg border border-line/50 flex flex-col gap-3">
                    <p className="text-[10px] font-bold uppercase text-brand tracking-tighter">{normalizeAssetLabel(asset.key)}</p>
                    <div className="relative group/asset overflow-hidden rounded-md border border-line bg-card h-24 flex items-center justify-center">
                       {hasFile ? (
                         asset.accept.includes("image") ? (
                           <img src={value} alt="" className="w-full h-full object-contain" />
                         ) : (
                           <div className="flex flex-col items-center gap-1">
                             <FileText className="h-6 w-6 text-brand/40" />
                             <span className="text-[9px] font-bold text-ink-soft/40 uppercase">PDF Cargado</span>
                           </div>
                         )
                       ) : (
                         <div className="flex flex-col items-center gap-1">
                           <Upload className="h-6 w-6 text-ink-soft/10" />
                           <span className="text-[9px] font-bold text-ink-soft/20 uppercase tracking-tighter">Sin archivo</span>
                         </div>
                       )}
                       {isUploading && (
                         <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] flex items-center justify-center">
                           <Loader2 className="h-5 w-5 animate-spin text-brand" />
                         </div>
                       )}
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="h-8 px-4 flex items-center justify-center gap-2 rounded-full bg-brand-deep text-white text-[10px] font-bold uppercase cursor-pointer shadow-md shadow-brand-deep/25 hover:bg-brand transition-colors">
                         <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden />
                         {hasFile ? "Reemplazar" : "Subir Archivo"}
                         <input type="file" className="hidden" accept={asset.accept} onChange={(e) => onUpload(asset.key, e.target.files?.[0] ?? null, asset.kind)} />
                       </label>
                       {hasFile && (
                         <a href={value} target="_blank" className="h-8 px-4 flex items-center justify-center gap-2 rounded-full bg-brand-deep text-white text-[10px] font-bold uppercase shadow-md shadow-brand-deep/25 hover:bg-brand transition-colors">
                           <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                           Ver Original
                         </a>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               {message && (
                 <div className={cn(
                   "px-4 py-2 rounded-full text-[11px] font-bold uppercase flex items-center gap-2",
                   message.toLowerCase().includes("error") || message.toLowerCase().includes("no se pudo") 
                    ? "bg-danger/10 text-danger" 
                    : "bg-brand-mint text-brand"
                 )}>
                   {message.toLowerCase().includes("error") ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                   {message}
                 </div>
               )}
            </div>
            <div className="flex items-center gap-3">
               <div className="hidden sm:flex items-center gap-2 text-ink-soft/40 mr-2">
                  <Info className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Cambios afectan persistencia global</span>
               </div>
               <Button 
                type="submit" 
                disabled={isPending || uploadingField !== null}
                className="h-10 px-10 text-[11px] font-bold uppercase gap-2 shadow-xl shadow-brand/20"
               >
                 {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                 Guardar Configuración
               </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
