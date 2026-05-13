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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

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
    <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white">Datos de acceso</p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Contraseña actual"
          />
          <Input
            label="Contraseña nueva"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Nueva contraseña"
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirmar contraseña"
          />
        </div>

        {error && (
          <div className="p-3 bg-danger/5 border border-danger/20 text-danger rounded-md text-[11px] font-bold text-center animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-success/5 border border-success/20 text-success rounded-md text-[11px] font-bold text-center animate-in fade-in slide-in-from-top-2">
            ¡Contraseña actualizada con éxito! Cerrando sesión...
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || success} className="h-8 px-6 text-[10px] font-bold uppercase tracking-widest gap-2">
            <Save className="h-3.5 w-3.5" />
            {loading ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </div>
      </form>
    </div>
  );
}
