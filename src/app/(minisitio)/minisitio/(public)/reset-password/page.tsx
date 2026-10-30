import type { Metadata } from "next";
import { getProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { validateResetToken } from "@/modules/minisitio/application/auth.service";
import { ResetPasswordView } from "./reset-password-view";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const [proyecto, validation] = await Promise.all([
    getProjectInfo(),
    token ? validateResetToken(token) : Promise.resolve(null),
  ]);

  return (
    <ResetPasswordView
      token={token || null}
      proyecto={proyecto}
      initialTokenValid={validation ? validation.valid : null}
      initialError={validation && !validation.valid ? validation.message : ""}
    />
  );
}
