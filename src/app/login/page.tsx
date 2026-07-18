"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await loginAction(null, formData);
        if (result.success) {
          window.location.href = "/";
        } else {
          setError(result.error || "Ocurrió un error inesperado.");
        }
      } catch (err) {
        setError("Error de conexión. Por favor, inténtalo de nuevo.");
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#0e0e0a] font-sans overflow-hidden">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(460px,40%)_1fr]">
        {/* Left: Login */}
        <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-gradient-to-br from-[#0e0e0a] via-[#242416] to-[#32321e]">
          {/* subtle glow spots */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -left-32 h-[350px] w-[350px] rounded-full bg-brand/10 blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[#b58c42]/5 blur-[120px]" />
            <div className="absolute -bottom-32 -right-32 h-[350px] w-[350px] rounded-full bg-[#5d5b35]/10 blur-[100px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(181,140,66,0.03),transparent_60%)]" />
          </div>

          <div className="relative mx-auto w-full max-w-[420px] flex flex-col justify-between min-h-[80vh]">
            {/* Logo */}
            <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <Image
                src="/brand/valquirico-logo-light.png"
                alt="Val'Quirico"
                width={520}
                height={140}
                priority
                className="h-auto w-[180px] sm:w-[220px] object-contain brightness-110"
              />
              <p className="mt-4 text-white/50 text-xs font-medium tracking-wide leading-relaxed max-w-[36ch]">
                Plataforma integrada de administración, finanzas y control operativo.
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-1000 delay-100">
              <div className="mb-6">
                <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                  Acceso Administrativo
                </h1>
                <p className="mt-1.5 text-xs text-white/40 font-medium tracking-wide">
                  Ingresa tus credenciales autorizadas.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-950/20 px-3.5 py-3 text-[12px] font-semibold text-red-300 flex items-start gap-2.5 animate-in shake duration-300">
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
                    htmlFor="email"
                    className="text-white/50 text-[10px] font-extrabold uppercase tracking-widest ml-0.5"
                  >
                    Email
                  </label>
                  <input
                    type="text"
                    id="email"
                    name="email"
                    required
                    disabled={isPending}
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-[#b58c42]/50 focus:ring-4 focus:ring-[#b58c42]/5 focus:outline-none transition-standard text-white placeholder-white/20 text-[14px] font-semibold h-11 px-4 rounded-xl disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-white/50 text-[10px] font-extrabold uppercase tracking-widest ml-0.5"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      required
                      disabled={isPending}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-[#b58c42]/50 focus:ring-4 focus:ring-[#b58c42]/5 focus:outline-none transition-standard text-white placeholder-white/20 text-[14px] font-semibold h-11 pl-4 pr-11 rounded-xl disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-lg text-white/30 hover:text-white transition-standard hover:bg-white/5"
                      aria-label={
                        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full mt-6 bg-[#b58c42] hover:bg-[#a07c39] text-[#0e0e0a] font-black text-xs tracking-widest h-11 rounded-full transition-standard shadow-lg shadow-[#b58c42]/10 active-scale disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-[#0e0e0a]"
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
                    <span>INGRESA AL SISTEMA</span>
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6 animate-in fade-in duration-1000 delay-200">
              <span className="text-[10px] text-white/30 font-bold tracking-widest uppercase">
                diseñado por
              </span>
              <Image
                src="/brand/abanzoft-logo-light.png"
                alt="Abanzoft"
                width={120}
                height={40}
                className="w-[90px] h-auto object-contain opacity-40 hover:opacity-75 transition-opacity"
              />
            </div>
          </div>
        </div>

        {/* Right: Cover Image */}
        <div className="relative hidden lg:block overflow-hidden">
          <Image
            src="/images/fdo1.jpg"
            alt="Fondo Val'Quirico"
            fill
            priority
            sizes="60vw"
            className="object-cover transition-transform duration-10000 scale-105 hover:scale-100"
          />
          {/* overlay layers */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0a]/95 via-[#0e0e0a]/30 to-transparent" />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      </div>
    </div>
  );
}
