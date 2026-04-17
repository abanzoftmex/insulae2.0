import Link from "next/link";

import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";

import {
  addPrivateAreaAssignmentAction,
  removePrivateAreaAssignmentAction,
  setPrivateAreaRentalTenantAction,
  setPrivateAreaAdministratorAction,
  updateOrdinaryAreaChargeAction,
  updatePrivateAreaSnapshotAction,
} from "../actions";
import { PrivateAreaActionShell } from "../_components/private-area-action-shell";
import {
  type ActionPageSearchParams,
  resolvePrivateAreaReference,
} from "../_lib/private-area-action-routing";

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
    .replace(/[^a-z0-9]/g, "");
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
    <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
      <h2 className="text-lg font-semibold text-[#2d2018]">{props.title}</h2>
      <p className="mt-1 text-sm text-[#6a594c]">{props.description}</p>

      <div className="mt-4 space-y-3">
        {props.assignments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#d7c5b3] bg-[#fffdf9] px-3 py-2 text-sm text-[#6a594c]">
            Sin registros.
          </p>
        ) : null}

        {props.assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8c8b8] bg-white px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-[#2f221a]">{assignment.user.name}</p>
              <p className="text-xs text-[#6c5a4a]">{assignment.user.email ?? "Sin correo"}</p>
            </div>
            <form action={removePrivateAreaAssignmentAction}>
              <input type="hidden" name="privateAreaId" value={props.privateAreaId} />
              <input type="hidden" name="assignmentId" value={assignment.id} />
              <button
                type="submit"
                className="rounded-lg border border-[#8d5338]/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#8d5338] transition hover:bg-[#8d5338] hover:text-[#fff7ef]"
              >
                Eliminar
              </button>
            </form>
          </div>
        ))}
      </div>

      <form action={addPrivateAreaAssignmentAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="privateAreaId" value={props.privateAreaId} />
        <input type="hidden" name="roleBucket" value={props.roleBucket} />
        <select
          name="userId"
          required
          defaultValue=""
          className="w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
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
        <button
          type="submit"
          className="rounded-lg border border-[#5f6a3f] bg-[#5f6a3f] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f6f9eb] transition hover:brightness-110"
        >
          Agregar
        </button>
      </form>
    </article>
  );
}

