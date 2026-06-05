"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, GripVertical, Info, ArrowLeft } from "lucide-react";
import { saveBudgetGroupAction, deleteBudgetConceptAction } from "@/app/presupuestos/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface ConceptFormState {
  id: string;
  name: string;
  order: number;
  type: string;
}

interface BudgetGroupFormProps {
  initialData: any | null;
  year: number;
  existingGroups: any[];
}

export function BudgetGroupForm({ initialData, year, existingGroups }: BudgetGroupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formName, setFormName] = useState(initialData?.name || "");
  const [formCategory, setFormCategory] = useState(initialData?.category || "Gastos de mantenimiento");
  
  const [formConcepts, setFormConcepts] = useState<ConceptFormState[]>(
    initialData?.concepts?.map((c: any) => ({
      id: c.id,
      name: c.name,
      order: c.order ?? 0,
      type: c.type ?? "N/A"
    })) || []
  );

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const availableCategories = useMemo(() => {
    const defaultCats = ["Gastos administración", "Gastos de mantenimiento", "Gastos de seguridad", "Gastos de infraestructura", "Gastos extraordinarios", "Otros gastos"];
    const existingCats = existingGroups.map(g => g.category).filter(c => !!c);
    const all = new Set([...defaultCats, ...existingCats]);
    return Array.from(all).sort();
  }, [existingGroups]);

  const handleAddConcept = () => {
    const newOrder = formConcepts.length > 0 ? Math.max(...formConcepts.map(c => c.order)) + 1 : 1;
    setFormConcepts([...formConcepts, { id: "", name: "", order: newOrder, type: "N/A" }]);
  };

  const handleRemoveConcept = (index: number) => {
    const concept = formConcepts[index];
    if (concept.id) {
       if(!confirm("¿Eliminar concepto permanentemente?")) return;
       startTransition(async () => {
         const res = await deleteBudgetConceptAction(concept.id);
         if(res.success) setFormConcepts(prev => prev.filter((_, i) => i !== index));
         else alert(res.error);
       });
    } else {
      setFormConcepts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleConceptChange = (index: number, field: keyof ConceptFormState, value: any) => {
    const next = [...formConcepts];
    next[index] = { ...next[index], [field]: value };
    setFormConcepts(next);
  };

  const handleSave = () => {
    startTransition(async () => {
      const finalCategory = isCreatingCategory && newCategoryName.trim() ? newCategoryName.trim() : formCategory;
      const res = await saveBudgetGroupAction({
        id: initialData?.id || undefined,
        year,
        name: formName,
        category: finalCategory,
        concepts: formConcepts.map(c => ({ 
          id: c.id || undefined, 
          name: c.name,
          order: Number(c.order),
          type: c.type
        }))
      });

      if (res.success) {
        router.push("/listado-estructura-presupuesto");
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="border-transparent shadow-layered">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={() => router.push("/listado-estructura-presupuesto")} className="h-8 px-4 text-[10px] font-bold uppercase gap-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button 
              disabled={isPending || !formName} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-bold uppercase bg-brand text-white hover:bg-brand/90"
            >
              {isPending ? "Guardando..." : "Guardar Estructura"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-line">
            <Input label="Nombre del Grupo" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej. Gastos de Limpieza" />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Categoría Contable</label>
                <button 
                  onClick={() => setIsCreatingCategory(!isCreatingCategory)} 
                  className="text-[9px] font-bold text-brand-accent uppercase hover:underline"
                >
                  {isCreatingCategory ? "Seleccionar Existente" : "+ Nueva Categoría"}
                </button>
              </div>
              {isCreatingCategory ? (
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Escribe la nueva categoría..."
                  className="h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none"
                />
              ) : (
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <p className="text-[12px] font-bold uppercase tracking-widest text-brand">Conceptos / Partidas</p>
              <button onClick={handleAddConcept} className="text-[10px] font-bold text-brand-accent flex items-center gap-1 uppercase hover:underline">
                <Plus className="h-3.5 w-3.5" /> Agregar Partida
              </button>
            </div>

            {/* Encabezados de la tabla para Desktop */}
            {formConcepts.length > 0 && (
              <div className="hidden md:flex items-center gap-4 px-2 py-1 bg-canvas/30 rounded border border-line text-[10px] font-bold uppercase tracking-widest text-ink-soft/50">
                <div className="w-8"></div>
                <div className="flex-1">Nombre</div>
                <div className="w-24 text-center">Orden</div>
                <div className="w-64">Tipo</div>
                <div className="w-9"></div>
              </div>
            )}

            <div className="space-y-3">
              {formConcepts.map((concept, idx) => (
                <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3 md:p-0 border border-line md:border-none rounded-lg bg-card md:bg-transparent">
                  <div className="hidden md:flex h-9 w-8 items-center justify-center bg-canvas/30 rounded border border-dashed border-line text-ink-soft/20">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  
                  <div className="w-full md:flex-1">
                    <label className="md:hidden text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 mb-1 block">Nombre</label>
                    <input 
                      type="text" 
                      value={concept.name}
                      onChange={(e) => handleConceptChange(idx, "name", e.target.value)}
                      placeholder="Nombre del concepto..."
                      className="h-9 w-full bg-card border border-line rounded px-3 text-[13px] font-medium focus:border-brand-accent outline-none transition-colors"
                    />
                  </div>

                  <div className="w-full md:w-24">
                    <label className="md:hidden text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 mb-1 block">Orden</label>
                    <input 
                      type="number" 
                      value={concept.order}
                      onChange={(e) => handleConceptChange(idx, "order", parseInt(e.target.value) || 0)}
                      className="h-9 w-full bg-card border border-line rounded px-3 text-[13px] font-medium text-center focus:border-brand-accent outline-none transition-colors"
                    />
                  </div>

                  <div className="w-full md:w-64">
                    <label className="md:hidden text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 mb-1 block">Tipo</label>
                    <div className="flex items-center gap-4 h-9 px-3 rounded border border-line bg-canvas/20">
                      {["N/A", "Variable", "Fijo"].map(t => (
                        <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${concept.type === t ? 'border-brand-accent bg-brand-accent' : 'border-ink-soft/30 bg-card'}`}>
                            {concept.type === t && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-[12px] font-medium text-ink-soft select-none">{t}</span>
                          <input 
                            type="radio" 
                            name={`type-${idx}`} 
                            value={t} 
                            checked={concept.type === t}
                            onChange={(e) => handleConceptChange(idx, "type", e.target.value)}
                            className="hidden" 
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="w-full md:w-9 flex justify-end md:justify-center mt-2 md:mt-0">
                    <button onClick={() => handleRemoveConcept(idx)} className="h-9 px-3 md:px-0 md:w-9 flex items-center justify-center rounded bg-danger/10 text-danger hover:bg-danger hover:text-white transition-colors text-[10px] font-bold uppercase md:normal-case">
                      <span className="md:hidden mr-2">Eliminar</span>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {formConcepts.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center bg-canvas/20 rounded-lg border border-dashed border-line/50">
                  <Plus className="h-8 w-8 text-ink-soft/20 mb-2" />
                  <p className="text-[11px] font-bold text-ink-soft/40 uppercase tracking-widest">Sin partidas asignadas</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-brand-mint/10 rounded-lg border border-brand-mint/20 flex gap-3 items-start mt-8">
            <Info className="h-5 w-5 text-brand shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-brand/80 leading-relaxed uppercase tracking-widest">
              Los cambios en los nombres de los conceptos se reflejarán en todos los meses del presupuesto {year}. 
              Eliminar conceptos con datos previos puede afectar el histórico.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
