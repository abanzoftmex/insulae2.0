"use client";

/**
 * Olvidé mi contraseña: el correo y el aviso que devuelve la acción (el mismo para cualquier
 * correo, para no revelar qué cuentas existen).
 */
import { useState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "../../_actions/auth";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { inputClass, labelClass } from "@/components/minisitio/ui/field";
import { AuthShell } from "../_components/auth-shell";

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await forgotPasswordAction(email);
      if (data.success) {
        setMessage(data.message || "Si el correo está registrado, te llegará un enlace para crear una contraseña nueva.");
        setEmail("");
      } else {
        setError(data.message || "No pudimos procesar la solicitud.");
      }
    } catch {
      setError("No hay conexión. Revisa tu internet e inténtalo otra vez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="¿Olvidaste tu contraseña?" description="Escribe tu correo y te mandamos un enlace para crear una nueva.">
      {message ? (
        <div role="status" className="space-y-5">
          <p className="rounded-panel border border-stroke-2 bg-highlight px-4 py-3 text-body text-fg-2">{message}</p>
          <p className="text-body text-fg-3">Revisa también tu carpeta de spam. El enlace dura una hora.</p>
          <Link href={msPath("/login")} className={buttonClass("outline", "md", "h-10 w-full")}>
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className={labelClass}>
              Correo electrónico
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" className="text-body text-overdue">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className={buttonClass("primary", "md", "h-10 w-full")}>
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>
          <p className="text-center text-body text-fg-3">
            ¿La recordaste?{" "}
            <Link href={msPath("/login")} className="font-medium text-brand hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
