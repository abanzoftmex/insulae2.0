"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { saveNotificationAction } from "./actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";

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
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f2ece2] px-5 pb-16 pt-8 text-[#231912] sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-11rem] top-[-8rem] h-[24rem] w-[24rem] rounded-full bg-[#1e7b78]/15 blur-3xl" />
        <div className="absolute right-[-8rem] top-[12rem] h-[22rem] w-[24rem] rounded-full bg-[#c36d2f]/18 blur-3xl" />
        <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(rgba(90,62,45,0.12)_1px,transparent_1px)] [background-size:15px_15px]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[#c8b5a3]/55 bg-[linear-gradient(120deg,rgba(255,255,255,0.95)_0%,rgba(248,236,219,0.92)_58%,rgba(236,222,201,0.9)_100%)] p-6 shadow-[0_22px_40px_rgba(35,23,16,0.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/notificaciones"
              className="inline-flex items-center rounded-xl border border-[#c9af97] bg-white/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b4936] transition hover:bg-[#fff6ea]"
            >
              Volver al listado
            </Link>

            <span className="inline-flex rounded-full border border-[#0d5f66]/40 bg-[#0d5f66]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b5a62]">
              Notificaciones
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-semibold leading-none text-[#2f2219] sm:text-5xl">{titleText}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5f5044] sm:text-base">
            Comunica avisos relevantes para condominio, comercios o ambos, usando el nuevo catalogo de categorias.
          </p>
        </header>

        <section className="rounded-3xl border border-[#cab7a6]/55 bg-white/82 p-5 shadow-[0_18px_34px_rgba(35,23,16,0.1)] backdrop-blur-sm sm:p-6">
          <article className="rounded-2xl border border-[#d8c6b7] bg-[#fffaf3] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6348]">Contenido de notificacion</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Titulo</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                  placeholder="Ejemplo: Mantenimiento preventivo"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Descripcion</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="min-h-32 w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                  placeholder="Detalle de la notificacion"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Tipo</span>
                <select
                  value={audienceTypeId}
                  onChange={(event) => setAudienceTypeId(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                >
                  {options.typeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Categoria</span>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                >
                  <option value="">Sin categoria</option>
                  {options.categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Fecha de publicacion</span>
                <input
                  type="date"
                  value={sentAt}
                  onChange={(event) => setSentAt(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Vigencia</span>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                />
              </label>

              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Color categoria</span>
                <div className="flex items-center gap-2 rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17]">
                  <span
                    className="h-5 w-5 rounded-md border border-black/10"
                    style={{ backgroundColor: normalizeColor(selectedCategory?.color ?? null) }}
                    aria-hidden
                  />
                  <span>{selectedCategory?.name ?? "Sin categoria seleccionada"}</span>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-[#d8c6b7] bg-white p-3 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Adjunto imagen</span>
                  {uploadingAsset === "image" ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f2e23]">Subiendo...</span>
                  ) : null}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onUploadImage(event.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-[#5d4f46] file:mr-3 file:rounded-full file:border-0 file:bg-[#2e221c] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#fff5e8]"
                />

                <div className="overflow-hidden rounded-xl border border-[#ddccb9] bg-[#f8efe4]">
                  {canUseAssetUrlInRuntime(imageUrl) ? (
                    <div className="relative h-36 w-full">
                      <Image
                        src={imageUrl}
                        alt="Adjunto de notificacion"
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-36 w-full items-center justify-center px-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#8f7b6a]">
                      Sube una imagen para ver previsualizacion
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all rounded-lg bg-[#f7efe5] px-2 py-1 text-[11px] text-[#6d5d52]">
                    {getAssetDisplayName(imageUrl || imagePath)}
                  </p>
                  {(imageUrl || imagePath) ? (
                    <button
                      type="button"
                      onClick={clearImage}
                      className="rounded-lg border border-[#b75b46] bg-[#fff1ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a3402e] transition hover:bg-[#ffe6df]"
                    >
                      Quitar imagen
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-[#d8c6b7] bg-white p-3 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Adjunto PDF</span>
                  {uploadingAsset === "pdf" ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f2e23]">Subiendo...</span>
                  ) : null}
                </div>

                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => onUploadPdf(event.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-[#5d4f46] file:mr-3 file:rounded-full file:border-0 file:bg-[#2e221c] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#fff5e8]"
                />

                <div className="overflow-hidden rounded-xl border border-[#ddccb9] bg-[#f8efe4]">
                  {canUseAssetUrlInRuntime(pdfUrl) ? (
                    <iframe
                      title="Adjunto PDF de notificacion"
                      src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="h-48 w-full bg-white"
                    />
                  ) : (
                    <div className="flex h-36 w-full items-center justify-center px-3 text-center text-[11px] uppercase tracking-[0.14em] text-[#8f7b6a]">
                      Sube un PDF para ver previsualizacion
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all rounded-lg bg-[#f7efe5] px-2 py-1 text-[11px] text-[#6d5d52]">
                    {getAssetDisplayName(pdfUrl || pdfPath)}
                  </p>
                  <div className="flex items-center gap-2">
                    {canUseAssetUrlInRuntime(pdfUrl) ? (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-[#c8ae97] bg-[#fff7ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4b39] transition hover:bg-[#ffeedb]"
                      >
                        Abrir PDF
                      </a>
                    ) : null}
                    {(pdfUrl || pdfPath) ? (
                      <button
                        type="button"
                        onClick={clearPdf}
                        className="rounded-lg border border-[#b75b46] bg-[#fff1ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a3402e] transition hover:bg-[#ffe6df]"
                      >
                        Quitar PDF
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#d8c4b0] pt-5">
            <button
              type="button"
              onClick={save}
              disabled={isPending || uploadingAsset !== null}
              className="rounded-xl border border-[#0c5a62] bg-[linear-gradient(150deg,#0C7C86_0%,#0C5A62_100%)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_22px_rgba(12,90,98,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Guardar notificacion"}
            </button>

            <Link
              href="/notificaciones"
              className="inline-flex rounded-xl border border-[#c8ae95] bg-white/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#694938] transition hover:bg-[#fff4e8]"
            >
              Cancelar
            </Link>

            {messageState ? (
              <p
                className={`text-xs font-semibold uppercase tracking-[0.1em] ${
                  messageState.toLowerCase().includes("correct") ? "text-[#2f6a40]" : "text-[#9c3d2b]"
                }`}
              >
                {messageState}
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
