import type { Metadata } from "next";
import { ForgotPasswordView } from "./forgot-password-view";

export const metadata: Metadata = { title: "Olvidé mi contraseña" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
