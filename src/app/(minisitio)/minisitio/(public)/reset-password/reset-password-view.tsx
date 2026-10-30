"use client";

/**
 * Nueva contraseña desde el enlace del correo. El token se valida en el servidor (page.tsx): sin
 * token o con uno vencido se explica qué pasó y se ofrece pedir otro enlace.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPasswordAction } from "../../_actions/auth";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { labelClass } from "@/components/minisitio/ui/field";
import { AuthShell } from "../_components/auth-shell";
import { PasswordField } from "../_components/password-field";

const MIN_LENGTH = 8;

export function ResetPasswordView({
  token,
  initialTokenValid,
  initialError,
}: {
  token: string | null;
  /** Validado en el servidor (page.tsx): null si no llegó token. */
  initialTokenValid: boolean | null;
  initialError: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token || initialTokenValid === false) {
    return (
      <AuthShell
        title={token ? "Este enlace ya no sirve" : "Falta el enlace"}
        description={
          token
            ? initialError || "El enlace venció o ya se usó. Pide uno nuevo: llega en un momento."
            : "Abre el enlace que te mandamos por correo para crear tu contraseña."
        }
      >
        <Link href={msPath("/forgot-password")} className={buttonClass("primary", "md", "h-10 w-full")}>
          Pedir un enlace nuevo
        </Link>
      </AuthShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const data = await resetPasswordAction({ token, newPassword: password });
      if (data.success) {
        setDone(true);
        setTimeout(() => router.push(msPath("/login")), 2000);
      } else {
        setError(data.message || "No pudimos guardar la contraseña.");
      }
    } catch {
      setError("No hay conexión. Revisa tu internet e inténtalo otra vez.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Listo" description="Guardamos tu contraseña nueva. Te llevamos a iniciar sesión…">
        <Link href={msPath("/login")} className={buttonClass("primary", "md", "h-10 w-full")}>
          Iniciar sesión
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crea tu contraseña" description="Úsala para entrar al portal a partir de ahora.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-password" className={labelClass}>
            Contraseña nueva
          </label>
          <PasswordField id="reset-password" name="password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="reset-ayuda" />
          <p id="reset-ayuda" className="mt-1.5 text-caption text-fg-3">
            Al menos {MIN_LENGTH} caracteres.
          </p>
        </div>
        <div>
          <label htmlFor="reset-confirm" className={labelClass}>
            Repite la contraseña
          </label>
          <PasswordField id="reset-confirm" name="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
        </div>
        {error && (
          <p role="alert" className="text-body text-overdue">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className={buttonClass("primary", "md", "h-10 w-full")}>
          {loading ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </AuthShell>
  );
}
