import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { 
  getDirectoryContactParticipationUseCase, 
  getDirectoryRolesUseCase 
} from "@/modules/directory";
import { DirectoryForm } from "./directory-form";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { cn } from "@/shared/utils/cn";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-directory-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-directory-body",
});

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
      <main className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-brand">Contacto no encontrado</h1>
        <p className="mt-2 text-ink-soft">No existe un contacto activo con esa referencia.</p>
        <a href="/directorio" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-brand-accent px-8 text-xs font-bold uppercase tracking-widest text-white transition-standard active-scale">
          Volver al listado
        </a>
      </main>
    );
  }

  return (
    <main className={cn("flex-1 px-4 py-8 md:px-10 lg:px-12", cormorant.variable, manrope.variable)}>
      <DirectoryForm 
        reference={reference}
        condominiumSlug={PROJECT_SCOPE.condominiumCode}
        initialData={detail}
        roleOptions={roles}
        backHref={backHref}
      />
    </main>
  );
}
