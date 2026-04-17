"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Playfair_Display, Sora } from "next/font/google";
import { useMemo, useState, useTransition } from "react";

import { saveTicketDepartmentAction } from "./actions";

interface DepartamentoTicketFormShellProps {
  mode: "create" | "edit";
  departmentId?: string;
  initialData: {
    name: string;
    email: string;
  };
}

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-ticket-display",
});

const uiFont = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ticket-ui",
});

function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function DotGridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <circle cx="5" cy="5" r="2" fill="currentColor" />
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="19" cy="5" r="2" fill="currentColor" />
      <circle cx="5" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="19" cy="12" r="2" fill="currentColor" />
      <circle cx="5" cy="19" r="2" fill="currentColor" />
      <circle cx="12" cy="19" r="2" fill="currentColor" />
      <circle cx="19" cy="19" r="2" fill="currentColor" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4.5 7.5 12 13l7.5-5.5" />
    </svg>
  );
}

function UserSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7.5 18a5.5 5.5 0 0 1 9 0" />
    </svg>
  );
}

export function DepartamentoTicketFormShell({
  mode,
  departmentId,
  initialData,
}: DepartamentoTicketFormShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const [name, setName] = useState(initialData.name);
  const [email, setEmail] = useState(initialData.email);

  const title = mode === "create" ? "Nuevo departamento" : "Editar departamento";

  const initials = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      return "DT";
    }

    const chunks = trimmed.split(/\s+/).slice(0, 2);
    const value = chunks.map((chunk) => chunk.slice(0, 1).toUpperCase()).join("");
    return value || "DT";
  }, [name]);

  const save = () => {
    setMessage("");

    startTransition(async () => {
      const result = await saveTicketDepartmentAction({
        id: departmentId,
        name,
        email: sanitizeEmail(email),
      });

      setMessage(result.message);
      if (!result.ok) {
        return;
      }

      router.push("/departamentos-tickets");
      router.refresh();
    });
  };

  return (
    <main
      className={`${displayFont.variable} ${uiFont.variable} relative isolate min-h-screen overflow-hidden bg-[#f5efe6] px-5 pb-16 pt-8 text-[#1f1712] sm:px-8 lg:px-12`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-8rem] h-[24rem] w-[24rem] rounded-full bg-[#0c7c86]/17 blur-3xl" />
        <div className="absolute right-[-8rem] top-[14rem] h-[22rem] w-[24rem] rounded-full bg-[#d07a2c]/14 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.55),transparent_32%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[#cbb8a6]/50 bg-[linear-gradient(122deg,rgba(255,255,255,0.94)_0%,rgba(248,237,224,0.92)_54%,rgba(238,224,202,0.9)_100%)] p-6 shadow-[0_22px_42px_rgba(35,23,16,0.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/departamentos-tickets"
              className="inline-flex items-center rounded-xl border border-[#c9af97] bg-white/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b4936] transition hover:bg-[#fff6ea]"
            >
              Volver al listado
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0d5f66]/40 bg-[#0d5f66]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b5a62]">
              <DotGridIcon />
              Tickets
            </span>
          </div>

          <h1 className="mt-4 font-[var(--font-ticket-display)] text-4xl leading-none text-[#2f2219] sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-3xl font-[var(--font-ticket-ui)] text-sm leading-relaxed text-[#5f5044] sm:text-base">
            Configura el responsable y correo de atencion para enrutar tickets en Insulae 2.0. El flujo opera solo
            con Neon y arquitectura hexagonal.
          </p>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-3xl border border-[#cab7a6]/55 bg-white/84 p-5 shadow-[0_18px_34px_rgba(35,23,16,0.1)] backdrop-blur-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6348]">Datos del departamento</p>

            <div className="mt-4 grid gap-4">
              <label className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">
                  <UserSquareIcon />
                  Nombre
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                  placeholder="Ejemplo: Soporte tecnico"
                />
              </label>

              <label className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">
                  <MailIcon />
                  Correo electronico
                </span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#0c7c86] focus:ring-2 focus:ring-[#0c7c86]/20"
                  placeholder="equipo@dominio.com"
                  type="email"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#d8c4b0] pt-5">
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="rounded-xl border border-[#0c5a62] bg-[linear-gradient(150deg,#0C7C86_0%,#0C5A62_100%)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_22px_rgba(12,90,98,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Guardando..." : "Guardar departamento"}
              </button>

              <Link
                href="/departamentos-tickets"
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
          </article>

          <aside className="rounded-3xl border border-[#c4b39f]/60 bg-[linear-gradient(160deg,#2f2218_0%,#3c2b1f_48%,#251a14_100%)] p-5 text-[#f7eadb] shadow-[0_18px_30px_rgba(27,18,12,0.3)]">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#f2ddc9]/35 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f5e4d3]">
              <DotGridIcon />
              Vista previa
            </p>

            <div className="mt-4 rounded-2xl border border-[#f2dfcd]/22 bg-white/6 p-4 [animation:ticketOrbit_8s_ease-in-out_infinite]">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#f3dfcc]/35 bg-[#fff4e8]/12 font-[var(--font-ticket-display)] text-xl text-[#fff1e1]">
                  {initials}
                </div>

                <div>
                  <p className="font-[var(--font-ticket-display)] text-2xl leading-none text-[#fff3e6]">
                    {name.trim() || "Sin nombre"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#f5decb]/82">Departamento de atencion</p>
                </div>
              </div>

              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#f0dcc8]/35 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#ffefdf]">
                <MailIcon />
                {sanitizeEmail(email) || "sin-correo@pendiente.com"}
              </p>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-[#f2decb]/82">
              Recomendacion: usa un correo de grupo para facilitar continuidad operativa durante cambios de personal.
            </p>
          </aside>
        </section>
      </section>
    </main>
  );
}
