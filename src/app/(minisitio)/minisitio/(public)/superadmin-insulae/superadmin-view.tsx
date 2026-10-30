"use client";

/**
 * Modo superadministrador (uso interno de soporte): usuario y contraseña del superadmin. Al
 * validarse vuelve al login con carga completa y el layout raíz muestra la burbuja con la que se
 * entra como cualquier condómino. Mismo marco que las demás pantallas de acceso.
 */
import { useState } from "react";
import Link from "next/link";
import { validateSuperadminAction } from "../../_actions/superadmin";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { inputClass, labelClass } from "@/components/minisitio/ui/field";
import { AuthShell } from "../_components/auth-shell";
import { PasswordField } from "../_components/password-field";

export function SuperAdminInsulaeView() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await validateSuperadminAction({ user, password });
      if (data.success) {
        // Carga completa: el layout raíz vuelve a leer la cookie y muestra la burbuja.
        window.location.href = msPath("/login");
        return;
      }
      setError(data.message || "Usuario o contraseña incorrectos.");
    } catch {
      setError("No hay conexión. Revisa tu internet e inténtalo otra vez.");
    }
    setLoading(false);
  };

  return (
    <AuthShell title="Modo superadministrador" description="Acceso de soporte del portal. La sesión dura 15 minutos.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="superadmin-user" className={labelClass}>
            Usuario
          </label>
          <input
            id="superadmin-user"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="superadmin-password" className={labelClass}>
            Contraseña
          </label>
          <PasswordField id="superadmin-password" name="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        {error && (
          <p role="alert" className="text-body text-overdue">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className={buttonClass("primary", "md", "h-10 w-full")}>
          {loading ? "Verificando…" : "Activar modo superadmin"}
        </button>
        <p className="text-center text-body text-fg-3">
          <Link href={msPath("/login")} className="font-medium text-brand hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
