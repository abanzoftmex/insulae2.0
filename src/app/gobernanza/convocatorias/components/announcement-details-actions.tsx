"use client";

import Link from "next/link";
import { Edit2, Play } from "lucide-react";

interface AnnouncementDetailsActionsProps {
  id: string;
  pdfUrl?: string | null;
}

export function AnnouncementDetailsActions({ id, pdfUrl }: AnnouncementDetailsActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={`/gobernanza/convocatorias/${id}/editar`}
        className="flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
      >
        <Edit2 className="h-3 w-3" />
        Editar convocatoria
      </Link>

      <Link
        href={`/gobernanza/convocatorias/${id}/asamblea`}
        className="flex items-center gap-2 h-9 px-5 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors active-scale"
      >
        <Play className="h-3 w-3 fill-current" />
        Iniciar asamblea
      </Link>
    </div>
  );
}
