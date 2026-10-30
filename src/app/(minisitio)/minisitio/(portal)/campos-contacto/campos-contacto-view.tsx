"use client";

/**
 * Teléfonos de emergencia y contacto, agrupados por lo que son: emergencias primero (con
 * "Llamar" destacado), luego administración y experiencias. Cada contacto trae sus acciones
 * (llamar, WhatsApp, escribir, mapa) y un botón para copiar el dato.
 */
import { ArrowUpRight, Copy, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { buttonClass } from "@/components/minisitio/ui/button";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { toast } from "@/stores/minisitio-toast.store";
import { GRUPOS, type AccionContacto, type Contacto } from "../_lib/contactos";

const ICONO = { llamar: Phone, whatsapp: MessageCircle, correo: Mail, mapa: MapPin } as const;

export function CamposContactoView({ contactos }: { contactos: Contacto[] | null }) {
  if (contactos === null) {
    return (
      <div className="mx-auto w-full max-w-[880px]">
        <LoadError what="los teléfonos" />
      </div>
    );
  }
  if (contactos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[880px] py-12 text-center">
        <p className="text-body text-fg-2">Todavía no hay teléfonos publicados.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[880px] space-y-8">
      {GRUPOS.map((grupo) => {
        const delGrupo = contactos.filter((c) => c.grupo === grupo.id).sort((a, b) => Number(b.medica) - Number(a.medica));
        if (delGrupo.length === 0) return null;
        return (
          <section key={grupo.id} aria-labelledby={`contactos-${grupo.id}`}>
            <div className="border-b border-stroke-3 pb-2">
              <h2 id={`contactos-${grupo.id}`} className="text-body-lg font-bold text-fg">
                {grupo.titulo}
              </h2>
              <p className="text-caption text-fg-3">{grupo.descripcion}</p>
            </div>
            <ul className="divide-y divide-stroke-3">
              {delGrupo.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block text-body font-semibold text-fg">{c.nombre}</span>
                    <span className="flex items-center gap-1">
                      <span className="min-w-0 text-body break-words text-fg-2 tabular-nums">{c.valor}</span>
                      {c.valor && <CopiarBoton valor={c.valor} nombre={c.nombre} />}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-2">
                    {c.acciones.map((accion) => (
                      <Accion key={accion.id} accion={accion} nombre={c.nombre} destacada={grupo.id === "emergencias" && accion.id === "llamar"} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Accion({ accion, nombre, destacada }: { accion: AccionContacto; nombre: string; destacada: boolean }) {
  const Icono = ICONO[accion.id];
  return (
    <a
      href={accion.href}
      {...(accion.externa ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      aria-label={`${accion.label}: ${nombre}${accion.externa ? " (se abre en otra pestaña)" : ""}`}
      className={buttonClass(destacada ? "primary" : "outline", "sm")}
    >
      <Icono className="h-3.5 w-3.5" aria-hidden />
      {accion.label}
      {accion.externa && <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden />}
    </a>
  );
}

function CopiarBoton({ valor, nombre }: { valor: string; nombre: string }) {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      toast(`Copiado: ${valor}`, "info");
    } catch {
      toast("No se pudo copiar. Selecciónalo y cópialo a mano.", "error");
    }
  };
  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`Copiar ${nombre}`}
      title="Copiar"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-ctrl text-fg-4 outline-none hover:bg-surface-3 hover:text-fg-2 focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
