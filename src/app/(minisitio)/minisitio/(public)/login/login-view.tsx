"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { forgotPasswordAction, loginAction } from "../../_actions/auth";
import { useMinisitioStore } from "@/stores/minisitio.store";
import { msPath } from "@/components/minisitio/paths";

const REASON_MESSAGES: Record<string, string> = {
  inactivity: "Tu sesión se cerró por inactividad (30 minutos). Por favor, inicia sesión nuevamente.",
  revoked: "Tu sesión se cerró porque tu cuenta ya no tiene acceso al portal. Contacta a la administración.",
};

export function LoginView({ reason }: { reason?: string | null }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const infoMessage = (reason && REASON_MESSAGES[reason]) || "";
  const [showPassword, setShowPassword] = useState(false);

  // Modal states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await loginAction({ email: formData.username, password: formData.password });

      if (data.success) {
        // La sesión queda en una cookie httpOnly; se limpia la caché de cliente del usuario anterior.
        useMinisitioStore.getState().clearData();
        // TEMPORAL: Ir directamente al dashboard, omitir aviso de privacidad
        router.push(msPath("/"));
      } else {
        setError(data.message || "Error al iniciar sesión");
      }
    } catch (error) {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotMessage("");

    try {
      const data = await forgotPasswordAction(forgotEmail);

      if (data.success) {
        setForgotMessage(data.message || "");
        // Clear the form
        setForgotEmail("");
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotMessage("");
        }, 3000);
      } else {
        setForgotError(data.message || "Error al procesar la solicitud");
      }
    } catch (error) {
      console.error("Forgot password modal error:", error);
      setForgotError("Error de conexión. Intenta nuevamente.");
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgotPassword = () => {
    setShowForgotPassword(true);
    setForgotEmail("");
    setForgotError("");
    setForgotMessage("");
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail("");
    setForgotError("");
    setForgotMessage("");
  };

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showForgotPassword) {
        closeForgotPassword();
      }
    };

    if (showForgotPassword) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showForgotPassword]);

  return (
    <div className="min-h-screen w-full bg-[#0e0e0a] font-sans overflow-hidden">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(460px,40%)_1fr]">
        {/* Left: Login Column */}
        <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-gradient-to-br from-[#0e0e0a] via-[#242416] to-[#32321e]">
          {/* Subtle ambient glows */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -left-32 h-[350px] w-[350px] rounded-full bg-[#5d5b35]/10 blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[#b58c42]/5 blur-[120px]" />
            <div className="absolute -bottom-32 -right-32 h-[350px] w-[350px] rounded-full bg-[#5d5b35]/10 blur-[100px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(181,140,66,0.03),transparent_60%)]" />
          </div>

          <div className="relative mx-auto w-full max-w-[420px] flex flex-col justify-between min-h-[80vh]">
            {/* Logo + Badge */}
            <div className="mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/valquirico-logo-light.png"
                alt="Val'Quirico"
                className="h-auto w-[180px] sm:w-[220px] object-contain brightness-110"
              />
              <div className="mt-4 flex items-center gap-2.5">
                <span className="bg-[#b58c42] text-[#242416] text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                  MINISITIO CONDÓMINOS
                </span>
              </div>
              <p className="mt-2 text-white/50 text-xs font-medium tracking-wide leading-relaxed max-w-[36ch]">
                Portal exclusivo para condóminos, propietarios y residentes de Val'Quirico.
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-6 sm:p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                  Acceso al Minisitio
                </h1>
                <p className="mt-1.5 text-xs text-white/40 font-medium tracking-wide">
                  Ingresa tu correo y contraseña registrados.
                </p>
              </div>

              {infoMessage && (
                <div className="mb-5 rounded-xl border border-blue-500/20 bg-blue-950/30 px-3.5 py-3 text-[12px] font-semibold text-blue-300 flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 shrink-0 text-blue-400 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="tracking-tight">{infoMessage}</span>
                </div>
              )}

              {error && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-950/20 px-3.5 py-3 text-[12px] font-semibold text-red-300 flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 shrink-0 text-red-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="tracking-tight">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="username"
                    className="text-white/50 text-[10px] font-extrabold uppercase tracking-widest ml-0.5"
                  >
                    Correo Electrónico
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    disabled={loading}
                    autoComplete="username"
                    placeholder="correo@ejemplo.com"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-[#b58c42]/50 focus:ring-4 focus:ring-[#b58c42]/5 focus:outline-none transition-standard text-white placeholder-white/20 text-[14px] font-semibold h-11 px-4 rounded-xl disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-white/50 text-[10px] font-extrabold uppercase tracking-widest ml-0.5"
                    >
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-[11px] text-[#b58c42] hover:text-[#c99f52] font-semibold transition-standard"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-[#b58c42]/50 focus:ring-4 focus:ring-[#b58c42]/5 focus:outline-none transition-standard text-white placeholder-white/20 text-[14px] font-semibold h-11 pl-4 pr-11 rounded-xl disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-lg text-white/40 hover:text-white transition-standard hover:bg-white/5"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-gradient-to-r from-[#b58c42] via-[#c99f52] to-[#b58c42] hover:brightness-110 text-[#242416] font-black text-[12px] tracking-[0.16em] h-12 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-[#242416]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>INGRESANDO...</span>
                    </>
                  ) : (
                    <span>INGRESAR AL MINISITIO</span>
                  )}
                </button>
              </form>
            </div>

            {/* Footer info */}
            <div className="mt-8 text-center text-white/30 text-[11px] font-medium">
              Val'Quirico · Insulae 2.0 · Minisitio Condóminos
            </div>
          </div>
        </div>

        {/* Modal Forgot Password */}
        {showForgotPassword && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
            onClick={closeForgotPassword}
          >
            <div
              className="bg-[#181812] border border-white/15 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-brand-deep to-brand p-6 text-white text-center relative border-b border-white/10">
                <button
                  onClick={closeForgotPassword}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                  aria-label="Cerrar"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-xl mb-3 border border-white/15">
                  <svg
                    className="w-6 h-6 text-[#b58c42]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Restablecer Contraseña</h3>
                <p className="text-white/70 text-xs mt-1">
                  Ingresa tu correo para enviarte las instrucciones.
                </p>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="forgotEmail"
                      className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-0.5"
                    >
                      Correo electrónico
                    </label>
                    <input
                      id="forgotEmail"
                      name="forgotEmail"
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-[#b58c42]/50 focus:outline-none transition-standard text-white placeholder-white/20 text-[14px] font-semibold h-11 px-4 rounded-xl"
                    />
                  </div>

                  {forgotError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-3 text-[12px] font-semibold text-red-300">
                      {forgotError}
                    </div>
                  )}

                  {forgotMessage && (
                    <div className="rounded-xl border border-brand/40 bg-brand-mint/20 px-3.5 py-3 text-[12px] font-semibold text-[#b58c42]">
                      {forgotMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-gradient-to-r from-[#b58c42] to-[#c99f52] text-[#242416] font-black text-[12px] tracking-wider h-11 rounded-xl transition-all shadow-md uppercase disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <span>ENVIANDO...</span>
                    ) : (
                      <span>ENVIAR ENLACE</span>
                    )}
                  </button>
                </form>

                <div className="mt-4 text-center text-xs text-white/40">
                  <Link
                    href={msPath("/forgot-password")}
                    className="text-[#b58c42] hover:underline"
                  >
                    Abrir en página completa →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right: Cover Column */}
        <div className="relative hidden lg:block overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/fdo1.jpg"
            alt="Val'Quirico"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-black/25 to-black/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(181,140,66,0.15),transparent_55%)]" />
          <div className="absolute inset-y-0 left-0 w-px bg-white/10" />

          <div className="absolute inset-x-12 bottom-12 space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold tracking-widest uppercase backdrop-blur-sm border border-white/20">
              Comunidad y Residencia
            </span>
            <p className="text-white/95 text-[40px] leading-[1.05] tracking-tight drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)] font-extrabold">
              Portal Oficial del Condómino
            </p>
            <p className="text-white/70 text-sm max-w-lg leading-relaxed">
              Consulta tus inmuebles, estados de cuenta, comunicados y reglamentos oficiales de Val'Quirico.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
