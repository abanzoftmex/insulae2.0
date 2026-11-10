/**
 * governance-terms.ts
 *
 * Utilidades centralizadas para terminología dinámica (Asamblea vs. Reunión, Votación vs. Confirmación)
 * y persistencia estructurada de conclusiones, acuerdos y archivos adjuntos de temas de orden del día.
 */

export interface AgreementFile {
  name: string;
  url: string;
  size?: number;
}

export interface TopicConclusionsData {
  conclusions: string;
  agreement: string;
  agreementFiles: AgreementFile[];
  responsible: string;
}

/**
 * Determina si una convocatoria es de tipo "Asamblea" basándose en la configuración persistida.
 * Revisa el tipo y subtipo de convocatoria guardados.
 */
export function isAsamblea(announcement?: {
  type?: { name?: string | null } | null;
  subtype?: { name?: string | null } | null;
  typeName?: string | null;
  subtypeName?: string | null;
  name?: string | null;
} | null): boolean {
  if (!announcement) return true; // Default fallback to asamblea if unknown

  const typeName = (announcement.type?.name || announcement.typeName || "").toLowerCase();
  const subtypeName = (announcement.subtype?.name || announcement.subtypeName || "").toLowerCase();
  const annName = (announcement.name || "").toLowerCase();

  if (typeName.includes("reunion") || typeName.includes("reunión")) {
    return false;
  }
  if (subtypeName.includes("reunion") || subtypeName.includes("reunión") || subtypeName.includes("sesion") || subtypeName.includes("sesión")) {
    return false;
  }
  if (typeName.includes("asamblea") || subtypeName.includes("asamblea")) {
    return true;
  }

  // Fallback a nombre de la convocatoria
  if (annName.includes("reunion") || annName.includes("reunión")) {
    return false;
  }
  return true;
}

/**
 * Retorna el sustantivo correspondiente según el tipo de convocatoria.
 */
export function getMeetingNoun(
  isAsambleaType: boolean,
  options?: {
    capitalized?: boolean;
    plural?: boolean;
    withArticle?: boolean;
    genderArticle?: boolean;
  }
): string {
  const { capitalized = false, plural = false, withArticle = false } = options || {};

  if (isAsambleaType) {
    if (withArticle) {
      return plural ? (capitalized ? "Las asambleas" : "las asambleas") : (capitalized ? "La asamblea" : "la asamblea");
    }
    if (plural) {
      return capitalized ? "Asambleas" : "asambleas";
    }
    return capitalized ? "Asamblea" : "asamblea";
  } else {
    if (withArticle) {
      return plural ? (capitalized ? "Las reuniones" : "las reuniones") : (capitalized ? "La reunión" : "la reunión");
    }
    if (plural) {
      return capitalized ? "Reuniones" : "reuniones";
    }
    return capitalized ? "Reunión" : "reunión";
  }
}

/**
 * Comprueba si el tipo de acción de un tema es Votación.
 */
export function isTopicVote(actionType?: string | null): boolean {
  if (!actionType) return false;
  const normalized = actionType.trim().toUpperCase();
  return normalized === "VOTE" || normalized === "VOTACION" || normalized === "VOTACIÓN";
}

/**
 * Comprueba si el tipo de acción de un tema es Confirmación.
 */
export function isTopicConfirmation(actionType?: string | null): boolean {
  if (!actionType) return false;
  const normalized = actionType.trim().toUpperCase();
  return normalized === "CONFIRMATION" || normalized === "CONFIRMACION" || normalized === "CONFIRMACIÓN";
}

/**
 * Analiza el conjunto de temas de una convocatoria para determinar su tipo de acción predominante.
 */
export function getTopicsActionSummary(topics: { actionType?: string | null }[] = []) {
  const hasVotes = topics.some((t) => isTopicVote(t.actionType));
  const hasConfirmations = topics.some((t) => isTopicConfirmation(t.actionType));

  let primaryAction: "VOTE" | "CONFIRMATION" | "MIXED" | "NONE" = "NONE";
  if (hasVotes && hasConfirmations) {
    primaryAction = "MIXED";
  } else if (hasVotes) {
    primaryAction = "VOTE";
  } else if (hasConfirmations) {
    primaryAction = "CONFIRMATION";
  }

  return {
    hasVotes,
    hasConfirmations,
    primaryAction,
    isOnlyConfirmation: hasConfirmations && !hasVotes,
  };
}

/**
 * Parsea el campo de texto `conclusions` de un tema.
 * Admite tanto el formato estructurado JSON nuevo como texto plano de registros históricos existentes.
 */
export function parseTopicConclusions(raw?: string | null): TopicConclusionsData {
  if (!raw || !raw.trim()) {
    return {
      conclusions: "",
      agreement: "",
      agreementFiles: [],
      responsible: "",
    };
  }

  const trimmed = raw.trim();

  // Intentar parsear como JSON estructurado
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        conclusions: typeof parsed.conclusions === "string" ? parsed.conclusions : "",
        agreement: typeof parsed.agreement === "string" ? parsed.agreement : "",
        agreementFiles: Array.isArray(parsed.agreementFiles)
          ? parsed.agreementFiles.filter((f: any) => f && typeof f.url === "string")
          : [],
        responsible: typeof parsed.responsible === "string" ? parsed.responsible : "",
      };
    } catch {
      // Ignorar error de parsing y continuar como string plano
    }
  }

  // Retrocompatibilidad con texto plano histórico
  return {
    conclusions: trimmed,
    agreement: "",
    agreementFiles: [],
    responsible: "",
  };
}

/**
 * Serializa los campos de conclusiones, acuerdo y responsable en un JSON estructurado para persistir en `conclusions`.
 */
export function serializeTopicConclusions(data: Partial<TopicConclusionsData>): string {
  return JSON.stringify({
    conclusions: data.conclusions || "",
    agreement: data.agreement || "",
    agreementFiles: data.agreementFiles || [],
    responsible: data.responsible || "",
  });
}

