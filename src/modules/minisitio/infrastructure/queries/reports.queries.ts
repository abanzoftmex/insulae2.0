/**
 * Reportes condominales del portal: reporte de cuotas (ordinarias / extraordinarias) por
 * área privativa y reporte general de saldos.
 */
import { prisma } from "@/shared/infrastructure/db/prisma";
import type { CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { computeBalance, mapAreaStatus, num, round2 } from "../scope";

function isExtra(kind: string | null | undefined): boolean {
  return kind === "EXTRA_CONDO" || kind === "EXTRA_COMMERCE";
}

export type FeesReportType = "ordinaria" | "extraordinaria";

export interface FeesReportArea {
  id: string;
  nombre: string;
  iniciales: string;
  id_cat_status: number;
  es_fusion: number;
  status: { nombre: string; css: string };
  tieneArrendamiento: boolean;
  cuotasPorGrupo: { id_grupo: string; nombre_grupo: string; propietario: number; comercio: number }[];
  saldosPorGrupo: {
    id_grupo: string;
    propietario: number;
    comercio: number;
    fechaVencimientoProp: string | null;
    fechaVencimientoCom: string | null;
  }[];
  pagosAnticipadosPorGrupo: { id_grupo: string; propietario: number; comercio: number }[];
  carteraVencidaPorGrupo: { id_grupo: string; propietario: number; comercio: number }[];
  areasFusion: unknown[];
  hijos: unknown[];
  /** `pagosMensuales${año}`: [{ id_grupo, mesesPropietario[12], mesesComercio[12] }] */
  [pagosMensualesKey: `pagosMensuales${number}`]: { id_grupo: string; mesesPropietario: number[]; mesesComercio: number[] }[];
}

/**
 * Reporte de cuotas por área privativa (todo el condominio), paginado. Los años de las
 * columnas salen de los CARGOS reales (crece solo cuando llega data nueva, p.ej. 2027).
 */
export async function getFeesReport(
  session: CondominoTokenPayload,
  options: { tipo?: FeesReportType; page?: number; limit?: number } = {},
) {
  const tipo: FeesReportType = options.tipo === "extraordinaria" ? "extraordinaria" : "ordinaria";
  const page = Math.max(1, Math.floor(options.page || 1));
  const limit = Math.min(50, Math.max(1, Math.floor(options.limit || 10)));

  // Catálogo de grupos de cobro del tipo solicitado
  const allGroups = await prisma.chargeGroup.findMany({
    where: { condominiumId: session.condominiumId },
    select: { id: true, name: true, kind: true },
  });
  const groups = allGroups.filter((g) => (tipo === "extraordinaria" ? isExtra(g.kind) : !isExtra(g.kind)));
  const groupIds = groups.map((g) => g.id);
  const gruposCobro = groups.map((g) => ({ id: g.id, nombre: g.name }));

  // Años con cargos reales de este tipo → las columnas crecen solas con la data
  const thisYear = new Date().getFullYear();
  const MAX_YEARS = 3; // solo años recientes (hay cargos de 10 años atrás)
  let anios: number[] = [thisYear];
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
    const sane = [...ys].filter((y) => y >= 2015 && y <= thisYear + 1).sort((a, b) => a - b);
    if (sane.length > 0) anios = sane.slice(-MAX_YEARS);
  }

  const [total, areas] = await Promise.all([
    prisma.privateArea.count({ where: { condominiumId: session.condominiumId } }),
    prisma.privateArea.findMany({
      where: { condominiumId: session.condominiumId },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        isFusion: true,
        charges: {
          select: {
            amount: true,
            paidAmount: true,
            interestAmount: true,
            discountAmount: true,
            status: true,
            dueDate: true,
            periodYear: true,
            periodMonth: true,
            chargeGroupId: true,
            responsibility: true,
          },
        },
        rentals: { select: { id: true }, take: 1 },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const now = new Date();
  const apoles = areas.map((a) => {
    const st = mapAreaStatus(a.status);
    const cuotasPorGrupo: FeesReportArea["cuotasPorGrupo"] = [];
    const saldosPorGrupo: FeesReportArea["saldosPorGrupo"] = [];
    const carteraVencidaPorGrupo: FeesReportArea["carteraVencidaPorGrupo"] = [];
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
        if (c.dueDate && (!venc || c.dueDate > venc)) {
          venc = c.dueDate;
          ultimaCuota = amount;
        }
        if (c.periodYear && mesesByYear[c.periodYear] && c.periodMonth >= 1 && c.periodMonth <= 12) {
          mesesByYear[c.periodYear][c.periodMonth - 1] = round2(mesesByYear[c.periodYear][c.periodMonth - 1] + amount);
        }
      }
      return { ultimaCuota, saldo, vencido, venc: venc as Date | null, mesesByYear };
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
        pagosMensualesByYear[y].push({ id_grupo: g.id, mesesPropietario: prop.mesesByYear[y], mesesComercio: com.mesesByYear[y] }),
      );
    }

    const out = {
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
    } as FeesReportArea;
    anios.forEach((y) => (out[`pagosMensuales${y}`] = pagosMensualesByYear[y]));
    return out;
  });

  return {
    success: true as const,
    anios,
    page,
    limit,
    total,
    totalUnidades: total,
    ultimaActualizacionTexto: "Actualizado al día de hoy",
    apoles,
    gruposCobro,
  };
}

export type FeesReport = Awaited<ReturnType<typeof getFeesReport>>;

/** Reporte general: todas las áreas con saldos y estadísticas por zona. */
export async function getGeneralReport(session: CondominoTokenPayload) {
  const year = new Date().getFullYear();

  const areas = await prisma.privateArea.findMany({
    where: { condominiumId: session.condominiumId },
    select: {
      id: true,
      name: true,
      zone: true,
      useType: true,
      status: true,
      m2Original: true,
      charges: {
        where: { responsibility: "OWNER" },
        select: { amount: true, paidAmount: true, interestAmount: true, discountAmount: true, status: true, dueDate: true },
      },
    },
    orderBy: { sortOrder: "asc" },
    take: 2000,
  });

  const estadisticasPorZona: Record<string, { total_areas: number; saldo_pendiente: number; saldo_vencido: number }> = {};
  let total_saldo_pendiente = 0;
  let total_saldo_vencido = 0;
  let total_intereses = 0;
  let areas_con_saldo_vencido = 0;

  const out = areas.map((a) => {
    const bal = computeBalance(a.charges);
    const meses: Record<number, number> = {};
    for (const c of a.charges) {
      if (c.status === "CANCELED" || !c.dueDate || c.dueDate.getFullYear() !== year) continue;
      const m = c.dueDate.getMonth() + 1;
      const saldo = num(c.amount) - num(c.paidAmount) - num(c.discountAmount) + num(c.interestAmount);
      meses[m] = round2((meses[m] || 0) + saldo);
    }
    total_saldo_pendiente += bal.saldo_pendiente;
    total_saldo_vencido += bal.saldo_vencido;
    total_intereses += bal.intereses_acumulados;
    if (bal.saldo_vencido > 0) areas_con_saldo_vencido++;
    const zona = a.zone || "Sin zona";
    if (!estadisticasPorZona[zona]) estadisticasPorZona[zona] = { total_areas: 0, saldo_pendiente: 0, saldo_vencido: 0 };
    estadisticasPorZona[zona].total_areas++;
    estadisticasPorZona[zona].saldo_pendiente = round2(estadisticasPorZona[zona].saldo_pendiente + bal.saldo_pendiente);
    estadisticasPorZona[zona].saldo_vencido = round2(estadisticasPorZona[zona].saldo_vencido + bal.saldo_vencido);

    return {
      id: `prop_${a.id}`,
      tipo: "Propiedad",
      identificador: a.name,
      direccion: "",
      zona,
      uso_suelo: a.useType || "Sin uso definido",
      status: a.status || "",
      m2_totales: num(a.m2Original),
      meses,
      saldo_pendiente: bal.saldo_pendiente,
      saldo_vencido: bal.saldo_vencido,
      intereses_acumulados: bal.intereses_acumulados,
      estado_financiero: bal.estado_saldo,
    };
  });

  return {
    success: true as const,
    areas: out,
    estadisticas: {
      total_areas: out.length,
      total_propiedades: out.length,
      total_arrendamientos: 0,
      total_saldo_pendiente: round2(total_saldo_pendiente),
      total_saldo_vencido: round2(total_saldo_vencido),
      total_intereses: round2(total_intereses),
      areas_con_saldo_vencido,
      estadisticas_por_zona: estadisticasPorZona,
    },
  };
}

export type GeneralReport = Awaited<ReturnType<typeof getGeneralReport>>;
