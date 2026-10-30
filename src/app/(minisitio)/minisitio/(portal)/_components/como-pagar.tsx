"use client";

/**
 * "Cómo pagar", en la vista secundaria (panel a la derecha en escritorio, pantalla completa en el
 * celular): las cuentas para transferir con su CLABE lista para copiar, a nombre de quién, el
 * concepto sugerido para que la administración identifique el pago y sus notas (plazos, formas de
 * pago aceptadas). Todo sale del pie de los recibos que la administración edita en el panel; antes
 * el portal mostraba el adeudo sin decir cómo pagarlo.
 */
import { Copy } from "lucide-react";
import type { InstruccionesPago } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { SecondaryView } from "@/components/minisitio/shell/secondary-view";
import { buttonClass } from "@/components/minisitio/ui/button";
import { toast } from "@/stores/minisitio-toast.store";
import { MINISITIO_TIME_ZONE } from "../_lib/client-dates";
import type { MovimientoEstadoCuenta } from "./estado-cuenta/statement-parts";

const MES_ANIO = new Intl.DateTimeFormat("es-MX", { month: "short", year: "numeric", timeZone: MINISITIO_TIME_ZONE });

/** CLABE en sus partes (banco · plaza · cuenta · dígito de control), para leerla o dictarla. */
const clabeLegible = (c: string) => `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6, 17)} ${c.slice(17)}`;

