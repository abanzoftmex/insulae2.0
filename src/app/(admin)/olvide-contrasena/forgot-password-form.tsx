"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/password-reset";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const email = String(new FormData(e.currentTarget).get("email") || "");
    startTransition(async () => {
      try {
        const result = await requestPasswordResetAction(email, window.location.origin);
        setMessage({ kind: result.success ? "ok" : "error", text: result.message });
      } catch {
        setMessage({ kind: "error", text: "Error de conexión. Inténtalo de nuevo." });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`rounded-xl px-3.5 py-3 text-[12px] font-semibold border ${
            message.kind === "ok"
              ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-200"
              : "border-red-500/20 bg-red-950/20 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-white/50 text-[10px] font-extrabold uppercase tracking-widest ml-0.5">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          disabled={isPending}
          autoComplete="email"
          placeholder="correo@ejemplo.com"
          className="w-full bg-white/[0.04] border border-white/10 focus:border-[#b58c42]/50 focus:ring-4 focus:ring-[#b58c42]/5 focus:outline-none transition-standard text-white placeholder-white/20 text-[14px] font-semibold h-11 px-4 rounded-xl disabled:opacity-60"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full mt-2 bg-[#b58c42] hover:bg-[#a07c39] text-[#0e0e0a] font-black text-xs tracking-widest h-11 rounded-full transition-standard shadow-lg shadow-[#b58c42]/10 disabled:opacity-70 disabled:pointer-events-none"
      >
        {isPending ? "ENVIANDO..." : "ENVIAR ENLACE"}
      </button>

      <div className="text-center pt-2">
        <Link href="/login" className="text-[11px] font-semibold text-white/50 hover:text-[#b58c42] transition-standard">
          Volver al inicio de sesión
        </Link>
      </div>
    </form>
  );
}
