"use server";

import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";

export type SearchResultItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  category: string;
  type: "area" | "resident" | "ticket" | "expense" | "income" | "contact";
};

export async function globalSearch(query: string): Promise<SearchResultItem[]> {
  if (!query.trim() || query.trim().length < 2) return [];

  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true },
  });
  if (!condominium) return [];

  const cid = condominium.id;
  const q = query.trim();
  const contains = (field: string) => ({ contains: q, mode: "insensitive" as const });

  const [areas, residents, tickets, expenses, incomes] = await Promise.all([
    prisma.privateArea.findMany({
      where: {
        condominiumId: cid,
        isActive: true,
        OR: [
          { name: contains(q) },
          { code: contains(q) },
          { street: contains(q) },
        ],
      },
      select: { id: true, name: true, code: true, street: true },
      take: 5,
    }),

    prisma.user.findMany({
      where: {
        condominiumId: cid,
        isActive: true,
        OR: [
          { firstName: contains(q) },
          { lastName: contains(q) },
          { businessName: contains(q) },
          { email: contains(q) },
        ],
      },
      select: { id: true, firstName: true, lastName: true, businessName: true, email: true },
      take: 5,
    }),

    prisma.ticket.findMany({
      where: {
        condominiumId: cid,
        isActive: true,
        OR: [{ title: contains(q) }, { description: contains(q) }],
      },
      select: { id: true, title: true, status: true },
      take: 5,
    }),

    prisma.expense.findMany({
      where: {
        condominiumId: cid,
        isActive: true,
        concept: contains(q),
      },
      select: { id: true, concept: true, amount: true },
      take: 4,
    }),

    prisma.income.findMany({
      where: {
        condominiumId: cid,
        isActive: true,
        concept: contains(q),
      },
      select: { id: true, concept: true, amount: true },
      take: 4,
    }),
  ]);

  const results: SearchResultItem[] = [
    ...areas.map((a) => ({
      id: a.id,
      label: a.name,
      sublabel: [a.code, a.street].filter(Boolean).join(" · ") || undefined,
      href: `/areas-privativas`,
      category: "Área Privativa",
      type: "area" as const,
    })),
    ...residents.map((u) => ({
      id: u.id,
      label: u.businessName || [u.firstName, u.lastName].filter(Boolean).join(" ") || "—",
      sublabel: u.email || undefined,
      href: `/directorio`,
      category: "Residente",
      type: "resident" as const,
    })),
    ...tickets.map((t) => ({
      id: t.id,
      label: t.title,
      sublabel: t.status,
      href: `/tickets`,
      category: "Ticket",
      type: "ticket" as const,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      label: e.concept,
      sublabel: `$${Number(e.amount).toLocaleString("es-MX")}`,
      href: `/listado-gastos`,
      category: "Gasto",
      type: "expense" as const,
    })),
    ...incomes.map((i) => ({
      id: i.id,
      label: i.concept,
      sublabel: `$${Number(i.amount).toLocaleString("es-MX")}`,
      href: `/listado-ingresos`,
      category: "Ingreso",
      type: "income" as const,
    })),
  ];

  return results;
}
