import { NextRequest, NextResponse } from "next/server";
import { expenseSyncPayloadSchema } from "@abanzoftmex/luca-insulae-contract";
import { readSignedRequest, verifyAgainstSecret, resolveCondominiumSecret } from "../_lib/verify-signature";
import { ReceiveExpenseSyncUseCase } from "@/modules/luca-sync/application/receive-expense-sync.use-case";
import { PrismaLucaSyncRepository } from "@/modules/luca-sync/infrastructure/prisma-luca-sync.repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const raw = await readSignedRequest(request);
  if (!raw.ok) return raw.response;

  let json: unknown;
  try {
    json = JSON.parse(raw.rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = expenseSyncPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const owner = await resolveCondominiumSecret(parsed.data.tenantId);
  if (!owner) {
    return NextResponse.json({ status: "rejected", reason: "tenant_not_mapped" }, { status: 422 });
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

  const useCase = new ReceiveExpenseSyncUseCase(new PrismaLucaSyncRepository());
  const result = await useCase.execute(parsed.data);

  if (result.outcome === "rejected") {
    return NextResponse.json({ status: "rejected", reason: result.reason }, { status: 422 });
  }

  return NextResponse.json(
    {
      status: "received",
      insulaeExpenseId: result.expenseId,
      syncStatus: "PENDING_CONFIRMATION",
    },
    { status: result.outcome === "duplicate" ? 200 : 201 },
  );
}
