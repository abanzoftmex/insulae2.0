import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listDocuments } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { DocumentList } from "../_components/document-list";

export const metadata: Metadata = { title: "Documentos del condominio" };

/** Documentos del condominio (`/minisitio/reglamentos`): reglamentos, estatutos y actas. */
export default async function ReglamentosPage() {
  const session = await requireCondominoSession();
  const documentos = await listDocuments(session)
    .then((data) => data.documentos)
    .catch((error) => {
      console.error("[minisitio] Documentos del condominio:", error);
      return null;
    });

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <p className="mb-2 text-body text-fg-3">Reglamentos, estatutos y documentos oficiales del condominio. Se abren en otra pestaña.</p>
      <DocumentList documentos={documentos ?? []} failed={documentos === null} />
    </div>
  );
}
