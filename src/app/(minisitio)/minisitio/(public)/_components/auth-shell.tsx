/**
 * Marco de las pantallas de acceso (entrar, olvidé y nueva contraseña) y de los errores fuera del
 * portal: el formulario sobre blanco y, en pantallas anchas, la foto de Val'Quirico con un solo
 * velo olivo plano (sin degradados ni manchas decorativas).
 */
import Image from "next/image";
import Link from "next/link";
import { msPath } from "@/components/minisitio/paths";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-surface text-fg">
      <main className="flex min-w-0 flex-1 flex-col px-6 pt-8 pb-10 sm:px-12">
        <Link href={msPath("/login")} className="flex items-center gap-2.5 self-start rounded-panel outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <Image src="/logo-mono.png" alt="" width={34} height={35} className="h-[35px] w-auto" priority />
          <span className="text-body-lg font-bold tracking-[-0.01em]">Val&apos;Quirico</span>
        </Link>
        <div className="flex flex-1 items-center py-10">
          <div className="w-full max-w-[400px]">
            <h1 className="text-display font-bold text-fg">{title}</h1>
            {description && <div className="mt-1.5 text-body-lg text-fg-3">{description}</div>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
        <p className="text-caption text-fg-3">Portal del condómino · Val&apos;Quirico, Tlaxcala</p>
      </main>
      <aside aria-hidden className="relative hidden w-[46%] max-w-[760px] lg:block">
        <Image src="/images/fdo1.jpg" alt="" fill priority sizes="46vw" className="object-cover" />
        <div className="absolute inset-0 bg-chrome-strong/50" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-chrome-ink">
          <p className="text-title font-bold">Bienvenido a casa.</p>
          <p className="mt-1 text-body-lg text-chrome-ink-soft">Tus saldos, avisos y solicitudes del condominio, en un solo lugar.</p>
        </div>
      </aside>
    </div>
  );
}
