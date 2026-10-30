"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, FileText } from "lucide-react";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import { BUTTON, EmptyState } from "@/components/minisitio/ui/list-controls";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import type { PropertyDetail } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import { ImageGallery } from "./image-gallery";

/**
 * Balance tal como lo lee la pantalla. `ultimo_pago`, `fecha_ultimo_pago` y `total_cargos` ya
 * no vienen en el contrato (tampoco los mandaba el proxy del minisitio): se muestran en $0.00 /
 * "Sin registros" / "Sin cargos", igual que en el minisitio actual.
 */
type BalanceView = PropertyDetail["balance"] & {
  ultimo_pago?: number | null;
  fecha_ultimo_pago?: string | null;
  total_cargos?: number | null;
};

/** Detalle de una propiedad (antes pages/propiedades/[id].js). `detail` es null si no es del condómino. */
export function PropiedadDetalleView({ id, detail }: { id: string; detail: PropertyDetail | null }) {
  const router = useRouter();
  const { user, isAuthenticated, userType } = useMinisitioAuth();
  const setPageData = useMinisitioLayoutStore((s) => s.setPageData);
  const propiedad = detail?.propiedad ?? null;
  const balance: BalanceView | null = detail?.balance ?? null;
  const images = detail?.images ?? [];
  const puedeVer = userType === "propietario" || userType === "both";

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(msPath("/login"));
      return;
    }

    if (userType !== "propietario" && userType !== "both") {
      router.push(msPath("/dashboard"));
      return;
    }

    if (propiedad) {
      // Set page data when propiedad is loaded
      setPageData({
        title: `Propiedad: ${propiedad.nombre}`,
        breadcrumbs: [{ label: "Propiedades", href: msPath("/propiedades") }, { label: propiedad.nombre }],
      });
    }
  }, [propiedad, isAuthenticated, userType, router, setPageData]);

  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const formatM2 = (m2: number | null | undefined) => {
    return `${(m2 || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })} m²`;
  };

  // El legacy dejaba el spinner mientras redirigía a quien no es propietario
  if (!puedeVer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!propiedad) {
    return (
      <EmptyState
        icon={Building2}
        title="Propiedad no encontrada"
        description="La propiedad que buscas no existe o no tienes permisos para verla."
        action={
          <Link href={msPath("/propiedades")} className={BUTTON.primary}>
            <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={2.25} />
            Volver a Propiedades
          </Link>
        }
      />
    );
  }

  const saldo = balance?.saldo_pendiente ?? 0;
  const fechaUltimoPago = (() => {
    if (!balance?.fecha_ultimo_pago) return "Sin registros";
    const d = new Date(balance.fecha_ultimo_pago);
    return isNaN(d.getTime()) ? "Sin registros" : d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });
  })();

  return (
    <div className="space-y-6">
      {/* Información clave de la propiedad */}
      <section aria-label="Datos de la propiedad" className="rounded-2xl border border-stroke-2 bg-card">
        <dl className="grid grid-cols-2 divide-stroke-3 md:grid-cols-4 md:divide-x">
          {/* El indiviso ya no cae a 0.0417 % cuando no hay dato: se muestra lo que hay (0 %). */}
          <Superficie label="M² Totales" value={formatM2(propiedad.m2_totales)} />
          <Superficie label="M² Construcción" value={formatM2(propiedad.m2_construccion)} />
          <Superficie label="M² Área Común" value={formatM2(propiedad.m2_area_comun)} />
          <Superficie label="% Indiviso" value={`${(propiedad.indiviso || 0).toFixed(4)}%`} />
        </dl>

        <div className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-stroke-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          <Dato label="Propietario">
            <span className="block font-medium">{[user?.nombre, user?.apaterno, user?.amaterno].filter(Boolean).join(" ")}</span>
            {user?.email && <span className="block truncate text-[12.5px] text-fg-3">{user.email}</span>}
          </Dato>
          <Dato label="Contacto">{user?.telefono || <span className="text-fg-4">No disponible</span>}</Dato>
          <Dato label="Barrio">{propiedad.zona || "No especificado"}</Dato>
          <Dato label="Uso de Suelo">{propiedad.uso_suelo || "No especificado"}</Dato>
        </div>
      </section>

      {/* Resumen financiero simplificado */}
      <section aria-labelledby="resumen-cuenta" className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke-3 px-5 py-4 sm:px-6">
          <h2 id="resumen-cuenta" className="text-[16px] font-semibold text-fg">
            Resumen de Cuenta
          </h2>
          <Link href={msPath(`/propiedades/${id}/estado-cuenta`)} className={`group ${BUTTON.primary}`}>
            <FileText aria-hidden className="h-4 w-4" strokeWidth={2} />
            Estado de Cuenta
            <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:p-6 md:grid-cols-3">
          <Saldo
            label="Saldo actual"
            value={formatCurrency(saldo)}
            caption={saldo > 0 ? "Pendiente de pago" : "Al corriente"}
            tone={saldo > 0 ? "overdue" : "success"}
          />
          <Saldo label="Último pago" value={formatCurrency(balance?.ultimo_pago || 0)} caption={fechaUltimoPago} />
          <Saldo
            label="Total cargos"
            value={formatCurrency(balance?.total_cargos || 0)}
            caption={(balance?.total_cargos ?? 0) > 0 ? "Periodo actual" : "Sin cargos"}
          />
        </div>
      </section>

      {/* Galería de imágenes del área privativa */}
      <ImageGallery images={images} title={`Imágenes de ${propiedad.nombre || "la Propiedad"}`} />
    </div>
  );
}

function Superficie({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4 text-center sm:px-6 [&:nth-child(-n+2)]:border-b [&:nth-child(-n+2)]:border-stroke-3 md:[&:nth-child(-n+2)]:border-b-0">
      <dt className="text-[12px] font-medium text-fg-3">{label}</dt>
      <dd className="mt-1 text-[18px] font-semibold leading-7 tracking-[-0.01em] text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium text-fg-3">{label}</p>
      <div className="mt-0.5 text-[14px] leading-5 text-fg">{children}</div>
    </div>
  );
}

function Saldo({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "overdue" | "success";
}) {
  return (
    <div className="rounded-xl bg-surface-2 p-4 text-center ring-1 ring-inset ring-stroke-3">
      <p className="text-[12.5px] font-medium text-fg-3">{label}</p>
      <p
        className={`mt-1.5 text-[24px] font-bold leading-8 tracking-[-0.02em] tabular-nums ${
          tone === "overdue" ? "text-overdue" : tone === "success" ? "text-success" : "text-fg"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[12px] text-fg-3">{caption}</p>
    </div>
  );
}
