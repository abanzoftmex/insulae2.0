"use client";

/**
 * Detalle de un comercio: saldo y ficha del contrato con lo que de verdad está registrado (antes
 * leía campos que no existen y pintaba "N/A" y $0.00). Sin "último pago": los pagos se registran
 * por área privativa y no distinguen al dueño del comercio.
 */
import { useEffect } from "react";
import Link from "next/link";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import { useDisplayTimeZone } from "../../_lib/client-dates";
import { formatLongDate } from "../../_lib/format";
import { SinDato, UnidadDetalle } from "../../_components/unidad-detalle";
import type { ArrendamientoView } from "../arrendamientos-types";

const m2 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const PLACEHOLDERS = new Set(["Sin barrio", "Sin uso definido"]);
const texto = (value: string | null | undefined) => (value && !PLACEHOLDERS.has(value) ? value : null);
const num = (value: unknown) => Number(value) || 0;

export function ArrendamientoDetalleView({ id, arrendamiento }: { id: string; arrendamiento: ArrendamientoView | null }) {
  const timeZone = useDisplayTimeZone();
  const setPageData = useMinisitioLayoutStore((s) => s.setPageData);

  useEffect(() => {
    if (arrendamiento) setPageData({ title: arrendamiento.nombre_comercio, breadcrumbs: [{ label: "Mis comercios", href: msPath("/arrendamientos") }] });
  }, [arrendamiento, setPageData]);

  if (!arrendamiento) {
    return (
      <div className="mx-auto w-full max-w-[1040px] py-12 text-center">
        <p className="text-body text-fg-2">No encontramos este comercio entre los tuyos.</p>
        <Link href={msPath("/arrendamientos")} className={buttonClass("outline", "sm", "mt-3")}>
          Ir a Mis comercios
        </Link>
      </div>
    );
  }

  const a = arrendamiento;
  const superficie = num(a.m2_construccion) || num(a.superficie);
  const inicio = formatLongDate(a.fecha_inicio, timeZone);

  return (
    <UnidadDetalle
      nombre={a.nombre_comercio}
      subtitulo={[a.area_privativa, texto(a.barrio)].filter(Boolean).join(" · ") || undefined}
      estadoCuentaHref={`/arrendamientos/${id}/estado-cuenta`}
      vencido={num(a.saldo_vencido)}
      porVencer={num(a.saldo_pendiente_no_vencido)}
      aFavor={num(a.saldo_a_favor)}
      ficha={[
        { label: "Contrato", value: a.id_cat_status_comercios === 1 ? "Activo" : "Inactivo" },
        { label: "Inicio del contrato", value: inicio ? <span suppressHydrationWarning>{inicio}</span> : <SinDato /> },
        { label: "Local", value: a.area_privativa || <SinDato /> },
        { label: "Barrio", value: texto(a.barrio) ?? <SinDato /> },
        { label: "Uso de suelo", value: texto(a.uso_suelo) ?? <SinDato /> },
        { label: "Superficie", value: superficie > 0 ? `${m2.format(superficie)} m²` : <SinDato /> },
        { label: "Contacto administrativo", value: a.contacto_administrativo || <SinDato /> },
        { label: "Contacto contable", value: a.contacto_contable || <SinDato /> },
        ...(a.observaciones ? [{ label: "Observaciones", value: <span className="whitespace-pre-line">{a.observaciones}</span> }] : []),
      ]}
    />
  );
}
