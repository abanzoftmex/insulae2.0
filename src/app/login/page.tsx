"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { Eye, EyeOff } from "lucide-react";

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
          router.push("/");
          router.refresh();
        } else {
          setError(result.error || "Ocurrió un error inesperado.");
        }
      } catch (err) {
        setError("Error de conexión. Por favor, inténtalo de nuevo.");
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#122420] via-[#1E3932] to-[#2d5249] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      
      {/* Decorative premium background elements (low-alpha green-mint and gold glows) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#cba258]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#d4e9e2]/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Title above the card */}
      <h1 className="text-white/60 text-[11px] font-bold uppercase tracking-[0.25em] text-center mb-6 drop-shadow-sm">
        INSULAE <span className="text-[#cba258]">|</span> Sistema Condominal
      </h1>

      {/* Main Login Card - Utilizing the 12px Border Radius & Whisper Shadow Stack */}
      <div className="w-full max-w-[420px] bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/5 p-8 md:p-10 transition-all duration-300 transform hover:scale-[1.01]">
        
        {/* Header - Starbucks inspired tight letter spacing */}
        <div className="mb-6">
          <h2 className="text-[23px] font-extrabold text-slate-800 tracking-tight leading-tight">
            Bienvenido, inicia sesión.
          </h2>
          <p className="text-[13px] text-slate-400 font-medium mt-1.5 leading-relaxed tracking-tight">
            Ingresa tu usuario (email) y contraseña proporcionada.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-100 text-[12px] font-semibold text-red-600 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <svg
              className="w-4 h-4 shrink-0 text-red-500 mt-0.5"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email field - Styled with soft off-white background and standard borders */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.1em] ml-1"
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
              defaultValue="admin"
              className="w-full bg-[#f4f7f5] border border-[#d6dbde] focus:border-[#00754A] focus:ring-4 focus:ring-[#00754A]/10 focus:outline-none transition-all duration-200 text-slate-800 text-[14px] font-semibold h-11 px-4 rounded-lg disabled:opacity-60"
            />
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.1em] ml-1"
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
                className="w-full bg-[#f4f7f5] border border-[#d6dbde] focus:border-[#00754A] focus:ring-4 focus:ring-[#00754A]/10 focus:outline-none transition-all duration-200 text-slate-800 text-[14px] font-semibold h-11 pl-4 pr-11 rounded-lg disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00754A] transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button - Restyled into a 50px Full-Pill CTA with Signature active:scale-95 */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-6 bg-[#cba258] hover:bg-[#bca065] text-white font-extrabold text-[12px] tracking-[0.15em] h-12 rounded-[50px] transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
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

      {/* Footer Branding Logos - Styled symmetrically in translucent tones */}
      <div className="mt-12 flex flex-col items-center gap-5 select-none w-full max-w-[420px]">
        
        <div className="flex items-center justify-center gap-10 text-white/40 w-full">
          {/* Val'Quirico Logo */}
          <div className="flex flex-col items-center gap-1 text-center group transition-colors duration-200 hover:text-white/60">
            <svg
              className="w-8 h-8 opacity-80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path d="M12 2L15 5H9L12 2Z" />
              <path d="M5 8C5 8 5 18 12 22C19 18 19 8 19 8H5Z" />
              <path d="M9 11L12 14L15 11" />
              <path d="M12 14V18" />
            </svg>
            <span className="font-serif text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
              VAL'QUIRICO
            </span>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10" />

          {/* ABANZOFT Logo */}
          <div className="flex flex-col items-center gap-1 text-center group transition-colors duration-200 hover:text-white/60">
            <div className="text-[19px] font-extrabold tracking-[0.08em] text-white/50 flex items-center select-none font-sans leading-none">
              ABAN<span className="text-[#cba258] font-black relative inline-block mx-[0.5px]">Z</span>OFT
            </div>
            <span className="font-serif text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
              SISTEMAS
            </span>
          </div>
        </div>

        {/* Developer Credit Text - Aligned with the design system typography guidelines */}
        <p className="text-[10px] sm:text-[11px] text-white/35 tracking-wide font-medium text-center leading-relaxed">
          2026 . Sistema desarrollado por ABANZOFT para REINOS DE MÉXICO
        </p>

      </div>

    </div>
  );
}
