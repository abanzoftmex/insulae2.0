"use client";

/**
 * Aceptación del aviso de privacidad. Solo se muestra a un condómino con sesión que aún no lo
 * aceptó; como la base todavía no guarda la aceptación (el login lo da por aceptado), hoy
 * page.tsx siempre redirige igual que el minisitio independiente. Es un documento largo: se lee
 * con ancho de lectura y las dos acciones quedan fijas abajo. "Cerrar sesión" sí cierra la sesión
 * (antes solo llevaba al login con la sesión abierta).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptPrivacyNoticeAction, logoutAction } from "../../_actions/auth";
import { msPath } from "@/components/minisitio/paths";
import { AvisoPrivacidadTexto } from "@/components/minisitio/aviso-privacidad-texto";
import { buttonClass } from "@/components/minisitio/ui/button";
import { useMinisitioStore } from "@/stores/minisitio.store";
import { AuthBrand } from "../_components/auth-shell";

export function PrivacyView({ notice }: { notice: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"accept" | "logout" | null>(null);
  const [error, setError] = useState("");

  const accept = async () => {
    setPending("accept");
    setError("");
    try {
      const data = await acceptPrivacyNoticeAction();
      if (data.success) {
        router.push(msPath("/"));
        return;
      }
      setError(data.message || "No pudimos registrar tu aceptación. Inténtalo otra vez.");
    } catch {
      setError("No hay conexión. Revisa tu internet e inténtalo otra vez.");
    }
    setPending(null);
  };

  const logout = async () => {
    setPending("logout");
    try {
      await logoutAction();
    } catch (err) {
      console.error("[minisitio] logout desde el aviso:", err);
    } finally {
      useMinisitioStore.getState().clearData();
      router.push(msPath("/login"));
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-fg">
      <header className="px-6 pt-8 sm:px-12">
        <AuthBrand />
      </header>
      <main className="mx-auto w-full max-w-[720px] flex-1 px-6 pt-10 pb-12 sm:px-0">
        <h1 className="text-display font-bold text-fg">Aviso de privacidad</h1>
        <p className="mt-1.5 text-body-lg text-fg-3">Léelo y acéptalo para entrar a tu portal.</p>
        <div className="mt-8">
          {notice ? (
            <AvisoPrivacidadTexto texto={notice} />
          ) : (
            <p className="text-body text-fg-2">El texto del aviso no está disponible en este momento. Puedes consultarlo con la administración.</p>
          )}
        </div>
      </main>
      <footer className="sticky bottom-0 border-t border-stroke-2 bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-center justify-end gap-2 px-6 py-3 sm:px-0">
          {error && (
            <p role="alert" className="mr-auto text-body text-overdue">
              {error}
            </p>
          )}
          <button type="button" onClick={logout} disabled={pending !== null} className={buttonClass("outline")}>
            {pending === "logout" ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
          <button type="button" onClick={accept} disabled={pending !== null} className={buttonClass("primary")}>
            {pending === "accept" ? "Guardando…" : "Acepto"}
          </button>
        </div>
      </footer>
    </div>
  );
}
