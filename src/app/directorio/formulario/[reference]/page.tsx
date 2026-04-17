import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { getDirectoryContactParticipationUseCase } from "@/modules/directory";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-directory-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-directory-body",
});

export const metadata: Metadata = {
  title: "Formulario Directorio | Insulae 2.0",
  description: "Detalle de contacto y participacion del directorio.",
};

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  params: Promise<{ reference: string }>;
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function pickParam(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function isUuidReference(reference: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    reference.trim(),
  );
}

export default async function DirectorioFormularioPage({ params, searchParams }: PageProps) {
  const [{ reference }, rawSearchParams] = await Promise.all([params, searchParams]);
  const query = pickParam(rawSearchParams?.q).trim();
  const page = pickParam(rawSearchParams?.page).trim() || "1";
  const detail = isUuidReference(reference)
    ? await getDirectoryContactParticipationUseCase.execute(reference)
    : null;

  const backHref = (() => {
    const search = new URLSearchParams();
    if (query) {
      search.set("q", query);
    }
    search.set("page", page);
    return `/directorio?${search.toString()}`;
  })();

  return (
    <main
      className={`${cormorant.variable} ${manrope.variable} relative isolate min-h-screen bg-[#f3eadc] px-5 pb-16 pt-8 text-[#231912] sm:px-8 lg:px-12`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[#b36f46]/18 blur-3xl" />
        <div className="absolute right-[-8rem] top-[10rem] h-[20rem] w-[20rem] rounded-full bg-[#5c7a56]/15 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-5xl space-y-5">
        <header className="rounded-[2rem] border border-[#bfa283]/40 bg-[#fff7ea]/80 p-6 shadow-[0_15px_50px_rgba(64,37,19,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#8f593b]/30 bg-[#8f593b]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6e3e26]">
              Directorio · Formulario
            </span>
            <Link
              href={backHref}
              className="rounded-full border border-[#1f1a17]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f1a17] transition hover:border-[#1f1a17] hover:bg-[#1f1a17] hover:text-[#fffaf1]"
            >
              Volver al listado
            </Link>
          </div>

          <div className="mt-6">
            <h1 className="font-[var(--font-directory-display)] text-4xl leading-none text-[#2e221c] sm:text-5xl">
              {detail?.displayName ?? "Contacto no encontrado"}
            </h1>
            <p className="mt-2 font-[var(--font-directory-body)] text-sm text-[#5d4f46] sm:text-base">
              {detail
                ? `Correo: ${detail.email ?? "sin correo"} · Telefono: ${detail.phone ?? "sin telefono"}`
                : "No existe un contacto activo con esa referencia en el condominio actual."}
            </p>
            {detail ? (
              <p className="mt-1 font-[var(--font-directory-body)] text-xs uppercase tracking-[0.14em] text-[#7a553f]">
                Requiere factura: {detail.requiresInvoice === null ? "N/D" : detail.requiresInvoice ? "Si" : "No"}
              </p>
            ) : null}
          </div>
        </header>

        {detail ? (
          <section className="rounded-3xl border border-[#bfa283]/45 bg-[#fff9f0]/88 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-[#dfcdbd] bg-[#fffdf9] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a553f]">Roles del sistema</p>
                <p className="mt-2 text-sm text-[#3a2b22]">
                  {detail.roles.length > 0 ? detail.roles.join(" • ") : "Sin rol"}
                </p>
              </article>
              <article className="rounded-xl border border-[#dfcdbd] bg-[#fffdf9] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a553f]">Asignaciones activas</p>
                <p className="mt-2 text-sm text-[#3a2b22]">
                  {detail.assignments.length.toLocaleString("es-MX")}
                </p>
              </article>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[760px] w-full table-fixed border-separate border-spacing-0 text-sm">
                <colgroup>
                  <col className="w-[300px]" />
                  <col className="w-[260px]" />
                  <col className="w-[200px]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#7a553f]">
                    <th className="border-b border-[#d7c7b5] bg-[#f8ecde] px-3 py-2">APoL</th>
                    <th className="border-b border-[#d7c7b5] bg-[#f8ecde] px-3 py-2">Participacion</th>
                    <th className="border-b border-[#d7c7b5] px-3 py-2">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.assignments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-sm text-[#6a594c]">
                        Este contacto no tiene asignaciones activas.
                      </td>
                    </tr>
                  ) : (
                    detail.assignments.map((assignment, index) => (
                      <tr
                        key={`${assignment.privateAreaId}-${assignment.roleName}-${index}`}
                        className="odd:bg-[#f9f4ec] even:bg-[#f5ede3]"
                      >
                        <td className="border-b border-[#e0d2c2] px-3 py-2.5 align-top text-[#2f221a]">
                          {assignment.privateAreaName}
                        </td>
                        <td className="border-b border-[#e0d2c2] px-3 py-2.5 align-top text-[#3a2b22]">
                          {assignment.roleName}
                        </td>
                        <td className="border-b border-[#e0d2c2] px-3 py-2.5 align-top text-[#5d4f46]">
                          {assignment.privateAreaId}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
