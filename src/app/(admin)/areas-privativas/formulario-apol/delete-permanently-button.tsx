"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function DeletePermanentlyButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm("¿ESTÁS SEGURO? Esta acción es IRREVERSIBLE. Se eliminará permanentemente esta área, junto con su historial de asignaciones, contratos y cobros.")) {
          e.preventDefault();
        }
      }}
      className="w-full font-bold uppercase tracking-widest text-[10px] border-danger text-danger hover:bg-danger hover:text-white transition-colors"
    >
      {pending ? "Eliminando..." : "Eliminar permanentemente"}
    </Button>
  );
}
