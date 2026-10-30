/**
 * Cómo se cuenta el adeudo en palabras, igual en Inicio y en Mis saldos: "70 de tus 86
 * propiedades tienen saldo vencido. Tus 4 comercios están al corriente."
 */
export interface ConteoUnidades {
  total: number;
  conAdeudo: number;
}

function lineaUnidades({ conAdeudo, total }: ConteoUnidades, [una, varias]: [string, string]): string | null {
  if (total === 0) return null;
  if (conAdeudo === 0) return total === 1 ? `Tu ${una} está al corriente.` : `Tus ${total} ${varias} están al corriente.`;
  if (total === 1) return `Tu ${una} tiene saldo vencido.`;
  return `${conAdeudo} de tus ${total} ${varias} ${conAdeudo === 1 ? "tiene" : "tienen"} saldo vencido.`;
}

export function resumenUnidades(propiedades: ConteoUnidades, comercios: ConteoUnidades): string {
  return [lineaUnidades(propiedades, ["propiedad", "propiedades"]), lineaUnidades(comercios, ["comercio", "comercios"])].filter(Boolean).join(" ");
}
