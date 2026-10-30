import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Home,
  Building,
  Clock,
  AlertCircle,
  Info,
  HelpCircle,
} from "lucide-react";
import type { CampoContacto } from "@/modules/minisitio/infrastructure/queries/documents.queries";

// Iconos disponibles con sus nombres
const ICONOS_DISPONIBLES = [
  { nombre: "MapPin", componente: MapPin, label: "Ubicación" },
  { nombre: "Phone", componente: Phone, label: "Teléfono" },
  { nombre: "Mail", componente: Mail, label: "Email" },
  {
    nombre: "MessageCircle",
    componente: MessageCircle,
    label: "WhatsApp/Chat",
  },
  { nombre: "Home", componente: Home, label: "Casa" },
  { nombre: "Building", componente: Building, label: "Edificio" },
  { nombre: "Clock", componente: Clock, label: "Horario" },
  { nombre: "AlertCircle", componente: AlertCircle, label: "Alerta" },
  { nombre: "Info", componente: Info, label: "Información" },
  { nombre: "HelpCircle", componente: HelpCircle, label: "Ayuda" },
];

const getIconComponent = (nombreIcono: string) => {
  const icono = ICONOS_DISPONIBLES.find((i) => i.nombre === nombreIcono);
  return icono ? icono.componente : Phone;
};

/** Diez dígitos seguidos se leen mejor en grupos de 3-3-4, como se dictan en México. */
function formatPhone(text: string): string {
  const t = text.trim();
  return /^\d{10}$/.test(t) ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : t;
}

/** Enlace para llamar o escribir según el contenido (antes el número solo se podía copiar a mano). */
function contactHref(campo: CampoContacto): { href: string; external: boolean } | null {
  if (campo.enlace) return { href: campo.enlace, external: campo.target === "_blank" };
  const t = campo.contenido.trim();
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(t)) return { href: `mailto:${t}`, external: false };
  const digits = t.replace(/[^\d+]/g, "");
  if (/^\+?[\d\s().-]{7,}$/.test(t) && digits.replace(/\D/g, "").length >= 7) return { href: `tel:${digits}`, external: false };
  return null;
}

/** Vista de "Información de Contacto". Sin estado ni interacción: se pinta en el servidor. */
export function CamposContactoView({ campos }: { campos: CampoContacto[] }) {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-mint shadow-[0_1px_2px_rgb(61_60_34/0.25)]">
          <Phone aria-hidden className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[24px] font-bold leading-8 tracking-[-0.02em] text-fg">Información de Contacto</h2>
          <p className="text-[14px] leading-5 text-fg-3">Consulta los diferentes medios de contacto disponibles</p>
        </div>
      </div>

      {/* Lista de campos */}
      <section aria-labelledby="medios-contacto" className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
        <div className="border-b border-stroke-3 px-5 py-4 sm:px-6">
          <h3 id="medios-contacto" className="text-[16px] font-semibold text-fg">
            Medios de Contacto Disponibles
          </h3>
        </div>

        {campos.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3 text-fg-4">
              <Phone aria-hidden className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="text-[14px] text-fg-3">No hay información de contacto disponible</p>
          </div>
        ) : (
          <ul className="divide-y divide-stroke-3">
            {campos.map((campo) => {
              const IconComponent = getIconComponent(campo.icono);
              const link = contactHref(campo);
              const contenido = formatPhone(campo.contenido);
              return (
                <li
                  key={campo.id}
                  data-search-id={campo.id}
                  className="scroll-mt-24 flex items-center gap-4 px-5 py-4 transition-colors duration-100 hover:bg-surface-2 sm:px-6"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                    <IconComponent aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[14.5px] font-semibold text-fg">{campo.titulo}</h4>
                      <span className="inline-flex h-[22px] items-center rounded-full bg-surface-4 px-2 text-[12px] font-medium text-fg-3">
                        {campo.tipo_contacto}
                      </span>
                    </div>
                    {link ? (
                      <a
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noopener noreferrer" : undefined}
                        className="mt-0.5 inline-block max-w-2xl break-words rounded text-[14px] text-brand underline-offset-[3px] outline-none tabular-nums hover:text-brand-deep hover:underline focus-visible:ring-2 focus-visible:ring-brand/45"
                      >
                        {contenido}
                      </a>
                    ) : (
                      <p className="mt-0.5 max-w-2xl text-[14px] text-fg-2 tabular-nums">{contenido}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
