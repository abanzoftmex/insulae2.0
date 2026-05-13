"use client";

import Link from "next/link";
import { Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveNotificationCategoryAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageBackBadge } from "@/components/ui/page-back-badge";

interface CategoriaNotificacionFormShellProps {
  mode: "create" | "edit";
  categoryId?: string;
  initialData: {
    name: string;
    color: string;
  };
}

const COLOR_PRESETS = [
  "#0C7C86",
  "#2D6A4F",
  "#5F0F40",
  "#8F2D56",
  "#2B2D42",
  "#A44A3F",
  "#D17A22",
  "#6D5C53",
];

function normalizeHex(value: string): string {
  const raw = value.trim();
  if (!raw) {
    return "#6D5C53";
  }

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toUpperCase() : "#6D5C53";
}

export function CategoriaNotificacionFormShell({
  mode,
  categoryId,
  initialData,
}: CategoriaNotificacionFormShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const [name, setName] = useState(initialData.name);
  const [color, setColor] = useState(normalizeHex(initialData.color));

  const title = mode === "create" ? "Nueva categoria de notificacion" : "Editar categoria de notificacion";

  const save = () => {
    setMessage("");

    startTransition(async () => {
      const result = await saveNotificationCategoryAction({
        id: categoryId,
        name,
        color: normalizeHex(color),
      });

      setMessage(result.message);
      if (!result.ok) {
        return;
      }

      router.push("/categorias-notificacion");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">{title}</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Catálogo Operativo</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Define una categoría para clasificar notificaciones del condominio.
            </p>
          </div>
        </div>
      </div>

      {/* ── Form card ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2">
          <Tag className="h-4 w-4 text-white/80" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">Datos de la categoría</span>
        </div>

        <div className="p-5 sm:p-6 grid gap-5 md:grid-cols-2">

          {/* Nombre */}
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Seguridad"
          />

          {/* Color HEX */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Color HEX</label>
            <div className="flex items-center gap-2">
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#6D5C53"
                className="flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent"
              />
              <span
                className="h-9 w-12 shrink-0 rounded-md border border-black/10"
                style={{ backgroundColor: normalizeHex(color) }}
                aria-label="Vista previa de color"
              />
            </div>
          </div>

          {/* Paleta sugerida — full width */}
          <div className="md:col-span-2 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70">Paleta sugerida</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className="h-8 w-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  style={{ backgroundColor: preset }}
                  title={`Usar ${preset}`}
                  aria-label={`Usar color ${preset}`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-wrap items-center gap-3 border-t border-line/30 pt-4">
          <Button
            type="button"
            onClick={save}
            disabled={isPending}
            className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25"
          >
            {isPending ? "Guardando..." : "Guardar categoría"}
          </Button>
          <Button variant="subtle" asChild size="sm" className="h-8 rounded-full">
            <Link href="/categorias-notificacion">Cancelar</Link>
          </Button>
          {message ? (
            <p className={`text-xs font-bold uppercase tracking-wide ${message.toLowerCase().includes("correct") ? "text-brand" : "text-danger"}`}>
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
