import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getUserPermissions, hasPermission } from "@/shared/application/auth/permissions";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";

import { createPrivateAreaRentalAction, deletePrivateAreaRentalAction } from "../actions";
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

function isActiveRentalStatus(status: string | null): boolean {
  const normalized = (status ?? "").trim().toLowerCase();

  if (/^\d+$/.test(normalized)) {
    return normalized === "1" || normalized === "2" || normalized === "3" || normalized === "4";
  }

  if (
    normalized === "0" ||
    normalized === "finalizada" ||
    normalized === "finalizado" ||
    normalized === "cancelada" ||
    normalized === "cancelado" ||
    normalized === "vencido" ||
    normalized === "vencida" ||
    normalized === "inactivo"
  ) {
    return false;
  }

  if (normalized === "") {
    return false;
  }

  return true;
}

function formatInputDate(date: Date | null): string {
  if (!date) {
    return "";
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return "";
  }
  return d.toISOString().slice(0, 10);
}

export default async function ListadoArrendamientosPage({ searchParams }: PageProps) {
  await requirePageAccess(MODULES.AREAS_PRIVATIVAS, "canUpdate");
  const permissions = await getUserPermissions();
  const canCreate = hasPermission(permissions, MODULES.AREAS_PRIVATIVAS, "canCreate");
  const canDelete = hasPermission(permissions, MODULES.AREAS_PRIVATIVAS, "canDelete");

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

  const latestRental = area.rentals[0] ?? null;
  const activeRental =
    area.rentals.find((rental) => isActiveRentalStatus(rental.status)) ?? latestRental;
  const currentTenantName =
    activeRental?.tenantName?.trim() || area.currentTenantName?.trim() || "";
  const currentTenantStatus =
    activeRental?.status ?? (currentTenantName.length > 0 ? "Activo" : "Sin estatus");

  const activeRentals = area.rentals.filter((rental) =>
    isActiveRentalStatus(rental.status) || isRentalActive(rental.startsAt, rental.endsAt, now),
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    {canDelete && <th className="border-b border-line px-3 py-2.5 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {area.rentals.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 6 : 5} className="px-3 py-8 text-center text-[11px] text-ink-soft">
                        No hay arrendatarios o usuarios cargados para esta área.
                      </td>
                    </tr>
                  ) : (
                    area.rentals.map((rental) => {
                      const active =
                        isActiveRentalStatus(rental.status) ||
                        isRentalActive(rental.startsAt, rental.endsAt, now);
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
                          {canDelete && (
                            <td className="border-b border-line/40 px-3 py-2 text-right">
                              <form action={deletePrivateAreaRentalAction}>
                                <input type="hidden" name="privateAreaId" value={area.privateAreaId} />
                                <input type="hidden" name="rentalId" value={rental.id} />
                                <Button
                                  type="submit"
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-[10px] font-bold uppercase tracking-widest"
                                >
                                  Eliminar
                                </Button>
                              </form>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de arrendatario o usuario */}
        {canCreate && (
          <Card className="border-transparent shadow-layered">
            <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
                {currentTenantName ? "Arrendatario o Usuario" : "Nuevo Arrendatario o Usuario"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-[11px] text-ink-soft">
                {currentTenantName
                  ? "Gestión y actualización del arrendatario o usuario asociado a la unidad."
                  : "Alta rápida para registrar movimientos operativos de la unidad."}
              </p>

              <form action={createPrivateAreaRentalAction} className="space-y-3">
                <input type="hidden" name="privateAreaId" value={area.privateAreaId} />
                {activeRental && <input type="hidden" name="rentalId" value={activeRental.id} />}

                <Input
                  label="Arrendatario o Usuario"
                  type="text"
                  name="tenantName"
                  defaultValue={currentTenantName}
                  placeholder="Nombre del arrendatario o usuario"
                  list="tenant-options"
                  required
                />
                <datalist id="tenant-options">
                  {area.tenantOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>

                <Input
                  label="Estatus"
                  type="text"
                  name="status"
                  defaultValue={activeRental?.status ?? (currentTenantName ? "Activo" : "")}
                  placeholder="Activo"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Inicio"
                    type="date"
                    name="startsAt"
                    defaultValue={formatInputDate(activeRental?.startsAt ?? null)}
                  />
                  <Input
                    label="Fin"
                    type="date"
                    name="endsAt"
                    defaultValue={formatInputDate(activeRental?.endsAt ?? null)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">
                    Notas
                  </label>
                  <textarea
                    name="notes"
                    rows={4}
                    defaultValue={activeRental?.notes ?? ""}
                    placeholder="Notas o comentarios..."
                    className="w-full rounded-md border border-line bg-card px-3 py-2 text-[13px] font-medium text-ink transition-standard resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent"
                  />
                </div>

                {currentTenantName ? (
                  <div className="space-y-1 rounded bg-canvas border border-line/50 px-3 py-2 text-[12px] text-ink-soft">
                    <p className="flex items-center justify-between">
                      <span className="font-medium">Nombre actual</span>
                      <strong className="text-ink">{currentTenantName}</strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="font-medium">Estatus</span>
                      <strong className="text-ink">{currentTenantStatus}</strong>
                    </p>
                  </div>
                ) : null}

                <Button type="submit" variant="dark" size="md" className="w-full font-bold uppercase tracking-widest text-[11px]">
                  Guardar Arrendatario o Usuario
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>
    </PrivateAreaActionShell>
  );
}
