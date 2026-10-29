"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateSuperadminAction } from "../../_actions/superadmin";
import { msPath } from "@/components/minisitio/paths";

export function SuperAdminInsulaeView() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      } else {
        setError(data.message || "Credenciales incorrectas");
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0e0e0a] via-[#242416] to-[#32321e] px-4">
      {/* Background decorative elements */}
      <div className="absolute top-20 left-20 w-40 h-40 bg-[#b58c42]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-60 h-60 bg-[#5d5b35]/15 rounded-full blur-3xl" />

      <div className="max-w-md w-full mx-auto relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#b58c42] to-[#8d6928] rounded-2xl mb-6 shadow-lg shadow-[#b58c42]/20">
            <svg
              className="w-8 h-8 text-[#0e0e0a]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
            Superadministrador
          </h1>
          <p className="text-white/50 text-xs font-medium tracking-wide">
            Minisitio Insulae · Val'Quirico
          </p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Usuario */}
            <div className="space-y-1.5">
              <label
                htmlFor="superadmin-user"
                className="block text-[10px] font-extrabold uppercase tracking-widest text-white/50 ml-0.5"
              >
                Usuario
              </label>
              <input
                id="superadmin-user"
                type="text"
                required
                autoComplete="username"
                className="w-full px-4 py-3.5 border border-white/10 rounded-xl placeholder-white/20 text-white bg-white/[0.04] focus:outline-none focus:border-[#b58c42]/60 focus:ring-4 focus:ring-[#b58c42]/5 transition-all text-sm font-semibold"
                placeholder="superadmin"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoFocus
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="superadmin-password"
                className="block text-[10px] font-extrabold uppercase tracking-widest text-white/50 ml-0.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="superadmin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full pl-4 pr-12 py-3.5 border border-white/10 rounded-xl placeholder-white/20 text-white bg-white/[0.04] focus:outline-none focus:border-[#b58c42]/60 focus:ring-4 focus:ring-[#b58c42]/5 transition-all text-sm font-semibold"
                  placeholder="••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-lg text-white/40 hover:text-white transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/20 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#b58c42] to-[#c99f52] hover:brightness-110 text-[#242416] font-black text-xs uppercase tracking-wider py-4 px-4 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Activar modo superadmin"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[11px] text-white/40">
              La sesión de superadministrador durará 15 minutos
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(msPath("/login"))}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}