/** "Oct 2026", como en el ejemplo de la administración ("VQ#001, Cuota Ordinaria Jul 2025"). */
function mesYAnio(fecha: Date) {
  const partes = MES_ANIO.formatToParts(fecha);
  const mes = (partes.find((p) => p.type === "month")?.value ?? "").replace(".", "");
  const anio = partes.find((p) => p.type === "year")?.value ?? "";
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${anio}`;
}

/**
 * Concepto sugerido: el del cargo pendiente más antiguo ("VQ#03B-020, Cuota Extraordinaria Dic
 * 2025"); sin pendientes, la cuota ordinaria del mes en curso.
 */
function conceptoDePago(unidad: string, movimientos: MovimientoEstadoCuenta[]) {
  const saldo = (m: MovimientoEstadoCuenta) => m.monto - m.montoAbonado - m.descuento_aplicado + m.intereses;
  const pendiente = movimientos
    .filter((m) => saldo(m) >= 0.005)
    .sort((a, b) => (a.fechaVigencia ?? "9999").localeCompare(b.fechaVigencia ?? "9999"))[0];
  if (!pendiente) return `${unidad}, Cuota Ordinaria ${mesYAnio(new Date())}`;
  const tipo = /extraordinari/i.test(`${pendiente.grupoCobro ?? ""} ${pendiente.concepto}`) ? "Cuota Extraordinaria" : "Cuota Ordinaria";
  const vence = pendiente.fechaVigencia ? new Date(pendiente.fechaVigencia) : new Date();
  return `${unidad}, ${tipo} ${mesYAnio(Number.isNaN(vence.getTime()) ? new Date() : vence)}`;
}

function Copiar({ valor, etiqueta, aviso }: { valor: string; etiqueta: string; aviso: string }) {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      toast(aviso, "success");
    } catch {
      toast("No se pudo copiar. Selecciónalo y cópialo a mano.", "error");
    }
  };
  return (
    <button type="button" onClick={copiar} aria-label={etiqueta} className={buttonClass("outline", "sm", "shrink-0")}>
      <Copy className="h-3.5 w-3.5" aria-hidden />
      Copiar
    </button>
  );
}

/**
 * Notas de la administración, línea por línea: las líneas seguidas forman un párrafo, una línea en
 * blanco lo cierra y cada "1. …" va aparte con sangría colgante (en el texto real, "Nota:" y el
 * primer inciso solo los separa un salto de línea).
 */
function Notas({ texto, omitir }: { texto: string; omitir?: RegExp }) {
  const bloques: { marca?: string; texto: string }[] = [];
  let parrafo: string[] = [];
  const cerrar = () => {
    if (parrafo.length) bloques.push({ texto: parrafo.join(" ") });
    parrafo = [];
  };
  for (const cruda of texto.split("\n")) {
    const linea = cruda.trim();
    const inciso = linea.match(/^(\d+\.)\s*(.+)$/);
    if (!linea) cerrar();
    else if (inciso) {
      cerrar();
      bloques.push({ marca: inciso[1], texto: inciso[2] });
    } else parrafo.push(linea);
  }
  cerrar();
  return (
    <div className="space-y-2.5 text-body text-fg-2">
      {bloques
        .filter((b) => !(omitir && omitir.test(b.texto)))
        .map((b, i) =>
          b.marca ? (
            <p key={i} className="flex gap-2">
              <span className="w-5 shrink-0 text-fg-3 tabular-nums">{b.marca}</span>
              <span className="min-w-0">{b.texto}</span>
            </p>
          ) : (
            <p key={i}>{b.texto}</p>
          ),
        )}
    </div>
  );
}

export function ComoPagar({
  open,
  onClose,
  info,
  unidad,
  movimientos = [],
}: {
  open: boolean;
  onClose: () => void;
  info: InstruccionesPago;
  /** Clave de la unidad ("VQ#03B-020") para sugerir el concepto del pago. */
  unidad?: string | null;
  /** Movimientos del estado de cuenta: el concepto sugerido es el del cargo pendiente más antiguo. */
  movimientos?: MovimientoEstadoCuenta[];
}) {
  const concepto = unidad ? conceptoDePago(unidad, movimientos) : null;
  return (
    <SecondaryView open={open} onClose={onClose} title="Cómo pagar" context={unidad ?? undefined}>
      <div className="space-y-6 px-4 py-4 sm:px-5">
        {info.cuentas.length > 0 && (
          <section aria-labelledby="pagar-cuentas">
            <h3 id="pagar-cuentas" className="text-body font-bold text-fg">
              Transfiere a cualquiera de estas cuentas
            </h3>
            <ul className="mt-2 divide-y divide-stroke-3 rounded-panel border border-stroke-2">
              {info.cuentas.map((c) => (
                <li key={c.clabe} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-caption font-semibold text-fg-3">{c.banco}</span>
                    <span className="block text-body-lg font-semibold text-fg tabular-nums">{clabeLegible(c.clabe)}</span>
                  </span>
                  <Copiar valor={c.clabe} etiqueta={`Copiar la CLABE de ${c.banco}`} aviso={`CLABE de ${c.banco} copiada`} />
                </li>
              ))}
            </ul>
            {info.beneficiario && (
              <p className="mt-2 text-caption text-fg-3">
                A nombre de <span className="font-semibold text-fg-2">{info.beneficiario.nombre}</span>
                {info.beneficiario.rfc && <> · RFC {info.beneficiario.rfc}</>}
              </p>
            )}
          </section>
        )}

        {concepto && (
          <section aria-labelledby="pagar-concepto">
            <h3 id="pagar-concepto" className="text-body font-bold text-fg">
              Concepto del pago
            </h3>
            <div className="mt-2 flex items-center gap-3 rounded-panel border border-stroke-2 px-3 py-2.5">
              <span className="min-w-0 flex-1 text-body font-semibold text-fg">{concepto}</span>
              <Copiar valor={concepto} etiqueta="Copiar el concepto del pago" aviso="Concepto copiado" />
            </div>
            <p className="mt-2 text-caption text-fg-3">Así la administración identifica tu pago. Cambia el mes o el tipo de cuota si pagas otra cosa.</p>
          </section>
        )}

        {info.notas && (
          <section aria-labelledby="pagar-notas">
            <h3 id="pagar-notas" className="mb-2 text-body font-bold text-fg">
              Antes de pagar
            </h3>
            <Notas texto={info.notas} omitir={info.beneficiario ? /raz[oó]n social:/i : undefined} />
          </section>
        )}
      </div>
    </SecondaryView>
  );
}
