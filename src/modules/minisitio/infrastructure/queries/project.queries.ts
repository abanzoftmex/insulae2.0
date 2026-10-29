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
