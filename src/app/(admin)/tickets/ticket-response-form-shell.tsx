"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveTicketResponseAction } from "./actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import type { TicketStatusValue } from "@/modules/tickets/domain/ticket";

interface TicketResponseFormShellProps {
  ticketId: string;
  condominiumSlug: string;
  initialData: {
    ticketNumber: string;
    departmentName: string;
    residentName: string;
    residentPhone: string;
    residentEmail: string;
    openedAtLabel: string;
    title: string;
    description: string;
    response: string;
    status: TicketStatusValue;
    responseImageUrl: string;
    responseImagePath: string;
    responsePdfUrl: string;
    responsePdfPath: string;
  };
  statusOptions: Array<{ value: TicketStatusValue; label: string }>;
}

type UploadingAsset = "image" | "pdf";

function trimSafe(value: string | null | undefined): string {
  return (value ?? "").trim();
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

function getAssetLabel(url: string, path: string): string {
  const candidate = trimSafe(url) || trimSafe(path);
  if (!candidate) {
    return "Sin archivo cargado";
  }

  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    try {
      const parsed = new URL(candidate);
      const lastSegment = decodeURIComponent(parsed.pathname).split("/").filter(Boolean).pop();
      return lastSegment || "archivo";
    } catch {
      return candidate;
    }
  }

  return candidate.split("/").filter(Boolean).pop() ?? candidate;
}

