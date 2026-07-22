import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/app/actions/auth";
import { ExecuteSyncRecordUseCase } from "@/modules/luca-sync/application/execute-sync-record.use-case";
import { PrismaLucaSyncRepository } from "@/modules/luca-sync/infrastructure/prisma-luca-sync.repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "CHECK", "OTHER"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body: { paymentMethod?: string; reference?: string | null; miscCatalogId?: string | null; chargeGroupId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const paymentMethod = body.paymentMethod;
  if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json(
      { error: "invalid_payment_method", allowed: VALID_PAYMENT_METHODS },
      { status: 400 },
    );
  }

  // Obligatorio: un cobro de Luca no trae categoría ni grupo financiero
  // propios de Insulae — hay que elegirlos antes de confirmar el registro.
  if (!body.miscCatalogId || !body.chargeGroupId) {
    return NextResponse.json(
      { error: "missing_category_or_group" },
      { status: 400 },
    );
  }

  const useCase = new ExecuteSyncRecordUseCase(new PrismaLucaSyncRepository());
  const result = await useCase.execute({
    entityType: "income",
    id,
    actor: { userId: session.userId, name: session.name ?? "Usuario Insulae" },
    paymentMethod,
    reference: body.reference ?? null,
    miscCatalogId: body.miscCatalogId ?? null,
    chargeGroupId: body.chargeGroupId ?? null,
  });

  if (result.outcome === "not_found") {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  if (result.outcome === "not_synced") {
    return NextResponse.json({ status: "not_synced" }, { status: 409 });
  }
  if (result.outcome === "already_locked") {
    return NextResponse.json({ status: "already_locked" }, { status: 409 });
  }
  if (result.outcome === "invalid_assignment") {
    return NextResponse.json({ status: "invalid_assignment" }, { status: 400 });
  }
  return NextResponse.json({ status: "executed" }, { status: 200 });
}
