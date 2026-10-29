import type { Metadata } from "next";
import { getProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { ForgotPasswordView } from "./forgot-password-view";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default async function ForgotPasswordPage() {
  const proyecto = await getProjectInfo();
  return <ForgotPasswordView proyecto={proyecto} />;
}
