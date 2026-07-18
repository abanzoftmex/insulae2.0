import { NextRequest, NextResponse } from "next/server";
import { voidSyncRequestSchema } from "@abanzoftmex/luca-insulae-contract";
import { readSignedRequest, verifyAgainstSecret, resolveCondominiumSecret } from "../../_lib/verify-signature";
import { VoidSyncRecordUseCase } from "@/modules/luca-sync/application/void-sync-record.use-case";
import { PrismaLucaSyncRepository } from "@/modules/luca-sync/infrastructure/prisma-luca-sync.repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ externalId: string }> },
) {
  const raw = await readSignedRequest(request);
  if (!raw.ok) return raw.response;

  const { externalId } = await params;

  let json: unknown;
  try {
    json = JSON.parse(raw.rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = voidSyncRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const owner = await resolveCondominiumSecret(parsed.data.tenantId);
  if (!owner) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  if (!owner.secret) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const valid = verifyAgainstSecret({
    secret: owner.secret,
    rawBody: raw.rawBody,
    timestamp: raw.timestamp,
    signature: raw.signature,
  });
  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const useCase = new VoidSyncRecordUseCase(new PrismaLucaSyncRepository());
  const result = await useCase.execute("expense", parsed.data.tenantId, externalId);

  if (result.outcome === "already_locked") {
    return NextResponse.json({ status: "already_locked" }, { status: 409 });
  }
  if (result.outcome === "not_found") {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "voided" }, { status: 200 });
}
