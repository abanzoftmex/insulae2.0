import type { DirectoryOverview, DirectoryPerson } from "../domain/directory";

export interface DirectoryPersonVM {
  id: string;
  reference: string;
  displayName: string;
  commerceLabel: string;
  legalNameLabel: string;
  primaryRoleLabel: string;
  adminRoles: string[];
  patrimonialRolesLabel: string;
  minisitioAccessLabel: string;
  hasMinisitioAccess: boolean;
  hasExplicitMinisitioRole: boolean;
  initialRoleMismatchLabel: string | null;
  requiresInvoiceLabel: string;
  initials: string;
  userTypeLabel: string;
  email: string;
  phone: string;
  rolesLabel: string;
  assignmentRolesLabel: string;
  assignedAreasLabel: string;
  assignmentCount: string;
  totalPrivateAreasLabel: string;
  indivisoLabel: string;
  children?: Array<{
    id: string;
    idVq: string | null;
    fullName: string;
    registrationTypeDesc: string;
  }>;
}

export interface DirectoryVM {
  condominiumName: string;
  condominiumSlug: string;
  totalUsers: string;
  totalAssignments: string;
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
  people: DirectoryPersonVM[];
}

function initialsFrom(value: string): string {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((token) => token[0]?.toUpperCase() ?? "")
      .join("") || "DI"
  );
}

function toUserTypeLabel(value: DirectoryPerson["userType"]): string {
  switch (value) {
    case "ADMIN":
      return "Administrador";
    case "LEGAL_ENTITY":
      return "Persona moral";
    default:
      return "Persona";
  }
}

function joinOrFallback(values: string[], fallback: string): string {
  return values.length > 0 ? values.join(" • ") : fallback;
}

function uniqueSortedLabels(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base", numeric: true }),
  );
}

function normalizeComparableLabel(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toPersonVM(person: DirectoryPerson): DirectoryPersonVM {
  const patrimonialCombined = uniqueSortedLabels([
    ...person.patrimonialRoles,
    ...person.assignmentRoles,
  ]);

  const primaryRole =
    person.adminRoles.length > 0
      ? person.adminRoles.join(" · ")
      : patrimonialCombined.length > 0
        ? patrimonialCombined.join(" · ")
        : person.hasExplicitMinisitioRole
          ? "Solo Minisitio"
          : person.minisitioAccess.hasAccess
            ? "Acceso automático al Minisitio"
            : "Sin rol";

  const minisitioAccessLabel =
    person.minisitioAccess.ways.length > 0
      ? person.minisitioAccess.ways.join(" + ")
      : "Sin acceso al Minisitio";

  const normalizedInitial = normalizeComparableLabel(person.initialRole);
  const initialMatchesAdmin =
    normalizedInitial.length > 0 &&
    person.adminRoles.some((r) => normalizeComparableLabel(r) === normalizedInitial);
  const initialRoleMismatchLabel =
    person.adminRoles.length > 0 && normalizedInitial.length > 0 && !initialMatchesAdmin
      ? `Rol inicial histórico: ${person.initialRole}`
      : null;

  return {
    id: person.id,
    reference: person.id,
    displayName: person.displayName,
    commerceLabel: person.commerceName ?? "-",
    legalNameLabel: person.legalName,
    primaryRoleLabel: primaryRole,
    adminRoles: person.adminRoles,
    patrimonialRolesLabel: patrimonialCombined.join(" · "),
    minisitioAccessLabel,
    hasMinisitioAccess: person.minisitioAccess.hasAccess,
    hasExplicitMinisitioRole: person.hasExplicitMinisitioRole,
    initialRoleMismatchLabel,
    requiresInvoiceLabel: person.requiresInvoice === null ? "N/D" : person.requiresInvoice ? "Si" : "No",
    initials: initialsFrom(person.displayName),
    userTypeLabel: toUserTypeLabel(person.userType),
    email: person.email ?? "sin correo",
    phone: person.phone ?? "sin telefono",
    rolesLabel: joinOrFallback(person.roles, "sin rol"),
    assignmentRolesLabel: joinOrFallback(person.assignmentRoles, "sin asignacion"),
    assignedAreasLabel: joinOrFallback(person.assignedAreas, "sin areas"),
    assignmentCount: person.assignmentCount.toLocaleString("es-MX"),
    totalPrivateAreasLabel: person.totalPrivateAreas.toString(),
    indivisoLabel: `${person.indiviso.toFixed(4)}%`,
    children: person.children?.map((child) => ({
      id: child.id,
      idVq: child.idVq ?? null,
      fullName: `${child.firstName ?? ""} ${child.lastName ?? ""}`.trim() || "Sin nombre",
      registrationTypeDesc: child.registrationTypeDesc || child.registrationTypeCode || "Usuario Anidado",
    })) ?? [],
  };
}

export function toDirectoryVM(directory: DirectoryOverview): DirectoryVM {
  return {
    condominiumName: directory.condominiumName,
    condominiumSlug: directory.condominiumSlug,
    totalUsers: directory.totalUsers.toLocaleString("es-MX"),
    totalAssignments: directory.totalAssignments.toLocaleString("es-MX"),
    pagination: directory.pagination,
    people: directory.people.map(toPersonVM),
  };
}
