"use client";

/**
 * Solicitudes (`/minisitio/tickets`) como hilos de Slack: la lista (abiertas o cerradas) y cada
 * solicitud se abre en la vista secundaria con la conversación completa —tu solicitud, la
 * respuesta de la administración y tu respuesta— y el compositor abajo.
 *
 * Se pinta con los datos del servidor: tras crear o responder, router.refresh() trae la lista
 * nueva y el conteo de la barra lateral. El modelo guarda una sola respuesta del condómino; una
 * nueva reemplaza la anterior, y el compositor lo dice.
 */
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send } from "lucide-react";
import { replyTicketAction } from "@/app/(minisitio)/minisitio/_actions/tickets";
import type { Ticket, TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioSession } from "@/components/minisitio/session-provider";
import { Avatar, userDisplayName } from "@/components/minisitio/shell/account-menu";
import { SecondaryView } from "@/components/minisitio/shell/secondary-view";
import { buttonClass } from "@/components/minisitio/ui/button";
import { ImageViewer, type ViewerImage } from "@/components/minisitio/ui/image-viewer";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { UnderlineTabs } from "@/components/minisitio/ui/tabs";
import { toast } from "@/stores/minisitio-toast.store";
import type { MinisitioUser } from "@/modules/minisitio/domain/types";
import { AdminAvatar, AvisoImagen, AvisoPdf } from "../_avisos/aviso-parts";
import { NuevaSolicitud } from "../_components/nueva-solicitud";
import { useDisplayTimeZone } from "../_lib/client-dates";
import { formatShortDate } from "../_lib/format";

type TabKey = "open" | "closed";

const estaAbierta = (t: Ticket) => t.id_cat_status_tickets === 1;

/** Quita la línea con la URL cruda del PDF que traen descripciones antiguas. */
function cleanDescripcion(text: string | null | undefined) {
  if (!text) return "";
  return text
    .split("\n")
    .filter((l) => !/^\s*PDF de la solicitud\s*:/i.test(l))
    .join("\n")
    .trim();
}

/** Lo último que se dijo en el hilo, para la fila de la lista. */
function vistaPrevia(t: Ticket): string {
  if (t.respuesta_usuario) return `Tú: ${t.respuesta_usuario}`;
  if (t.respuesta) return `Administración: ${t.respuesta}`;
  return cleanDescripcion(t.descripcion);
}

