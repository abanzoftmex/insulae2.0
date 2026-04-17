import { redirect } from "next/navigation";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function pickParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function LegacyListadoSeguridadRedirect({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const target = new URLSearchParams();

  const palabra = pickParam(params.palabra) ?? pickParam(params.q);
  const page = pickParam(params.page);

  if (palabra && palabra.trim().length > 0) {
    target.set("palabra", palabra.trim());
  }

  if (page && page.trim().length > 0) {
    target.set("page", page.trim());
  }

  const query = target.toString();
  redirect(query.length > 0 ? `/listado-seguridad?${query}` : "/listado-seguridad");
}
