"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StructureManagerModal } from "./structure-manager-modal";

export function StructureManagerButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full border-brand/20 text-brand hover:bg-brand hover:text-white transition-colors"
      >
        <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden /> Configurar Grupos
      </Button>

      <StructureManagerModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
