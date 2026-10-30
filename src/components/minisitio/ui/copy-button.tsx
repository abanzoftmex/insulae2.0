"use client";

/**
 * Botón de copiar: copia al portapapeles, avisa con un toast y cambia el ícono por una palomita
 * durante 1.5 s, para que la confirmación quede donde está la mirada (el texto pasa a "Copiado").
 * Con texto ("Copiar", botón outline chico de ancho fijo, para que "Copiado" no empuje lo de al
 * lado) o solo ícono (filas de contactos). El cambio de ícono dura 80 ms y respeta "reducir
 * movimiento" (MotionConfig del shell).
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { toast } from "@/stores/minisitio-toast.store";
import { DUR, EASE } from "../motion";
import { buttonClass } from "./button";

export function CopyButton({
  valor,
  etiqueta,
  aviso,
  soloIcono = false,
  className = "",
}: {
  valor: string;
  /** Nombre accesible ("Copiar la CLABE de INBURSA"). */
  etiqueta: string;
  /** Texto del toast ("CLABE copiada"). */
  aviso: string;
  soloIcono?: boolean;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (espera.current) clearTimeout(espera.current);
  }, []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      if (espera.current) clearTimeout(espera.current);
      espera.current = setTimeout(() => setCopiado(false), 1500);
      toast(aviso, "success");
    } catch {
      toast("No se pudo copiar. Selecciónalo y cópialo a mano.", "error");
    }
  };

  const icono = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={copiado ? "listo" : "copiar"}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: DUR.instant, ease: EASE.slack }}
        className="inline-flex"
      >
        {copiado ? <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.5} aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      </motion.span>
    </AnimatePresence>
  );

  if (soloIcono) {
    return (
      <button
        type="button"
        onClick={copiar}
        aria-label={etiqueta}
        title={copiado ? "Copiado" : "Copiar"}
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-ctrl text-fg-4 outline-none hover:bg-surface-3 hover:text-fg-2 focus-visible:ring-2 focus-visible:ring-brand ${className}`}
      >
        {icono}
      </button>
    );
  }
  return (
    <button type="button" onClick={copiar} aria-label={etiqueta} className={buttonClass("outline", "sm", `min-w-[6.75rem] shrink-0 justify-center ${className}`)}>
      {icono}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}
