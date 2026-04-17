import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { toCondominiumOverviewVM } from "@/modules/condominium/presentation/condominium-overview.vm";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-home-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-home-body",
});

export const metadata: Metadata = {
  title: "Inicio | Insulae 2.0",
  description: "Inicio operativo del condominio con accesos rapidos a modulos principales.",
};

type FeatureCard = {
  title: string;
  description: string;
  href?: string;
};

export default async function Home() {
  const condominiumOverview = await getCondominiumOverviewUseCase.execute();
  const overview = condominiumOverview ? toCondominiumOverviewVM(condominiumOverview) : null;

  const heroImage = overview?.condominiumImageUrl || overview?.condominiumLogoUrl || "";
  const footerLogo = overview?.footerLogoUrl || overview?.condominiumLogoUrl || "";

  const featureCards: FeatureCard[] = [
    {
      title: "Informacion del condominio (Reporte)",
      description: "Vista general del condominio con indicadores y distribuciones principales.",
      href: "/reporte-condominio",
    },
    {
      title: "Condominio",
      description: "Configuracion base del proyecto, imagenes y parametros del condominio.",
      href: "/condominio",
    },
    {
      title: "Contactos",
      description: "Gestion de medios de contacto institucionales del condominio.",
      href: "/contactos",
    },
    {
      title: "Directorio",
      description: "Personas activas, roles y APoLes asignadas en una vista operativa independiente.",
      href: "/directorio",
    },
    {
      title: "Reglamentos",
      description: "Documentos internos y reglamentos del condominio en un solo lugar.",
      href: "/reglamentos",
    },
    {
      title: "Resumen financiero",
      description: "Panel consolidado de ingresos, gastos y balance operativo.",
      href: "/resumen-financiero",
    },
    {
      title: "Areas privativas",
      description: "Inventario detallado de areas, superficies y estados operativos.",
      href: "/areas-privativas",
    },
  ];

  return (
    <main
      className={`${cormorant.variable} ${manrope.variable} relative isolate mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 pb-14 pt-8 sm:px-8 lg:px-10`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-[-5rem] h-64 w-64 rounded-full bg-[#b86c3f]/16 blur-3xl" />
        <div className="absolute right-[-6rem] top-[12rem] h-72 w-72 rounded-full bg-[#607e58]/14 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_0%,rgba(255,255,255,0.5),transparent_40%)]" />
      </div>

      <section className="relative overflow-hidden rounded-[2.1rem] border border-[#c6b198]/50 bg-[#2c1f18] shadow-[0_18px_50px_rgba(50,32,20,0.16)]">
        {heroImage ? (
          <Image
            src={heroImage}
            alt="Imagen alusiva del condominio"
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 1100px"
            className="object-cover"
          />
        ) : null}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,10,8,0.56)_0%,rgba(25,17,13,0.72)_44%,rgba(20,14,11,0.86)_100%)]" />

        <div className="relative px-6 pb-7 pt-8 sm:px-8 sm:pt-10 lg:px-10">
          <div className="space-y-3 text-center">
            <p className="inline-flex rounded-full border border-[#d9c2ae]/60 bg-[#f8e9dc]/18 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#f6e8da]">
              Bienvenido
            </p>
            <h1 className="font-[var(--font-home-display)] text-4xl leading-none text-[#fff4e8] sm:text-5xl">
              {overview?.condominiumName ?? "Val'Quirico"}
            </h1>
            <p className="mx-auto max-w-3xl font-[var(--font-home-body)] text-sm leading-relaxed text-[#f4e7d9]/92 sm:text-base">
              Bienvenido al panel principal. Desde aqui puedes acceder rapido a las funciones principales del sistema.
            </p>

            <div className="mt-8 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((card, index) => {
                const cardContent = (
                  <article
                    className="flex h-full min-h-[188px] flex-col rounded-2xl border border-[#f0dfcf]/45 bg-[#fff8ef]/20 p-4 shadow-[0_12px_22px_rgba(12,8,6,0.26)] backdrop-blur-md [animation:condoFadeUp_0.7s_ease-out_both] transition-all duration-300 hover:-translate-y-1 hover:border-[#fff4e8]/75 hover:bg-[#fff8ef]/32 hover:shadow-[0_18px_34px_rgba(0,0,0,0.34)]"
                    style={{ animationDelay: `${80 + index * 70}ms` }}
                  >
                    <p className="line-clamp-2 min-h-[4.25rem] font-[var(--font-home-display)] text-2xl leading-tight text-[#fff4e8]">
                      {card.title}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#f4e4d6]/92">{card.description}</p>
                  </article>
                );

                if (!card.href) {
                  return (
                    <div key={card.title} className="h-full">
                      {cardContent}
                    </div>
                  );
                }

                return (
                  <Link key={card.title} href={card.href} className="block h-full">
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="relative mt-1 flex flex-col items-center gap-3 pb-2">
        <div className="relative h-16 w-40 overflow-hidden rounded-xl border border-[#d5bfaa] bg-[#fffdf8] sm:h-20 sm:w-48">
          {footerLogo ? (
            <Image
              src={footerLogo}
              alt="Logo de pie del condominio"
              fill
              unoptimized
              sizes="(max-width: 768px) 180px, 200px"
              className="object-contain p-2"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-[var(--font-home-display)] text-2xl text-[#6f4a35]">
              {overview?.projectInitials?.slice(0, 3) ?? "VQ"}
            </div>
          )}
        </div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#8d654b]">
          {overview?.condominiumName ?? "Condominio"}
        </p>
      </footer>
    </main>
  );
}
