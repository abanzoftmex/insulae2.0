import Link from "next/link";
import type { ReactNode } from "react";

import type { PrivateAreaActionPageData } from "@/modules/private-area-actions";

import {
  buildActionHref,
  formatNumber,
  statusLabel,
} from "../_lib/private-area-action-routing";

interface PrivateAreaActionShellProps {
  area: PrivateAreaActionPageData;
  title: string;
  subtitle: string;
  activePage:
    | "formulario-apol"
    | "formulario-apol-imagenes"
    | "listado-pagos-propietario"
    | "listado-pagos-comercio"
    | "listado-arrendamientos";
  children: ReactNode;
}

function actionLinkClass(isActive: boolean): string {
  if (isActive) {
    return "rounded-full border border-[#7f4e34] bg-[#7f4e34] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#fff8ef]";
  }

  return "rounded-full border border-[#7f4e34]/35 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b442f] transition hover:bg-[#f6ebdf]";
}

export function PrivateAreaActionShell({
  area,
  title,
  subtitle,
  activePage,
  children,
}: PrivateAreaActionShellProps) {
  const privateAreaId = area.privateAreaId;

  return (
    <main className="min-h-screen bg-[#f2ece4] px-5 pb-12 pt-8 sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <header className="rounded-[2rem] border border-[#bfaa93]/45 bg-[#fff7eb]/90 p-6 shadow-[0_18px_45px_rgba(43,27,17,0.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#7a553f]">
                Areas privativas · Acciones
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#2f221a] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-[#5f4f44]">{subtitle}</p>
            </div>
            <Link
              href="/areas-privativas"
              className="rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
            >
              Volver a tabla
            </Link>
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl border border-[#d8c7b5] bg-white/75 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">Area</p>
              <p className="mt-1 text-lg font-semibold text-[#2f221a]">{area.name}</p>
              <p className="text-xs text-[#6b5849]">ID canonico: {privateAreaId}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">Zona</p>
              <p className="mt-1 text-sm font-semibold text-[#2f221a]">{area.zone ?? "Sin zona"}</p>
              <p className="text-xs text-[#6b5849]">Uso: {area.useType ?? "Sin uso"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">Estatus</p>
              <p className="mt-1 text-sm font-semibold text-[#2f221a]">{statusLabel(area.isActive)}</p>
              <p className="text-xs text-[#6b5849]">Estado de dominio: {area.businessStatusLabel}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">M2 actualizado</p>
              <p className="mt-1 text-sm font-semibold text-[#2f221a]">{formatNumber(area.m2Apole, 4)}</p>
              <p className="text-xs text-[#6b5849]">Codigo: {area.code ?? "-"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={buildActionHref("formulario-apol", privateAreaId)}
              className={actionLinkClass(activePage === "formulario-apol")}
            >
              Formulario AP
            </Link>
            <Link
              href={buildActionHref("formulario-apol-imagenes", privateAreaId)}
              className={actionLinkClass(activePage === "formulario-apol-imagenes")}
            >
              Imagenes AP
            </Link>
            <Link
              href={buildActionHref("listado-pagos", privateAreaId, "2")}
              className={actionLinkClass(activePage === "listado-pagos-propietario")}
            >
              Pagos Propietario
            </Link>
            <Link
              href={buildActionHref("listado-pagos", privateAreaId, "1")}
              className={actionLinkClass(activePage === "listado-pagos-comercio")}
            >
              Pagos Comercio
            </Link>
            <Link
              href={buildActionHref("listado-arrendamientos", privateAreaId)}
              className={actionLinkClass(activePage === "listado-arrendamientos")}
            >
              Arrendamientos
            </Link>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
