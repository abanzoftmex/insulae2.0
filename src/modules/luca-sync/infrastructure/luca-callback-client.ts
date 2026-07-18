import { signPayload, type ExecutionCallbackPayload } from "@abanzoftmex/luca-insulae-contract";

export type CallbackResult = { ok: true } | { ok: false; error: string };

export interface LucaConnection {
  baseUrl: string;
  secret: string;
}

/**
 * Notifica a Luca que un registro sincronizado fue ejecutado/bloqueado en
 * Insulae. No reabre el asiento contable en Luca — es solo el cierre del
 * ciclo de auditoría. Si falla, la ejecución local en Insulae ya ocurrió
 * y no se revierte (ver ExecuteSyncRecordUseCase).
 *
 * La URL y el secreto vienen del condominio que ejecutó — cada condominio
 * puede estar ligado a un tenant/deployment de Luca distinto.
 */
export async function sendExecutionCallback(
  connection: LucaConnection,
  payload: ExecutionCallbackPayload,
): Promise<CallbackResult> {
  const { baseUrl, secret } = connection;

  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signPayload(secret, body, timestamp);

  try {
    const res = await fetch(`${baseUrl}/api/integrations/insulae/v1/executions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Luca-Signature": signature,
        "X-Luca-Timestamp": timestamp,
      },
      body,
    });
    if (!res.ok) {
      return { ok: false, error: `Luca respondió ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network_error" };
  }
}
