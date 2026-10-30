import type { Metadata } from "next";
import { LoginView } from "./login-view";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <LoginView reason={reason ?? null} />;
}
