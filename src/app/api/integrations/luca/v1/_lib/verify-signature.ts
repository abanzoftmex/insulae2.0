import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@abanzoftmex/luca-insulae-contract";
import { prisma } from "@/shared/infrastructure/db/prisma";

const HEADER_SIGNATURE = "x-luca-signature";
const HEADER_TIMESTAMP = "x-luca-timestamp";

export type RawSignedRequest =
  | { ok: true; rawBody: string; signature: string; timestamp: string }
  | { ok: false; response: NextResponse };

/**
 * Solo lee el cuerpo y los headers de firma — NO verifica todavía. Cada
 * condominio (tenant de Insulae) puede estar ligado a un tenant de Luca
 * distinto, con su propio secreto, así que hay que saber de cuál condominio
 * es el mensaje antes de poder verificarlo (ver resolveCondominiumSecret).
 */
export async function readSignedRequest(request: NextRequest): Promise<RawSignedRequest> {
  const signature = request.headers.get(HEADER_SIGNATURE);
  const timestamp = request.headers.get(HEADER_TIMESTAMP);
  const rawBody = await request.text();

  if (!signature || !timestamp) {
    return {
      ok: false,
      response: NextResponse.json({ error: "missing_signature" }, { status: 401 }),
    };
  }

  return { ok: true, rawBody, signature, timestamp };
}

export function verifyAgainstSecret(params: {
  secret: string;
  rawBody: string;
  timestamp: string;
  signature: string;
}): boolean {
  return verifySignature(params);
}

/**
 * Busca a qué condominio pertenece este tenantId de Luca, y su secreto —
 * usar el tenantId solo como llave de búsqueda no otorga ningún privilegio;
 * la firma se verifica después, con el secreto ya resuelto.
 */
export async function resolveCondominiumSecret(
  tenantId: string,
): Promise<{ condominiumId: string; secret: string | null } | null> {
  const condo = await prisma.condominium.findUnique({
    where: { lucaTenantId: tenantId },
    select: { id: true, lucaWebhookSecret: true },
  });
  if (!condo) return null;
  return { condominiumId: condo.id, secret: condo.lucaWebhookSecret };
}
