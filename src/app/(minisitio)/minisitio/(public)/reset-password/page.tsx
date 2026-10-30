import type { Metadata } from "next";
import { validateResetToken } from "@/modules/minisitio/application/auth.service";
import { ResetPasswordView } from "./reset-password-view";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const validation = token ? await validateResetToken(token) : null;

  return (
    <ResetPasswordView
      token={token || null}
      initialTokenValid={validation ? validation.valid : null}
      initialError={validation && !validation.valid ? validation.message : ""}
    />
  );
}
