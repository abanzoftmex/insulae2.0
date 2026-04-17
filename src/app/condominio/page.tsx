import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import type { CondominiumOverviewVM } from "@/modules/condominium/presentation/condominium-overview.vm";
import { CondominioEditor } from "./condominio-editor";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-condo-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-condo-body",
});

export const metadata: Metadata = {
  title: "Condominio | Insulae 2.0",
  description: "Primera vista del modulo condominio con diseno premium y arquitectura hexagonal.",
};

export const dynamic = "force-dynamic";

export default async function CondominioPage() {
  let overview: CondominiumOverviewVM | null = null;
  let editorInitialValues = {
    projectId: "",
    projectName: "",
    projectInitials: "",
    projectDescription: "",
    privacyNoticeText: "",
    startYear: "",
    condominiumFormatId: "",
    totalM2: "",
    totalApoles: "",
    commonAreasM2: "",
    developedBy: "",
    usesLandUseFormula: false,
    hasVccc: false,
    footerLeft: "",
    footerRight: "",
    condominiumLogoUrl: "",
    condominiumImageUrl: "",
    footerLogoUrl: "",
    privacyNoticePdfUrl: "",
  };
  let hasLoadError = false;

  try {
    const [{ getCondominiumOverviewUseCase }, { toCondominiumOverviewVM }] = await Promise.all([
      import("@/modules/condominium"),
      import("@/modules/condominium/presentation/condominium-overview.vm"),
    ]);

    const response = await getCondominiumOverviewUseCase.execute();
    overview = response ? toCondominiumOverviewVM(response) : null;
    if (response) {
      editorInitialValues = {
        projectId: response.projectId ?? "",
        projectName: response.projectName ?? "",
        projectInitials: response.projectInitials ?? "",
        projectDescription: response.projectDescription ?? "",
        privacyNoticeText: response.privacyNoticeText ?? "",
        startYear: response.startYear?.toString() ?? "",
        condominiumFormatId: response.condominiumFormatId?.toString() ?? "",
        totalM2: response.totalM2 ? response.totalM2.toString() : "",
        totalApoles: response.totalApoles ? response.totalApoles.toString() : "",
        commonAreasM2: response.commonAreasM2 ? response.commonAreasM2.toString() : "",
        developedBy: response.developedBy ?? "",
        usesLandUseFormula: response.usesLandUseFormula,
        hasVccc: response.hasVccc,
        footerLeft: response.footerLeft ?? "",
        footerRight: response.footerRight ?? "",
        condominiumLogoUrl: response.condominiumLogoUrl ?? "",
        condominiumImageUrl: response.condominiumImageUrl ?? "",
        footerLogoUrl: response.footerLogoUrl ?? "",
        privacyNoticePdfUrl: response.privacyNoticePdfUrl ?? "",
      };
    }
  } catch (error) {
    console.error("[CondominioPage] Failed to load overview", error);
    hasLoadError = true;
  }

  return (
    <main className={`${cormorant.variable} ${manrope.variable} relative isolate min-h-screen overflow-hidden bg-[#f7f2e8] px-5 pb-16 pt-8 text-[#1f1a17] sm:px-8 lg:px-12`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-8rem] h-[18rem] w-[22rem] rounded-full bg-[#b55d3f]/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-[10rem] h-[20rem] w-[20rem] rounded-full bg-[#5f7f5b]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.3)_48%,transparent_100%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="rounded-[2rem] border border-[#b9997d]/40 bg-[#fffaf1]/80 p-6 shadow-[0_15px_50px_rgba(74,49,24,0.12)] backdrop-blur sm:p-8 [animation:condoFadeUp_0.7s_ease-out_both]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#8f593b]/30 bg-[#8f593b]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6e3e26]">
              Modulo Condominio
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/reporte-condominio"
                className="rounded-full border border-[#1f1a17]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f1a17] transition hover:border-[#1f1a17] hover:bg-[#1f1a17] hover:text-[#fffaf1]"
              >
                Abrir Reporte
              </Link>
              <Link
                href="/reglamentos"
                className="rounded-full border border-[#1f1a17]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f1a17] transition hover:border-[#1f1a17] hover:bg-[#1f1a17] hover:text-[#fffaf1]"
              >
                Abrir Reglamentos
              </Link>
              <Link
                href="/"
                className="rounded-full border border-[#1f1a17]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f1a17] transition hover:border-[#1f1a17] hover:bg-[#1f1a17] hover:text-[#fffaf1]"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h1 className="font-[var(--font-condo-display)] text-4xl leading-none text-[#2e221c] sm:text-5xl">
                Condominio
              </h1>
              <p className="max-w-2xl font-[var(--font-condo-body)] text-sm leading-relaxed text-[#5d4f46] sm:text-base">
                Esta vista reemplaza el formulario legacy de proyecto con una experiencia moderna,
                limpia y preparada para evolucionar a flujos de edicion, documentos y reportes
                integrados.
              </p>
            </div>

            <div
              className="rounded-3xl border border-[#cab097] bg-[#2e221c] p-5 text-[#f5e8d7] [animation:condoFadeUp_0.7s_ease-out_both]"
              style={{ animationDelay: "120ms" }}
            >
              <p className="font-[var(--font-condo-body)] text-xs uppercase tracking-[0.2em] text-[#e7c8a7]">
                Estado del Proyecto
              </p>
              <p className="mt-3 font-[var(--font-condo-display)] text-3xl">
                {overview?.projectName ?? "Sin datos"}
              </p>
              <p className="mt-1 font-[var(--font-condo-body)] text-xs uppercase tracking-[0.14em] text-[#efdbc8]">
                {overview ? `${overview.projectInitials} · ${overview.startYear}` : "--"}
              </p>
              <p className="mt-2 line-clamp-3 font-[var(--font-condo-body)] text-sm text-[#f3dcc5]/90">
                {overview?.projectDescription ?? "Aun no hay informacion sincronizada para este condominio."}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "APoLes Activos",
              value: overview?.activePrivateAreas ?? "0",
              detail: `Inactivos: ${overview?.inactivePrivateAreas ?? "0"}`,
            },
            {
              label: "M2 Privativos",
              value: overview ? `${overview.totalPrivateAreaM2} m2` : "0 m2",
              detail: "Suma de superficies registradas",
            },
            {
              label: "Usuarios Activos",
              value: overview?.activeUsers ?? "0",
              detail: "Directorio vigente",
            },
            {
              label: "Documentos",
              value: overview?.projectDocumentCount ?? "0",
              detail: "Reglamentos y anexos",
            },
          ].map((card, index) => (
            <article
              key={card.label}
              className="rounded-3xl border border-[#b9997d]/35 bg-[#fffaf2]/85 p-5 shadow-[0_12px_30px_rgba(31,26,23,0.08)] backdrop-blur [animation:condoFadeUp_0.7s_ease-out_both]"
              style={{ animationDelay: `${180 + index * 70}ms` }}
            >
              <p className="font-[var(--font-condo-body)] text-xs uppercase tracking-[0.2em] text-[#8b5a3c]">
                {card.label}
              </p>
              <p className="mt-3 font-[var(--font-condo-display)] text-4xl leading-none text-[#2f221b]">
                {card.value}
              </p>
              <p className="mt-3 font-[var(--font-condo-body)] text-sm text-[#685a4f]">{card.detail}</p>
            </article>
          ))}
        </section>

        <section
          className="rounded-3xl border border-[#b9997d]/35 bg-[#fffef9]/90 p-6 shadow-[0_16px_38px_rgba(31,26,23,0.09)] [animation:condoFadeUp_0.8s_ease-out_both]"
          style={{ animationDelay: "360ms" }}
        >
          <p className="font-[var(--font-condo-body)] text-xs uppercase tracking-[0.2em] text-[#8b5a3c]">
            Informacion general del condominio
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Nombre", value: overview?.projectName ?? "Sin definir" },
              { label: "Iniciales", value: overview?.projectInitials ?? "--" },
              { label: "Formato", value: overview?.condominiumFormat ?? "Sin definir" },
              { label: "Anio de arranque", value: overview?.startYear ?? "Sin definir" },
              { label: "Total M2", value: overview ? `${overview.totalM2} m2` : "0 m2" },
              { label: "Total APoLes", value: overview?.totalApoles ?? "0" },
              { label: "Areas comunes", value: overview ? `${overview.commonAreasM2} m2` : "0 m2" },
              { label: "Desarrollado", value: overview?.developedBy ?? "Sin definir" },
              {
                label: "Formula uso de suelo",
                value: overview?.usesLandUseFormula ?? "No",
              },
              { label: "Manejo VCCC", value: overview?.hasVccc ?? "No" },
            ].map((field) => (
              <article
                key={field.label}
                className="rounded-2xl border border-[#d9c4af] bg-[#fffaf2] px-4 py-3"
              >
                <p className="font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.16em] text-[#9a6a4a]">
                  {field.label}
                </p>
                <p className="mt-2 font-[var(--font-condo-body)] text-sm font-semibold text-[#2f221b]">
                  {field.value}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#d9c4af] bg-[#fffaf2] p-4">
              <p className="font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.16em] text-[#9a6a4a]">
                Pie izquierdo de pagos
              </p>
              <p className="mt-2 line-clamp-6 whitespace-pre-line font-[var(--font-condo-body)] text-sm leading-relaxed text-[#5d4f46]">
                {overview?.footerLeft ?? "Sin texto configurado"}
              </p>
            </article>
            <article className="rounded-2xl border border-[#d9c4af] bg-[#fffaf2] p-4">
              <p className="font-[var(--font-condo-body)] text-[11px] uppercase tracking-[0.16em] text-[#9a6a4a]">
                Pie derecho de pagos
              </p>
              <p className="mt-2 line-clamp-6 whitespace-pre-line font-[var(--font-condo-body)] text-sm leading-relaxed text-[#5d4f46]">
                {overview?.footerRight ?? "Sin texto configurado"}
              </p>
            </article>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article
            className="rounded-3xl border border-[#b9997d]/35 bg-[linear-gradient(170deg,#fffef9_0%,#fff4e7_100%)] p-6 shadow-[0_16px_38px_rgba(31,26,23,0.09)] [animation:condoFadeUp_0.8s_ease-out_both]"
            style={{ animationDelay: "460ms" }}
          >
            <p className="font-[var(--font-condo-body)] text-xs uppercase tracking-[0.2em] text-[#8b5a3c]">
              Salud Operativa
            </p>
            <div className="mt-5 space-y-4">
              <div className="flex items-end justify-between gap-3">
                <h2 className="font-[var(--font-condo-display)] text-3xl text-[#2e221c]">
                  Cobertura de APoLes activos
                </h2>
                <strong className="font-[var(--font-condo-body)] text-2xl text-[#6e3e26]">
                  {overview ? `${overview.activeRatio.toFixed(1)}%` : "0%"}
                </strong>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-[#eadbc9]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8d4226,#bd6a3b_45%,#d6a06a)] transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, overview?.activeRatio ?? 0))}%` }}
                />
              </div>

              <p className="font-[var(--font-condo-body)] text-sm leading-relaxed text-[#645448]">
                APoLes con uso de suelo asignado: <strong>{overview?.privateAreasWithUseType ?? "0"}</strong>.
                Ultima sincronizacion registrada: <strong>{overview?.updatedAtLabel ?? "Sin datos"}</strong>.
              </p>
            </div>
          </article>

          <article
            className="rounded-3xl border border-[#2e221c]/25 bg-[radial-gradient(circle_at_top_left,#4a3328_0%,#2e221c_58%,#221914_100%)] p-6 text-[#f6e9d8] shadow-[0_16px_38px_rgba(31,26,23,0.2)] [animation:condoFadeUp_0.8s_ease-out_both]"
            style={{ animationDelay: "540ms" }}
          >
            <p className="font-[var(--font-condo-body)] text-xs uppercase tracking-[0.2em] text-[#e7c8a7]">
              Proximos bloques
            </p>
            <ul className="mt-4 space-y-3 font-[var(--font-condo-body)] text-sm leading-relaxed text-[#f1dbc4]">
              <li>Edicion completa de informacion general y pie de pagos.</li>
              <li>Gestor de reglamentos y documentos con carga segura.</li>
              <li>Panel de indicadores de soles, sombras y uso de suelo sin N+1.</li>
            </ul>
          </article>
        </section>

        <CondominioEditor
          condominiumSlug={overview?.condominiumSlug ?? "valquirico"}
          initialValues={editorInitialValues}
        />

        {hasLoadError ? (
          <section className="rounded-2xl border border-[#a6453b]/35 bg-[#fff4f1] p-4 font-[var(--font-condo-body)] text-sm text-[#8f2e23] [animation:condoFadeUp_0.8s_ease-out_both]">
            No fue posible cargar los datos desde la base en este momento. La vista se renderizo en
            modo seguro para que podamos continuar con el desarrollo de UI.
          </section>
        ) : null}
      </section>

      <style>{`
        @keyframes condoFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
