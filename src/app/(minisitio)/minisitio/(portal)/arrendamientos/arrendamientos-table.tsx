"use client";

import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import { msPath } from "@/components/minisitio/paths";
import { Tooltip } from "@/components/minisitio/tooltip";
import { parseNum, type ArrendamientoView } from "./arrendamientos-types";

/** Tabla de comercios (antes `components/ArrendamientosTable.js`). */
export function ArrendamientosTable({ arrendamientos }: { arrendamientos: ArrendamientoView[] }) {
  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const formatM2 = (amount: number | null | undefined) => {
    if (!amount || amount === 0) return "N/A";
    return (
      new Intl.NumberFormat("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + " m²"
    );
  };

  // Estado financiero de cada comercio. Antes el objeto se pasaba como `status` a StatusBadge, que
  // no lo reconocía, y todas las filas decían "Sin estado".
  const FINANCIAL_STATUS: Record<string, { color: string; dot: string; text: string }> = {
    al_corriente: { color: "bg-success-bg text-success ring-success/15", dot: "bg-success", text: "Al corriente" },
    pendiente: { color: "bg-warning-bg text-warning ring-brand-accent/25", dot: "bg-brand-accent", text: "Pendiente" },
    vencido: { color: "bg-critical-bg text-overdue ring-overdue/15", dot: "bg-overdue", text: "Vencido" },
    a_favor: { color: "bg-surface-4 text-fg-2 ring-stroke-2", dot: "bg-brand", text: "A favor" },
  };

  // Ordenar arrendamientos por área privativa de forma ascendente
  const sortedArrendamientos = [...arrendamientos].sort((a, b) => {
    const areaA = a?.area_privativa || "";
    const areaB = b?.area_privativa || "";
    return areaA.localeCompare(areaB, "es", { numeric: true });
  });

  const th = "whitespace-nowrap border-b border-stroke-2 bg-surface-2 px-4 py-3 text-[12px] font-semibold text-fg-3";
  const td = "border-b border-stroke-3 px-4 py-3 text-[13.5px] text-fg tabular-nums";
  const accion =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg outline-none transition-colors duration-100 hover:bg-brand/[0.08] hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-brand/45";

  return (
    <div className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
      <div className="scrollbar-slim max-h-[calc(100vh-300px)] overflow-auto">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th scope="col" className={`${th} sticky left-0 z-10 text-left`}>Área Privativa</th>
              <th scope="col" className={`${th} text-left`}>Comercio</th>
              <th scope="col" className={`${th} text-right`}>Superficie</th>
              <th scope="col" className={`${th} text-right`}>M² Construcción</th>
              <th scope="col" className={`${th} text-right`}>Indiviso</th>
              <th scope="col" className={`${th} text-right`}>Indiviso FAP/Cond.</th>
              <th scope="col" className={`${th} text-right`}>Estado Financiero (Saldo Vencido)</th>
              <th scope="col" className={`${th} text-right`}>Saldo Pendiente</th>
              <th scope="col" className={`${th} text-left`}>Estado</th>
              <th scope="col" className={`${th} text-left`}>Barrio</th>
              <th scope="col" className={`${th} text-left`}>Uso de Suelo</th>
              <th scope="col" className={`${th} text-center`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedArrendamientos.map((arrendamiento, index) => {
              const pendiente = parseNum(arrendamiento?.saldo_pendiente) || 0;
              const vencido = parseNum(arrendamiento?.saldo_vencido) || 0;
              const noVencido = parseNum(arrendamiento?.saldo_pendiente_no_vencido) || 0;
              const estado = FINANCIAL_STATUS[arrendamiento?.estado_financiero] ?? FINANCIAL_STATUS.al_corriente;
              const nombre = arrendamiento?.nombre_comercio || "Sin nombre";
              return (
                <tr key={arrendamiento?.id_arrendamientos ?? index} className="group bg-card transition-colors duration-100 hover:bg-surface-3">
                  <td className={`${td} sticky left-0 z-[1] whitespace-nowrap bg-inherit font-medium`}>{arrendamiento?.area_privativa || "N/A"}</td>
                  <td className={`${td} min-w-44`}>
                    <div className="truncate font-medium">{nombre}</div>
                    {arrendamiento?.razon_social_comercio && arrendamiento.razon_social_comercio !== nombre && (
                      <div className="truncate text-[12.5px] text-fg-3">{arrendamiento.razon_social_comercio}</div>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-right`}>{formatM2(arrendamiento?.superficie)}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>{formatM2(arrendamiento?.m2_construccion)}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>{(parseNum(arrendamiento?.indiviso) || 0).toFixed(4)}%</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    {arrendamiento?.indiviso_fap_condominio !== null ? (
                      `${parseNum(arrendamiento?.indiviso_fap_condominio).toFixed(4)}%`
                    ) : (
                      <span className="text-fg-4">—</span>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <div className={`font-semibold ${pendiente > 0 ? "text-overdue" : "text-success"}`}>{formatCurrency(pendiente)}</div>
                    <div className={`text-[12px] ${vencido > 0 ? "text-overdue/80" : pendiente > 0 ? "text-warning" : "text-fg-3"}`}>
                      {vencido > 0 ? "Vencido" : pendiente > 0 ? "Pendiente" : "Al corriente"}
                    </div>
                  </td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <div className={`font-semibold ${noVencido > 0 ? "text-warning" : "text-fg-2"}`}>{formatCurrency(noVencido)}</div>
                    <div className="text-[12px] text-fg-3">No vencido</div>
                  </td>
                  <td className={td}>
                    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ring-1 ring-inset ${estado.color}`}>
                      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${estado.dot}`} />
                      {estado.text}
                    </span>
                  </td>
                  <td className={`${td} max-w-40`}>
                    <div className="truncate" title={arrendamiento?.barrio || "Sin barrio"}>
                      {arrendamiento?.barrio || "Sin barrio"}
                    </div>
                  </td>
                  <td className={`${td} min-w-48 text-fg-2`}>{arrendamiento?.uso_suelo || "Sin uso definido"}</td>
                  <td className={td}>
                    <div className="flex justify-center gap-1">
                      <Tooltip title="Ver detalle" position="bottom" className="inline-flex">
                        <Link
                          href={msPath(`/arrendamientos/${arrendamiento?.id_arrendamientos}`)}
                          aria-label={`Ver detalle de ${nombre}`}
                          className={`${accion} text-brand`}
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.75} />
                        </Link>
                      </Tooltip>
                      <Tooltip title="Estado de cuenta" position="bottom" className="inline-flex">
                        <Link
                          href={msPath(`/arrendamientos/${arrendamiento?.id_arrendamientos}/estado-cuenta`)}
                          aria-label={`Estado de cuenta de ${nombre}`}
                          className={`${accion} text-fg-3`}
                        >
                          <FileText className="h-4 w-4" strokeWidth={1.75} />
                        </Link>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ArrendamientosTable;
