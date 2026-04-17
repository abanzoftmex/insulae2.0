import type { Metadata } from "next";
import Link from "next/link";
import { Libre_Baskerville, Plus_Jakarta_Sans } from "next/font/google";

import { getCondominiumReportUseCase } from "@/modules/condominium-report";
import { toCondominiumReportVM } from "@/modules/condominium-report/presentation/condominium-report.vm";

const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-report-display",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-report-body",
});

export const metadata: Metadata = {
  title: "Reporte Condominio | Insulae 2.0",
  description:
    "Vista equivalente de reporte_condominio.php con metricas operativas, soles/sombras y resumen por uso de suelo.",
};

export const dynamic = "force-dynamic";

export default async function ReporteCondominioPage() {
  const report = await getCondominiumReportUseCase.execute();
  const vm = report ? toCondominiumReportVM(report) : null;

  return (
    <main
      className={`${libre.variable} ${jakarta.variable} relative isolate min-h-screen overflow-x-clip bg-[#f2eee7] px-5 pb-16 pt-8 text-[#201814] sm:px-8 lg:px-12`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[#8f4e34]/16 blur-3xl" />
        <div className="absolute right-[-7rem] top-[10rem] h-[22rem] w-[22rem] rounded-full bg-[#2f6a75]/14 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[15%] h-[18rem] w-[32rem] rounded-full bg-[#7a7f43]/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.52),transparent_42%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="rounded-[2rem] border border-[#b4a088]/45 bg-[#fffaf0]/82 p-6 shadow-[0_16px_50px_rgba(44,27,17,0.13)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#7e5037]/30 bg-[#7e5037]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6f4028]">
              Reporte Condominio
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/condominio"
                className="rounded-full border border-[#2a211d]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2a211d] transition hover:border-[#2a211d] hover:bg-[#2a211d] hover:text-[#fffaf1]"
              >
                Ir a Condominio
              </Link>
              <Link
                href="/reglamentos"
                className="rounded-full border border-[#2a211d]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2a211d] transition hover:border-[#2a211d] hover:bg-[#2a211d] hover:text-[#fffaf1]"
              >
                Ir a Reglamentos
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <h1 className="font-[var(--font-report-display)] text-4xl leading-none text-[#2e221c] sm:text-5xl">
                Informacion del Condominio
              </h1>
              <p className="max-w-3xl font-[var(--font-report-body)] text-sm leading-relaxed text-[#5c4d42] sm:text-base">
                Tablero operativo inspirado en reporte_condominio.php: concentra inventario de
                areas, lectura de soles/sombras y matriz por uso de suelo contra barrios.
              </p>
            </div>

            <div className="rounded-3xl border border-[#ccb193] bg-[#261d18] p-5 text-[#f7ead7]">
              <p className="font-[var(--font-report-body)] text-xs uppercase tracking-[0.18em] text-[#eac8a5]">
                Proyecto
              </p>
              <p className="mt-2 font-[var(--font-report-display)] text-3xl leading-tight">
                {vm?.projectName ?? "Sin proyecto activo"}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#f4dbc2]">
                Condominio: {vm?.condominiumName ?? "--"}
              </p>
              <p className="mt-4 text-xs text-[#f2dcc8]/90">Ultima actualizacion: {vm?.updatedAtLabel ?? "--"}</p>
              <p className="mt-1 text-[11px] text-[#edd2bd]/80">Corte del reporte: {vm?.generatedAtLabel ?? "--"}</p>
            </div>
          </div>
        </header>

        {vm ? (
          <>
            <section className="relative overflow-hidden rounded-[2rem] border border-[#b6a38e]/45 bg-[#fff7eb]/88 p-5 shadow-[0_18px_40px_rgba(38,23,16,0.12)] sm:p-7">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[8%] top-[-6rem] h-[13rem] w-[13rem] rounded-full bg-[#f4be54]/20 blur-3xl" />
                <div className="absolute right-[6%] top-[-5rem] h-[12rem] w-[12rem] rounded-full bg-[#6a88a8]/18 blur-3xl" />
              </div>

              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                  Distribucion Soles / Sombras
                </p>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <article className="relative overflow-hidden rounded-3xl border border-[#d5b067] bg-[linear-gradient(160deg,#fff4cf_0%,#f8d97f_56%,#e9b34f_100%)] p-5 text-[#4a2c0c] shadow-[0_14px_32px_rgba(167,110,28,0.25)]">
                    <div className="absolute right-[-2.5rem] top-[-2.5rem] h-20 w-20 rounded-full bg-[#fff7dc]/75 blur-md [animation:reportSunPulse_3.2s_ease-in-out_infinite]" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#805011]">
                      Soles
                    </p>
                    <p className="mt-2 font-[var(--font-report-display)] text-5xl leading-none">
                      {vm.availableAreas}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#6b420f]">{vm.availableRatio} del total base</p>
                  </article>

                  <article className="relative overflow-hidden rounded-3xl border border-[#8fa3be] bg-[linear-gradient(160deg,#dae4f3_0%,#b8cade_52%,#8fa3be_100%)] p-5 text-[#142232] shadow-[0_14px_32px_rgba(33,58,86,0.22)]">
                    <div className="absolute left-[-2.2rem] top-[-2.2rem] h-16 w-16 rounded-full bg-[#f4f8ff]/65 blur-sm [animation:reportMoonFloat_4.2s_ease-in-out_infinite]" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2a4463]">
                      Sombras
                    </p>
                    <p className="mt-2 font-[var(--font-report-display)] text-5xl leading-none">
                      {vm.builtAreas}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#1d3550]">{vm.builtRatio} del total base</p>
                  </article>
                </div>

                <div className="mt-5 rounded-2xl border border-[#cdb8a1] bg-[#fffdf9] p-4">
                  <div className="h-4 overflow-hidden rounded-full bg-[#eadfce]">
                    <div className="flex h-full w-full">
                      <div
                        className="h-full bg-[linear-gradient(90deg,#f3cb67_0%,#e7a545_100%)] [animation:reportBarReveal_0.9s_ease-out_both]"
                        style={{ width: `${Math.min(Math.max(vm.availableRatioValue, 0), 100)}%` }}
                      />
                      <div
                        className="h-full bg-[linear-gradient(90deg,#9db3cc_0%,#6b88a8_100%)] [animation:reportBarReveal_0.9s_ease-out_both]"
                        style={{ width: `${Math.min(Math.max(vm.builtRatioValue, 0), 100)}%`, animationDelay: "120ms" }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#664b3a]">
                    <span>Base: {vm.classificationBaseLabel}</span>
                    <span>Total base: {vm.classificationBaseTotal}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Areas operativas",
                  value: vm.activePrivateAreas,
                  detail: `Inactivas: ${vm.inactivePrivateAreas}`,
                },
                {
                  label: `Base (${vm.classificationBaseLabel})`,
                  value: vm.classificationBaseTotal,
                  detail: `APoLes proyecto: ${vm.projectTotalApoles}`,
                },
                {
                  label: "Clasificadas",
                  value: vm.classifiedAreas,
                  detail: `Regla: ${vm.classificationModeLabel}`,
                },
                {
                  label: "Sin clasificar",
                  value: vm.unclassifiedAreas,
                  detail: `Con uso de suelo: ${vm.areasWithUseType}`,
                },
              ].map((card, index) => (
                <article
                  key={card.label}
                  className="rounded-3xl border border-[#b39f87]/35 bg-[#fffaf2]/90 p-5 shadow-[0_14px_30px_rgba(35,25,18,0.09)] [animation:condoFadeUp_0.7s_ease-out_both]"
                  style={{ animationDelay: `${120 + index * 70}ms` }}
                >
                  <p className="font-[var(--font-report-body)] text-xs uppercase tracking-[0.18em] text-[#86553b]">
                    {card.label}
                  </p>
                  <p className="mt-3 font-[var(--font-report-display)] text-4xl leading-none text-[#2f221b]">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm text-[#6d5c4f]">{card.detail}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <article className="rounded-3xl border border-[#b9a58f]/40 bg-[#fff9f0]/88 p-6 shadow-[0_16px_34px_rgba(39,26,19,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                  Datos generales
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Areas registradas", value: vm.totalRegisteredPrivateAreas },
                    { label: "Con uso de suelo", value: vm.areasWithUseType },
                    { label: "Sin uso de suelo", value: vm.areasWithoutUseType },
                    { label: "M2 privativos", value: vm.totalPrivateAreaM2 },
                    { label: "M2 construccion", value: vm.totalBuiltAreaM2 },
                    { label: "M2 areas comunes", value: vm.projectCommonAreasM2 },
                    { label: "Fraccion indiviso", value: vm.totalIndiviso },
                    { label: "Regla de clasificacion", value: vm.classificationModeLabel },
                  ].map((field) => (
                    <div key={field.label} className="rounded-2xl border border-[#d8c3ad] bg-[#fffdf8] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#9b6a4b]">{field.label}</p>
                      <p className="mt-2 text-sm font-semibold text-[#2e2119]">{field.value}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-[#b9a58f]/40 bg-[#fff9f0]/88 p-6 shadow-[0_16px_34px_rgba(39,26,19,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                  Notas de compatibilidad
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#5f4f43]">
                  {vm.caveats.map((note) => (
                    <li key={note} className="rounded-2xl border border-[#d8c3ad] bg-[#fffdf8] px-4 py-3">
                      {note}
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="rounded-3xl border border-[#b5a089]/40 bg-[#fff9f0]/88 p-5 shadow-[0_16px_34px_rgba(39,26,19,0.09)] sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                    Resumen por uso de suelo
                  </p>
                  <h2 className="mt-1 font-[var(--font-report-display)] text-3xl text-[#2f221b]">
                    Tabla Operativa
                  </h2>
                </div>

                <p className="rounded-full border border-[#c7b198] bg-[#fff3e5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#815239]">
                  Total general: {vm.grandTotal}
                </p>
              </div>

              <div className="mt-5 max-h-[68vh] overflow-auto rounded-2xl border border-[#c5cde0] bg-white">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#c9cfdd] text-left">
                      <th className="sticky top-0 z-30 border-b border-[#adc0df] bg-[#c9cfdd] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                        Descripcion
                      </th>
                      <th className="sticky top-0 z-30 border-b border-[#adc0df] bg-[#c9cfdd] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                        Uso de suelo
                      </th>
                      <th className="sticky top-0 z-30 border-b border-[#adc0df] bg-[#c9cfdd] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                        Total
                      </th>
                      {vm.zones.map((zone) => (
                        <th
                          key={zone}
                          className="sticky top-0 z-30 border-b border-[#adc0df] bg-[#c9cfdd] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                        >
                          {zone}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vm.rows.map((row) => (
                      <tr key={row.landUseName} className="odd:bg-[#f4f6fb] even:bg-[#edf1f8]">
                        <td className="border-b border-[#bfd0ea] px-4 py-3 text-sm text-[#2c3138]">
                          {row.landUseName}
                        </td>
                        <td className="border-b border-[#bfd0ea] px-4 py-3 text-sm text-[#485462]">
                          {row.landUseInitials}
                        </td>
                        <td className="border-b border-[#bfd0ea] px-4 py-3 text-sm font-semibold text-[#2f3842]">
                          {row.total}
                        </td>
                        {row.byZone.map((count, index) => (
                          <td
                            key={`${row.landUseName}-${vm.zones[index]}`}
                            className="border-b border-[#bfd0ea] px-4 py-3 text-sm text-[#3f4a56]"
                          >
                            {count}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#d9dde6]">
                      <td className="border-t border-[#adc0df] px-4 py-3 text-sm font-bold text-[#333740]">
                        Total general
                      </td>
                      <td className="border-t border-[#adc0df] px-4 py-3 text-sm font-semibold text-[#333740]">-</td>
                      <td className="border-t border-[#adc0df] px-4 py-3 text-sm font-semibold text-[#333740]">
                        {vm.grandTotal}
                      </td>
                      {vm.totalsByZone.map((count, index) => (
                        <td
                          key={`total-zone-${vm.zones[index]}`}
                          className="border-t border-[#adc0df] px-4 py-3 text-sm font-semibold text-[#333740]"
                        >
                          {count}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-[#c8ad95] bg-[#fff8ef] p-6 text-center">
            <h2 className="font-[var(--font-report-display)] text-3xl text-[#2f221a]">
              Sin condominio activo
            </h2>
            <p className="mt-2 font-[var(--font-report-body)] text-sm text-[#68584c]">
              No se encontro informacion suficiente para construir el reporte del condominio.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