export function TicketsView({
  tickets,
  departments,
  initialCreateOpen = false,
  initialAsunto,
}: {
  /** `null` si no se pudo cargar. */
  tickets: Ticket[] | null;
  departments: TicketDepartment[];
  /** Abrir el formulario de alta al entrar (`/tickets?nueva=1`). */
  initialCreateOpen?: boolean;
  /** Asunto con el que abre el formulario (`&asunto=…`). */
  initialAsunto?: string;
}) {
  const router = useRouter();
  const { user } = useMinisitioSession();
  const timeZone = useDisplayTimeZone();
  const [tab, setTab] = useState<TabKey>("open");
  const [creating, setCreating] = useState(initialCreateOpen);
  // El id se conserva al cerrar para que el panel no se vacíe mientras sale.
  const [panel, setPanel] = useState<{ id: string | null; open: boolean }>({ id: null, open: false });
  const [imagen, setImagen] = useState<ViewerImage | null>(null);

  // `?nueva=1` solo abre el formulario al entrar: se quita de la URL para que recargar no lo reabra.
  useEffect(() => {
    if (initialCreateOpen) window.history.replaceState(null, "", msPath("/tickets"));
  }, [initialCreateOpen]);

  const lista = tickets ?? [];
  const abiertas = lista.filter(estaAbierta);
  const cerradas = lista.filter((t) => !estaAbierta(t));
  const visibles = tab === "open" ? abiertas : cerradas;
  const abierto = lista.find((t) => t.id_tickets === panel.id) ?? null;

  const abrir = (id: string) => setPanel({ id, open: true });

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <div className="mb-1 flex items-center justify-between gap-3 border-b border-stroke-3">
        <UnderlineTabs
          label="Mostrar solicitudes"
          value={tab}
          onChange={setTab}
          layoutId="solicitudes-tab"
          options={[
            { id: "open", label: "Abiertas", count: abiertas.length },
            { id: "closed", label: "Cerradas", count: cerradas.length },
          ]}
        />
        <button type="button" onClick={() => setCreating(true)} className={buttonClass("primary", "sm", "mb-1.5")}>
          <Plus className="h-4 w-4" aria-hidden />
          Nueva solicitud
        </button>
      </div>

      <div role="tabpanel" aria-label={tab === "open" ? "Solicitudes abiertas" : "Solicitudes cerradas"}>
        {tickets === null ? (
          <div className="pt-4">
            <LoadError what="tus solicitudes" />
          </div>
        ) : visibles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-body text-fg-2">{tab === "open" ? "No tienes solicitudes abiertas." : "Todavía no tienes solicitudes cerradas."}</p>
            {tab === "open" && (
              <button type="button" onClick={() => setCreating(true)} className={buttonClass("outline", "sm", "mt-3")}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Nueva solicitud
              </button>
            )}
          </div>
        ) : (
          <ul className="-mx-4 divide-y divide-stroke-3 sm:-mx-6">
            {visibles.map((t) => {
              const activa = panel.open && panel.id === t.id_tickets;
              const respondida = Boolean(t.respuesta);
              return (
                <li key={t.id_tickets}>
                  <button
                    type="button"
                    onClick={() => abrir(t.id_tickets)}
                    aria-current={activa ? "true" : undefined}
                    className={`block w-full px-4 py-3 text-left outline-none focus-visible:bg-surface-2 sm:px-6 ${activa ? "bg-highlight" : "hover:bg-surface-2"}`}
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="min-w-0 flex-1 truncate text-message font-semibold text-fg">{t.nombre}</span>
                      <time dateTime={t.fecha ?? undefined} className="shrink-0 text-caption text-fg-3" suppressHydrationWarning>
                        {formatShortDate(t.fecha, timeZone)}
                      </time>
                    </span>
                    <span className="mt-0.5 flex items-baseline gap-1.5 text-body text-fg-3">
                      <span className="shrink-0">{t.departamento || "Administración"}</span>
                      <span aria-hidden>·</span>
                      <span className="min-w-0 flex-1 truncate">{vistaPrevia(t)}</span>
                      {estaAbierta(t) && (
                        <span className={`shrink-0 text-caption ${respondida ? "font-semibold text-brand" : "text-fg-3"}`}>
                          {respondida ? "Respondida" : "Sin respuesta"}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SecondaryView
        open={panel.open}
        onClose={() => setPanel((p) => ({ ...p, open: false }))}
        title="Solicitud"
        context={abierto?.departamento ?? undefined}
        footer={
          abierto && estaAbierta(abierto) ? (
            <Compositor key={abierto.id_tickets} ticket={abierto} onSent={() => router.refresh()} />
          ) : undefined
        }
      >
        {abierto ? (
          <Hilo ticket={abierto} user={user} timeZone={timeZone} onImage={setImagen} />
        ) : (
          <p className="text-body text-fg-3" role="status">
            Cargando la solicitud…
          </p>
        )}
      </SecondaryView>

      <NuevaSolicitud
        open={creating}
        onClose={() => setCreating(false)}
        departments={departments}
        defaultAsunto={initialAsunto}
        onCreated={(id) => {
          setTab("open");
          if (id) abrir(id);
        }}
      />
      <ImageViewer image={imagen} onClose={() => setImagen(null)} />
    </div>
  );
}

function Mensaje({
  autor,
  avatar,
  fecha,
  timeZone,
  children,
}: {
  autor: string;
  avatar: React.ReactNode;
  fecha: string | null | undefined;
  timeZone?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 py-1">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-body font-bold text-fg">{autor}</span>
          {fecha && (
            <time dateTime={fecha} className="text-caption text-fg-3" suppressHydrationWarning>
              {formatShortDate(fecha, timeZone)}
            </time>
          )}
        </p>
        {children}
      </div>
    </div>
  );
}

function Hilo({
  ticket,
  user,
  timeZone,
  onImage,
}: {
  ticket: Ticket;
  user: MinisitioUser | null;
  timeZone?: string;
  onImage: (image: ViewerImage) => void;
}) {
  const abierta = estaAbierta(ticket);
  const descripcion = cleanDescripcion(ticket.descripcion);
  const respuestas = Number(Boolean(ticket.respuesta)) + Number(Boolean(ticket.respuesta_usuario));
  const yo = userDisplayName(user);

  return (
    <div>
      <Mensaje autor={yo} avatar={<Avatar user={user} size={36} />} fecha={ticket.fecha} timeZone={timeZone}>
        <p className="text-message font-semibold text-fg">{ticket.nombre}</p>
        {descripcion && <p className="text-message whitespace-pre-line text-fg">{descripcion}</p>}
      </Mensaje>

      <div className="my-3 flex items-center gap-3 text-caption text-fg-3">
        <span>{respuestas === 0 ? "Sin respuestas" : respuestas === 1 ? "1 respuesta" : `${respuestas} respuestas`}</span>
        <span aria-hidden className="h-px flex-1 bg-stroke-3" />
      </div>

      {ticket.respuesta ? (
        <Mensaje
          autor={ticket.departamento ? `Administración · ${ticket.departamento}` : "Administración"}
          avatar={<AdminAvatar />}
          fecha={ticket.fecha_respuesta}
          timeZone={timeZone}
        >
          <p className="text-message whitespace-pre-wrap text-fg">{ticket.respuesta}</p>
          {(ticket.imagen_respuesta || ticket.pdf_respuesta) && (
            <div className="mt-2 flex flex-col items-start gap-2">
              {ticket.imagen_respuesta && (
                <AvisoImagen
                  src={ticket.imagen_respuesta}
                  titulo={ticket.nombre}
                  onOpen={() => onImage({ src: ticket.imagen_respuesta ?? "", title: ticket.nombre })}
                />
              )}
              {ticket.pdf_respuesta && <AvisoPdf href={ticket.pdf_respuesta} />}
            </div>
          )}
        </Mensaje>
      ) : (
        <p className="text-body text-fg-3">{abierta ? "La administración todavía no responde." : "Se cerró sin respuesta escrita."}</p>
      )}

      {ticket.respuesta_usuario && (
        <div className="mt-2">
          <Mensaje autor={yo} avatar={<Avatar user={user} size={36} />} fecha={ticket.fecha_respuesta_usuario} timeZone={timeZone}>
            <p className="text-message whitespace-pre-wrap text-fg">{ticket.respuesta_usuario}</p>
          </Mensaje>
        </div>
      )}

      {!abierta && <p className="mt-6 text-center text-caption text-fg-3">Solicitud cerrada</p>}
    </div>
  );
}

/** El compositor de Slack: radio 8, borde que se enciende con el foco y ⌘/Ctrl + Enter para enviar. */
function Compositor({ ticket, onSent }: { ticket: Ticket; onSent: () => void }) {
  const fieldId = useId();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const yaRespondio = Boolean(ticket.respuesta_usuario);

  const enviar = async () => {
    const value = texto.trim();
    if (!value || enviando) return;
    setEnviando(true);
    try {
      const res = await replyTicketAction(ticket.id_tickets, value);
      if (res.success) {
        setTexto("");
        toast("Respuesta enviada");
        onSent();
      } else {
        toast(res.message || "No se pudo enviar la respuesta.", "error");
      }
    } catch {
      toast("No se pudo enviar. Revisa tu conexión e inténtalo otra vez.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
      className="rounded-panel border border-stroke-accessible/40 transition-[border-color,box-shadow] duration-fast focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"
    >
      <label htmlFor={fieldId} className="sr-only">
        Responder a la administración
      </label>
      <textarea
        id={fieldId}
        rows={2}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void enviar();
          }
        }}
        placeholder="Responder a la administración…"
        className="block max-h-48 min-h-[60px] w-full resize-none bg-transparent px-3 pt-2.5 text-message text-fg outline-none [field-sizing:content] placeholder:text-fg-4 max-sm:text-body-lg"
      />
      <div className="flex items-center gap-2 px-2 pb-2">
        <p className="min-w-0 flex-1 truncate pl-1 text-caption text-fg-3">
          {/* La tecla solo sirve con teclado; que se reemplaza la respuesta, siempre. */}
          {yaRespondio ? "Reemplaza tu respuesta anterior." : <span className="pointer-coarse:hidden">⌘/Ctrl + Enter para enviar</span>}
        </p>
        <button type="submit" disabled={!texto.trim() || enviando} className={buttonClass("primary", "sm")}>
          <Send className="h-3.5 w-3.5" aria-hidden />
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}
