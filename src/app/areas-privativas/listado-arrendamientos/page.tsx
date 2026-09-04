import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";

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
  await requirePageAccess(MODULES.AREAS_PRIVATIVAS);

  const resolvedSearchParams = (await searchParams) ?? {};
  const resolvedReference = await resolvePrivateAreaReference(resolvedSearchParams);

  if (!resolvedReference) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <Card className="w-full max-w-sm text-center border-transparent shadow-layered p-8">
          <Badge variant="brand" className="w-fit mx-auto rounded-full px-4 py-2 text-[10px] tracking-widest mb-4">
            Arrendatarios o Usuarios
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
            Arrendatarios o Usuarios
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
  const now = new Date();

  const activeRentals = area.rentals.filter((rental) =>
    isRentalActive(rental.startsAt, rental.endsAt, now),
  );
  const finishedCount = Math.max(0, area.rentals.length - activeRentals.length);

  return (
    <PrivateAreaActionShell
      area={area}
      title="Arrendatarios o Usuarios"
      subtitle="Módulo operativo de arrendatarios o usuarios para AP/FAP. Contratos y contactos preparados para evolución."
      activePage="listado-arrendamientos"
    >
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard accent="brand" label="Total" value={area.rentals.length} icon={<KeyRound className="h-3.5 w-3.5" />} />
        <StatCard accent="lime" label="Activos" value={activeRentals.length} icon={<KeyRound className="h-3.5 w-3.5" />} />
        <StatCard accent={finishedCount > 0 ? "gold" : "cyan"} label="Finalizados" value={finishedCount} icon={<KeyRound className="h-3.5 w-3.5" />} />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        {/* Rental list */}
        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
              Arrendatarios o Usuarios registrados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-[12px]">
                <thead>
                  <tr className="bg-canvas text-left text-[10px] font-bold uppercase tracking-widest text-brand">
                    <th className="border-b border-line px-3 py-2.5">Arrendatario o Usuario</th>
                    <th className="border-b border-line px-3 py-2.5">Estatus</th>
                    <th className="border-b border-line px-3 py-2.5">Inicio</th>
                    <th className="border-b border-line px-3 py-2.5">Fin</th>
                    <th className="border-b border-line px-3 py-2.5">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {area.rentals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-[11px] text-ink-soft">
                        No hay arrendatarios o usuarios cargados para esta área.
                      </td>
                    </tr>
                  ) : (
                    area.rentals.map((rental) => {
                      const active = isRentalActive(rental.startsAt, rental.endsAt, now);
                      return (
                        <tr key={rental.id} className="hover:bg-canvas/60 transition-colors">
                          <td className="border-b border-line/40 px-3 py-2 font-bold text-ink">
                            {rental.tenantName ?? "Sin arrendatario o usuario"}
                          </td>
                          <td className="border-b border-line/40 px-3 py-2">
                            <Badge
                               variant={active ? "success" : "outline"}
                               className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest"
                            >
                              {rental.status ?? "—"}
                            </Badge>
                          </td>
                          <td className="border-b border-line/40 px-3 py-2 text-ink-soft tabular-nums">
                            {formatDate(rental.startsAt)}
                          </td>
                          <td className="border-b border-line/40 px-3 py-2 text-ink-soft tabular-nums">
                            {formatDate(rental.endsAt)}
                          </td>
                          <td className="border-b border-line/40 px-3 py-2 text-ink-soft">
                            {rental.notes ?? "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* New rental form */}
        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
              Nuevo Arrendatario o Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-[11px] text-ink-soft">
              Alta rápida para registrar movimientos operativos de la unidad.
            </p>

            <form action={createPrivateAreaRentalAction} className="space-y-3">
              <input type="hidden" name="privateAreaId" value={area.privateAreaId} />

              <Input label="Arrendatario o Usuario" type="text" name="tenantName" required />

              <Input label="Estatus" type="text" name="status" placeholder="Activo" />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Inicio" type="date" name="startsAt" />
                <Input label="Fin" type="date" name="endsAt" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">
                  Notas
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  className="w-full rounded-md border border-line bg-card px-3 py-2 text-[13px] font-medium text-ink transition-standard resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent"
                />
              </div>

              <Button type="submit" variant="dark" size="md" className="w-full font-bold uppercase tracking-widest text-[11px]">
                Guardar Arrendatario o Usuario
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrivateAreaActionShell>
  );
}
