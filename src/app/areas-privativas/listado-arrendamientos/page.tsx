import Link from "next/link";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";

import { createPrivateAreaRentalAction } from "../actions";
import { PrivateAreaActionShell } from "../_components/private-area-action-shell";
import {
  type ActionPageSearchParams,
  formatDate,
  resolvePrivateAreaReference,
} from "../_lib/private-area-action-routing";

type PageProps = {
  searchParams?: Promise<ActionPageSearchParams>;
};

function isRentalActive(
  startsAt: Date | null,
  endsAt: Date | null,
  now: Date,
): boolean {
  if (startsAt && startsAt.getTime() > now.getTime()) {
    return false;
  }

  if (endsAt && endsAt.getTime() < now.getTime()) {
    return false;
  }

  return true;
}

export default async function ListadoArrendamientosPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const resolvedReference = await resolvePrivateAreaReference(resolvedSearchParams);

  if (!resolvedReference) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <div className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Arrendamientos</p>
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
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Arrendamientos</p>
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
  const now = new Date();

  const activeRentals = area.rentals.filter((rental) =>
    isRentalActive(rental.startsAt, rental.endsAt, now),
  );

  return (
    <PrivateAreaActionShell
      area={area}
      title="Listado de Arrendamientos"
      subtitle="Modulo operativo de arrendamientos para AP/FAP con estructura preparada para evolucion de contratos y contactos."
      activePage="listado-arrendamientos"
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <h2 className="text-lg font-semibold text-[#2d2018]">Arrendamientos registrados</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#cfb8a1] bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">Total</p>
              <p className="mt-1 text-2xl font-semibold text-[#2f221a]">{area.rentals.length}</p>
            </article>
            <article className="rounded-2xl border border-[#cfb8a1] bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">Activos</p>
              <p className="mt-1 text-2xl font-semibold text-[#2f221a]">{activeRentals.length}</p>
            </article>
            <article className="rounded-2xl border border-[#cfb8a1] bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a6247]">Finalizados</p>
              <p className="mt-1 text-2xl font-semibold text-[#2f221a]">
                {Math.max(0, area.rentals.length - activeRentals.length)}
              </p>
            </article>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#7a553f]">
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Arrendatario</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Estatus</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Inicio</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Fin</th>
                  <th className="border-b border-[#d7c7b5] px-3 py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {area.rentals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#6a594c]">
                      No hay arrendamientos cargados para esta area.
                    </td>
                  </tr>
                ) : (
                  area.rentals.map((rental) => (
                    <tr key={rental.id} className="odd:bg-[#f9f4ec] even:bg-[#f5ede3]">
                      <td className="border-b border-[#e0d2c2] px-3 py-2">
                        {rental.tenantName ?? "Sin arrendatario"}
                      </td>
                      <td className="border-b border-[#e0d2c2] px-3 py-2">{rental.status ?? "-"}</td>
                      <td className="border-b border-[#e0d2c2] px-3 py-2">{formatDate(rental.startsAt)}</td>
                      <td className="border-b border-[#e0d2c2] px-3 py-2">{formatDate(rental.endsAt)}</td>
                      <td className="border-b border-[#e0d2c2] px-3 py-2">{rental.notes ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <h3 className="text-lg font-semibold text-[#2d2018]">Nuevo arrendamiento</h3>
          <p className="mt-1 text-sm text-[#6a594c]">
            Alta rapida para registrar movimientos operativos de la unidad.
          </p>

          <form action={createPrivateAreaRentalAction} className="mt-4 space-y-3">
            <input type="hidden" name="privateAreaId" value={area.privateAreaId} />

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
              Arrendatario
              <input
                type="text"
                name="tenantName"
                required
                className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
              Estatus
              <input
                type="text"
                name="status"
                placeholder="Activo"
                className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                Inicio
                <input
                  type="date"
                  name="startsAt"
                  className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                Fin
                <input
                  type="date"
                  name="endsAt"
                  className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
                />
              </label>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
              Notas
              <textarea
                name="notes"
                rows={4}
                className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl border border-[#5b6b45] bg-[#5b6b45] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f3f8e8] transition hover:brightness-110"
            >
              Guardar arrendamiento
            </button>
          </form>
        </article>
      </section>
    </PrivateAreaActionShell>
  );
}
