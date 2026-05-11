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
    <div className="min-h-screen w-full bg-canvas font-sans">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(420px,48%)_1fr]">
        {/* Left: Login */}
        <div className="relative flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 bg-linear-to-br from-[#122420] via-brand-deep to-[#2d5249]">
          {/* subtle texture + glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gold/12 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-mint/18 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(203,162,88,0.10),transparent_52%),radial-gradient(circle_at_90%_10%,rgba(212,233,226,0.10),transparent_45%)]" />
          </div>

          <div className="relative mx-auto w-full max-w-[460px]">
            {/* Logo arriba del login */}
            <div className="mb-8">
              <Image
                src="/brand/valquirico-logo-light.png"
                alt="Val'Quirico"
                width={520}
                height={140}
                priority
                className="h-auto w-[240px] sm:w-[280px] object-contain"
              />
              <p className="mt-4 text-white/70 text-[13px] leading-relaxed max-w-[40ch]">
                Accede a la plataforma condominal con tu usuario y contraseña.
              </p>
            </div>

            {/* Card */}
            <div className="rounded-[16px] bg-card/85 backdrop-blur-md shadow-layered border border-line p-6 sm:p-8">
              <div className="mb-6">
                <h1 className="text-[30px] leading-[1.05] tracking-tight text-ink font-extrabold">
                  Bienvenido.
                </h1>
                <p className="mt-2 text-[13px] text-ink-soft">
                  Inicia sesión para continuar.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-200/70 bg-red-50 px-3.5 py-3 text-[12px] font-semibold text-red-700 flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 shrink-0 text-red-600 mt-0.5"
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
                    className="text-ink-soft text-[11px] font-bold uppercase tracking-[0.12em] ml-0.5"
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
                    className="w-full bg-canvas-2/70 border border-line focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 focus:outline-none transition-standard text-ink text-[14px] font-semibold h-11 px-4 rounded-xl disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-ink-soft text-[11px] font-bold uppercase tracking-[0.12em] ml-0.5"
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
                      className="w-full bg-canvas-2/70 border border-line focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 focus:outline-none transition-standard text-ink text-[14px] font-semibold h-11 pl-4 pr-11 rounded-xl disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-lg text-ink-soft hover:text-brand transition-standard hover:bg-canvas"
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
                  className="w-full mt-5 bg-gold hover:bg-[#bca065] text-white font-extrabold text-[12px] tracking-[0.16em] h-12 rounded-pill transition-standard shadow-layered active-scale disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
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

            {/* Logos auxiliares debajo (1 a la izq, 2 a la der) */}
            <div className="mt-7 flex items-center justify-between gap-6">
              <div className="flex-1 flex items-center justify-start">
                <Image
                  src="/brand/reinos-de-mexico-logo-c.png"
                  alt="Reinos de México"
                  width={220}
                  height={120}
                  className="h-[90px] w-auto object-contain opacity-85"
                />
              </div>
              <div className="flex-1 flex items-center justify-end">
                <Image
                  src="/brand/abanzoft-logo-light.png"
                  alt="Abanzoft"
                  width={220}
                  height={80}
                  className="w-[150px] h-auto object-contain opacity-80"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Image */}
        <div className="relative hidden lg:block">
          <Image
            src="/images/fdo1.jpg"
            alt="Imagen de fondo"
            fill
            priority
            sizes="52vw"
            className="object-cover"
          />
          {/* overlays for readability / luxury tone */}
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-linear-to-l from-black/40 via-black/25 to-black/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(203,162,88,0.18),transparent_55%)]" />
          <div className="absolute inset-y-0 left-0 w-px bg-white/20" />

          <div className="absolute inset-x-10 bottom-10">
            <p className="text-white/92 text-[44px] leading-[0.95] tracking-[-0.02em] drop-shadow-[0_12px_30px_rgba(0,0,0,0.55)] font-bold">
              Sistema de Administración Condominal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
