"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Bell, FileText, ImageIcon, X, ExternalLink } from "lucide-react";

import { saveNotificationAction } from "./actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { PageBackBadge } from "@/components/ui/page-back-badge";

interface NotificationTypeOption {
  id: string;
  label: string;
}

interface NotificationCategoryOption {
  id: string;
  name: string;
  color: string | null;
}

interface NotificacionFormShellProps {
  mode: "create" | "edit";
  notificationId?: string;
  condominiumSlug: string;
  options: {
    typeOptions: NotificationTypeOption[];
    categoryOptions: NotificationCategoryOption[];
  };
  initialData: {
    title: string;
    message: string;
    sentAt: string;
    validUntil: string;
    audienceTypeId: string;
    categoryId: string;
    imageUrl: string;
    imagePath: string;
    pdfUrl: string;
    pdfPath: string;
  };
}

type UploadingAsset = "image" | "pdf";

const ALLOW_LEGACY_NOTIFICATION_ASSET_FALLBACK =
  process.env.NEXT_PUBLIC_ALLOW_LEGACY_NOTIFICATION_ASSET_FALLBACK?.trim().toLowerCase() === "true";

function normalizeColor(value: string | null): string {
  if (!value) {
    return "#6D5C53";
  }

  const normalized = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : "#6D5C53";
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function isLegacyNotificationAssetUrl(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("sistemasabanza.com/insulae") ||
    normalized.startsWith("imagenes/notificaciones/") ||
    normalized.startsWith("/imagenes/notificaciones/") ||
    normalized.startsWith("notificaciones/")
  );
}

function canUseAssetUrlInRuntime(value: string): boolean {
  if (!isHttpUrl(value)) {
    return false;
  }

  if (isLegacyNotificationAssetUrl(value) && !ALLOW_LEGACY_NOTIFICATION_ASSET_FALLBACK) {
    return false;
  }

  return true;
}

function getAssetDisplayName(value: string): string {
  if (!value) {
    return "Sin archivo cargado";
  }

  if (!isHttpUrl(value)) {
    return value;
  }

  try {
    const parsed = new URL(value);
    const decodedPath = decodeURIComponent(parsed.pathname);
    const lastSegment = decodedPath.split("/").filter(Boolean).pop();
    return lastSegment || "archivo";
  } catch {
    return value;
  }
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") {
    return true;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "pdf";
}

