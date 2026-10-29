"use client";

import { useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { generateTemporaryPasswordAction } from "./formulario/[reference]/actions";

interface ProvisionalPasswordButtonProps {
  userId: string;
  userEmail: string | null;
  userName: string;
}

export function ProvisionalPasswordButton({ userId, userEmail, userName }: ProvisionalPasswordButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleGenerate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const emailToUse = userEmail && userEmail.trim() !== "" ? userEmail : null;
    if (!emailToUse) {
      alert(`El usuario ${userName} no tiene un correo electrónico configurado.`);
      return;
    }

    const confirmAction = confirm(
      `¿Estás seguro de que deseas generar una contraseña provisional para ${userName} y enviársela a ${emailToUse}?`
    );
    if (!confirmAction) return;

    startTransition(async () => {
      try {
        const result = await generateTemporaryPasswordAction(userId);
        alert(result.message);
      } catch (error) {
        console.error("Error generating temp password", error);
        alert("Ocurrió un error al generar la contraseña provisional.");
      }
    });
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isPending}
      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-brand/10 border border-brand/30 text-brand hover:bg-brand hover:text-white transition-all shadow-sm hover:shadow disabled:opacity-50 shrink-0"
      title="Generar y enviar contraseña provisional"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <KeyRound className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
