import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listComunicadosRecientes } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { listContactFields } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { listProperties } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import { listRentals } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { listTickets } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { comunicadoFileUrl } from "./_lib/comunicado-file-url";
import { formatPhone, telHref } from "./_lib/format";
import { InicioView, type AvisoResumen, type CuentaResumen, type SolicitudesResumen, type TelefonoEmergencia } from "./inicio-view";

export const metadata: Metadata = { title: "Inicio" };

/** Teléfonos que van en Inicio: urgencias médicas primero, luego casetas y seguridad. */
const URGENCIA_MEDICA = /param[eé]dic|ambulanc|emergenc|bomber|protecci[oó]n civil/i;
const URGENCIA = /caseta|seguridad|guardia|vigilan/i;
const MAX_TELEFONOS = 4;

const round2 = (n: number) => Math.round(n * 100) / 100;

function logAndNull(section: string) {
  return (error: unknown) => {
    console.error(`[minisitio] Inicio: ${section}:`, error);
    return null;
  };
}

/**
 * Inicio (`/minisitio`): responde "¿debo algo?" y "¿qué hay de nuevo?". Saldo vencido de todas
 * las unidades, avisos recientes, solicitudes abiertas y teléfonos de emergencia. Si una
 * consulta falla, su bloque lo dice (no se pinta en ceros) y el resto de la pantalla sigue.
 */
export default async function InicioPage() {
  const session = await requireCondominoSession();

  const [propiedades, comercios, recientes, abiertas, contacto] = await Promise.all([
    listProperties(session).catch(logAndNull("propiedades")),
    listRentals(session).catch(logAndNull("comercios")),
    listComunicadosRecientes(session).catch(logAndNull("avisos recientes")),
    listTickets(session, "open").catch(logAndNull("solicitudes abiertas")),
    listContactFields(session).catch(logAndNull("teléfonos")),
  ]);

  let cuenta: CuentaResumen | null = null;
  if (propiedades && comercios) {
    const unidades = [
      ...propiedades.propiedades.map((p) => ({
        tipo: "propiedad" as const,
        nombre: p.nombre,
        vencido: p.saldo_vencido,
        porVencer: Math.max(0, p.saldo_pendiente - p.saldo_vencido),
        estadoCuenta: `/propiedades/${p.id_areas_privativas}/estado-cuenta`,
      })),
      ...comercios.arrendamientos.map((r) => ({
        tipo: "comercio" as const,
        nombre: r.nombre_comercio,
        vencido: r.saldo_vencido ?? 0,
        porVencer: r.saldo_pendiente_no_vencido ?? 0,
        estadoCuenta: `/arrendamientos/${r.id_arrendamientos}/estado-cuenta`,
      })),
    ];
    const conAdeudo = unidades.filter((u) => u.vencido > 0);
    cuenta = {
      saldoVencido: round2(unidades.reduce((sum, u) => sum + u.vencido, 0)),
      saldoPorVencer: round2(unidades.reduce((sum, u) => sum + u.porVencer, 0)),
      propiedades: { total: propiedades.propiedades.length, conAdeudo: conAdeudo.filter((u) => u.tipo === "propiedad").length },
      comercios: { total: comercios.arrendamientos.length, conAdeudo: conAdeudo.filter((u) => u.tipo === "comercio").length },
      unicaConAdeudo: conAdeudo.length === 1 ? { nombre: conAdeudo[0].nombre, href: conAdeudo[0].estadoCuenta } : null,
    };
  }

  const avisos: AvisoResumen[] | null = recientes
    ? recientes.comunicados.map((c) => {
        const titulo = c.nombre?.trim() || "Aviso";
        const mensaje = c.descripcion?.trim() ?? "";
        return {
          id: c.id_notificaciones,
          titulo,
          // Muchos avisos repiten el título como texto: no se muestra dos veces.
          mensaje: mensaje && mensaje !== titulo ? mensaje : "",
          fecha: c.fechaPublicar,
          vigencia: c.fechaVigencia,
          imagen: c.imagen ? comunicadoFileUrl(c.imagen) : null,
          pdf: c.pdf ? comunicadoFileUrl(c.pdf) : null,
        };
      })
    : null;

  const solicitudes: SolicitudesResumen | null = abiertas
    ? {
        total: abiertas.tickets.length,
        recientes: abiertas.tickets.slice(0, 3).map((t) => ({
          id: t.id_tickets,
          titulo: t.nombre,
          departamento: t.departamento,
          fecha: t.fecha,
          respondida: Boolean(t.respuesta),
        })),
      }
    : null;

  const llamables = (contacto?.campos ?? []).flatMap((c) => {
    const href = telHref(c.contenido ?? "");
    return href ? [{ id: c.id, nombre: c.titulo, numero: formatPhone(c.contenido), href }] : [];
  });
  const urgentes = llamables.filter((t) => URGENCIA_MEDICA.test(t.nombre) || URGENCIA.test(t.nombre));
  const vistos = new Set<string>();
  const telefonos: TelefonoEmergencia[] = (urgentes.length ? urgentes : llamables)
    .sort((a, b) => Number(URGENCIA_MEDICA.test(b.nombre)) - Number(URGENCIA_MEDICA.test(a.nombre)))
    // Un número por nombre (la caseta principal tiene dos); el resto, en "Todos".
    .filter((t) => {
      const key = t.nombre.trim().toLowerCase();
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    })
    .slice(0, MAX_TELEFONOS);

  return <InicioView cuenta={cuenta} avisos={avisos} solicitudes={solicitudes} telefonos={telefonos} />;
}
