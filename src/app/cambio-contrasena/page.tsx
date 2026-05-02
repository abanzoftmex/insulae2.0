import { PasswordChangeForm } from "./components/password-change-form";
import Link from "next/link";

export default function PasswordChangePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="p-2 hover:bg-[#e8dbcc] text-[#6d422a] rounded-xl transition-colors bg-white/50 border border-[#e8dbcc]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-[ui-serif] font-bold text-[#2f221a] flex items-center gap-2">
          Cambio de contraseña
        </h1>
      </div>

      <PasswordChangeForm />
      
      <div className="flex justify-center mt-12 opacity-40">
        <div className="w-32 h-32 relative">
          <img 
            src="/logo.png" 
            alt="Val'Quirico" 
            className="w-full h-full object-contain grayscale"
          />
        </div>
      </div>
    </div>
  );
}
