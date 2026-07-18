"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveRejectedSyncEventsAction } from "../actions";

export function ArchiveRejectedButton({ condominiumId, count }: { condominiumId: string; count: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (count === 0) return null;

  const handleClick = () => {
    setError("");
    startTransition(async () => {
      try {
        await archiveRejectedSyncEventsAction(condominiumId);
        router.refresh();
      } catch {
        setError("No se pudo archivar. Intenta de nuevo.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="gap-1.5"
      >
        <Archive className="h-3.5 w-3.5" aria-hidden />
        {isPending ? "Archivando…" : "Limpiar"}
      </Button>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
