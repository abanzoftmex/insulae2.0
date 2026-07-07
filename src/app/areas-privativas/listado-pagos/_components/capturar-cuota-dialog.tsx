"use client";

import React, { useState, useTransition } from "react";
import { Plus, X, Calendar, DollarSign, FileText, ChevronRight } from "lucide-react";
import { createPrivateAreaChargeAction } from "../../actions";
import { Button } from "@/components/ui/button";

interface ChargeGroupOption {
  id: string;
  name: string;
}

interface CapturarCuotaDialogProps {
  privateAreaId: string;
  opc: string; // "2" for Commerce, "1" for Owner
  chargeGroups: ChargeGroupOption[];
}

export function CapturarCuotaDialog({
  privateAreaId,
  opc,
  chargeGroups,
}: CapturarCuotaDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Set default dates (today) in local YYYY-MM-DD format
  const todayStr = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("privateAreaId", privateAreaId);
    // responsibility context based on opc: 1=COMMERCE, 2=OWNER (matches legacy)
    formData.append("responsibility", opc === "2" ? "OWNER" : "COMMERCE");

    const amount = Number(formData.get("amount"));
    if (!formData.get("chargeGroupId")) {
      setError("Por favor seleccione un tipo de cuota.");
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Por favor ingrese un monto válido mayor a 0.");
      return;
    }

    startTransition(async () => {
      try {
        await createPrivateAreaChargeAction(formData);
        setIsOpen(false);
      } catch (err: any) {
        setError(err.message || "Ha ocurrido un error al guardar la cuota.");
      }
    });
  };

  return (
    <>
      <Button
        variant="dark"
        size="sm"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="h-8 gap-1.5 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/15"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Capturar cuota
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Glassmorphic Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-md transition-opacity"
            onClick={() => !isPending && setIsOpen(false)}
          />

          {/* Dialog Body */}
          <div className="relative w-full max-w-lg overflow-hidden rounded-[1.6rem] border border-[#c8b59d] bg-[#faf6f0] p-6 shadow-[0_24px_50px_rgba(30,18,8,0.30)] animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-full border border-[#ddd0be] bg-white/80 p-1.5 text-[#5a4838] hover:bg-[#e8ddd0] hover:text-brand transition-colors disabled:opacity-30"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="mb-5 pb-3 border-b border-[#ddd0be]">
              <h2 className="text-xl font-bold uppercase tracking-tight text-[#3a2a18]">
                {opc === "2" ? "Capturar Cuota · Comercio" : "Capturar Cuota · Propietario"}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7a5e44]/80 mt-1">
                Registrar un nuevo cargo individual en la cuenta corriente del lote
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              {/* Selector Tipo de Cuota */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#5a4838] leading-none">
                  Tipo de cuota (Grupo)
                </label>
                <select
                  name="chargeGroupId"
                  required
                  disabled={isPending}
                  className="h-9 w-full rounded-lg border border-[#c8b8a0] bg-white px-3 text-xs font-semibold text-[#2b1e12] outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-50 appearance-none"
                >
                  <option value="">Seleccione el tipo de cuota...</option>
                  {chargeGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid Fechas y Monto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Fecha Cuota */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#5a4838] leading-none flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-brand/70" />
                    Fecha cuota
                  </label>
                  <input
                    type="date"
                    name="chargeDate"
                    required
                    disabled={isPending}
                    defaultValue={todayStr}
                    className="h-9 w-full rounded-lg border border-[#c8b8a0] bg-white px-3 text-xs font-semibold text-[#2b1e12] outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-50"
                  />
                </div>

                {/* Fecha Vigencia */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#5a4838] leading-none flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-brand/70" />
                    Fecha límite
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    required
                    disabled={isPending}
                    defaultValue={todayStr}
                    className="h-9 w-full rounded-lg border border-[#c8b8a0] bg-white px-3 text-xs font-semibold text-[#2b1e12] outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-50"
                  />
                </div>

                {/* Monto */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#5a4838] leading-none flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-brand/70" />
                    Monto
                  </label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    required
                    disabled={isPending}
                    className="h-9 w-full rounded-lg border border-[#c8b8a0] bg-white px-3 text-xs font-semibold text-[#2b1e12] outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Concepto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#5a4838] leading-none flex items-center gap-1">
                  <FileText className="h-3 w-3 text-brand/70" />
                  Concepto
                </label>
                <input
                  type="text"
                  name="concept"
                  placeholder="Ej. Cuota extraordinaria extraordinaria mantenimiento..."
                  required
                  disabled={isPending}
                  className="h-9 w-full rounded-lg border border-[#c8b8a0] bg-white px-3 text-xs font-semibold text-[#2b1e12] outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-50"
                />
              </div>

              {/* Comentarios */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#5a4838] leading-none">
                  Comentarios generales
                </label>
                <textarea
                  name="comentarios"
                  placeholder="Notas internas u observaciones sobre el cargo..."
                  rows={2}
                  disabled={isPending}
                  className="w-full rounded-lg border border-[#c8b8a0] bg-white p-3 text-xs font-semibold text-[#2b1e12] outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-50 resize-none"
                />
              </div>

              {/* Footer Acciones */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ddd0be] mt-6">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => setIsOpen(false)}
                  className="h-9 px-4 text-[10px] font-bold uppercase rounded-full border-[#ddd0be] bg-white text-[#5a4838] hover:bg-[#e8ddd0]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="dark"
                  disabled={isPending}
                  className="h-9 px-5 text-[10px] font-bold uppercase rounded-full gap-1.5 shadow-md shadow-brand-deep/15"
                >
                  {isPending ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Guardar información
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
