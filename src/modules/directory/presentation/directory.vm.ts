import type { DirectoryOverview, DirectoryPerson } from "../domain/directory";

export interface DirectoryPersonVM {
  id: string;
  reference: string;
  displayName: string;
  commerceLabel: string;
  legalNameLabel: string;
  primaryRoleLabel: string;
  requiresInvoiceLabel: string;
  initials: string;
  userTypeLabel: string;
  email: string;
  phone: string;
  rolesLabel: string;
  assignmentRolesLabel: string;
  assignedAreasLabel: string;
  assignmentCount: string;
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

function toPersonVM(person: DirectoryPerson): DirectoryPersonVM {
  const primaryRole =
    person.roles[0] ?? person.assignmentRoles[0] ?? "Sin rol";

  return {
    id: person.id,
    reference: person.id,
    displayName: person.displayName,
    commerceLabel: person.commerceName ?? "-",
    legalNameLabel: person.legalName,
    primaryRoleLabel: primaryRole,
    requiresInvoiceLabel: person.requiresInvoice === null ? "N/D" : person.requiresInvoice ? "Si" : "No",
    initials: initialsFrom(person.displayName),
    userTypeLabel: toUserTypeLabel(person.userType),
    email: person.email ?? "sin correo",
    phone: person.phone ?? "sin telefono",
    rolesLabel: joinOrFallback(person.roles, "sin rol"),
    assignmentRolesLabel: joinOrFallback(person.assignmentRoles, "sin asignacion"),
    assignedAreasLabel: joinOrFallback(person.assignedAreas, "sin areas"),
    assignmentCount: person.assignmentCount.toLocaleString("es-MX"),
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
