import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { AlertCircle, CheckCircle2, ChevronRight, HandCoins, Receipt, ShieldAlert } from "lucide-react";
import { getActiveCondominium, getSyncCounts } from "./_lib/data";

export const metadata: Metadata = {
  title: "Sincronización con Luca | Insulae 2.0",
  description: "Cobros y gastos recibidos de Luca pendientes de validar o ejecutar.",
};

export const dynamic = "force-dynamic";

function SyncCard({
  href,
  icon,
  title,
  description,
  count,
  pendingLabel,
  upToDateLabel,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  count: number;
  pendingLabel: string;
  upToDateLabel: string;
}) {
  const hasPending = count > 0;
  return (
    <Link href={href} className="group block">
      <Card
        className={
          "relative h-full border transition-standard hover:-translate-y-0.5 hover:shadow-xl " +
          (hasPending ? "border-danger/30" : "border-transparent")
        }
      >
        {hasPending && (
          <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-danger text-white shadow-md">
            <AlertCircle className="h-4 w-4" aria-hidden />
          </span>
        )}
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand">
              {icon}
            </span>
            <ChevronRight className="h-5 w-5 text-ink-soft/40 transition-transform group-hover:translate-x-1 group-hover:text-brand" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <div>
            {hasPending ? (
              <Badge variant="danger" className="gap-1 px-2 py-1 text-[10px]">
                <AlertCircle className="h-3 w-3" aria-hidden />
                {count} {pendingLabel}
              </Badge>
            ) : (
              <Badge variant="success" className="gap-1 px-2 py-1 text-[10px]">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                {upToDateLabel}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default async function SincronizacionLucaPage() {
  const condominium = await getActiveCondominium();

  if (!condominium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio activo configurado.</p>
      </div>
    );
  }

  const counts = await getSyncCounts(condominium.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Sincronización con Luca</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Integración</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {condominium.name} · Elige un apartado para validar y ejecutar lo que Luca envió.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SyncCard
          href="/sincronizacion-luca/cobros"
          icon={<HandCoins className="h-5 w-5" aria-hidden />}
          title="Cobros"
          description="Ingresos que Luca ligó a una propiedad, pendientes de forma de pago y ejecución."
          count={counts.pendingIncomes}
          pendingLabel="pendientes"
          upToDateLabel="Al día"
        />
        <SyncCard
          href="/sincronizacion-luca/gastos"
          icon={<Receipt className="h-5 w-5" aria-hidden />}
          title="Gastos"
          description="Egresos que Luca ligó a una partida presupuestal, pendientes de ejecución."
          count={counts.pendingExpenses}
          pendingLabel="pendientes"
          upToDateLabel="Al día"
        />
        <SyncCard
          href="/sincronizacion-luca/rechazados"
          icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
          title="Rechazados"
          description="Movimientos que Luca mandó pero Insulae no pudo procesar — falta mapear un código."
          count={counts.rejected}
          pendingLabel="rechazados"
          upToDateLabel="Sin rechazos"
        />
      </div>
    </div>
  );
}
