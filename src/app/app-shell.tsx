"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  label: string;
  href?: string;
  icon: string;
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Panel Principal",
    items: [
      { label: "Condominio", href: "/condominio", icon: "CO" },
      { label: "Contactos", href: "/contactos", icon: "CT" },
      { label: "Documentos condominales", href: "/reglamentos", icon: "DC" },
      { label: "Informacion del condominio", href: "/reporte-condominio", icon: "IC" },
      { label: "Areas Privativas o Lotes", href: "/areas-privativas", icon: "AP" },
      { label: "Areas Privativas para caseta de seguridad", href: "/listado-seguridad", icon: "LS" },
      { label: "Directorio", href: "/directorio", icon: "DI" },
      { label: "Barrios", href: "/listado-zonas", icon: "BR" },
      { label: "Usos de suelo", href: "/listado-usos-suelo", icon: "US" },
      { label: "Estructura condominal", href: "/estructura-condominal", icon: "ES" },
      { label: "Generacion de estructura condominal", href: "/listado-estructura-condominal", icon: "GE" },
    ],
  },
  {
    title: "Notificaciones",
    items: [
      { label: "Categorias de notificacion", href: "/categorias-notificacion", icon: "CN" },
      { label: "Notificaciones", href: "/notificaciones", icon: "NO" },
    ],
  },
  {
    title: "Tickets",
    items: [
      { label: "Departamentos de tickets", href: "/departamentos-tickets", icon: "DT" },
      { label: "Tickets", href: "/tickets", icon: "TK" },
    ],
  },
  {
    title: "Financiero",
    items: [{ label: "Resumen financiero", href: "/resumen-financiero", icon: "RF" }],
  },
];

const NAV_LINK_ITEMS = NAV_SECTIONS.flatMap((section) => section.items).filter(
  (item): item is NavItem & { href: string } => typeof item.href === "string",
);

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

interface AppShellProps {
  children: React.ReactNode;
  navbarLogoUrl?: string | null;
  navbarLogoAlt?: string;
}

export function AppShell({ children, navbarLogoUrl, navbarLogoAlt = "Val'Quirico" }: AppShellProps) {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname || "/");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeLabel = useMemo(() => {
    if (currentPath === "/") {
      return "Inicio";
    }

    const active = NAV_LINK_ITEMS.find((item) => {
      const normalizedHref = normalizePath(item.href);
      return currentPath === normalizedHref || currentPath.startsWith(`${normalizedHref}/`);
    });
    return active?.label ?? "Modulo";
  }, [currentPath]);

  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="relative min-h-screen bg-[#efe6d8] text-[#241a14]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-8rem] h-[24rem] w-[26rem] rounded-full bg-[#b36d43]/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-[12rem] h-[22rem] w-[20rem] rounded-full bg-[#5f7f5b]/14 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(255,255,255,0.55),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent_28%)]" />
      </div>

      <div className="relative flex min-h-screen">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#ccb49c]/55 bg-[#f8efe3]/85 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-xl border border-[#b98f71]/50 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6d422a] transition hover:bg-[#2e221c] hover:text-[#f8efe1]"
                  aria-label="Abrir menu lateral"
                  aria-expanded={sidebarOpen}
                >
                  Menu
                </button>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#9a6a4a]">Modulo Activo</p>
                  <p className="font-[ui-serif] text-2xl leading-none text-[#2f221a]">{activeLabel}</p>
                </div>
              </div>

              <Link
                href="/"
                className="absolute left-1/2 top-1/2 hidden h-11 w-44 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-xl border border-[#cfb79f]/70 bg-[#fff8ef]/90 shadow-[0_10px_22px_rgba(50,30,18,0.12)] sm:flex"
                aria-label="Ir al inicio"
              >
                {navbarLogoUrl ? (
                  <Image
                    src={navbarLogoUrl}
                    alt={navbarLogoAlt}
                    fill
                    unoptimized
                    sizes="176px"
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="font-[ui-serif] text-lg text-[#6d412b]">Val&apos;Quirico</span>
                )}
              </Link>

              <div className="hidden w-44 sm:block" />
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-visible">{children}</main>
        </div>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-[#23170f]/55 backdrop-blur-sm"
            aria-label="Cerrar menu"
          />
          <aside className="absolute left-0 top-0 h-full w-[17rem] overflow-y-auto overscroll-contain border-r border-[#ccb29a]/65 bg-[linear-gradient(170deg,#fff8ef_0%,#f5e9d8_70%,#f1e0c9_100%)] p-4 shadow-[18px_0_30px_rgba(50,30,18,0.25)] sm:w-[19rem]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8d5a3d]">Insulae 2.0</p>
                <p className="font-[ui-serif] text-xl text-[#2a1e17]">Valquirico</p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-full border border-[#9e6f50]/50 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#73452b]"
              >
                X
              </button>
            </div>

            <nav className="space-y-4">
              {NAV_SECTIONS.map((section) => (
                <section key={section.title}>
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f6348]">
                    {section.title}
                  </p>

                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = item.href
                        ? currentPath === normalizePath(item.href) || currentPath.startsWith(`${normalizePath(item.href)}/`)
                        : false;
                      const sharedClass = `flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                        isActive
                          ? "border-[#8f593b]/50 bg-[#8f593b]/12 text-[#3a261c]"
                          : "border-transparent text-[#5f4b3f] hover:border-[#c8ae97] hover:bg-white/65"
                      }`;

                      const inner = (
                        <>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#cdb8a3] bg-white/70 text-[11px] font-bold uppercase tracking-[0.08em] text-[#77523d]">
                            {item.icon}
                          </span>
                          <span className="text-sm font-medium leading-tight">{item.label}</span>
                          {item.badge ? (
                            <span className="ml-auto rounded-full bg-[#2a201a] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f6e7d5]">
                              {item.badge}
                            </span>
                          ) : null}
                        </>
                      );

                      if (!item.href) {
                        return (
                          <div key={`${section.title}-${item.label}`} className={`${sharedClass} cursor-not-allowed opacity-70`}>
                            {inner}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={`${section.title}-${item.label}`}
                          href={item.href}
                          className={sharedClass}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {inner}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>

            <div className="mt-4 border-t border-[#d8c2ab] pt-4">
              <div className="rounded-2xl border border-[#ccb097] bg-[#fff7ec]/80 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8f6348]">Estado</p>
                <p className="mt-1 text-sm font-semibold text-[#3b281d]">Operativo</p>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
