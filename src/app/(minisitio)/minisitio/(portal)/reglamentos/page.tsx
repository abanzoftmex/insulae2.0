import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listDocuments, type Documento } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { ReglamentosView } from "./reglamentos-view";

export const metadata: Metadata = { title: "Documentos Condominales" };

/** Documentos condominales (antes pages/reglamentos.js + /api/reglamentos). */
export default async function ReglamentosPage() {
  const session = await requireCondominoSession();

  let documentos: Documento[] = [];
  let error: string | null = null;
  try {
    documentos = (await listDocuments(session)).documentos;
  } catch (err) {
    console.error("[minisitio] reglamentos:", err);
    error = "No se pudieron cargar los documentos";
  }

  return <ReglamentosView documentos={documentos} error={error} />;
}
