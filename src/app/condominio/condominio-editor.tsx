"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  type UpdateCondominioSettingsInput,
  updateCondominioSettingsAction,
} from "./actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";

type AssetFieldKey =
  | "condominiumLogoUrl"
  | "condominiumImageUrl"
  | "footerLogoUrl"
  | "privacyNoticePdfUrl";

interface CondominioEditorProps {
  initialValues: UpdateCondominioSettingsInput;
  condominiumSlug: string;
}

function toNumericString(value: string): string {
  if (!value || value === "Sin definir" || value === "--") {
    return "";
  }

  return value.replaceAll(",", "").replaceAll(" m2", "").trim();
}

function normalizeAssetLabel(field: AssetFieldKey): string {
  switch (field) {
    case "condominiumLogoUrl":
      return "Logotipo del condominio";
    case "condominiumImageUrl":
      return "Imagen alusiva del condominio";
    case "footerLogoUrl":
      return "Logo pie";
    case "privacyNoticePdfUrl":
      return "PDF de aviso de privacidad";
    default:
      return "Archivo";
  }
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
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

  const assets = useMemo(
    () => [
      {
        key: "condominiumLogoUrl" as const,
        accept: "image/*",
        kind: "condominium-logo" as const,
        previewType: "image" as const,
      },
      {
        key: "condominiumImageUrl" as const,
        accept: "image/*",
        kind: "condominium-image" as const,
        previewType: "image" as const,
      },
      {
        key: "footerLogoUrl" as const,
        accept: "image/*",
        kind: "footer-logo" as const,
        previewType: "image" as const,
      },
      {
        key: "privacyNoticePdfUrl" as const,
        accept: "application/pdf",
        kind: "privacy-pdf" as const,
        previewType: "pdf" as const,
      },
    ],
    [],
  );

  const onInput = (field: keyof UpdateCondominioSettingsInput, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onUpload = async (field: AssetFieldKey, file: File | null, kind: "condominium-logo" | "condominium-image" | "footer-logo" | "privacy-pdf") => {
    if (!file) {
      return;
    }

    setMessage("");
    setUploadingField(field);

    try {
      const uploaded = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId: form.projectId || "default-project",
        kind,
      });

      setForm((prev) => ({ ...prev, [field]: uploaded.url }));
      setMessage(`${normalizeAssetLabel(field)} cargado en Firebase.`);
    } catch (error) {
      console.error("[CondominioEditor] Upload failed", error);
      setMessage(`No se pudo subir ${normalizeAssetLabel(field)}.`);
    } finally {
      setUploadingField(null);
    }
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const response = await updateCondominioSettingsAction(form);
      setMessage(response.message);

      if (response.ok) {
        router.refresh();
      }
    });
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#2e221c]/18 bg-[linear-gradient(150deg,#fffaf2_0%,#f7ebdb_56%,#fff6ea_100%)] p-6 shadow-[0_18px_35px_rgba(31,26,23,0.1)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 top-[-6rem] h-44 w-44 rounded-full bg-[#bb7b56]/20 blur-3xl" />
        <div className="absolute -left-10 bottom-[-4rem] h-36 w-56 rounded-full bg-[#5f7f5b]/10 blur-3xl" />
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex rounded-full border border-[#9f6d50]/35 bg-[#fff5e8]/80 px-3 py-1 font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.2em] text-[#8b5a3c]">
            Edicion completa
          </p>
          <h3 className="mt-3 font-[var(--font-condo-display)] text-3xl text-[#2e221c] sm:text-4xl">
            Configuracion del condominio
          </h3>
          <p className="mt-2 max-w-2xl font-[var(--font-condo-body)] text-sm text-[#6a594d]">
            Edita datos generales, leyendas y documentos oficiales en un solo flujo de trabajo.
          </p>
        </div>
      </div>

      <form id="condominio-editor-form" onSubmit={onSubmit} className="relative mt-7 space-y-7">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Nombre", name: "projectName", type: "text" },
            { label: "Iniciales", name: "projectInitials", type: "text" },
            { label: "Formato (1-Vertical, 2-Horizontal, 3-Mixto)", name: "condominiumFormatId", type: "number" },
            { label: "Anio de arranque", name: "startYear", type: "number" },
            { label: "Total M2", name: "totalM2", type: "number" },
            { label: "Total APoLes", name: "totalApoles", type: "number" },
            { label: "Areas comunes M2", name: "commonAreasM2", type: "number" },
            { label: "Desarrollado", name: "developedBy", type: "text" },
          ].map((field) => (
            <label
              key={field.name}
              className="space-y-2 rounded-2xl border border-[#d9c4af] bg-[#fffef9]/95 p-3 shadow-[0_8px_18px_rgba(31,26,23,0.04)]"
            >
              <span className="block font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.16em] text-[#9a6a4a]">
                {field.label}
              </span>
              <input
                type={field.type}
                value={form[field.name as keyof UpdateCondominioSettingsInput] as string}
                onChange={(event) => onInput(field.name as keyof UpdateCondominioSettingsInput, event.target.value)}
                className="w-full rounded-xl border border-[#d8c5b1] bg-white px-3 py-2 font-[var(--font-condo-body)] text-sm text-[#2f221b] outline-none transition focus:border-[#9a6a4a] focus:ring-2 focus:ring-[#d7b79f]/55"
              />
            </label>
          ))}

          <label className="flex items-center gap-3 rounded-2xl border border-[#d9c4af] bg-[#fffef9]/95 p-3 shadow-[0_8px_18px_rgba(31,26,23,0.04)]">
            <input
              type="checkbox"
              checked={form.usesLandUseFormula}
              onChange={(event) => onInput("usesLandUseFormula", event.target.checked)}
              className="h-4 w-4 rounded border-[#9a6a4a] text-[#8b5a3c]"
            />
            <span className="font-[var(--font-condo-body)] text-sm text-[#2f221b]">Formula uso de suelo</span>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-[#d9c4af] bg-[#fffef9]/95 p-3 shadow-[0_8px_18px_rgba(31,26,23,0.04)]">
            <input
              type="checkbox"
              checked={form.hasVccc}
              onChange={(event) => onInput("hasVccc", event.target.checked)}
              className="h-4 w-4 rounded border-[#9a6a4a] text-[#8b5a3c]"
            />
            <span className="font-[var(--font-condo-body)] text-sm text-[#2f221b]">Manejo VCCC</span>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 rounded-2xl border border-[#d9c4af] bg-[#fffef9]/95 p-3 shadow-[0_8px_18px_rgba(31,26,23,0.04)]">
            <span className="block font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.16em] text-[#9a6a4a]">
              Sintesis aviso
            </span>
            <textarea
              rows={6}
              value={form.projectDescription}
              onChange={(event) => onInput("projectDescription", event.target.value)}
              className="w-full rounded-xl border border-[#d8c5b1] bg-white px-3 py-2 font-[var(--font-condo-body)] text-sm text-[#2f221b] outline-none transition focus:border-[#9a6a4a] focus:ring-2 focus:ring-[#d7b79f]/55"
            />
          </label>

          <label className="space-y-2 rounded-2xl border border-[#d9c4af] bg-[#fffef9]/95 p-3 shadow-[0_8px_18px_rgba(31,26,23,0.04)]">
            <span className="block font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.16em] text-[#9a6a4a]">
              Informacion de aviso de privacidad
            </span>
            <textarea
              rows={6}
              value={form.privacyNoticeText}
              onChange={(event) => onInput("privacyNoticeText", event.target.value)}
              className="w-full rounded-xl border border-[#d8c5b1] bg-white px-3 py-2 font-[var(--font-condo-body)] text-sm text-[#2f221b] outline-none transition focus:border-[#9a6a4a] focus:ring-2 focus:ring-[#d7b79f]/55"
            />
          </label>

          <label className="space-y-2 rounded-2xl border border-[#d9c4af] bg-[#fffef9]/95 p-3 shadow-[0_8px_18px_rgba(31,26,23,0.04)]">
            <span className="block font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.16em] text-[#9a6a4a]">
              Pie izquierdo de pagos
            </span>
            <textarea
              rows={6}
              value={form.footerLeft}
              onChange={(event) => onInput("footerLeft", event.target.value)}
              className="w-full rounded-xl border border-[#d8c5b1] bg-white px-3 py-2 font-[var(--font-condo-body)] text-sm text-[#2f221b] outline-none transition focus:border-[#9a6a4a] focus:ring-2 focus:ring-[#d7b79f]/55"
            />
          </label>

          <label className="space-y-2 rounded-2xl border border-[#d9c4af] bg-[#fffef9]/95 p-3 shadow-[0_8px_18px_rgba(31,26,23,0.04)]">
            <span className="block font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.16em] text-[#9a6a4a]">
              Pie derecho de pagos
            </span>
            <textarea
              rows={6}
              value={form.footerRight}
              onChange={(event) => onInput("footerRight", event.target.value)}
              className="w-full rounded-xl border border-[#d8c5b1] bg-white px-3 py-2 font-[var(--font-condo-body)] text-sm text-[#2f221b] outline-none transition focus:border-[#9a6a4a] focus:ring-2 focus:ring-[#d7b79f]/55"
            />
          </label>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#cfae92] bg-[linear-gradient(160deg,#fffef9_0%,#fff6eb_100%)] p-4 shadow-[0_10px_20px_rgba(31,26,23,0.06)]">
          <p className="font-[var(--font-condo-body)] text-xs uppercase tracking-[0.16em] text-[#8b5a3c]">
            Documentos y assets (Firebase Storage)
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {assets.map((asset) => {
              const value = form[asset.key];
              const isUploading = uploadingField === asset.key;

              return (
                <div
                  key={asset.key}
                  className="rounded-xl border border-[#d8c5b1] bg-white/95 p-3 shadow-[0_6px_14px_rgba(31,26,23,0.05)]"
                >
                  <p className="font-[var(--font-condo-body)] text-xs font-semibold uppercase tracking-[0.14em] text-[#8b5a3c]">
                    {normalizeAssetLabel(asset.key)}
                  </p>
                  <input
                    type="file"
                    accept={asset.accept}
                    onChange={(event) => onUpload(asset.key, event.target.files?.[0] ?? null, asset.kind)}
                    className="mt-2 block w-full text-xs text-[#5d4f46] file:mr-3 file:rounded-full file:border-0 file:bg-[#2e221c] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#fff5e8]"
                  />

                  <div className="mt-2 overflow-hidden rounded-lg border border-[#ddccb9] bg-[#f8efe4]">
                    {isHttpUrl(value) ? (
                      asset.previewType === "image" ? (
                          <div className="relative h-32 w-full">
                            <Image
                              src={value}
                              alt={normalizeAssetLabel(asset.key)}
                              fill
                              unoptimized
                              sizes="(max-width: 768px) 100vw, 25vw"
                              className="object-cover"
                            />
                          </div>
                      ) : (
                        <iframe
                          title={normalizeAssetLabel(asset.key)}
                          src={`${value}#toolbar=0&navpanes=0&scrollbar=0`}
                          className="h-32 w-full bg-white"
                        />
                      )
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center px-3 text-center font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.14em] text-[#8f7b6a]">
                        Sube un archivo para ver previsualizacion
                      </div>
                    )}
                  </div>

                  <p className="mt-2 break-all rounded-lg bg-[#f7efe5] px-2 py-1 font-[var(--font-condo-body)] text-[11px] text-[#6d5d52]">
                    {getAssetDisplayName(value)}
                  </p>

                  {isUploading ? (
                    <p className="mt-2 font-[var(--font-condo-body)] text-xs text-[#8f2e23]">Subiendo...</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[#c9ab92] bg-[#fff8ee] p-4 sm:flex-row sm:items-center sm:justify-between">
          {message ? (
            <p className="font-[var(--font-condo-body)] text-sm text-[#4d3c30]">{message}</p>
          ) : (
            <p className="font-[var(--font-condo-body)] text-sm text-[#6c5b4f]">
              Guarda cuando termines de actualizar informacion y documentos.
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || uploadingField !== null}
            className="w-full rounded-full bg-[#2e221c] px-6 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#fff5e8] shadow-[0_6px_18px_rgba(46,34,28,0.26)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#1f1713] hover:shadow-[0_12px_26px_rgba(46,34,28,0.35)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}
