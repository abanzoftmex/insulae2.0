import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import type { Metadata } from "next";
import { getDirectoryRolesUseCase } from "@/modules/directory";
import { CreateDirectoryForm } from "./create-directory-form";
import { PROJECT_SCOPE } from "@/config/project-scope";

export const metadata: Metadata = {
  title: "Nuevo Expediente | Insulae 2.0",
  description: "Crear un nuevo expediente para el directorio.",
};

export const dynamic = "force-dynamic";

export default async function DirectorioFormularioNuevoPage() {
  await requirePageAccess(MODULES.DIRECTORIO);

  const roles = await getDirectoryRolesUseCase.execute();

  const backHref = "/directorio";

  return (
    <div className="animate-in fade-in duration-500">
      <CreateDirectoryForm 
        condominiumSlug={PROJECT_SCOPE.condominiumCode}
        roleOptions={roles}
        backHref={backHref}
      />
    </div>
  );
}
