"use client";

/**
 * Detalle de una propiedad: saldo, último pago y ficha con lo que de verdad está registrado
 * (antes inventaba un indiviso de 0.0417 % y pintaba "Último pago" y "Total cargos" en $0.00).
 */
import { useEffect } from "react";
import Link from "next/link";
import type { PropertyDetail } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioSession } from "@/components/minisitio/session-provider";
import { userDisplayName } from "@/components/minisitio/shell/account-menu";
import { buttonClass } from "@/components/minisitio/ui/button";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import { tieneReferencia } from "../propiedades-organizer";
import { SinDato, UnidadDetalle } from "../../_components/unidad-detalle";

const m2 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const PLACEHOLDERS = new Set(["Sin barrio", "Sin uso definido"]);
const texto = (value: string | null | undefined) => (value && !PLACEHOLDERS.has(value) ? value : null);
const metros = (value: number | null | undefined) => (value && value > 0 ? `${m2.format(value)} m²` : <SinDato />);

export function PropiedadDetalleView({ id, detail }: { id: string; detail: PropertyDetail | null }) {
  const { user } = useMinisitioSession();
  const setPageData = useMinisitioLayoutStore((s) => s.setPageData);
  const propiedad = detail?.propiedad ?? null;

  useEffect(() => {
    if (propiedad) setPageData({ title: propiedad.nombre, breadcrumbs: [{ label: "Mis propiedades", href: msPath("/propiedades") }] });
  }, [propiedad, setPageData]);

  if (!detail || !propiedad) {
    return (
      <div className="mx-auto w-full max-w-[1040px] py-12 text-center">
        <p className="text-body text-fg-2">No encontramos esta propiedad entre las tuyas.</p>
        <Link href={msPath("/propiedades")} className={buttonClass("outline", "sm", "mt-3")}>
          Ir a Mis propiedades
        </Link>
      </div>
    );
  }

  const { balance } = detail;
  const fap = tieneReferencia(propiedad.id_areas_privativas_padre);

  return (
    <UnidadDetalle
      nombre={propiedad.nombre}
      subtitulo={[texto(propiedad.zona), texto(propiedad.uso_suelo)].filter(Boolean).join(" · ") || undefined}
      estadoCuentaHref={`/propiedades/${id}/estado-cuenta`}
      vencido={balance.saldo_vencido}
      porVencer={Math.max(0, balance.saldo_pendiente - balance.saldo_vencido)}
      aFavor={balance.saldo_a_favor}
      ultimoPago={detail.ultimoPago}
      ficha={[
        { label: "Tipo", value: fap ? "Fracción de área privativa (FAP)" : "Área privativa (AP)" },
        { label: "Estado", value: propiedad.status_nombre || <SinDato /> },
        { label: "Barrio", value: texto(propiedad.zona) ?? <SinDato /> },
        { label: "Uso de suelo", value: texto(propiedad.uso_suelo) ?? <SinDato /> },
        { label: "Superficie", value: metros(propiedad.m2_totales) },
        { label: "Construcción", value: metros(propiedad.m2_construccion) },
        { label: "Área común", value: metros(propiedad.m2_area_comun) },
        { label: "Indiviso", value: propiedad.indiviso > 0 ? `${pct.format(propiedad.indiviso)} %` : <SinDato /> },
        { label: "Propietario", value: userDisplayName(user) },
      ]}
      imagenes={detail.images.map((img, index) => ({ src: img.full_url, title: img.descripcion || `${propiedad.nombre}, imagen ${index + 1}` }))}
    />
  );
}