export function NotificacionFormShell({
  mode,
  notificationId,
  condominiumSlug,
  options,
  initialData,
}: NotificacionFormShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messageState, setMessageState] = useState("");
  const [uploadingAsset, setUploadingAsset] = useState<UploadingAsset | null>(null);

  const [title, setTitle] = useState(initialData.title);
  const [message, setMessage] = useState(initialData.message);
  const [sentAt, setSentAt] = useState(initialData.sentAt);
  const [validUntil, setValidUntil] = useState(initialData.validUntil);
  const [audienceTypeId, setAudienceTypeId] = useState(initialData.audienceTypeId || "3");
  const [categoryId, setCategoryId] = useState(initialData.categoryId);
  const [imageUrl, setImageUrl] = useState(initialData.imageUrl);
  const [imagePath, setImagePath] = useState(initialData.imagePath);
  const [pdfUrl, setPdfUrl] = useState(initialData.pdfUrl);
  const [pdfPath, setPdfPath] = useState(initialData.pdfPath);

  const selectedCategory = useMemo(
    () => options.categoryOptions.find((category) => category.id === categoryId) ?? null,
    [categoryId, options.categoryOptions],
  );

  const titleText = mode === "create" ? "Nueva notificacion" : "Editar notificacion";

  const onUploadImage = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!isImageFile(file)) {
      setMessageState("Solo se permiten imagenes para el adjunto visual.");
      return;
    }

    setMessageState("");
    setUploadingAsset("image");

    try {
      const uploaded = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId: "notificaciones",
        kind: "notification-image",
      });

      setImageUrl(uploaded.url);
      setImagePath(uploaded.fullPath);
      setMessageState("Imagen cargada en Firebase.");
    } catch (error) {
      console.error("[NotificacionFormShell] image upload failed", error);
      setMessageState("No se pudo subir la imagen.");
    } finally {
      setUploadingAsset(null);
    }
  };

  const onUploadPdf = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setMessageState("Solo se permiten archivos PDF.");
      return;
    }

    setMessageState("");
    setUploadingAsset("pdf");

    try {
      const uploaded = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId: "notificaciones",
        kind: "notification-pdf",
      });

      setPdfUrl(uploaded.url);
      setPdfPath(uploaded.fullPath);
      setMessageState("PDF cargado en Firebase.");
    } catch (error) {
      console.error("[NotificacionFormShell] pdf upload failed", error);
      setMessageState("No se pudo subir el PDF.");
    } finally {
      setUploadingAsset(null);
    }
  };

  const clearImage = () => {
    setImageUrl("");
    setImagePath("");
    setMessageState("Imagen removida del formulario.");
  };

  const clearPdf = () => {
    setPdfUrl("");
    setPdfPath("");
    setMessageState("PDF removido del formulario.");
  };

  const save = () => {
    setMessageState("");

    startTransition(async () => {
      const result = await saveNotificationAction({
        id: notificationId,
        title,
        message,
        sentAt,
        validUntil,
        audienceTypeId,
        categoryId: categoryId || null,
        imageUrl: imageUrl || null,
        imagePath: imagePath || null,
        pdfUrl: pdfUrl || null,
        pdfPath: pdfPath || null,
      });

      setMessageState(result.message);
      if (!result.ok) {
        return;
      }

      router.push("/notificaciones");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">{titleText}</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Comunicación Operativa</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Comunica avisos relevantes para el condominio, comercios o ambos.
            </p>
          </div>
        </div>
      </div>

      {/* ── Form card ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2">
          <Bell className="h-4 w-4 text-white/80" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">Contenido de la notificación</span>
        </div>

        <div className="p-5 sm:p-6 grid gap-5 md:grid-cols-2">

          {/* Título — full width */}
          <div className="md:col-span-2">
            <Input
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Mantenimiento preventivo"
            />
          </div>

          {/* Descripción — full width */}
          <div className="md:col-span-2">
            <Textarea
              label="Descripción"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detalle de la notificación..."
              className="min-h-28"
            />
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Tipo de audiencia</label>
            <select
              value={audienceTypeId}
              onChange={(e) => setAudienceTypeId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent"
            >
              {options.typeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Categoría</label>
            <div className="flex items-center gap-2">
              {selectedCategory && (
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: normalizeColor(selectedCategory.color) }}
                  aria-hidden
                />
              )}
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent"
              >
                <option value="">Sin categoría</option>
                {options.categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha publicación */}
          <Input
            label="Fecha de publicación"
            type="date"
            value={sentAt}
            onChange={(e) => setSentAt(e.target.value)}
          />

          {/* Vigencia */}
          <Input
            label="Vigencia"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />

          {/* Adjunto imagen — full width */}
          <div className="md:col-span-2 rounded-card border border-line/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Adjunto imagen
              </p>
              {uploadingAsset === "image" && (
                <Badge variant="warning" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">Subiendo...</Badge>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => onUploadImage(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-3 file:py-1 file:text-xs file:font-bold file:text-white file:uppercase file:tracking-widest cursor-pointer"
            />

            <div className="overflow-hidden rounded-md border border-line/40 bg-canvas/60">
              {canUseAssetUrlInRuntime(imageUrl) ? (
                <div className="relative h-36 w-full">
                  <Image src={imageUrl} alt="Adjunto de notificación" fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                </div>
              ) : (
                <div className="flex h-28 items-center justify-center text-[10px] font-bold uppercase tracking-widest text-ink-soft/50">
                  Sube una imagen para ver previsualización
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="break-all text-xs text-ink-soft">{getAssetDisplayName(imageUrl || imagePath)}</p>
              {(imageUrl || imagePath) && (
                <button type="button" onClick={clearImage} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-danger hover:underline">
                  <X className="h-3 w-3" /> Quitar
                </button>
              )}
            </div>
          </div>

          {/* Adjunto PDF — full width */}
          <div className="md:col-span-2 rounded-card border border-line/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Adjunto PDF
              </p>
              {uploadingAsset === "pdf" && (
                <Badge variant="warning" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">Subiendo...</Badge>
              )}
            </div>

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => onUploadPdf(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-3 file:py-1 file:text-xs file:font-bold file:text-white file:uppercase file:tracking-widest cursor-pointer"
            />

            <div className="overflow-hidden rounded-md border border-line/40 bg-canvas/60">
              {canUseAssetUrlInRuntime(pdfUrl) ? (
                <iframe title="Adjunto PDF" src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="h-48 w-full bg-white" />
              ) : (
                <div className="flex h-28 items-center justify-center text-[10px] font-bold uppercase tracking-widest text-ink-soft/50">
                  Sube un PDF para ver previsualización
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="break-all text-xs text-ink-soft">{getAssetDisplayName(pdfUrl || pdfPath)}</p>
              <div className="flex items-center gap-2">
                {canUseAssetUrlInRuntime(pdfUrl) && (
                  <a href={pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand hover:underline">
                    <ExternalLink className="h-3 w-3" /> Abrir PDF
                  </a>
                )}
                {(pdfUrl || pdfPath) && (
                  <button type="button" onClick={clearPdf} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-danger hover:underline">
                    <X className="h-3 w-3" /> Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-wrap items-center gap-3 border-t border-line/30 pt-4">
          <Button
            type="button"
            onClick={save}
            disabled={isPending || uploadingAsset !== null}
            className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25"
          >
            {isPending ? "Guardando..." : "Guardar notificación"}
          </Button>
          <Button variant="subtle" asChild size="sm" className="h-8 rounded-full">
            <Link href="/notificaciones">Cancelar</Link>
          </Button>
          {messageState ? (
            <p className={`text-xs font-bold uppercase tracking-wide ${messageState.toLowerCase().includes("correct") || messageState.toLowerCase().includes("cargad") ? "text-brand" : "text-danger"}`}>
              {messageState}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
