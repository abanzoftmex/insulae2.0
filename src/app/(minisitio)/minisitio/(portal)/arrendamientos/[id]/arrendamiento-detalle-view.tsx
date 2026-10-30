"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, Store } from "lucide-react";
import { BUTTON, EmptyState } from "@/components/minisitio/ui/list-controls";
import { StatementSection, SummaryStat } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/statement-ui";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import { parseNum, type ArrendamientoView } from "../arrendamientos-types";

/**
 * Comercio tal como lo lee la pantalla. `area_nombre`, `zona_nombre`, `monto_cargado` y
 * `monto_vencido` ya no vienen en el contrato (tampoco los mandaba el proxy del minisitio):
 * se muestran "N/A" / $0.00, igual que en el minisitio actual.
 */
type ArrendamientoDetalle = ArrendamientoView & {
  area_nombre?: string | null;
  zona_nombre?: string | null;
  monto_cargado?: number | null;
  monto_vencido?: number | null;
};

const ERROR_MESSAGE = "Error al cargar los detalles del arrendamiento";

/** Formato de fecha del legacy, con la zona de Val'Quirico para que servidor e hidratación coincidan. */
function formatFecha(value: string): string {
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });
  } catch {
    return "N/A";
  }
}

/**
 * Detalle de un comercio (antes pages/arrendamientos/[id]/index.js). `arrendamiento` es null
 * si no es del condómino: el proxy legacy respondía 404 y la pantalla mostraba el error.
 */
export function ArrendamientoDetalleView({
  id,
  arrendamiento,
}: {
  id: string;
  arrendamiento: ArrendamientoDetalle | null;
}) {
  const router = useRouter();
  const { user, userType } = useMinisitioAuth();
  const setPageData = useMinisitioLayoutStore((s) => s.setPageData);
  const puedeVer = userType === "arrendatario" || userType === "both";

  useEffect(() => {
    if (!user || !id) return;

    if (userType !== "arrendatario" && userType !== "both") {
      router.push(msPath("/"));
      return;
    }

    // El legacy envolvía cada estado en <Layout title="…">, que fijaba el título del encabezado:
    // "Detalle de Comercio" (se quedaba tras cargar) o "Error". Las migas van en el encabezado,
    // como en el detalle de una propiedad (antes eran una línea suelta dentro de la página).
    if (arrendamiento) {
      setPageData({
        title: "Detalle de Comercio",
        breadcrumbs: [{ label: "Comercios", href: msPath("/arrendamientos") }, { label: arrendamiento.nombre_comercio || "Detalle" }],
      });
    } else {
      setPageData({ title: "Error" });
    }
  }, [user, id, userType, router, arrendamiento, setPageData]);

  // El legacy dejaba el spinner mientras redirigía a quien no tiene comercios
  if (!puedeVer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!arrendamiento) {
    return (
      <EmptyState
        icon={Store}
        title={ERROR_MESSAGE}
        description="El comercio no existe o no tienes permisos para verlo."
        action={
          <Link href={msPath("/arrendamientos")} className={BUTTON.primary}>
            <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={2.25} />
            Volver a Comercios
          </Link>
        }
      />
    );
  }

  // `area_nombre`, `zona_nombre`, `monto_cargado` y `monto_vencido` ya no vienen en el contrato y
  // dejaban "N/A" y $0.00 fijos; el área, el barrio y los saldos sí llegan con otro nombre.
  const area = arrendamiento.area_nombre || arrendamiento.area_privativa || "N/A";
  const zona = arrendamiento.zona_nombre || (arrendamiento.barrio !== "Sin barrio" ? arrendamiento.barrio : "") || "N/A";
  const saldoTotal = arrendamiento.monto_cargado ?? (parseNum(arrendamiento.saldo_pendiente) || 0);
  const montoVencido = arrendamiento.monto_vencido ?? (parseNum(arrendamiento.saldo_vencido) || 0);
  const activo = arrendamiento.id_cat_status_comercios === 1;
  const money = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <StatementSection title="Información del Comercio">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <Dato label="Nombre del Comercio">{arrendamiento.nombre_comercio || "N/A"}</Dato>
          <Dato label="Área Privativa">{area}</Dato>
          <Dato label="Razón Social">{arrendamiento.razon_social_comercio || "N/A"}</Dato>
          <Dato label="Zona">{zona}</Dato>
          <Dato label="Clase de Comercio">{arrendamiento.clase_comercio || "Sin clasificar"}</Dato>
          {arrendamiento.fecha_inicio && <Dato label="Fecha de Inicio">{formatFecha(arrendamiento.fecha_inicio)}</Dato>}
          <Dato label="Estado">
            {/* Antes era una pastilla vacía (StatusBadge recibía el id como `type`). */}
            <span
              className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium ring-1 ring-inset ${
                activo ? "bg-success-bg text-success ring-success/15" : "bg-surface-4 text-fg-3 ring-stroke-2"
              }`}
            >
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-success" : "bg-fg-4"}`} />
              {activo ? "Activo" : "Inactivo"}
            </span>
          </Dato>
        </dl>
      </StatementSection>

      <StatementSection title="Información Financiera">
        <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SummaryStat label="Saldo Total" value={money(saldoTotal)} />
          <SummaryStat label="Monto Vencido" value={money(montoVencido)} tone={montoVencido > 0 ? "overdue" : "success"} />
        </dl>
      </StatementSection>

      {(arrendamiento.folio_861 || arrendamiento.fecha_inscripcion_f861 || arrendamiento.fecha_vigencia_f861) && (
        <StatementSection title="Documentación F-861">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-3">
            {arrendamiento.folio_861 && <Dato label="Folio F-861">{arrendamiento.folio_861}</Dato>}
            {arrendamiento.fecha_inscripcion_f861 && (
              <Dato label="Fecha de Inscripción">{formatFecha(arrendamiento.fecha_inscripcion_f861)}</Dato>
            )}
            {arrendamiento.fecha_vigencia_f861 && <Dato label="Fecha de Vigencia">{formatFecha(arrendamiento.fecha_vigencia_f861)}</Dato>}
          </dl>
        </StatementSection>
      )}

      <StatementSection title="Acciones">
        <div className="flex flex-wrap gap-2.5">
          <Link href={msPath(`/arrendamientos/${id}/estado-cuenta`)} className={`group ${BUTTON.primary}`}>
            <FileText aria-hidden className="h-4 w-4" strokeWidth={2} />
            Ver Estado de Cuenta
            <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
          </Link>
          <Link href={msPath("/arrendamientos")} className={`group ${BUTTON.secondary}`}>
            <ArrowLeft aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2} />
            Volver a Comercios
          </Link>
        </div>
      </StatementSection>
    </div>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium text-fg-3">{label}</dt>
      <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">{children}</dd>
    </div>
  );
}
