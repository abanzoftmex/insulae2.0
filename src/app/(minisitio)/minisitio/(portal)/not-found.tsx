import Link from "next/link";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";

/** `notFound()` en una pantalla del portal: dentro del panel, con el shell y la navegación. */
export default function PortalNotFound() {
  return (
    <div className="mx-auto w-full max-w-[520px] py-16 text-center">
      <p className="text-subtitle font-bold text-fg">No encontramos lo que buscas</p>
      <p className="mt-1 text-body text-fg-3">Puede que ya no exista o que no esté entre tus unidades. Usa el menú o «Buscar o ir a…» (Ctrl/⌘ K).</p>
      <Link href={msPath("/")} className={buttonClass("primary", "md", "mt-5")}>
        Ir a Inicio
      </Link>
    </div>
  );
}
