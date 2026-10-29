import type { Metadata } from "next";
import Image from "next/image";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña | Insulae 2.0",
};

export default function OlvideContrasenaPage() {
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
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Recuperar contraseña</h1>
            <p className="mt-1.5 text-xs text-white/40 font-medium tracking-wide">
              Te enviaremos un enlace para crear una contraseña nueva. Caduca en una hora.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
