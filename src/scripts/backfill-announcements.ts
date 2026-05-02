import { prisma } from "../shared/infrastructure/db/prisma";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { join } from "path";

dotenv.config({ path: join(process.cwd(), ".env") });

// Mapeos manuales de catálogos centrales (basados en legacy PHP)
const STATUS_MAP: Record<number, string> = {
  1: "Pendiente",
  2: "Terminada",
  3: "Cancelada",
  4: "En Proceso",
  5: "Cerrada",
  6: "Iniciada",
};

const TYPE_MAP: Record<number, string> = {
  1: "Asamblea",
  2: "Reunión",
};

const CALL_TYPE_MAP: Record<number, string> = {
  1: "1ra Convocatoria",
  2: "2da Convocatoria",
  3: "3ra Convocatoria",
};

async function main() {
  console.log("🚀 Starting Announcements Backfill...");

  const legacyConn = await mysql.createConnection({
    host: process.env.LEGACY_DB_HOST,
    user: process.env.LEGACY_DB_USER,
    password: process.env.LEGACY_DB_PASSWORD,
    database: "sistemasabanza_insulaeValquirico",
    charset: "latin1",
  });

  // 1. Get Condominium
  const condominium = await prisma.condominium.findFirst({
    where: { slug: "valquirico" },
  });

  if (!condominium) {
    throw new Error("Condominium 'valquirico' not found in Neon.");
  }

  // 2. Sync Types
  console.log("--- Syncing Announcement Types ---");
  const [legacyTypes]: any = await legacyConn.execute("SELECT * FROM CAT_TIPOS_CONVOCATORIAS");
  for (const lt of legacyTypes) {
    await prisma.announcementType.upsert({
      where: { legacyId: lt.id_cat_tipos_convocatoria },
      update: { name: lt.nombre, isActive: lt.activo === 1 },
      create: {
        legacyId: lt.id_cat_tipos_convocatoria,
        name: lt.nombre,
        isActive: lt.activo === 1,
      },
    });
  }

  // 3. Sync Statuses (Manual)
  console.log("--- Syncing Announcement Statuses ---");
  for (const [id, name] of Object.entries(STATUS_MAP)) {
    await prisma.announcementStatus.upsert({
      where: { legacyId: parseInt(id) },
      update: { name },
      create: {
        legacyId: parseInt(id),
        name,
        color: id === "4" || id === "6" ? "#5a7b56" : "#6d422a",
      },
    });
  }

  // 4. Sync Subtypes
  console.log("--- Syncing Announcement Subtypes ---");
  const [legacySubtypes]: any = await legacyConn.execute("SELECT * FROM CAT_SUBTIPOS_CONVOCATORIAS");
  for (const ls of legacySubtypes) {
    const parentType = await prisma.announcementType.findUnique({
      where: { legacyId: ls.id_cat_tipos_convocatoria },
    });

    if (parentType) {
      await prisma.announcementSubtype.upsert({
        where: { legacyId: ls.id_cat_subtipos_convocatorias },
        update: { name: ls.nombre, typeId: parentType.id, isActive: ls.activo === 1 },
        create: {
          legacyId: ls.id_cat_subtipos_convocatorias,
          name: ls.nombre,
          typeId: parentType.id,
          isActive: ls.activo === 1,
        },
      });
    }
  }

  // 5. Sync Announcements
  console.log("--- Syncing Announcements ---");
  const [legacyAnnouncements]: any = await legacyConn.execute("SELECT * FROM CONVOCATORIAS WHERE activo = 1");
  
  for (const la of legacyAnnouncements) {
    const type = await prisma.announcementType.findUnique({ where: { legacyId: la.id_cat_tipos_convocatoria } });
    const subtype = await prisma.announcementSubtype.findUnique({ where: { legacyId: la.id_cat_subtipos_convocatorias } });
    const status = await prisma.announcementStatus.findUnique({ where: { legacyId: la.id_cat_status_convocatoria } });

    if (!type || !subtype || !status) continue;

    const announcement = await prisma.announcement.upsert({
      where: { 
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId: la.id_convocatorias
        }
      },
      update: {
        name: la.nombre,
        typeId: type.id,
        subtypeId: subtype.id,
        statusId: status.id,
        comments: la.comentarios,
        guests: la.invitados,
        pdfUrl: la.pdf ? `https://valquirico.insulae.com.mx/adjuntos/convocatorias/${la.pdf}` : null,
        expectedAttendance: la.total_esperado,
        actualAttendance: la.total_asistencia,
        attendancePercentage: la.indiviso_asistencia,
        conveningPosition: la.puestoConvoca,
        moderatorPosition: la.puestoModerador,
        isActive: la.activo === 1,
      },
      create: {
        condominiumId: condominium.id,
        legacyId: la.id_convocatorias,
        name: la.nombre,
        typeId: type.id,
        subtypeId: subtype.id,
        statusId: status.id,
        comments: la.comentarios,
        guests: la.invitados,
        pdfUrl: la.pdf ? `https://valquirico.insulae.com.mx/adjuntos/convocatorias/${la.pdf}` : null,
        expectedAttendance: la.total_esperado,
        actualAttendance: la.total_asistencia,
        attendancePercentage: la.indiviso_asistencia,
        conveningPosition: la.puestoConvoca,
        moderatorPosition: la.puestoModerador,
        isActive: la.activo === 1,
      },
    });

    // 6. Sync Dates for this Announcement
    const [legacyDates]: any = await legacyConn.execute(
      "SELECT * FROM CONVOCATORIAS_FECHAS WHERE id_convocatorias = ? AND activo = 1",
      [la.id_convocatorias]
    );

    for (const ld of legacyDates) {
      await prisma.announcementDate.upsert({
        where: { legacyId: ld.id_convocatorias_fechas },
        update: {
          date: ld.fecha,
          time: ld.hora,
          location: ld.lugar,
          callType: CALL_TYPE_MAP[ld.id_dcat_tipos_fechas_convocatorias] || "Convocatoria",
          status: ld.id_cat_status_convocatorias_fechas === 3 ? "Realizada" : "Pendiente",
        },
        create: {
          announcementId: announcement.id,
          legacyId: ld.id_convocatorias_fechas,
          date: ld.fecha,
          time: ld.hora,
          location: ld.lugar,
          callType: CALL_TYPE_MAP[ld.id_dcat_tipos_fechas_convocatorias] || "Convocatoria",
          status: ld.id_cat_status_convocatorias_fechas === 3 ? "Realizada" : "Pendiente",
        },
      });
    }

    // 7. Sync Topics (Agenda)
    const [legacyTopics]: any = await legacyConn.execute(
      "SELECT * FROM TEMAS WHERE id_convocatorias = ? AND activo = 1",
      [la.id_convocatorias]
    );

    for (const lt of legacyTopics) {
      await prisma.announcementTopic.upsert({
        where: { legacyId: lt.id_temas },
        update: {
          order: lt.orden || 0,
          title: lt.tema,
          description: lt.comentarios,
        },
        create: {
          announcementId: announcement.id,
          legacyId: lt.id_temas,
          order: lt.orden || 0,
          title: lt.tema,
          description: lt.comentarios,
        },
      });
    }
  }

  console.log("✅ Backfill completed successfully!");
  await legacyConn.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
