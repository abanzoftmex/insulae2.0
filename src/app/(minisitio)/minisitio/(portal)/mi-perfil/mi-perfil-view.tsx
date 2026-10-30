"use client";

/**
 * Mi perfil: tus datos tal como los tiene la administración, la facturación (si requieres
 * factura y tu constancia fiscal) y lo que tienes asignado. Los datos no se editan aquí: un
 * enlace abre una solicitud para corregirlos. La constancia la actualiza la administración (el
 * portal aún no recibe archivos; antes había un "Subir PDF" que siempre fallaba): se manda por
 * correo.
 */
import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, Mail } from "lucide-react";
import { updateRequiresInvoiceAction } from "@/app/(minisitio)/minisitio/_actions/account";
import type { Profile } from "@/modules/minisitio/infrastructure/queries/profile.queries";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioSession } from "@/components/minisitio/session-provider";
import { Avatar, userDisplayName } from "@/components/minisitio/shell/account-menu";
import { buttonClass } from "@/components/minisitio/ui/button";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { Switch } from "@/components/minisitio/ui/switch";
import { toast } from "@/stores/minisitio-toast.store";
import { SinDato } from "../_components/unidad-detalle";

const corregir = (asunto: string) => msPath(`/tickets?nueva=1&asunto=${encodeURIComponent(asunto)}`);

export function MiPerfilView({ perfil, correoAdministracion }: { perfil: Profile | null; correoAdministracion: string | null }) {
  const { user } = useMinisitioSession();
  const ayudaFacturaId = useId();
  const [requiereFactura, setRequiereFactura] = useState(Boolean(perfil?.datosGenerales.requiereFactura));
  const [guardando, setGuardando] = useState(false);

  if (!perfil) {
    return (
      <div className="mx-auto w-full max-w-[880px]">
        <LoadError what="tu perfil" />
      </div>
    );
  }

  const { datosGenerales: datos, tipoDirectorio, asignaciones, comercios } = perfil;
  const nombre = [datos.nombre, datos.apaterno, datos.amaterno].filter(Boolean).join(" ") || userDisplayName(user);

  const cambiarFactura = async (valor: boolean) => {
    setGuardando(true);
    setRequiereFactura(valor);
    try {
      const res = await updateRequiresInvoiceAction(valor);
      if (!res.success) throw new Error(res.message);
      toast(valor ? "Listo: la administración emitirá tus facturas" : "Listo: ya no requieres factura");
    } catch (error) {
      console.error("[minisitio] requiere factura:", error);
      setRequiereFactura(!valor);
      toast("No se pudo guardar. Inténtalo otra vez.", "error");
    } finally {
      setGuardando(false);
    }
  };

  // Asignaciones por rol: "Propietario · 86 propiedades".
  const porRol = asignaciones.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.rolNombre]: (acc[a.rolNombre] ?? 0) + 1 }), {});
  const mailto = correoAdministracion
    ? `mailto:${correoAdministracion}?subject=${encodeURIComponent(`Constancia de situación fiscal — ${nombre}`)}&body=${encodeURIComponent("Adjunto mi constancia de situación fiscal actualizada.")}`
    : null;

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <div className="mb-8 flex items-center gap-4">
        <Avatar user={user} size={56} />
        <div className="min-w-0">
          <p className="truncate text-title font-bold text-fg">{nombre}</p>
          <p className="text-body text-fg-3">{tipoDirectorio?.nombre || "Condómino"}</p>
        </div>
      </div>

      <Seccion id="perfil-datos" titulo="Datos de contacto">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Dato label="Correo" value={datos.email} />
          <Dato label="Teléfono" value={datos.telefono} />
          <Dato label="Dirección" value={datos.direccion} />
          <Dato label="Razón social" value={datos.razon_social} />
        </dl>
        <p className="mt-4 text-body text-fg-3">
          ¿Algún dato está mal?{" "}
          <Link href={corregir("Corregir mis datos de contacto")} className="font-medium text-brand hover:underline">
            Pide que lo corrijan
          </Link>
        </p>
      </Seccion>

      <Seccion id="perfil-facturacion" titulo="Facturación">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-body font-semibold text-fg">Requiero factura</p>
            <p id={ayudaFacturaId} className="text-body text-fg-3">
              La administración emite tus facturas con tus datos fiscales.
            </p>
          </div>
          <Switch checked={requiereFactura} onChange={cambiarFactura} disabled={guardando} label="Requiero factura" describedBy={ayudaFacturaId} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stroke-3 pt-5">
          <div className="min-w-0">
            <p className="text-body font-semibold text-fg">Constancia de situación fiscal</p>
            <p className="text-body text-fg-3">
              {datos.constanciaFiscal ? "Registrada. " : "Todavía no está registrada. "}
              La actualiza la administración: mándala por correo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {datos.constanciaFiscal && (
              <a href={datos.constanciaFiscal} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Ver constancia
                <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden />
                <span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
            )}
            {mailto ? (
              <a href={mailto} className={buttonClass("outline", "sm")}>
                <Mail className="h-3.5 w-3.5" aria-hidden />
                Enviar por correo
              </a>
            ) : (
              <Link href={corregir("Actualizar mi constancia de situación fiscal")} className={buttonClass("outline", "sm")}>
                Pedir que la actualicen
              </Link>
            )}
          </div>
        </div>
      </Seccion>

      <Seccion id="perfil-asignaciones" titulo="Lo que tienes asignado">
        <ul className="divide-y divide-stroke-3">
          {asignaciones.length > 0 && (
            <li className="flex items-start justify-between gap-3 py-2.5">
              <span className="min-w-0 text-body text-fg">
                {asignaciones.length} {asignaciones.length === 1 ? "asignación" : "asignaciones"} en propiedades{" "}
                <span className="block text-fg-3">
                  {Object.entries(porRol)
                    .sort(([, a], [, b]) => b - a)
                    .map(([rol, total]) => `${rol} ${total}`)
                    .join(" · ")}
                </span>
              </span>
              <Link href={msPath("/propiedades")} className="shrink-0 text-body font-medium text-brand hover:underline">
                Ver Mis propiedades
              </Link>
            </li>
          )}
          {comercios.length > 0 && (
            <li className="flex items-start justify-between gap-3 py-2.5">
              <span className="min-w-0 text-body text-fg">
                Comercios <span className="block text-fg-3">{comercios.map((c) => c.nombre).join(" · ")}</span>
              </span>
              <Link href={msPath("/arrendamientos")} className="shrink-0 text-body font-medium text-brand hover:underline">
                Ver Mis comercios
              </Link>
            </li>
          )}
          {asignaciones.length === 0 && comercios.length === 0 && <li className="py-2.5 text-body text-fg-3">No tienes propiedades ni comercios asignados.</li>}
        </ul>
      </Seccion>
    </div>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-8">
      <h2 id={id} className="mb-4 border-b border-stroke-3 pb-2 text-body-lg font-bold text-fg">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Dato({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption font-semibold text-fg-3">{label}</dt>
      <dd className="mt-0.5 text-body break-words text-fg">{value?.trim() ? value : <SinDato />}</dd>
    </div>
  );
}
