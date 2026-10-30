"use client";

/**
 * Error de una pantalla del portal: se muestra dentro del panel de contenido, con el shell y la
 * navegación intactos, y "Reintentar" vuelve a pedirla al servidor.
 */
import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    console.error("[minisitio] Error en una pantalla del portal:", error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto w-full max-w-[520px] py-16 text-center">
      <p className="text-subtitle font-bold text-fg">No pudimos cargar esta pantalla</p>
      <p className="mt-1 text-body text-fg-3">Suele ser algo pasajero. Vuelve a intentarlo; si sigue pasando, escríbenos desde Solicitudes.</p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" disabled={pending} onClick={() => startTransition(() => (router.refresh(), reset()))} className={buttonClass("primary")}>
          {pending ? "Reintentando…" : "Reintentar"}
        </button>
        <Link href={msPath("/")} className={buttonClass("outline")}>
          Ir a Inicio
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-caption text-fg-4">Código de error: {error.digest}</p>}
    </div>
  );
}