export default async function FormularioApolPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const resolvedReference = await resolvePrivateAreaReference(resolvedSearchParams);

  if (!resolvedReference) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <div className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Formulario AP</p>
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
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Formulario AP</p>
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
          <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)] lg:col-span-2">
            <h2 className="text-lg font-semibold text-[#2d2018]">Informacion general</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                  Es una fusion
                </p>
                <div className="mt-2 grid gap-2 text-sm text-[#2d241f] sm:grid-cols-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" disabled checked={fusionLegacyValue === "0"} readOnly />
                    No
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" disabled checked={fusionLegacyValue === "1"} readOnly />
                    Si
                  </label>
                  {area.isChild ? (
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" disabled checked={fusionLegacyValue === "2"} readOnly />
                      Si de hijos
                    </label>
                  ) : null}
                </div>
              </div>

              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                Nombre
                <input
                  type="text"
                  name="name"
                  defaultValue={area.name}
                  required
                  className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                M2 del area
                <input
                  type="number"
                  step="0.0001"
                  name="m2Updated"
                  defaultValue={toInputValue(area.m2Apole)}
                  className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
                />
              </label>

              {!area.isChild ? (
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                  M2 iniciales
                  <input
                    type="number"
                    step="0.0001"
                    name="m2Original"
                    defaultValue={toInputValue(area.m2Original)}
                    className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
                  />
                </label>
              ) : null}

              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                M2 de construccion
                <input
                  type="number"
                  step="0.0001"
                  name="m2Construction"
                  defaultValue={toInputValue(area.m2Construction)}
                  className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                M2 del area comun
                <input
                  type="number"
                  step="0.0001"
                  name="m2CommonArea"
                  defaultValue={toInputValue(area.m2CommonArea)}
                  className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
                />
              </label>

              {!area.isChild ? (
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                  Zona
                  <select
                    name="zoneId"
                    defaultValue={
                      selectedZoneId !== null ? String(selectedZoneId) : ""
                    }
                    className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
                  >
                    <option value="">Seleccione</option>
                    {area.zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {area.projectHasVccc ? (
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
                  Porcentaje VCCC
                  <input
                    type="number"
                    step="0.000001"
                    name="vccc"
                    defaultValue={toInputValue(area.vccc)}
                    className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
                  />
                </label>
              ) : null}
            </div>
          </article>

          <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
            <h2 className="text-lg font-semibold text-[#2d2018]">Datos generales</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#4f433a]">
              <li>
                M2 AP: <strong>{formatNumber(area.generalMetrics.areaM2, 4)} m2</strong>
              </li>
              <li>
                % Indiviso: <strong>{formatNumber(area.generalMetrics.indivisoPercent, 4)}%</strong>
              </li>
              <li>
                Diferencia vs M2 inicial:
                <strong>
                  {" "}
                  {formatNumber(area.generalMetrics.differenceFromOriginalM2, 4)}
                </strong>
              </li>
              {area.parentName ? (
                <li>
                  AP padre: <strong>{area.parentName}</strong>
                </li>
              ) : null}
            </ul>
          </article>

          <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
            <h2 className="text-lg font-semibold text-[#2d2018]">
              Disponibilidad de uso de suelo
            </h2>
            <p className="mt-1 text-sm text-[#6a594c]">
              Seleccion equivalente al combo legacy de `AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO`.
            </p>

            <select
              name="landUseId"
              defaultValue={
                selectedLandUseId !== null ? String(selectedLandUseId) : ""
              }
              className="mt-4 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
            >
              <option value="">Seleccione</option>
              {area.landUses.map((landUse) => (
                <option key={landUse.id} value={landUse.id}>
                  {landUse.name}
                </option>
              ))}
            </select>
          </article>
        </section>

        <div className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <button
            type="submit"
            className="w-full rounded-xl border border-[#6e4a34] bg-[#6e4a34] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#fff5e9] transition hover:brightness-110"
          >
            Guardar informacion
          </button>
        </div>
      </form>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <h2 className="text-lg font-semibold text-[#2d2018]">Administrador del subcondominio</h2>
          <p className="mt-1 text-sm text-[#6a594c]">
            Selector dedicado equivalente al bloque de administrador en legacy.
          </p>

          <form action={setPrivateAreaAdministratorAction} className="mt-4 space-y-3">
            <input type="hidden" name="privateAreaId" value={area.privateAreaId} />

            <p className="rounded-xl border border-[#d8c8b8] bg-white px-3 py-2 text-sm text-[#4f433a]">
              Actual:
              <strong className="ml-1 text-[#2f221a]">
                {administratorAssignment ? administratorAssignment.user.name : "Sin asignar"}
              </strong>
            </p>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
              Asignar administrador
              <select
                name="userId"
                defaultValue={administratorAssignment?.user.id ?? ""}
                className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
              >
                <option value="">Sin asignar</option>
                {area.userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                    {user.email ? ` · ${user.email}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="w-full rounded-xl border border-[#4f6a40] bg-[#4f6a40] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f2f8ea] transition hover:brightness-110"
            >
              Actualizar administrador
            </button>
          </form>
        </article>

        <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <h2 className="text-lg font-semibold text-[#2d2018]">Arrendatario / Usuario</h2>
          <p className="mt-1 text-sm text-[#6a594c]">
            Selector equivalente al legacy para asociar el nombre visible del arrendatario.
          </p>

          <form action={setPrivateAreaRentalTenantAction} className="mt-4 space-y-3">
            <input type="hidden" name="privateAreaId" value={area.privateAreaId} />

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
              Arrendatario / Usuario
              <select
                name="tenantName"
                defaultValue={currentTenantName}
                className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
              >
                <option value="">Sin asignar</option>
                {area.tenantOptions.map((tenantName) => (
                  <option key={tenantName} value={tenantName}>
                    {tenantName}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="w-full rounded-xl border border-[#4f6a40] bg-[#4f6a40] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f2f8ea] transition hover:brightness-110"
            >
              Guardar arrendatario
            </button>
          </form>

          <div className="mt-4 space-y-1 rounded-xl border border-[#d8c8b8] bg-white px-3 py-2 text-sm text-[#4f433a]">
            <p>
              Nombre actual:
              <strong className="ml-1 text-[#2f221a]">{currentTenantName || "Sin asignar"}</strong>
            </p>
            <p>
              Estatus:
              <strong className="ml-1 text-[#2f221a]">{currentTenantStatus}</strong>
            </p>
          </div>

          <Link
            href={`/areas-privativas/listado-arrendamientos?id=${area.privateAreaId}`}
            className="mt-4 inline-flex rounded-lg border border-[#6e4a34] bg-[#6e4a34] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#fff5e9] transition hover:brightness-110"
          >
            Ir a listado de arrendamientos
          </Link>
        </article>

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

        <article className="rounded-3xl border border-[#bea993]/45 bg-[#fff9f1]/90 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)]">
          <h2 className="text-lg font-semibold text-[#2d2018]">Cuota ordinaria</h2>
          <p className="mt-1 text-sm text-[#6a594c]">
            Conservamos esta accion como ajuste rapido de cargo anual desde la misma pantalla.
          </p>
          <form action={updateOrdinaryAreaChargeAction} className="mt-4 space-y-3">
            <input type="hidden" name="privateAreaId" value={area.privateAreaId} />
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#785741]">
              Cuota ordinaria anual
              <input
                type="number"
                step="0.01"
                min="0"
                name="annualOrdinaryFee"
                defaultValue={toInputValue(area.annualOrdinaryFee)}
                className="mt-1 w-full rounded-lg border border-[#ccb7a3] bg-white px-3 py-2 text-sm text-[#2d241f]"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl border border-[#5b6b45] bg-[#5b6b45] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f3f8e8] transition hover:brightness-110"
            >
              Guardar cuota
            </button>
          </form>
        </article>
      </section>
    </PrivateAreaActionShell>
  );
}
