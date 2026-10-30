"use client";

/**
 * Bloque de error de carga: dice qué no se pudo cargar y ofrece reintentar (vuelve a pedir la
 * pantalla al servidor). Nunca se pintan ceros ni listas vacías en su lugar.
 */
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { buttonClass } from "./button";

export function LoadError({ what }: { what: string }) {
  const router = useRouter();
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-stroke-2 px-4 py-3">
      <p className="text-body text-fg-2">
        <span className="font-semibold text-fg">No pudimos cargar {what}.</span> Vuelve a intentarlo en un momento.
      </p>
      <button type="button" onClick={() => router.refresh()} className={buttonClass("outline", "sm")}>
        <RotateCw className="h-3.5 w-3.5" aria-hidden />
        Reintentar
      </button>
    </div>
  );
}
