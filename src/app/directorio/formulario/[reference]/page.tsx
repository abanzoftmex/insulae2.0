import type { Metadata } from "next";
import { 
  getDirectoryContactParticipationUseCase, 
  getDirectoryRolesUseCase 
} from "@/modules/directory";
import { DirectoryForm } from "./directory-form";
import { PROJECT_SCOPE } from "@/config/project-scope";

export const metadata: Metadata = {
  title: "Expediente Maestro | Insulae 2.0",
  description: "Gestión centralizada de perfiles y expedientes del condominio.",
};

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  params: Promise<{ reference: string }>;
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function pickParam(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function isUuidReference(reference: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    reference.trim(),
  );
}

export default async function DirectorioFormularioPage({ params, searchParams }: PageProps) {
  const [{ reference }, rawSearchParams] = await Promise.all([params, searchParams]);
  const query = pickParam(rawSearchParams?.q).trim();
  const page = pickParam(rawSearchParams?.page).trim() || "1";
  
  const [detail, roles] = await Promise.all([
    isUuidReference(reference)
      ? await getDirectoryContactParticipationUseCase.execute(reference)
      : null,
    getDirectoryRolesUseCase.execute()
  ]);

  const backHref = (() => {
    const search = new URLSearchParams();
    if (query) {
      search.set("q", query);
    }
    search.set("page", page);
    return `/directorio?${search.toString()}`;
  })();

  if (!detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-brand">Contacto no encontrado</h1>
        <p className="mt-2 text-ink-soft">No existe un contacto activo con esa referencia.</p>
        <a href="/directorio" className="mt-6 flex items-center gap-2 h-9 px-6 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors">
          Volver al listado
        </a>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <DirectoryForm 
        reference={reference}
        condominiumSlug={PROJECT_SCOPE.condominiumCode}
        initialData={detail}
        roleOptions={roles}
        backHref={backHref}
      />
    </div>
  );
}

