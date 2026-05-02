"use client";

import { useState } from "react";
import { 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  updatePassword,
  signOut
} from "firebase/auth";
import { getClientAuth } from "@/shared/infrastructure/storage/firebase-client";
import { useRouter } from "next/navigation";

export function PasswordChangeForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const auth = getClientAuth();
      const user = auth.currentUser;

      if (!user || !user.email) {
        throw new Error("No hay un usuario autenticado.");
      }

      // 1. Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Update password
      await updatePassword(user, newPassword);

      setSuccess(true);
      
      // Optional: Sign out after password change for security
      setTimeout(async () => {
        await signOut(auth);
        router.push("/login"); // Adjust to your login route
      }, 2000);

    } catch (err: any) {
      console.error("Error changing password:", err);
      if (err.code === "auth/wrong-password") {
        setError("La contraseña actual es incorrecta.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiados intentos. Inténtalo más tarde.");
      } else {
        setError("Ocurrió un error al cambiar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#e8dbcc] overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6d422a] block text-center">
                Contraseña actual (o provisional si tienes una)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Contraseña"
                  className="w-full px-4 py-3 rounded-xl border border-[#e8dbcc] focus:outline-none focus:ring-2 focus:ring-[#5a7b56]/20 focus:border-[#5a7b56] transition-all bg-[#fcf9f5]/30 pr-10"
                />
                {currentPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                )}
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6d422a] block text-center">
                Contraseña nueva
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Contraseña"
                  className="w-full px-4 py-3 rounded-xl border border-[#e8dbcc] focus:outline-none focus:ring-2 focus:ring-[#5a7b56]/20 focus:border-[#5a7b56] transition-all bg-[#fcf9f5]/30 pr-10"
                />
                {newPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6d422a] block text-center">
                Confirmación de contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirmar contraseña"
                  className="w-full px-4 py-3 rounded-xl border border-[#e8dbcc] focus:outline-none focus:ring-2 focus:ring-[#5a7b56]/20 focus:border-[#5a7b56] transition-all bg-[#fcf9f5]/30 pr-10"
                />
                {confirmPassword && confirmPassword === newPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={loading || success}
              className="px-12 py-4 rounded-xl bg-[#2f394d] text-white font-bold uppercase tracking-widest hover:bg-[#1e2532] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-3"
            >
              {loading && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Guardar información
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
              ¡Contraseña actualizada con éxito! Cerrando sesión...
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