export function TicketResponseFormShell({
  ticketId,
  condominiumSlug,
  initialData,
  statusOptions,
}: TicketResponseFormShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [uploadingAsset, setUploadingAsset] = useState<UploadingAsset | null>(null);

  const [response, setResponse] = useState(initialData.response);
  const [status, setStatus] = useState<TicketStatusValue>(initialData.status);
  const [responseImageUrl, setResponseImageUrl] = useState(initialData.responseImageUrl);
  const [responseImagePath, setResponseImagePath] = useState(initialData.responseImagePath);
  const [responsePdfUrl, setResponsePdfUrl] = useState(initialData.responsePdfUrl);
  const [responsePdfPath, setResponsePdfPath] = useState(initialData.responsePdfPath);

  const onUploadImage = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!isImageFile(file)) {
      setMessage("Solo se permiten imagenes para la evidencia visual.");
      return;
    }

    setMessage("");
    setUploadingAsset("image");

    try {
      const uploaded = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId: "tickets",
        kind: "ticket-response-image",
      });

      setResponseImageUrl(uploaded.url);
      setResponseImagePath(uploaded.fullPath);
      setMessage("Imagen cargada en Firebase.");
    } catch (error) {
      console.error("[TicketResponseFormShell] image upload failed", error);
      setMessage("No se pudo subir la imagen.");
    } finally {
      setUploadingAsset(null);
    }
  };

  const onUploadPdf = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setMessage("Solo se permiten archivos PDF.");
      return;
    }

    setMessage("");
    setUploadingAsset("pdf");

    try {
      const uploaded = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId: "tickets",
        kind: "ticket-response-pdf",
      });

      setResponsePdfUrl(uploaded.url);
      setResponsePdfPath(uploaded.fullPath);
      setMessage("PDF cargado en Firebase.");
    } catch (error) {
      console.error("[TicketResponseFormShell] pdf upload failed", error);
      setMessage("No se pudo subir el PDF.");
    } finally {
      setUploadingAsset(null);
    }
  };

  const save = () => {
    setMessage("");

    startTransition(async () => {
      const result = await saveTicketResponseAction({
        id: ticketId,
        response,
        status,
        responseImageUrl: responseImageUrl || null,
        responseImagePath: responseImagePath || null,
        responsePdfUrl: responsePdfUrl || null,
        responsePdfPath: responsePdfPath || null,
      });

      setMessage(result.message);
      if (!result.ok) {
        return;
      }

      router.push("/tickets");
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

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[#c8b5a3]/55 bg-[linear-gradient(120deg,rgba(255,255,255,0.95)_0%,rgba(248,236,219,0.92)_58%,rgba(236,222,201,0.9)_100%)] p-6 shadow-[0_22px_40px_rgba(35,23,16,0.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/tickets"
              className="inline-flex items-center rounded-xl border border-[#c9af97] bg-white/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b4936] transition hover:bg-[#fff6ea]"
            >
              Volver al listado
            </Link>

            <span className="inline-flex rounded-full border border-[#0d5f66]/40 bg-[#0d5f66]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b5a62]">
              Respuesta ticket
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-semibold leading-none text-[#2f2219] sm:text-5xl">Ticket #{initialData.ticketNumber}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5f5044] sm:text-base">
            Registra la respuesta oficial del ticket y actualiza su estatus desde Insulae 2.0 con trazabilidad en Neon.
          </p>
        </header>

        <section className="rounded-3xl border border-[#cab7a6]/55 bg-white/82 p-5 shadow-[0_18px_34px_rgba(35,23,16,0.1)] backdrop-blur-sm sm:p-6">
          <article className="rounded-2xl border border-[#d8c6b7] bg-[#fffaf3] p-5">
            <h2 className="text-xl font-semibold text-[#3a291f]">Informacion del ticket | {initialData.openedAtLabel}</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#4f3f33] md:grid-cols-2">
              <p>
                Departamento: <strong>{initialData.departmentName}</strong>
              </p>
              <p>
                Condomino: <strong>{initialData.residentName}</strong>
              </p>
              <p>
                Telefono: <strong>{initialData.residentPhone || "No disponible"}</strong>
              </p>
              <p>
                Email: <strong>{initialData.residentEmail || "No disponible"}</strong>
              </p>
              <p className="md:col-span-2">
                Tema: <strong>{initialData.title}</strong>
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-[#dfcdbb] bg-[#f8ead4] p-4 text-sm text-[#3f2e22]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785744]">Comentarios</p>
              <p className="mt-2 whitespace-pre-wrap">{initialData.description || "Sin comentarios"}</p>
            </div>
          </article>

          <article className="mt-5 rounded-2xl border border-[#d8c6b7] bg-[#fffaf3] p-5">
            <h2 className="text-xl font-semibold text-[#3a291f]">Respuesta</h2>

            <div className="mt-4 grid gap-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Respuesta</span>
                <textarea
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  className="min-h-32 w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                  placeholder="Escribe la respuesta operativa"
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Estado de respuesta</legend>
                <div className="flex flex-wrap gap-3">
                  {statusOptions.map((option) => (
                    <label
                      key={option.value}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d7c4b2] bg-white px-3 py-1.5 text-sm text-[#4f4035]"
                    >
                      <input
                        type="radio"
                        name="ticket-status"
                        value={option.value}
                        checked={status === option.value}
                        onChange={() => setStatus(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]" htmlFor="ticket-response-image">
                    Imagen
                  </label>
                  <input
                    id="ticket-response-image"
                    type="file"
                    accept="image/*"
                    onChange={(event) => void onUploadImage(event.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17]"
                  />
                  <p className="text-xs text-[#6b594c]">{getAssetLabel(responseImageUrl, responseImagePath)}</p>
                  {trimSafe(responseImageUrl) ? (
                    <Link
                      href={responseImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-[#c8ae97] bg-[#fff7ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4b39]"
                    >
                      Ver imagen
                    </Link>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]" htmlFor="ticket-response-pdf">
                    PDF
                  </label>
                  <input
                    id="ticket-response-pdf"
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => void onUploadPdf(event.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17]"
                  />
                  <p className="text-xs text-[#6b594c]">{getAssetLabel(responsePdfUrl, responsePdfPath)}</p>
                  {trimSafe(responsePdfUrl) ? (
                    <Link
                      href={responsePdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-[#c8ae97] bg-[#fff7ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4b39]"
                    >
                      Ver PDF
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#d8c4b0] pt-5">
              <button
                type="button"
                onClick={save}
                disabled={isPending || uploadingAsset !== null}
                className="rounded-xl border border-[#0c5a62] bg-[linear-gradient(150deg,#0C7C86_0%,#0C5A62_100%)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_22px_rgba(12,90,98,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Guardando..." : "Guardar informacion"}
              </button>

              <Link
                href="/tickets"
                className="inline-flex rounded-xl border border-[#c8ae95] bg-white/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#694938] transition hover:bg-[#fff4e8]"
              >
                Cancelar
              </Link>

              {uploadingAsset ? (
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#225f72]">Subiendo {uploadingAsset}...</p>
              ) : null}

              {message ? (
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.1em] ${
                    message.toLowerCase().includes("correct") ? "text-[#2f6a40]" : "text-[#9c3d2b]"
                  }`}
                >
                  {message}
                </p>
              ) : null}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
