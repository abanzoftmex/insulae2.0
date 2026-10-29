import type { Metadata } from "next";
import Link from "next/link";
import { ShieldOff, House } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Acceso denegado | Insulae 2.0",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ modulo?: string | string[] }>;
};

export default async function AccesoDenegadoPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const modulo = Array.isArray(params.modulo) ? params.modulo[0] : params.modulo;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 animate-in fade-in duration-500">
      <Card className="max-w-md w-full p-8 text-center space-y-5 border border-line shadow-layered">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
          <ShieldOff className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <Badge variant="brand" className="rounded-full px-4 py-1.5 text-[10px] tracking-widest">
            Control de acceso
          </Badge>
          <h1 className="text-2xl font-bold text-brand tracking-tight uppercase">Acceso denegado</h1>
          <p className="text-xs text-ink-soft leading-relaxed">
            Tu rol no tiene permiso para consultar
            {modulo ? <> el módulo <strong className="text-ink">{modulo}</strong>.</> : " esta sección."}
            {" "}Si crees que deberías tener acceso, pide a la administración que actualice tu rol.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-deep transition-colors"
        >
          <House className="h-3.5 w-3.5" />
          Volver al inicio
        </Link>
      </Card>
    </div>
  );
}
