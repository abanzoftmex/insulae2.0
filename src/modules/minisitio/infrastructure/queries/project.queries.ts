/**
 * Datos públicos del proyecto (logo, nombre, aviso de privacidad). Los usan también las
 * pantallas sin sesión: login, recuperación de contraseña y aviso de privacidad.
 */
import { PROJECT_SCOPE } from "@/config/project-scope";
import { getActiveProject, getMinisitioCondominium } from "../condominium";

export interface ProjectInfo {
  nombre: string;
  totalM2: number;
  logo: string | null;
  avisoPrivacidad: string | null;
  sintesisAviso: string | null;
}

export async function getProjectInfo(): Promise<ProjectInfo> {
  const condominium = await getMinisitioCondominium();
  if (!condominium) {
    return { nombre: PROJECT_SCOPE.condominiumName, totalM2: 0, logo: null, avisoPrivacidad: null, sintesisAviso: null };
  }
  const project = await getActiveProject(condominium.id);
  return {
    nombre: project?.name || condominium.name,
    totalM2: project?.totalM2 ? Number(project.totalM2) : 0,
    logo: project?.condominiumLogoUrl || null,
    avisoPrivacidad: project?.privacyNoticeText || null,
    sintesisAviso: null,
  };
}

export interface PrivacyNotice {
  aviso_privacidad: string;
  pdfAviso: string | null;
}

export async function getPrivacyNotice(): Promise<PrivacyNotice> {
  const condominium = await getMinisitioCondominium();
  if (!condominium) return { aviso_privacidad: "", pdfAviso: null };
  const project = await getActiveProject(condominium.id);
  return {
    aviso_privacidad: project?.privacyNoticeText || "",
    pdfAviso: project?.privacyNoticePdfUrl || null,
  };
}

export interface InstruccionesPago {
  /** Cuentas para transferir (CLABE de 18 dígitos, sin espacios). */
  cuentas: { banco: string; clabe: string }[];
  /** A nombre de quién van los pagos, si las notas lo dicen ("Nombre o razón social: … RFC: …"). */
  beneficiario: { nombre: string; rfc: string | null } | null;
  /** Texto de la administración: plazos, formas de pago aceptadas y cómo identificar el pago. */
  notas: string;
}

/**
 * Cómo pagar: sale del pie de los recibos que la administración edita en el panel (Proyecto). El
 * derecho trae los bancos ("Banco: …" y "Clabe interbancaria: …"); el izquierdo, las notas. Si el
 * derecho no tiene ese formato, su texto se agrega a las notas para no perderlo. null si no hay nada.
 */
export async function getPaymentInstructions(): Promise<InstruccionesPago | null> {
  const condominium = await getMinisitioCondominium();
  if (!condominium) return null;
  const project = await getActiveProject(condominium.id);
  const derecho = (project?.footerRight ?? "").replace(/\r\n?/g, "\n");
  const notasIzq = (project?.footerLeft ?? "").replace(/\r\n?/g, "\n").trim();
  const cuentas = [...derecho.matchAll(/Banco:\s*([^\n]+)\n\s*Clabe[^:\n]*:\s*([\d ]{18,})/gi)]
    .map((m) => ({ banco: m[1].trim(), clabe: m[2].replace(/\s/g, "") }))
    .filter((c) => /^\d{18}$/.test(c.clabe));
  const notas = cuentas.length ? notasIzq : [notasIzq, derecho.trim()].filter(Boolean).join("\n\n");
  const titular = notasIzq.match(/raz[oó]n social:\s*(.+?)\s+RFC:\s*([A-Z0-9&Ñ]{12,13})/i);
  if (!cuentas.length && !notas) return null;
  return {
    cuentas,
    beneficiario: titular ? { nombre: titular[1].trim(), rfc: titular[2].toUpperCase() } : null,
    notas,
  };
}
