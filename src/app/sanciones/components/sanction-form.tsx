"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createSanctionAction, updateSanctionAction } from "../actions";
import { Sanction } from "@/modules/sanction/domain/sanction.types";

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
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/sanciones"
          className="p-2 hover:bg-[#e8dbcc] text-[#6d422a] rounded-xl transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#2f221a]">
            {isEditing ? "Editar Sanción" : "Nueva Sanción"}
          </h1>
          <p className="text-[#6d422a] mt-1 text-sm">
            {isEditing ? "Modifica los detalles de la sanción." : "Completa la información para registrar una nueva sanción."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#ccb49c]/30 overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-[#2f221a] border-b border-[#ccb49c]/20 pb-3">
            Información General
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-semibold text-[#6d422a]">Nombre de la sanción <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Multa por ruido excesivo"
                className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 text-[#2f221a] outline-none focus:border-[#5a7b56] transition-colors"
              />
            </div>
            
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-semibold text-[#6d422a]">Fundamento en Artículo</label>
              <input
                type="text"
                value={formData.article}
                onChange={(e) => setFormData(p => ({ ...p, article: e.target.value }))}
                placeholder="Ej. Artículo 42, inciso B"
                className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 text-[#2f221a] outline-none focus:border-[#5a7b56] transition-colors"
              />
              <p className="text-xs text-[#958172]">El artículo del reglamento en el que se basa esta sanción.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <p className="text-sm font-medium">Información guardada con éxito. Redirigiendo...</p>
            </div>
          )}
        </div>

        <div className="bg-[#fcf9f5] px-6 py-4 border-t border-[#ccb49c]/20 flex justify-end gap-3">
          <Link
            href="/sanciones"
            className="px-5 py-2.5 rounded-xl font-medium text-[#6d422a] hover:bg-[#e8dbcc] transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || success}
            className="inline-flex items-center gap-2 bg-[#5a7b56] hover:bg-[#4a6b46] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            )}
            Guardar información
          </button>
        </div>
      </form>
    </div>
  );
}
