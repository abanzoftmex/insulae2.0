import Link from "next/link";
import { ImageOff, Info } from "lucide-react";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PrivateAreaActionShell } from "../_components/private-area-action-shell";
import {
  type ActionPageSearchParams,
  resolvePrivateAreaReference,
} from "../_lib/private-area-action-routing";

type PageProps = {
  searchParams?: Promise<ActionPageSearchParams>;
};

export default async function FormularioApolImagenesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const resolvedReference = await resolvePrivateAreaReference(resolvedSearchParams);

  if (!resolvedReference) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <Card className="w-full max-w-sm text-center border-transparent shadow-layered p-8">
          <Badge variant="brand" className="w-fit mx-auto rounded-full px-4 py-2 text-[10px] tracking-widest mb-4">
            Imágenes AP
          </Badge>
          <h1 className="text-2xl font-bold text-ink tracking-tighter uppercase">ID inválido</h1>
          <p className="mt-3 text-[12px] text-ink-soft">
            Para abrir esta pantalla necesitas enviar un identificador válido.
          </p>
          <Button variant="dark" size="sm" asChild className="mt-6">
            <Link href="/areas-privativas">Volver a Áreas Privativas</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const pageData = await getPrivateAreaActionPageDataUseCase.execute({
    privateAreaId: resolvedReference.privateAreaId,
    opc: "2",
  });

  if (!pageData) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <Card className="w-full max-w-sm text-center border-transparent shadow-layered p-8">
          <Badge variant="brand" className="w-fit mx-auto rounded-full px-4 py-2 text-[10px] tracking-widest mb-4">
            Imágenes AP
          </Badge>
          <h1 className="text-2xl font-bold text-ink tracking-tighter uppercase">Área no encontrada</h1>
          <p className="mt-3 text-[12px] text-ink-soft">
            No encontramos un Área Privativa con ese identificador.
          </p>
          <Button variant="dark" size="sm" asChild className="mt-6">
            <Link href="/areas-privativas">Volver a Áreas Privativas</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const { area } = pageData;

  return (
    <PrivateAreaActionShell
      area={area}
      title="Imágenes AP"
      subtitle="Administración de galería por área privativa. Sin depender de rutas legacy."
      activePage="formulario-apol-imagenes"
    >
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
              Galería de imágenes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <p className="text-[11px] text-ink-soft">
              En legacy este módulo dependía de la tabla{" "}
              <code className="text-[10px] bg-canvas border border-line rounded px-1">
                AREAS_PRIVATIVAS_IMAGENES
              </code>{" "}
              y endpoints AJAX dedicados. En Insulae 2.0 queda preparado para conectarlo
              a almacenamiento unificado por entidad.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded border border-dashed border-line bg-canvas"
                >
                  <div className="flex h-36 flex-col items-center justify-center gap-2 bg-card/50">
                    <ImageOff className="h-6 w-6 text-ink-soft/30" aria-hidden />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/40">
                      Sin imagen
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-line/50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                      Slot {index + 1}
                    </p>
                    <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
                      Pendiente
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-transparent shadow-layered bg-brand-deep text-white">
          <CardHeader className="px-4 py-3 border-b border-white/10">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-brand-mint">
              Roadmap de persistencia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <ol className="space-y-3">
              {[
                "Definir entidad de imágenes por área privativa en dominio y Prisma.",
                "Conectar upload a Firebase Storage (bucket por módulo).",
                "Agregar reorder, pie de imagen y borrado con auditoría.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/60">
                    {i + 1}
                  </span>
                  <p className="text-[11px] text-white/60 leading-relaxed">{item}</p>
                </li>
              ))}
            </ol>

            <div className="flex items-start gap-2 rounded bg-white/5 border border-white/10 p-3">
              <Info className="h-3.5 w-3.5 shrink-0 text-brand-mint mt-0.5" aria-hidden />
              <p className="text-[10px] text-white/50 leading-relaxed">
                Esta ruta ya reemplaza al legacy en URL y navegación. La persistencia de
                imágenes queda desacoplada para no bloquear formulario, pagos y arrendamientos.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </PrivateAreaActionShell>
  );
}
