import type { Metadata } from "next";
import { LoginView } from "./login-view";

export const metadata: Metadata = { title: "Acceso" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <LoginView reason={reason ?? null} />;
}
