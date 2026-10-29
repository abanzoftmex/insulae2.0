"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveZoneAction } from "./actions";

interface ZonaFormShellProps {
  mode: "create" | "edit";
  zoneId?: string;
  initialName?: string;
  initialInitials?: string;
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M10.78 3.22a.75.75 0 0 1 0 1.06L5.81 9.25H17a.75.75 0 0 1 0 1.5H5.81l4.97 4.97a.75.75 0 0 1-1.06 1.06l-6.25-6.25a.75.75 0 0 1 0-1.06l6.25-6.25a.75.75 0 0 1 1.06 0" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M3 4a2 2 0 0 1 2-2h8.59a2 2 0 0 1 1.41.59l2.41 2.41A2 2 0 0 1 18 6.41V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm3 0v4h8V4zm8 12v-4H6v4z" />
    </svg>
  );
}

export function ZonaFormShell({
  mode,
  zoneId,
  initialName = "",
  initialInitials = "",
}: ZonaFormShellProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [name, setName] = useState(initialName);
  const [initials, setInitials] = useState(initialInitials);
  const router = useRouter();

  const title = mode === "create" ? "Nuevo barrio" : "Editar barrio";
  const subtitle =
    mode === "create"
      ? "Crea un barrio nuevo con una experiencia limpia y optimizada para captura rapida."
      : "Actualiza la informacion del barrio manteniendo consistencia operativa.";

  const save = () => {
    setMessage("");

    startTransition(async () => {
      const response = await saveZoneAction({
        id: zoneId,
        name,
        initials,
      });

      setMessage(response.message);
      if (!response.ok) {
        return;
      }

      router.push("/listado-zonas");
      router.refresh();
    });
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#ede7db] px-5 pb-16 pt-8 text-[#1e1712] sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-9rem] top-[-7rem] h-[21rem] w-[24rem] rounded-full bg-[#8b5238]/18 blur-3xl" />
        <div className="absolute right-[-9rem] top-[8rem] h-[20rem] w-[24rem] rounded-full bg-[#3e6656]/16 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.45),transparent_35%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[#c0a386]/45 bg-[linear-gradient(130deg,rgba(255,249,237,0.95)_0%,rgba(247,236,220,0.92)_58%,rgba(237,223,204,0.9)_100%)] p-6 shadow-[0_20px_45px_rgba(43,28,18,0.13)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/listado-zonas"
              className="inline-flex items-center gap-2 rounded-xl border border-[#c8ae95] bg-white/86 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f4834] transition hover:bg-[#fff4e8]"
            >
              <ArrowLeftIcon />
              Volver a barrios
            </Link>

            <span className="inline-flex rounded-full border border-[#8c5a3e]/35 bg-[#8c5a3e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#7a4b33]">
              Master Data
            </span>
          </div>

          <h1 className="mt-5 font-[var(--font-zones-display)] text-4xl leading-none text-[#2d2018] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl font-[var(--font-zones-body)] text-sm leading-relaxed text-[#5f5044] sm:text-base">
            {subtitle}
          </p>
        </header>

        <section className="rounded-3xl border border-[#c5ad95]/50 bg-white/65 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.11)] backdrop-blur-sm sm:p-6">
          <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-[#d2bdab] bg-[#fff9f0] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6348]">Informacion general</p>

              <div className="mt-4 grid gap-4">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Nombre del barrio</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ej. Bosque-Carretero"
                    className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Iniciales (opcional)</span>
                  <input
                    value={initials}
                    onChange={(event) => setInitials(event.target.value.toUpperCase())}
                    placeholder="Ej. BCC"
                    maxLength={8}
                    className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm uppercase tracking-[0.06em] text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                  />
                </label>
              </div>
            </article>

            <aside className="rounded-2xl border border-[#d2bdab] bg-[#fff9f0] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6348]">Tips</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#614f43]">
                <li>Usa un nombre breve y reconocible para el equipo operativo.</li>
                <li>Si dejas iniciales vacias, se generan automaticamente.</li>
                <li>Evita duplicados para mantener reportes consistentes.</li>
              </ul>
            </aside>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#d8c4b0] pt-5">
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2f4c73] bg-[linear-gradient(155deg,#3e638f_0%,#2f4c73_100%)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#eff6ff] shadow-[0_12px_22px_rgba(46,71,106,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SaveIcon />
              {isPending ? "Guardando..." : "Guardar informacion"}
            </button>

            <Link
              href="/listado-zonas"
              className="inline-flex rounded-xl border border-[#c8ae95] bg-white/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#694938] transition hover:bg-[#fff4e8]"
            >
              Cancelar
            </Link>

            {message ? (
              <p
                className={`text-xs font-semibold uppercase tracking-[0.1em] ${
                  message.toLowerCase().includes("correctamente")
                    ? "text-[#2f6a40]"
                    : "text-[#9c3d2b]"
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
