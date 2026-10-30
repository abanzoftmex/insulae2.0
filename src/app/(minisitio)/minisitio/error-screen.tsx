"use client";

/**
 * Error o página inexistente fuera del portal (o cuando falla el propio portal): el marco de las
 * pantallas de acceso con una explicación y salidas claras. Dentro del portal, los errores de una
 * pantalla se muestran en el panel, sin perder la navegación ((portal)/error.tsx).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { AuthShell } from "./(public)/_components/auth-shell";

export function MinisitioErrorScreen({ statusCode, onRetry }: { statusCode?: number; onRetry?: () => void }) {
  const router = useRouter();
  const noExiste = statusCode === 404;
  return (
    <AuthShell
      title={noExiste ? "No encontramos esta página" : "Algo salió mal"}
      description={noExiste ? "Puede que el enlace esté incompleto o que la página ya no exista." : "Fue un problema de nuestro lado. Vuelve a intentarlo en un momento."}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        {!noExiste && onRetry ? (
          <button type="button" onClick={onRetry} className={buttonClass("primary", "md", "h-10 flex-1")}>
            Reintentar
          </button>
        ) : (
          <Link href={msPath("/")} className={buttonClass("primary", "md", "h-10 flex-1")}>
            Ir al inicio
          </Link>
        )}
        <button type="button" onClick={() => router.back()} className={buttonClass("outline", "md", "h-10 flex-1")}>
          Volver atrás
        </button>
      </div>
    </AuthShell>
  );
}
