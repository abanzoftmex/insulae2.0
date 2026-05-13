"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSanctionAction, updateSanctionAction } from "../actions";
import { Sanction } from "@/modules/sanction/domain/sanction.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Save } from "lucide-react";

interface Props {
  initialData?: Sanction | null;
}

export function SanctionForm({ initialData }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    article: initialData?.article || "",
  });

  const isEditing = !!initialData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    let result;
    if (isEditing) {
      result = await updateSanctionAction({
        id: initialData!.id,
        name: formData.name,
        article: formData.article,
      });
    } else {
      result = await createSanctionAction({
        name: formData.name,
        article: formData.article,
      });
    }

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/sanciones");
        router.refresh();
      }, 1500);
    } else {
      setError(result.error || "Ocurrió un error al guardar");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">
              {isEditing ? "Editar Sanción" : "Nueva Sanción"}
            </h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
              Catálogo Reglamentario
            </Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {isEditing ? "Modifica los datos de la sanción registrada" : "Registra una nueva sanción en el catálogo"}
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white">Información General</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input
            label="Nombre / Descripción de la Infracción *"
            value={formData.name}
            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            placeholder="Ej. Multa por ruido excesivo"
            required
          />

          <div className="space-y-1">
            <Input
              label="Fundamento en Artículo"
              value={formData.article}
              onChange={(e) => setFormData(p => ({ ...p, article: e.target.value }))}
              placeholder="Ej. Artículo 42, inciso B"
            />
            <p className="text-[10px] text-ink-soft/50 italic">El artículo del reglamento en el que se basa esta sanción.</p>
          </div>

          {error && (
            <div className="p-3 bg-danger/5 border border-danger/20 text-danger rounded-md text-[11px] font-bold">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-success/5 border border-success/20 text-success rounded-md text-[11px] font-bold">
              Información guardada con éxito. Redirigiendo...
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-line">
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.push("/sanciones")}
              className="h-8 text-[10px] font-bold uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || success}
              className="h-8 px-6 text-[10px] font-bold uppercase tracking-widest gap-2"
            >
              <Save className="h-3.5 w-3.5" />
              {loading ? "Guardando..." : "Guardar Sanción"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
