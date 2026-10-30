"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MinisitioErrorScreen } from "./error-screen";

export default function MinisitioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  useEffect(() => {
    console.error("[minisitio] Error de pantalla:", error);
  }, [error]);

  // Reintentar vuelve a pedir la pantalla al servidor (los errores suelen venir de ahí).
  return <MinisitioErrorScreen statusCode={500} onRetry={() => startTransition(() => (router.refresh(), reset()))} />;
}
