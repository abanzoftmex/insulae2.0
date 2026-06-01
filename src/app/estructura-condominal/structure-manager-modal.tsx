"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, Save, Loader2, GripVertical } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/utils/cn";
import { saveCondominiumStructureAction } from "./actions";

interface StructureManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StructureManagerModal({ isOpen, onClose }: StructureManagerModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [groupName, setGroupName] = useState("");
  const [concepts, setConcepts] = useState<Array<{ id: string; name: string; quantity: number; isAlternate: boolean }>>([
    { id: crypto.randomUUID(), name: "", quantity: 1, isAlternate: false }
  ]);

  if (!isOpen) return null;

  const addConcept = () => {
    setConcepts((prev) => [...prev, { id: crypto.randomUUID(), name: "", quantity: 1, isAlternate: false }]);
  };

  const updateConcept = (id: string, field: string, value: any) => {
    setConcepts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeConcept = (id: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = async () => {
    setError("");
    const validConcepts = concepts.filter(c => c.name.trim().length > 0);

    if (groupName.trim().length < 2) {
      setError("El nombre del grupo debe tener al menos 2 caracteres.");
      return;
    }

    if (validConcepts.length === 0) {
      setError("Debes agregar al menos un cargo válido.");
      return;
    }

    startTransition(async () => {
      const payload = {
        name: groupName,
        concepts: validConcepts.map((c) => ({
          name: c.name,
          quantity: c.quantity,
          isAlternate: c.isAlternate,
        })),
      };

      const result = await saveCondominiumStructureAction(payload);
      if (result.ok) {
        setGroupName("");
        setConcepts([{ id: crypto.randomUUID(), name: "", quantity: 1, isAlternate: false }]);
        onClose();
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-deep/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-card rounded-card overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-canvas">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand">Crear Grupo Directivo</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-danger transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Nombre del Grupo</label>
            <Input 
              placeholder="Ej. Consejo de Administración" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="font-medium"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Cargos del Grupo</label>
              <Button type="button" variant="outline" size="sm" onClick={addConcept} className="h-7 text-[10px] gap-1">
                <Plus className="h-3 w-3" /> Agregar Cargo
              </Button>
            </div>

            <div className="space-y-2">
              {concepts.map((concept, index) => (
                <div key={concept.id} className="flex items-start gap-2 p-3 bg-canvas/30 border border-line rounded-lg">
                  <div className="pt-2 text-ink-soft/30 cursor-grab">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <Input 
                      placeholder="Nombre del cargo (Ej. Presidente)" 
                      value={concept.name}
                      onChange={(e) => updateConcept(concept.id, "name", e.target.value)}
                      className="h-8 text-xs font-medium"
                    />
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-medium text-ink-soft">Max. Asignaciones</label>
                        <Input 
                          type="number" 
                          min={1} 
                          value={concept.quantity}
                          onChange={(e) => updateConcept(concept.id, "quantity", parseInt(e.target.value) || 1)}
                          className="h-7 w-16 text-xs text-center p-0"
                        />
                      </div>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={concept.isAlternate}
                          onChange={(e) => updateConcept(concept.id, "isAlternate", e.target.checked)}
                          className="rounded border-line text-brand focus:ring-brand/20 cursor-pointer"
                        />
                        <span className="text-[10px] font-medium text-ink-soft">Admite Suplentes</span>
                      </label>
                    </div>
                  </div>

                  <button 
                    onClick={() => removeConcept(concept.id)}
                    className="p-1.5 text-ink-soft/40 hover:text-danger hover:bg-danger/10 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {concepts.length === 0 && (
                <div className="py-8 text-center border border-dashed border-line rounded-lg">
                  <p className="text-[11px] font-medium text-ink-soft/50 uppercase tracking-widest">No hay cargos configurados</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-[11px] font-bold text-center">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-line bg-canvas/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="h-9 px-6 text-[11px] font-bold uppercase">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending}
            className="h-9 px-6 text-[11px] font-bold uppercase gap-2"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar Grupo
          </Button>
        </div>
      </div>
    </div>
  );
}
