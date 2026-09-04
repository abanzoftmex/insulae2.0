import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { SanctionForm } from "../components/sanction-form";

export const dynamic = "force-dynamic";

export default async function NewSanctionPage() {
  await requirePageAccess(MODULES.CATALOGO_SANCIONES);

  return <SanctionForm />;
}
