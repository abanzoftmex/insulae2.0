"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBudgetGroupAction } from "../../presupuestos/actions";

interface Concept {
  id?: string;
  name: string;
  order: number;
  type: string;
  isActive?: boolean;
}

interface BudgetGroup {
  id?: string;
  name: string;
  year: number;
  condominiumId: string;
  parentId?: string;
  category: string;
  concepts: Concept[];
}

interface EditFormProps {
  initialData: BudgetGroup;
  allGroups: { id: string; name: string }[];
  chargeGroups: { id: string; name: string }[];
}

export function EditBudgetGroupForm({ initialData, allGroups, chargeGroups }: EditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<BudgetGroup>(initialData);
  const [loading, setLoading] = useState(false);

  const handleAddConcept = () => {
    setFormData({
      ...formData,
      concepts: [
        ...formData.concepts,
        { name: "", order: formData.concepts.length + 1, type: "N/A" }
      ]
    });
  };

  const handleRemoveConcept = (index: number) => {
    const newConcepts = [...formData.concepts];
    if (newConcepts[index].id) {
      newConcepts[index].isActive = false;
    } else {
      newConcepts.splice(index, 1);
    }
    setFormData({ ...formData, concepts: newConcepts });
  };

  const handleConceptChange = (index: number, field: keyof Concept, value: any) => {
    const newConcepts = [...formData.concepts];
    newConcepts[index] = { ...newConcepts[index], [field]: value };
    setFormData({ ...formData, concepts: newConcepts });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await saveBudgetGroupAction(formData);
      if (res.success) {
        router.push("/listado-estructura-presupuesto?anio=" + formData.year);
        router.refresh();
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
        <h1 className="font-[ui-serif] text-3xl text-[#2f221a]">
          Grupo de la estructura del presupuesto <span className="text-[#9a6a4a] text-xl ml-2">(Año: {formData.year})</span>
        </h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[#9a6a4a] hover:text-[#2f221a] flex items-center gap-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Volver
        </button>
      </div>

      {/* Información General */}
      <section className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm overflow-hidden">
        <div className="bg-[#f8efe3]/50 px-8 py-4 border-b border-[#ccb49c]/30">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#6d422a]">Información general</h2>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold block ml-1">Nombre</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del grupo"
              className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/50 transition-all text-[#2f221a]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold block ml-1">Grupo padre</label>
            <select
              value={formData.parentId || ""}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value || undefined })}
              className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/50 transition-all text-[#2f221a]"
            >
              <option value="">N/A</option>
              {allGroups.filter(g => g.id !== formData.id).map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold block ml-1">Grupo de cobro</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-[#fcf9f5] border border-[#ccb49c]/40 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#d2a35a]/50 transition-all text-[#2f221a]"
            >
              <option value="ADMINISTRATION">Gastos administración</option>
              <option value="MAINTENANCE">Gastos de mantenimiento</option>
              <option value="SECURITY">Gastos de seguridad</option>
              <option value="INFRASTRUCTURE">Gastos de infraestructura</option>
              <option value="OTHER">Otros</option>
            </select>
          </div>
        </div>
      </section>

      {/* Conceptos */}
      <section className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm overflow-hidden">
        <div className="bg-[#f8efe3]/50 px-8 py-4 border-b border-[#ccb49c]/30 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#6d422a]">Conceptos</h2>
          <button
            type="button"
            onClick={handleAddConcept}
            className="flex items-center gap-2 text-xs font-bold text-[#5a7b56] hover:text-[#4a6b46] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Agregar un concepto
          </button>
        </div>
        
        <div className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#ccb49c]/20">
                <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold">Nombre</th>
                <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold w-32">Orden</th>
                <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold w-64">Tipo</th>
                <th className="px-8 py-4 text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold w-32 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ccb49c]/10">
              {formData.concepts.filter(c => c.isActive !== false).map((concept, index) => (
                <tr key={index} className="hover:bg-[#fcf9f5]/50 transition-colors">
                  <td className="px-8 py-4">
                    <input
                      type="text"
                      required
                      value={concept.name}
                      onChange={(e) => handleConceptChange(index, "name", e.target.value)}
                      placeholder="Nombre del concepto"
                      className="w-full bg-transparent border-none focus:ring-0 text-[#2f221a] p-0"
                    />
                  </td>
                  <td className="px-8 py-4">
                    <input
                      type="number"
                      value={concept.order}
                      onChange={(e) => handleConceptChange(index, "order", parseInt(e.target.value))}
                      className="w-full bg-transparent border-none focus:ring-0 text-[#2f221a] p-0"
                    />
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      {["N/A", "Variable", "Fijo"].map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`type-${index}`}
                            checked={concept.type === type}
                            onChange={() => handleConceptChange(index, "type", type)}
                            className="text-[#d2a35a] focus:ring-[#d2a35a] border-[#ccb49c]/40 bg-[#fcf9f5]"
                          />
                          <span className="text-xs text-[#6d422a]">{type}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveConcept(index)}
                        className="text-[#ccb49c] hover:text-red-500 transition-colors p-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {formData.concepts.filter(c => c.isActive !== false).length === 0 && (
             <div className="p-12 text-center text-[#ccb49c] italic text-sm">
                No hay conceptos. Haz clic en "Agregar un concepto" para comenzar.
             </div>
          )}
        </div>
      </section>

      <div className="flex justify-center pt-8">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#2f221a] text-white px-12 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#4a3a2e] transition-all shadow-xl shadow-[#2f221a]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Guardando..." : "Guardar información"}
        </button>
      </div>
    </form>
  );
}
