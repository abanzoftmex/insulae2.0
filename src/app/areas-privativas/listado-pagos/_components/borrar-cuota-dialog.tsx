"use client";

import React, { useState, useTransition } from "react";
import { AlertCircle, X, Trash2, ChevronRight } from "lucide-react";
import { deletePrivateAreaChargeAction } from "../../actions";
import { Button } from "@/components/ui/button";

interface BorrarCuotaDialogProps {
  chargeId: string;
}

export function BorrarCuotaDialog({ chargeId }: BorrarCuotaDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deletePrivateAreaChargeAction(chargeId);
      setIsOpen(false);
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#dda835] text-white p-1.5 rounded-md hover:bg-[#bd8f2d] transition-colors shadow-sm"
        title="Eliminar cuota"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-md transition-opacity"
            onClick={() => !isPending && setIsOpen(false)}
          />

          <div className="relative w-full max-w-sm overflow-hidden rounded-[1.6rem] border border-[#c8b59d] bg-[#faf6f0] p-6 shadow-[0_24px_50px_rgba(30,18,8,0.30)] animate-in zoom-in-95 duration-200">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-full border border-[#ddd0be] bg-white/80 p-1.5 text-[#5a4838] hover:bg-[#e8ddd0] transition-colors disabled:opacity-30"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 pb-3 border-b border-[#ddd0be] flex items-center gap-2">
              <Trash2 className="text-[#dda835] h-5 w-5" />
              <h2 className="text-xl font-bold uppercase tracking-tight text-[#3a2a18]">
                Borrar Cuota
              </h2>
            </div>

            <p className="text-[13px] text-[#3a2a18] mb-6">
              ¿Estás seguro de que deseas eliminar permanentemente este cargo? Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ddd0be]">
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
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleConfirm}
                className="h-9 px-5 text-[10px] font-bold uppercase rounded-full gap-1.5 shadow-md shadow-brand-deep/15 bg-red-600 hover:bg-red-700 text-white"
              >
                {isPending ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Borrando...
                  </>
                ) : (
                  <>
                    Eliminar
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
