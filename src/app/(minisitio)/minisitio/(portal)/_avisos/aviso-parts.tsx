"use client";

/**
 * Piezas de un aviso que comparten Inicio y Avisos: el avatar de la administración (el sello) y
 * los adjuntos, con la imagen en vista previa (se amplía en el visor) y el PDF como tarjeta de archivo,
 * como los archivos en un mensaje de Slack.
 */
import Image from "next/image";
import { ArrowUpRight, FileText } from "lucide-react";

/** 36 px con radio del 22 %: el avatar de mensaje de Slack, con el sello de Val'Quirico. */
export function AdminAvatar() {
  return (
    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-highlight">
      <Image src="/logo-mono.png" alt="" width={26} height={27} className="h-[27px] w-auto" />
    </span>
  );
}

/** Vista previa (hasta 360 × 360, como Slack) que abre el visor. */
export function AvisoImagen({ src, titulo, onOpen }: { src: string; titulo: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block overflow-hidden rounded-panel border border-stroke-2 outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- imágenes de la 1.0 en otro host */}
      <img
        src={src}
        alt={`Imagen del aviso «${titulo}»`}
        loading="lazy"
        className="block h-auto max-h-[360px] w-auto max-w-full object-contain transition-[filter] group-hover:brightness-95 sm:max-w-[360px]"
      />
      <span className="sr-only"> (ampliar)</span>
    </button>
  );
}

export function AvisoPdf({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full max-w-[360px] items-center gap-3 rounded-panel border border-stroke-2 bg-surface p-3 outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-surface bg-surface-3 text-fg-2">
        <FileText className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-fg">Documento del aviso</span>
        <span className="block text-caption text-fg-3">PDF · se abre en otra pestaña</span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-fg-3" aria-hidden />
    </a>
  );
}
