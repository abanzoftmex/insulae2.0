/**
 * GET /api/condomino/profile  → datos del condómino (perfil)
 * PUT /api/condomino/profile  → actualiza requiereFactura
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

function tipoDirectorio(userType: string): { id: number; nombre: string } {
  if (userType === "LEGAL_ENTITY") return { id: 2, nombre: "Persona Moral" };
  return { id: 1, nombre: "Persona Física" };
}

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: { id: session.userId, condominiumId: session.condominiumId },
    select: {
      userType: true, firstName: true, lastName: true, lastNamePaterno: true, lastNameMaterno: true,
      email: true, personalEmail: true, businessEmail: true, phone: true, address: true,
      businessName: true, requiresInvoice: true, taxStatusPdfUrl: true,
      assignments: { where: { isActive: true }, select: { roleName: true, privateArea: { select: { name: true, code: true } } } },
      administrativeCommerces: { select: { name: true } },
      operativeCommerces: { select: { name: true } },
    },
  });
  if (!user) return NextResponse.json({ success: false, message: "Usuario no encontrado." }, { status: 404 });

  const td = tipoDirectorio(user.userType);
  const comerciosMap = new Map<string, { nombre: string }>();
  [...user.administrativeCommerces, ...user.operativeCommerces].forEach((c) => {
    if (c.name) comerciosMap.set(c.name, { nombre: c.name });
  });

  return NextResponse.json({
    success: true,
    datosGenerales: {
      id_cat_tipos_directorio: td.id,
      nombre: user.firstName || "",
      apaterno: user.lastNamePaterno || user.lastName || "",
      amaterno: user.lastNameMaterno || "",
      email: user.email || user.personalEmail || user.businessEmail || "",
      telefono: user.phone || null,
      direccion: user.address || null,
      razon_social: user.businessName || null,
      requiereFactura: user.requiresInvoice ? 1 : 0,
      constanciaFiscal: user.taxStatusPdfUrl || null,
    },
    tipoDirectorio: { id_cat_tipos_directorio: td.id, nombre: td.nombre },
    comercios: [...comerciosMap.values()].map((c) => ({
      nombre: c.nombre,
      email: "",
      telefono: "",
      razonSocial: c.nombre,
      rfc: "",
      id_directorioAdministrativo: null,
      id_directorioContable: null,
      directorioAdministrativo: null,
      directorioContable: null,
    })),
    asignaciones: user.assignments.map((a) => ({
      id_roles_condominal: null,
      id: null,
      activo: 1,
      rolNombre: a.roleName || "Propietario",
      tabla: "AREAS_PRIVATIVAS",
      campo: "",
      entidadNombre: a.privateArea?.name || a.privateArea?.code || "",
    })),
  });
}

export async function PUT(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  let body: { requiereFactura?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Solicitud inválida." }, { status: 400 });
  }
  if (typeof body?.requiereFactura !== "boolean") {
    return NextResponse.json({ success: false, message: "El campo requiereFactura debe ser un valor booleano" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { requiresInvoice: body.requiereFactura },
  });

  return NextResponse.json({ success: true, message: "Campo de requiere factura actualizado correctamente" });
}
