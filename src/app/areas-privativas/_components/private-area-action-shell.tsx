import Link from "next/link";
import type { ReactNode } from "react";

import type { PrivateAreaActionPageData } from "@/modules/private-area-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Layers,
  Activity,
  Ruler,
} from "lucide-react";

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

const NAV_TABS = [
  { key: "formulario-apol" as const, label: "Formulario AP" },
  { key: "formulario-apol-imagenes" as const, label: "Imágenes AP" },
  {
    key: "listado-pagos-propietario" as const,
    label: "Pagos Propietario",
    opc: "1",
  },
  {
    key: "listado-pagos-comercio" as const,
    label: "Pagos Comercio",
    opc: "2",
  },
  { key: "listado-arrendamientos" as const, label: "Arrendamientos" },
] as const;

export function PrivateAreaActionShell({
  area,
  title,
  subtitle,
  activePage,
  children,
}: PrivateAreaActionShellProps) {
  const privateAreaId = area.privateAreaId;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">
              {title}
            </h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
              Áreas Privativas · Acciones
            </Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {subtitle}
            </p>
          </div>
        </div>

        <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase shadow-md shadow-brand-deep/25 shrink-0">
          <Link href="/areas-privativas">
            <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Volver a tabla
          </Link>
        </Button>
      </div>

      {/* Area KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Área", value: area.name, sub: `ID: ${privateAreaId}`, icon: <Layers className="h-3.5 w-3.5" /> },
          { label: "Zona", value: area.zone ?? "Sin zona", sub: `Uso: ${area.useType ?? "—"}`, icon: <MapPin className="h-3.5 w-3.5" /> },
          { label: "Estatus", value: statusLabel(area.isActive), sub: area.businessStatusLabel, icon: <Activity className="h-3.5 w-3.5" /> },
          { label: "M2 actualizado", value: `${formatNumber(area.m2Apole, 4)} m²`, sub: `Código: ${area.code ?? "—"}`, icon: <Ruler className="h-3.5 w-3.5" /> },
        ].map((item) => (
          <Card key={item.label} className="border-transparent shadow-layered">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-ink-soft/70">{item.label}</p>
                <span className="text-brand/60">{item.icon}</span>
              </div>
              <p className="text-[13px] font-bold text-ink truncate">{item.value}</p>
              <p className="text-[10px] text-ink-soft/70 mt-0.5 truncate">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap gap-1.5">
        {NAV_TABS.map((tab) => {
          const isActive = activePage === tab.key;
          const href =
            tab.key === "listado-pagos-propietario"
              ? buildActionHref("listado-pagos", privateAreaId, "2")
              : tab.key === "listado-pagos-comercio"
                ? buildActionHref("listado-pagos", privateAreaId, "1")
                : buildActionHref(tab.key, privateAreaId);

          return (
            <Link
              key={tab.key}
              href={href}
              className={
                isActive
                  ? "rounded-full bg-brand-deep text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-standard"
                  : "rounded-full border border-line bg-canvas text-ink-soft hover:text-ink hover:border-brand/40 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-standard"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
