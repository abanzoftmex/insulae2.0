"use client";

/**
 * Detalle de una unidad (propiedad o comercio): nombre y datos con "Ver estado de cuenta" a la
 * mano, sus cifras (vencido, por vencer y, si hay, el último pago), la ficha y, si hay, sus
 * imágenes. Solo datos reales: lo que no está registrado se dice, no se inventa.
 */
import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { ImageViewer, type ViewerImage } from "@/components/minisitio/ui/image-viewer";
import { StatStrip, type StatItem } from "@/components/minisitio/ui/stat-strip";
import { useDisplayTimeZone } from "../_lib/client-dates";
import { formatCurrency, formatShortDate } from "../_lib/format";

export interface FichaItem {
  label: string;
  value: React.ReactNode;
}

export function UnidadDetalle({
  nombre,
  subtitulo,
  estadoCuentaHref,
  vencido,
  porVencer,
  aFavor,
  ultimoPago,
  ficha,
  imagenes = [],
}: {
  nombre: string;
  subtitulo?: string;
  /** Sin /minisitio. */
  estadoCuentaHref: string;
  vencido: number;
  porVencer: number;
  aFavor: number;
  /** `undefined` cuando no aplica (comercios); `null` si no hay pagos registrados. */
  ultimoPago?: { fecha: string; monto: number } | null;
  ficha: FichaItem[];
  imagenes?: ViewerImage[];
}) {
  const timeZone = useDisplayTimeZone();
  const [imagen, setImagen] = useState<ViewerImage | null>(null);

  const cifras: StatItem[] = [
    { id: "vencido", label: "Saldo vencido", value: formatCurrency(vencido), tone: vencido > 0 ? "overdue" : undefined },
    { id: "por-vencer", label: "Por vencer", value: formatCurrency(porVencer) },
  ];
  if (aFavor > 0) cifras.push({ id: "a-favor", label: "A favor", value: formatCurrency(aFavor), tone: "success" });
  if (ultimoPago !== undefined) {
    cifras.push({
      id: "ultimo-pago",
      label: "Último pago",
      value: ultimoPago ? (
        <>
          {formatCurrency(ultimoPago.monto)}
          <span className="block text-caption font-normal text-fg-3" suppressHydrationWarning>
            {formatShortDate(ultimoPago.fecha, timeZone)}
          </span>
        </>
      ) : (
        <span className="text-body-lg font-normal text-fg-3">Sin pagos registrados</span>
      ),
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-title font-bold text-fg">{nombre}</p>
          {subtitulo && <p className="text-body text-fg-3">{subtitulo}</p>}
        </div>
        <Link href={msPath(estadoCuentaHref)} className={buttonClass("primary", "sm")}>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Ver estado de cuenta
        </Link>
      </div>

      <StatStrip label={`Saldo de ${nombre}`} items={cifras} />

      <section aria-labelledby="unidad-ficha" className="mt-8">
        <h2 id="unidad-ficha" className="border-b border-stroke-3 pb-2 text-body-lg font-bold text-fg">
          Ficha
        </h2>
        <dl className="grid gap-x-8 gap-y-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {ficha.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-caption font-semibold text-fg-3">{item.label}</dt>
              <dd className="mt-0.5 text-body break-words text-fg">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {imagenes.length > 0 && (
        <section aria-labelledby="unidad-imagenes" className="mt-8">
          <h2 id="unidad-imagenes" className="border-b border-stroke-3 pb-2 text-body-lg font-bold text-fg">
            Imágenes
          </h2>
          <ul className="grid grid-cols-2 gap-2 pt-4 sm:grid-cols-3 lg:grid-cols-4">
            {imagenes.map((img, index) => (
              <li key={`${img.src}-${index}`}>
                <button
                  type="button"
                  onClick={() => setImagen(img)}
                  className="group block aspect-[4/3] w-full overflow-hidden rounded-panel border border-stroke-2 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- archivos de R2 y de la 1.0 */}
                  <img src={img.src} alt={img.title} loading="lazy" className="h-full w-full object-cover transition-[filter] group-hover:brightness-95" />
                </button>
              </li>
            ))}
          </ul>
          <ImageViewer image={imagen} onClose={() => setImagen(null)} />
        </section>
      )}
    </div>
  );
}

/** "Sin registrar" en gris para lo que no está en la base. */
export function SinDato({ children = "Sin registrar" }: { children?: React.ReactNode }) {
  return <span className="text-fg-3">{children}</span>;
}
