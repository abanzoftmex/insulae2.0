import { redirect } from "next/navigation";

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

export default async function DirectorioContactoRedirectPage({ params, searchParams }: PageProps) {
  const [{ reference }, rawSearchParams] = await Promise.all([params, searchParams]);

  const search = new URLSearchParams();
  const q = pickParam(rawSearchParams?.q).trim();
  const page = pickParam(rawSearchParams?.page).trim();

  if (q) {
    search.set("q", q);
  }

  if (page) {
    search.set("page", page);
  }

  const query = search.toString();
  const href = query
    ? `/directorio/formulario/${encodeURIComponent(reference)}?${query}`
    : `/directorio/formulario/${encodeURIComponent(reference)}`;

  redirect(href);
}
