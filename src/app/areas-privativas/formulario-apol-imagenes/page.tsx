import Link from "next/link";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";

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
        <div className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Imagenes AP</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2d2018]">ID invalido</h1>
          <p className="mt-3 text-sm text-[#604f42]">
            Para abrir esta pantalla necesitas enviar un identificador valido.
          </p>
          <Link
            href="/areas-privativas"
            className="mt-5 inline-flex rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
          >
            Volver a Areas Privativas
          </Link>
        </div>
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
        <div className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Imagenes AP</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2d2018]">Area no encontrada</h1>
          <p className="mt-3 text-sm text-[#604f42]">
            No encontramos una Area Privativa con ese identificador.
          </p>
          <Link
            href="/areas-privativas"
            className="mt-5 inline-flex rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
          >
            Volver a Areas Privativas
          </Link>
        </div>
      </main>
    );
  }

  const { area } = pageData;

  return (
    <PrivateAreaActionShell
      area={area}
      title="Formulario AP Imagenes"
      subtitle="Vista preparada para administrar galeria por area privada sin depender de rutas .php."
      activePage="formulario-apol-imagenes"
    >
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="lg:col-span-2 rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <h2 className="text-lg font-semibold text-[#2d2018]">Galeria de imagenes por area</h2>
          <p className="mt-2 text-sm text-[#6a594c]">
            En legacy este modulo dependia de la tabla AREAS_PRIVATIVAS_IMAGENES y endpoints AJAX dedicados.
            En Insulae 2.0 lo dejamos montado sobre App Router y preparado para conectarlo a un almacenamiento
            unificado por entidad.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-dashed border-[#ccb69f] bg-[#f8efe5] p-4"
              >
                <div className="flex h-36 items-center justify-center rounded-xl border border-[#d7c8b7] bg-white/70">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8f715c]">Sin imagen</p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6e4a34]">
                    Slot {index + 1}
                  </p>
                  <span className="rounded-full border border-[#d9c9b8] bg-[#fff8ef] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#8b6a52]">
                    Pendiente
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6d4c39]">
            Roadmap de persistencia
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#5d4f44]">
            <li>Definir entidad de imagenes por area privada en dominio y Prisma.</li>
            <li>Conectar upload a Firebase Storage (bucket por modulo).</li>
            <li>Agregar reorder, pie de imagen y borrado con auditoria.</li>
          </ol>

          <div className="mt-4 rounded-2xl border border-[#d7c6b5] bg-[#fffdf9] p-3 text-sm text-[#5f5043]">
            Esta ruta ya reemplaza al legacy en URL y navegacion. La persistencia de imagenes por area queda
            desacoplada para no bloquear las pantallas operativas de formulario, pagos y arrendamientos.
          </div>
        </aside>
      </section>
    </PrivateAreaActionShell>
  );
}
