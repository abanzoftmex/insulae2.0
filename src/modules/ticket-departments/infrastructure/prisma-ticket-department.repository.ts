import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  SaveTicketDepartmentInput,
  TicketDepartmentCommandResult,
  TicketDepartmentFormSnapshot,
  TicketDepartmentListing,
} from "../domain/ticket-department";
import type { TicketDepartmentRepository } from "../domain/ticket-department.repository";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TicketDepartmentRow = {
  id: string;
  name: string;
  email: string | null;
  _count: {
    tickets: number;
  };
};

type TicketDepartmentDelegate = {
  findMany(args: unknown): Promise<TicketDepartmentRow[]>;
  findFirst(args: unknown): Promise<TicketDepartmentFormSnapshot | { id: string; _count: { tickets: number } } | { id: string } | null>;
  update(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<{ id: string }>;
};

const ticketDepartmentModel = (
  prisma as unknown as {
    ticketDepartment: TicketDepartmentDelegate;
  }
).ticketDepartment;

function trimSafe(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeEmail(value: string | null | undefined): string {
  return trimSafe(value).toLowerCase();
}

async function resolveCondominium(): Promise<{ id: string; slug: string; name: string } | null> {
  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    }));

  if (!condominium) {
    return null;
  }

  return condominium;
}

export class PrismaTicketDepartmentRepository implements TicketDepartmentRepository {
  async getListing(): Promise<TicketDepartmentListing | null> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return null;
    }

    const rows = await ticketDepartmentModel.findMany({
      where: {
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      rows: rows.map((row: TicketDepartmentRow) => ({
        id: row.id,
        name: row.name,
        email: row.email ?? "",
        ticketsCount: row._count.tickets,
        canDelete: row._count.tickets === 0,
      })),
    };
  }

  async getById(id: string): Promise<TicketDepartmentFormSnapshot | null> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return null;
    }

    const departmentId = trimSafe(id);
    if (!departmentId) {
      return null;
    }

    const department = (await ticketDepartmentModel.findFirst({
      where: {
        id: departmentId,
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })) as TicketDepartmentFormSnapshot | null;

    if (!department) {
      return null;
    }

    return department;
  }

  async save(input: SaveTicketDepartmentInput): Promise<TicketDepartmentCommandResult> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return {
        ok: false,
        message: "No se encontro un condominio activo.",
      };
    }

    const name = trimSafe(input.name);
    if (name.length < 2) {
      return {
        ok: false,
        message: "El nombre debe tener al menos 2 caracteres.",
      };
    }

    const email = normalizeEmail(input.email);
    if (!EMAIL_REGEX.test(email)) {
      return {
        ok: false,
        message: "El correo electronico no es valido.",
      };
    }

    const departmentId = trimSafe(input.id);

    if (departmentId) {
      const existing = (await ticketDepartmentModel.findFirst({
        where: {
          id: departmentId,
          condominiumId: condominium.id,
          isActive: true,
        },
        select: { id: true },
      })) as { id: string } | null;

      if (!existing) {
        return {
          ok: false,
          message: "El departamento ya no existe.",
        };
      }

      const duplicate = (await ticketDepartmentModel.findFirst({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          name: { equals: name, mode: "insensitive" },
          NOT: { id: departmentId },
        },
        select: { id: true },
      })) as { id: string } | null;

      if (duplicate) {
        return {
          ok: false,
          message: "Ya existe un departamento activo con ese nombre.",
        };
      }

      await ticketDepartmentModel.update({
        where: { id: departmentId },
        data: {
          name,
          email,
        },
      });

      return {
        ok: true,
        message: "Departamento actualizado correctamente.",
        departmentId,
      };
    }

    const duplicate = (await ticketDepartmentModel.findFirst({
      where: {
        condominiumId: condominium.id,
        isActive: true,
        name: { equals: name, mode: "insensitive" },
      },
      select: { id: true },
    })) as { id: string } | null;

    if (duplicate) {
      return {
        ok: false,
        message: "Ya existe un departamento activo con ese nombre.",
      };
    }

    const created = await ticketDepartmentModel.create({
      data: {
        condominiumId: condominium.id,
        name,
        email,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      message: "Departamento creado correctamente.",
      departmentId: created.id,
    };
  }

  async delete(id: string): Promise<TicketDepartmentCommandResult> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return {
        ok: false,
        message: "No se encontro un condominio activo.",
      };
    }

    const departmentId = trimSafe(id);
    if (!departmentId) {
      return {
        ok: false,
        message: "El departamento solicitado no es valido.",
      };
    }

    const department = (await ticketDepartmentModel.findFirst({
      where: {
        id: departmentId,
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    })) as { id: string; _count: { tickets: number } } | null;

    if (!department) {
      return {
        ok: false,
        message: "El departamento ya no existe.",
      };
    }

    if (department._count.tickets > 0) {
      return {
        ok: false,
        message: "No se puede eliminar un departamento con tickets asignados.",
      };
    }

    await ticketDepartmentModel.update({
      where: { id: department.id },
      data: {
        isActive: false,
      },
    });

    return {
      ok: true,
      message: "Departamento eliminado correctamente.",
      departmentId: department.id,
    };
  }
}
