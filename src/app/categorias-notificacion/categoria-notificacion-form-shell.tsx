"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveNotificationCategoryAction } from "./actions";

interface CategoriaNotificacionFormShellProps {
  mode: "create" | "edit";
  categoryId?: string;
  initialData: {
    name: string;
    color: string;
  };
}

const COLOR_PRESETS = [
  "#0C7C86",
  "#2D6A4F",
  "#5F0F40",
  "#8F2D56",
  "#2B2D42",
  "#A44A3F",
  "#D17A22",
  "#6D5C53",
];

function normalizeHex(value: string): string {
  const raw = value.trim();
  if (!raw) {
    return "#6D5C53";
  }

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toUpperCase() : "#6D5C53";
}

export function CategoriaNotificacionFormShell({
  mode,
  categoryId,
  initialData,
}: CategoriaNotificacionFormShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const [name, setName] = useState(initialData.name);
  const [color, setColor] = useState(normalizeHex(initialData.color));

  const title = mode === "create" ? "Nueva categoria de notificacion" : "Editar categoria de notificacion";

  const save = () => {
    setMessage("");

    startTransition(async () => {
      const result = await saveNotificationCategoryAction({
        id: categoryId,
        name,
        color: normalizeHex(color),
      });

      setMessage(result.message);
      if (!result.ok) {
        return;
      }

      router.push("/categorias-notificacion");
      router.refresh();
    });
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f4efe8] px-5 pb-16 pt-8 text-[#1f1714] sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-8rem] h-[24rem] w-[24rem] rounded-full bg-[#0c7c86]/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-[14rem] h-[22rem] w-[24rem] rounded-full bg-[#d17a22]/16 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.6),transparent_34%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[#cbb8a6]/50 bg-[linear-gradient(120deg,rgba(255,255,255,0.94)_0%,rgba(248,237,224,0.92)_55%,rgba(238,224,202,0.9)_100%)] p-6 shadow-[0_22px_42px_rgba(35,23,16,0.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/categorias-notificacion"
              className="inline-flex items-center rounded-xl border border-[#c9af97] bg-white/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b4936] transition hover:bg-[#fff6ea]"
            >
              Volver al listado
            </Link>

            <span className="inline-flex rounded-full border border-[#0d5f66]/40 bg-[#0d5f66]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b5a62]">
              Notificaciones
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-semibold leading-none text-[#2f2219] sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5f5044] sm:text-base">
            Define una categoria propia de Insulae 2.0. Este catalogo ya vive en la base nueva y no depende de la
            base legacy en tiempo de ejecucion.
          </p>
        </header>

        <section className="rounded-3xl border border-[#cab7a6]/55 bg-white/82 p-5 shadow-[0_18px_34px_rgba(35,23,16,0.1)] backdrop-blur-sm sm:p-6">
          <article className="rounded-2xl border border-[#d8c6b7] bg-[#fffaf3] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6348]">Datos de categoria</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Nombre</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                  placeholder="Ejemplo: Seguridad"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Color HEX</span>
                <div className="flex items-center gap-2">
                  <input
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                    placeholder="#6D5C53"
                  />
                  <span
                    className="h-10 w-10 shrink-0 rounded-lg border border-[#cab39f]"
                    style={{ backgroundColor: normalizeHex(color) }}
                    aria-label="Vista previa de color"
                  />
                </div>
              </label>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f6348]">Paleta sugerida</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className="h-8 w-8 rounded-md border border-[#c7b4a4] transition hover:scale-105"
                    style={{ backgroundColor: preset }}
                    title={`Usar ${preset}`}
                    aria-label={`Usar color ${preset}`}
                  />
                ))}
              </div>
            </div>
          </article>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#d8c4b0] pt-5">
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="rounded-xl border border-[#0c5a62] bg-[linear-gradient(150deg,#0C7C86_0%,#0C5A62_100%)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_22px_rgba(12,90,98,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Guardar categoria"}
            </button>

            <Link
              href="/categorias-notificacion"
              className="inline-flex rounded-xl border border-[#c8ae95] bg-white/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#694938] transition hover:bg-[#fff4e8]"
            >
              Cancelar
            </Link>

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
        </section>
      </section>
    </main>
  );
}
