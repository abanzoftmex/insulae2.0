import Link from "next/link";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";

import {
  addPrivateAreaAssignmentAction,
  removePrivateAreaAssignmentAction,
  setPrivateAreaRentalTenantAction,
  setPrivateAreaAdministratorAction,
  updateOrdinaryAreaChargeAction,
  updatePrivateAreaSnapshotAction,
  togglePrivateAreaStatusAction,
  deletePrivateAreaPermanentlyAction,
} from "../actions";
import { PrivateAreaActionShell } from "../_components/private-area-action-shell";
import { DeletePermanentlyButton } from "./delete-permanently-button";
import {
  type ActionPageSearchParams,
  resolvePrivateAreaReference,
} from "../_lib/private-area-action-routing";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type PageProps = {
  searchParams?: Promise<ActionPageSearchParams>;
};

type AssignmentRoleBucket = "ACTUAL" | "LEGAL" | "INITIAL";

function toInputValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }

  return String(value);
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]/g, "");
}

function formatNumber(value: number | null, digits = 4): string {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("es-MX", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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

function AssignmentSection(props: {
  title: string;
  description: string;
  roleBucket: AssignmentRoleBucket;
  privateAreaId: string;
  userOptions: Array<{ id: string; name: string; email: string | null }>;
  assignments: Array<{
    id: string;
    user: { id: string; name: string; email: string | null; phone: string | null };
  }>;
}) {
  return (
    <Card className="border-transparent shadow-layered">
      <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <p className="text-[11px] text-ink-soft">{props.description}</p>

        <div className="space-y-2">
          {props.assignments.length === 0 ? (
            <p className="rounded border border-dashed border-line bg-canvas px-3 py-2 text-[11px] text-ink-soft">
              Sin registros.
            </p>
        ) : null}

        {props.assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded bg-canvas border border-line/50 px-3 py-2"
          >
            <div>
              <p className="text-[12px] font-bold text-ink">{assignment.user.name}</p>
              <p className="text-[10px] text-ink-soft">{assignment.user.email ?? "Sin correo"}</p>
            </div>
            <form action={removePrivateAreaAssignmentAction}>
              <input type="hidden" name="privateAreaId" value={props.privateAreaId} />
              <input type="hidden" name="assignmentId" value={assignment.id} />
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                className="h-7 text-[10px] font-bold uppercase tracking-widest"
              >
                Eliminar
              </Button>
            </form>
          </div>
        ))}
        </div>

        <form action={addPrivateAreaAssignmentAction} className="grid gap-2 sm:grid-cols-[1fr_auto] pt-1">
          <input type="hidden" name="privateAreaId" value={props.privateAreaId} />
          <input type="hidden" name="roleBucket" value={props.roleBucket} />
          <select
            name="userId"
            required
            defaultValue=""
            className="w-full rounded-md border border-line bg-card px-3 py-2 text-[12px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30"
          >
            <option value="" disabled>
              Seleccione una persona
            </option>
            {props.userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
                {user.email ? ` · ${user.email}` : ""}
              </option>
            ))}
          </select>
          <Button type="submit" variant="dark" size="sm">
            Agregar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function FormularioApolPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const resolvedReference = await resolvePrivateAreaReference(resolvedSearchParams);

  if (!resolvedReference) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <Card className="w-full max-w-sm text-center border-transparent shadow-layered p-8">
          <Badge variant="brand" className="w-fit mx-auto rounded-full px-4 py-2 text-[10px] tracking-widest mb-4">
            Formulario AP
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
            Formulario AP
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
  const selectedZoneId =
    area.zones.find(
      (zone) => normalizeKey(zone.name) === normalizeKey(area.zone),
    )?.id ?? null;

  const selectedLandUseId =
    area.landUses.find(
      (landUse) => normalizeKey(landUse.name) === normalizeKey(area.useType),
    )?.id ?? null;

  const fusionLegacyValue = area.isFusion ? (area.isChild ? "2" : "1") : "0";

  const administratorAssignment = area.assignments.find((assignment) =>
    normalizeKey(assignment.roleName).includes("administrador"),
  );

  const groupedAssignments = {
    ACTUAL: area.assignments.filter(
      (assignment) =>
        assignment.roleBucket === "ACTUAL" &&
        !normalizeKey(assignment.roleName).includes("administrador"),
    ),
    LEGAL: area.assignments.filter((assignment) => assignment.roleBucket === "LEGAL"),
    INITIAL: area.assignments.filter((assignment) => assignment.roleBucket === "INITIAL"),
  };

  const latestRental = area.rentals[0] ?? null;
  const activeRental =
    area.rentals.find((rental) => isActiveRentalStatus(rental.status)) ?? latestRental;
  const currentTenantName =
    activeRental?.tenantName?.trim() || area.currentTenantName?.trim() || "";
  const currentTenantStatus =
    activeRental?.status ?? (currentTenantName.length > 0 ? "Activo" : "Sin estatus");

  return (
    <PrivateAreaActionShell
      area={area}
      title="Formulario AP"
      subtitle="Paridad funcional con formulario legacy: informacion general, uso de suelo, dominio, propietario legal e inicial."
      activePage="formulario-apol"
    >
      <form action={updatePrivateAreaSnapshotAction} className="space-y-4">
        <input type="hidden" name="privateAreaId" value={area.privateAreaId} />
        <input type="hidden" name="isFusion" value={fusionLegacyValue} />

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-transparent shadow-layered lg:col-span-2">
            <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand flex flex-row items-center justify-between rounded-t-card">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Información general</CardTitle>
              <Button type="submit" variant="outline" size="sm" className="h-7 px-4 text-[10px] border-white/20 bg-white/10 text-white hover:bg-white hover:text-brand font-bold uppercase tracking-widest transition-colors">
                Guardar Cambios
              </Button>
            </CardHeader>
            <CardContent className="p-4">
            <div className="mt-0 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">
                  Es una fusión
                </p>
                <div className="mt-3 grid gap-2 text-[12px] font-medium text-ink sm:grid-cols-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" disabled checked={fusionLegacyValue === "0"} readOnly />
                    No
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" disabled checked={fusionLegacyValue === "1"} readOnly />
                    Sí
                  </label>
                  {area.isChild ? (
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" disabled checked={fusionLegacyValue === "2"} readOnly />
                      Sí de hijos
                    </label>
                  ) : null}
                </div>
              </div>

              <Input
                label="Nombre"
                type="text"
                name="name"
                defaultValue={area.name}
                required
              />

              <Input
                label="Número de ordenamiento"
                type="number"
                name="sortOrder"
                defaultValue={toInputValue(area.sortOrder)}
              />

              <Input
                label="Nivel"
                type="text"
                name="level"
                defaultValue={area.level ?? ""}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="M2 del área"
                type="number"
                step="0.0001"
                name="m2Updated"
                defaultValue={toInputValue(area.m2Apole)}
              />

              {!area.isChild ? (
                <Input
                  label="M2 iniciales"
                  type="number"
                  step="0.0001"
                  name="m2Original"
                  defaultValue={toInputValue(area.m2Original)}
                />
              ) : null}

              <Input
                label="M2 de construcción"
                type="number"
                step="0.0001"
                name="m2Construction"
                defaultValue={toInputValue(area.m2Construction)}
              />

              <Input
                label="M2 construcción áreas comunes"
                type="number"
                step="0.000001"
                name="m2ConstructionCommonArea"
                defaultValue={toInputValue(area.m2ConstructionCommonArea)}
              />

              <Input
                label="M2 del área común (Automático)"
                type="number"
                step="0.0001"
                name="m2CommonArea"
                disabled
                readOnly
                defaultValue={toInputValue(area.m2CommonArea)}
              />

              {!area.isChild ? (
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">
                    Zona
                  </label>
                  <select
                    name="zoneId"
                    defaultValue={selectedZoneId !== null ? String(selectedZoneId) : ""}
                    className="flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent"
                  >
                    <option value="">Seleccione</option>
                    {area.zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {area.projectHasVccc ? (
                <Input
                  label="Porcentaje VCCC"
                  type="number"
                  step="0.000001"
                  name="vccc"
                  defaultValue={toInputValue(area.vccc)}
                />
              ) : null}
            </div>
            </CardContent>
          </Card>

          <Card className="border-transparent shadow-layered">
            <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Datos generales</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2 text-[12px] text-ink-soft">
                <li className="flex items-center justify-between p-2 rounded bg-canvas border border-line/50">
                  <span className="font-medium">M2 AP</span>
                  <strong className="text-ink">{formatNumber(area.generalMetrics.areaM2, 4)} m2</strong>
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-canvas border border-line/50">
                  <span className="font-medium">% Indiviso</span>
                  <strong className="text-ink">{formatNumber(area.generalMetrics.indivisoPercent, 4)}%</strong>
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-canvas border border-line/50">
                  <span className="font-medium">Dif. vs M2 inicial</span>
                  <strong className="text-ink">{formatNumber(area.generalMetrics.differenceFromOriginalM2, 4)}</strong>
                </li>
                {area.parentName ? (
                  <li className="flex items-center justify-between p-2 rounded bg-canvas border border-line/50">
                    <span className="font-medium">AP padre</span>
                    <strong className="text-ink">{area.parentName}</strong>
                  </li>
                ) : null}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-transparent shadow-layered">
            <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Uso de Suelo</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-[11px] text-ink-soft">
                Selección equivalente al combo legacy de <code className="text-[10px] bg-canvas border border-line rounded px-1">AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO</code>.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">
                  Tipo de uso
                </label>
                <select
                  name="landUseId"
                  defaultValue={selectedLandUseId !== null ? String(selectedLandUseId) : ""}
                  className="flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent"
                >
                  <option value="">Seleccione</option>
                  {area.landUses.map((landUse) => (
                    <option key={landUse.id} value={landUse.id}>
                      {landUse.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </section>
      </form>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Administrador del subcondominio</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-[11px] text-ink-soft">
              Selector dedicado equivalente al bloque de administrador en legacy.
            </p>

            <form action={setPrivateAreaAdministratorAction} className="space-y-3">
              <input type="hidden" name="privateAreaId" value={area.privateAreaId} />

              <div className="flex items-center justify-between rounded bg-canvas border border-line/50 px-3 py-2">
                <span className="text-[11px] text-ink-soft font-medium">Actual</span>
                <strong className="text-[12px] font-bold text-ink">
                  {administratorAssignment ? administratorAssignment.user.name : "Sin asignar"}
                </strong>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">
                  Asignar administrador
                </label>
                <select
                  name="userId"
                  defaultValue={administratorAssignment?.user.id ?? ""}
                  className="flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30"
                >
                  <option value="">Sin asignar</option>
                  {area.userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                      {user.email ? ` · ${user.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" variant="dark" size="sm" className="w-full font-bold uppercase tracking-widest text-[10px]">
                Actualizar administrador
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Arrendatario o Usuario</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-[11px] text-ink-soft">
              Selector equivalente al legacy para asociar el nombre visible del arrendatario o usuario.
            </p>

            <form action={setPrivateAreaRentalTenantAction} className="space-y-3">
              <input type="hidden" name="privateAreaId" value={area.privateAreaId} />

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">
                  Arrendatario o Usuario
                </label>
                <select
                  name="tenantName"
                  defaultValue={currentTenantName}
                  className="flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30"
                >
                  <option value="">Sin asignar</option>
                  {area.tenantOptions.map((tenantName) => (
                    <option key={tenantName} value={tenantName}>
                      {tenantName}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" variant="dark" size="sm" className="w-full font-bold uppercase tracking-widest text-[10px]">
                Guardar arrendatario o usuario
              </Button>
            </form>

            <div className="space-y-1 rounded bg-canvas border border-line/50 px-3 py-2 text-[12px] text-ink-soft">
              <p className="flex items-center justify-between">
                <span className="font-medium">Nombre actual</span>
                <strong className="text-ink">{currentTenantName || "Sin asignar"}</strong>
              </p>
              <p className="flex items-center justify-between">
                <span className="font-medium">Estatus</span>
                <strong className="text-ink">{currentTenantStatus}</strong>
              </p>
            </div>

            <Button variant="outline" size="sm" asChild className="w-full text-[10px] font-bold uppercase tracking-widest">
              <Link href={`/areas-privativas/listado-arrendamientos?id=${area.privateAreaId}`}>
                Ir a listado de arrendatarios o usuarios
              </Link>
            </Button>
          </CardContent>
        </Card>

        <AssignmentSection
          title="Dominio actual"
          description="Listado y alta de titulares de dominio en la AP."
          roleBucket="ACTUAL"
          privateAreaId={area.privateAreaId}
          userOptions={area.userOptions}
          assignments={groupedAssignments.ACTUAL}
        />

        <AssignmentSection
          title="Propietario legal"
          description="Alta y baja de propietarios legales asociados a la AP."
          roleBucket="LEGAL"
          privateAreaId={area.privateAreaId}
          userOptions={area.userOptions}
          assignments={groupedAssignments.LEGAL}
        />

        <AssignmentSection
          title="Propietario inicial"
          description="Alta y baja de propietarios iniciales para seguimiento historico."
          roleBucket="INITIAL"
          privateAreaId={area.privateAreaId}
          userOptions={area.userOptions}
          assignments={groupedAssignments.INITIAL}
        />

        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Cuota ordinaria</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-[11px] text-ink-soft">
              Conservamos esta acción como ajuste rápido de cargo anual desde la misma pantalla.
            </p>
            <form action={updateOrdinaryAreaChargeAction} className="space-y-3">
              <input type="hidden" name="privateAreaId" value={area.privateAreaId} />
              <Input
                label="Cuota ordinaria anual"
                type="number"
                step="0.01"
                min="0"
                name="annualOrdinaryFee"
                defaultValue={toInputValue(area.annualOrdinaryFee)}
              />
              <Button type="submit" variant="dark" size="sm" className="w-full font-bold uppercase tracking-widest text-[10px]">
                Guardar cuota
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Estatus y Eliminación</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-[11px] text-ink-soft">
              {area.isActive 
                ? "El lote está actualmente Activo. Si decides desactivarlo, dejará de figurar en el panel principal y listados operativos."
                : "El lote está actualmente Inactivo. Puedes reactivarlo para volver a habilitar los cobros y la gestión."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <form action={togglePrivateAreaStatusAction} className="flex-1">
                <input type="hidden" name="privateAreaId" value={area.privateAreaId} />
                <input type="hidden" name="nextStatus" value={area.isActive ? "INACTIVE" : "ACTIVE"} />
                <Button
                  type="submit"
                  variant={area.isActive ? "destructive" : "dark"}
                  size="sm"
                  className="w-full font-bold uppercase tracking-widest text-[10px]"
                >
                  {area.isActive ? "Desactivar lote" : "Reactivar lote"}
                </Button>
              </form>

              <form action={deletePrivateAreaPermanentlyAction} className="flex-1">
                <input type="hidden" name="privateAreaId" value={area.privateAreaId} />
                <DeletePermanentlyButton />
              </form>
            </div>
          </CardContent>
        </Card>
      </section>
    </PrivateAreaActionShell>
  );
}
