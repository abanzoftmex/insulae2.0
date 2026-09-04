import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Restablecer contraseña | Insulae 2.0",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ token?: string | string[] }>;
};

export default async function RestablecerContrasenaPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0e0e0a] via-[#242416] to-[#32321e] font-sans flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px] space-y-8">
        <Image
          src="/brand/valquirico-logo-light.png"
          alt="Val'Quirico"
          width={520}
          height={140}
          priority
          className="h-auto w-[180px] sm:w-[220px] object-contain brightness-110"
        />
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Nueva contraseña</h1>
            <p className="mt-1.5 text-xs text-white/40 font-medium tracking-wide">
              Elige una contraseña de al menos 8 caracteres.
            </p>
          </div>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl px-3.5 py-3 text-[12px] font-semibold border border-red-500/20 bg-red-950/20 text-red-300">
                El enlace no es válido. Solicita uno nuevo.
              </div>
              <Link href="/olvide-contrasena" className="block text-center text-[11px] font-semibold text-white/50 hover:text-[#b58c42] transition-standard">
                Solicitar enlace nuevo
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
