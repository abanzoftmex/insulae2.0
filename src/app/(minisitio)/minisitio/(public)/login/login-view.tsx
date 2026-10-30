"use client";

/**
 * Entrar al portal: correo y contraseña, "Mostrar" y "¿La olvidaste?" (lleva a su pantalla; antes
 * había además un modal que la repetía). Los avisos de sesión cerrada (inactividad, acceso
 * retirado) van arriba del formulario.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "../../_actions/auth";
import { useMinisitioStore } from "@/stores/minisitio.store";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { inputClass, labelClass } from "@/components/minisitio/ui/field";
import { AuthShell } from "../_components/auth-shell";
import { PasswordField } from "../_components/password-field";

const REASON_MESSAGES: Record<string, string> = {
  inactivity: "Cerramos tu sesión porque pasaron 30 minutos sin actividad. Vuelve a entrar.",
  revoked: "Tu sesión se cerró porque tu cuenta ya no tiene acceso al portal. Escribe a la administración.",
};

export function LoginView({ reason }: { reason?: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const aviso = (reason && REASON_MESSAGES[reason]) || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await loginAction({ email, password });
      if (data.success) {
        // La sesión queda en una cookie httpOnly; se limpia la caché de cliente del usuario anterior.
        useMinisitioStore.getState().clearData();
        router.push(msPath("/"));
        return;
      }
      setError(data.message || "No pudimos iniciar tu sesión.");
    } catch {
      setError("No hay conexión. Revisa tu internet e inténtalo otra vez.");
    }
    setLoading(false);
  };

  return (
    <AuthShell title="Inicia sesión" description="Entra a tu portal de condómino.">
      {aviso && (
        <p role="status" className="mb-5 rounded-panel border border-stroke-2 bg-highlight px-4 py-3 text-body text-fg-2">
          {aviso}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Correo electrónico
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="login-password" className="text-body font-semibold text-fg">
              Contraseña
            </label>
            <Link href={msPath("/forgot-password")} className="text-body font-medium text-brand hover:underline">
              ¿La olvidaste?
            </Link>
          </div>
          <PasswordField id="login-password" name="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        {error && (
          <p role="alert" className="text-body text-overdue">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className={buttonClass("primary", "md", "h-10 w-full")}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
