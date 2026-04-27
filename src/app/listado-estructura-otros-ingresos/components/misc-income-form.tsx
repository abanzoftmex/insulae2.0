"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMiscIncomeCatalogAction, deleteMiscIncomeConceptAction } from "../actions";
import { MiscIncomeConcept } from "@/modules/misc-income";

interface MiscIncomeFormProps {
  initialConcepts: MiscIncomeConcept[];
  ordinaryGroupId: string;
  extraordinaryGroupId: string;
}

export function MiscIncomeForm({ initialConcepts, ordinaryGroupId, extraordinaryGroupId }: MiscIncomeFormProps) {
  const router = useRouter();
  const [concepts, setConcepts] = useState<MiscIncomeConcept[]>(initialConcepts);
  const [loading, setLoading] = useState(false);

  const handleAddConcept = () => {
    setConcepts([
      ...concepts,
      {
        id: "",
        name: "",
        chargeGroupId: ordinaryGroupId,
        isActive: true,
        order: concepts.length,
      }
    ]);
  };

  const handleRemoveConcept = async (index: number) => {
    const concept = concepts[index];
    if (concept.id) {
      if (!confirm("¿Estás seguro de eliminar este concepto?")) return;
      const res = await deleteMiscIncomeConceptAction(concept.id);
      if (!res.success) {
        alert("Error: " + res.error);
        return;
      }
    }
    
    const newConcepts = [...concepts];
    newConcepts.splice(index, 1);
    setConcepts(newConcepts);
  };

  const handleChange = (index: number, field: keyof MiscIncomeConcept, value: any) => {
    const newConcepts = [...concepts];
    newConcepts[index] = { ...newConcepts[index], [field]: value };
    setConcepts(newConcepts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await saveMiscIncomeCatalogAction(concepts);
      if (res.success) {
        router.refresh();
        alert("Cambios guardados con éxito");
      } else {
        alert("Error: " + res.error);
      }
    } catch (err) {
      alert("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[ui-serif] text-3xl text-[#2f221a]">
            Estructura otros ingresos
          </h1>
          <p className="text-[#9a6a4a] text-sm mt-1 uppercase tracking-widest font-medium">Conceptos ordinarios - extraordinarios</p>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#f8efe3]/50 border-b border-[#ccb49c]/30">
              <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold w-64">Tipo</th>
              <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Nombre</th>
              <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold w-32 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ccb49c]/10">
            {concepts.map((concept, index) => (
              <tr key={index} className="hover:bg-[#fcf9f5]/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name={`type-${index}`}
                        checked={concept.chargeGroupId === ordinaryGroupId}
                        onChange={() => handleChange(index, "chargeGroupId", ordinaryGroupId)}
                        className="text-[#d2a35a] focus:ring-[#d2a35a] border-[#ccb49c]/40 bg-[#fcf9f5]"
                      />
                      <span className="text-xs text-[#6d422a] font-medium group-hover:text-[#2f221a] transition-colors">Ordinaria</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name={`type-${index}`}
                        checked={concept.chargeGroupId === extraordinaryGroupId}
                        onChange={() => handleChange(index, "chargeGroupId", extraordinaryGroupId)}
                        className="text-[#d2a35a] focus:ring-[#d2a35a] border-[#ccb49c]/40 bg-[#fcf9f5]"
                      />
                      <span className="text-xs text-[#6d422a] font-medium group-hover:text-[#2f221a] transition-colors">Extraordinaria</span>
                    </label>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <input
                    type="text"
                    required
                    value={concept.name}
                    onChange={(e) => handleChange(index, "name", e.target.value)}
                    placeholder="Nombre del concepto"
                    className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/30 transition-all text-[#2f221a] text-sm"
                  />
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveConcept(index)}
                      className="bg-white border border-[#ccb49c]/40 text-[#ccb49c] hover:text-red-500 hover:border-red-200 p-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-red-100 active:scale-95"
                      title="Eliminar concepto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {concepts.length === 0 && (
          <div className="p-16 text-center">
            <div className="bg-[#f8efe3]/30 inline-flex p-6 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccb49c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <p className="text-[#9a6a4a] italic text-sm">No hay conceptos registrados. Haz clic en "Agregar concepto" para comenzar.</p>
          </div>
        )}
      </section>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleAddConcept}
          className="bg-[#5a7b56] text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-[#4a6b46] transition-all shadow-lg shadow-green-900/10 active:scale-95 flex items-center gap-2 uppercase tracking-wider"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Agregar nuevo concepto
        </button>
      </div>

      <div className="flex justify-center pt-8">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#2f221a] text-white px-12 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#4a3a2e] transition-all shadow-xl shadow-[#2f221a]/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[280px]"
        >
          {loading ? "Guardando..." : "Guardar información"}
        </button>
      </div>
    </form>
  );
}
