/**
 * GET /api/condomino/fees-report?tipo=ordinaria|extraordinaria&page=1&limit=10
 * Reporte de cuotas por área privativa (condominio), paginado.
 * Los años de columnas salen de los CARGOS reales (crece solo cuando llega data nueva, p.ej. 2027).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";
import { mapAreaStatus, num, round2 } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

function isExtra(kind: string | null | undefined): boolean {
  return kind === "EXTRA_CONDO" || kind === "EXTRA_COMMERCE";
}

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const tipo = sp.get("tipo") === "extraordinaria" ? "extraordinaria" : "ordinaria";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "10", 10)));

  // Catálogo de grupos de cobro del tipo solicitado
  const allGroups = await prisma.chargeGroup.findMany({
    where: { condominiumId: session.condominiumId },
    select: { id: true, name: true, kind: true },
  });
  const groups = allGroups.filter((g) => (tipo === "extraordinaria" ? isExtra(g.kind) : !isExtra(g.kind)));
  const groupIds = groups.map((g) => g.id);
  const gruposCobro = groups.map((g) => ({ id: g.id, nombre: g.name }));

  // Años con cargos reales de este tipo → las columnas crecen solas con la data
  const currentYear = new Date().getFullYear();
  const MAX_YEARS = 3; // cap: solo años recientes (hay cargos de 10 años atrás)
  let anios: number[] = [currentYear];
  if (groupIds.length) {
    const yearCharges = await prisma.charge.findMany({
      where: { condominiumId: session.condominiumId, chargeGroupId: { in: groupIds }, status: { not: "CANCELED" } },
      select: { periodYear: true, dueDate: true },
    });
    const ys = new Set<number>();
    yearCharges.forEach((c) => {
      if (c.periodYear) ys.add(c.periodYear);
      if (c.dueDate) ys.add(c.dueDate.getFullYear());
    });
    // Rango sano (descarta años basura tipo 4200) + cap a los más recientes.
    const sane = [...ys].filter((y) => y >= 2015 && y <= currentYear + 1).sort((a, b) => a - b);
    if (sane.length > 0) anios = sane.slice(-MAX_YEARS);
  }

  const total = await prisma.privateArea.count({ where: { condominiumId: session.condominiumId } });
  const areas = await prisma.privateArea.findMany({
    where: { condominiumId: session.condominiumId },
    select: {
      id: true, name: true, code: true, status: true, isFusion: true,
      charges: {
        select: { amount: true, paidAmount: true, interestAmount: true, discountAmount: true, status: true, dueDate: true, periodYear: true, periodMonth: true, chargeGroupId: true, responsibility: true },
      },
      rentals: { select: { id: true }, take: 1 },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

  const now = new Date();
  const apoles = areas.map((a) => {
    const st = mapAreaStatus(a.status);
    const cuotasPorGrupo: { id_grupo: string; nombre_grupo: string; propietario: number; comercio: number }[] = [];
    const saldosPorGrupo: { id_grupo: string; propietario: number; comercio: number; fechaVencimientoProp: string | null; fechaVencimientoCom: string | null }[] = [];
    const carteraVencidaPorGrupo: { id_grupo: string; propietario: number; comercio: number }[] = [];
    // pagosMensualesByYear[year] = [{ id_grupo, mesesPropietario[12], mesesComercio[12] }]
    const pagosMensualesByYear: Record<number, { id_grupo: string; mesesPropietario: number[]; mesesComercio: number[] }[]> = {};
    anios.forEach((y) => (pagosMensualesByYear[y] = []));

    // Calcula una "columna" (propietario=OWNER o comercio=COMMERCE) para un grupo.
    const computeSide = (groupId: string, resp: "OWNER" | "COMMERCE") => {
      const gc = a.charges.filter((c) => c.chargeGroupId === groupId && c.responsibility === resp && c.status !== "CANCELED");
      let ultimaCuota = 0;
      let saldo = 0;
      let vencido = 0;
      let venc: Date | null = null;
      const mesesByYear: Record<number, number[]> = {};
      anios.forEach((y) => (mesesByYear[y] = new Array(12).fill(0)));
      for (const c of gc) {
        const amount = num(c.amount);
        const s = amount - num(c.paidAmount) - num(c.discountAmount) + num(c.interestAmount);
        saldo += s;
        if (s > 0 && c.dueDate && c.dueDate < now) vencido += s;
        if (c.dueDate && (!venc || c.dueDate > venc)) { venc = c.dueDate; ultimaCuota = amount; }
        if (c.periodYear && mesesByYear[c.periodYear] && c.periodMonth >= 1 && c.periodMonth <= 12) {
          mesesByYear[c.periodYear][c.periodMonth - 1] = round2(mesesByYear[c.periodYear][c.periodMonth - 1] + amount);
        }
      }
      return { ultimaCuota, saldo, vencido, venc, mesesByYear };
    };

    for (const g of groups) {
      const prop = computeSide(g.id, "OWNER");
      const com = computeSide(g.id, "COMMERCE");

      cuotasPorGrupo.push({ id_grupo: g.id, nombre_grupo: g.name, propietario: round2(prop.ultimaCuota), comercio: round2(com.ultimaCuota) });
      saldosPorGrupo.push({
        id_grupo: g.id,
        propietario: round2(Math.max(0, prop.saldo)),
        comercio: round2(Math.max(0, com.saldo)),
        fechaVencimientoProp: prop.venc ? prop.venc.toISOString().slice(0, 10) : null,
        fechaVencimientoCom: com.venc ? com.venc.toISOString().slice(0, 10) : null,
      });
      carteraVencidaPorGrupo.push({ id_grupo: g.id, propietario: round2(prop.vencido), comercio: round2(com.vencido) });
      anios.forEach((y) =>
        pagosMensualesByYear[y].push({ id_grupo: g.id, mesesPropietario: prop.mesesByYear[y], mesesComercio: com.mesesByYear[y] })
      );
    }

    const out: Record<string, unknown> = {
      id: a.id,
      nombre: a.name,
      iniciales: a.code || a.name,
      id_cat_status: st.id_cat_status,
      es_fusion: a.isFusion ? 1 : 0,
      status: { nombre: st.status_nombre, css: st.id_cat_status === 1 ? "statusDespierto" : "statusInactivo" },
      tieneArrendamiento: a.rentals.length > 0,
      cuotasPorGrupo,
      saldosPorGrupo,
      pagosAnticipadosPorGrupo: groups.map((g) => ({ id_grupo: g.id, propietario: 0, comercio: 0 })),
      carteraVencidaPorGrupo,
      areasFusion: [],
      hijos: [],
    };
    anios.forEach((y) => (out[`pagosMensuales${y}`] = pagosMensualesByYear[y]));
    return out;
  });

  return NextResponse.json({
    success: true,
    anios,
    page,
    limit,
    total,
    totalUnidades: total,
    ultimaActualizacionTexto: "Actualizado al día de hoy",
    apoles,
    gruposCobro,
  });
}
