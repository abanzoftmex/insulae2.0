import type { Metadata } from "next";
import Link from "next/link";
import { getCondominiumOrganigramUseCase } from "@/modules/condominium-organigram";
import { OrganigramaEditorShell } from "./organigrama-editor-shell";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { 
  Users, 
  Settings, 
  Search, 
  Layers,
  ShieldCheck,
  UserCheck,
  Eye,
  Edit2
} from "lucide-react";

export const metadata: Metadata = {
  title: "Estructura Condominal | Insulae 2.0",
  description: "Organigrama operativo y gobierno interno del condominio.",
};

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<{
  mode?: string;
}>;

interface EstructuraCondominalPageProps {
  searchParams: PageSearchParams;
}

export default async function EstructuraCondominalPage({ searchParams }: EstructuraCondominalPageProps) {
  const params = await searchParams;
  const isEditMode = params.mode === "edit";

  const snapshot = await getCondominiumOrganigramUseCase.execute();

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para construir el organigrama.</p>
      </div>
    );
  }

  const totalPositions = snapshot.groups.reduce((acc, g) => acc + g.rows.length, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-brand tracking-tighter uppercase">Estructura Condominal</h1>
            <Badge variant="brand">Gobierno Interno</Badge>
          </div>
          <p className="text-ink-soft/50 text-[11px] font-bold uppercase tracking-tight">
            {snapshot.condominiumName} · Organigrama de responsables y toma de decisiones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode ? (
            <Button variant="outline" size="sm" asChild className="h-8 px-4 text-[10px] font-black uppercase">
              <Link href="/estructura-condominal"><Eye className="h-3.5 w-3.5 mr-1.5" /> Modo Lectura</Link>
            </Button>
          ) : (
            <Button variant="dark" size="sm" asChild className="h-8 px-4 text-[10px] font-black uppercase shadow-lg shadow-brand-deep/20">
              <Link href="/estructura-condominal?mode=edit"><Edit2 className="h-3.5 w-3.5 mr-1.5" /> Editar Organigrama</Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Grupos Directivos" value={snapshot.groups.length} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard label="Cargos Totales" value={totalPositions} icon={<Users className="h-3.5 w-3.5" />} />
        <StatCard label="Responsables" value={snapshot.groups.reduce((acc, g) => acc + g.rows.reduce((a, r) => a + r.responsible.length, 0), 0)} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
        <StatCard label="Suplentes" value={snapshot.groups.reduce((acc, g) => acc + g.rows.reduce((a, r) => a + r.alternates.length, 0), 0)} icon={<UserCheck className="h-3.5 w-3.5" />} />
      </div>

      {isEditMode ? (
        <OrganigramaEditorShell groups={snapshot.groups} userOptions={snapshot.userOptions} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {snapshot.groups.length === 0 ? (
            <div className="col-span-full py-20 text-center text-ink-soft/30 italic font-bold uppercase text-[11px] bg-card rounded-md border border-line">
              No hay grupos o cargos configurados
            </div>
          ) : (
            snapshot.groups.map((group) => (
              <Card key={group.groupId} className="overflow-hidden border-transparent shadow-layered h-fit">
                <CardHeader className="px-4 py-3 border-b border-line bg-canvas/30">
                  <CardTitle className="text-[12px] font-black uppercase tracking-widest text-brand">{group.groupName}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="h-8 bg-canvas/10 text-[9px] font-black uppercase tracking-widest text-ink-soft/40 border-b border-line/30">
                        <th className="px-4 py-2">Cargo / Responsabilidad</th>
                        <th className="px-4 py-2">Titular</th>
                        <th className="px-4 py-2">Suplente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/30">
                      {group.rows.map((row) => (
                        <tr key={row.positionId} className="h-12 hover:bg-canvas/5 transition-colors group/row">
                          <td className="px-4 py-2">
                             <p className="text-[12px] font-bold text-ink leading-tight">{row.positionName}</p>
                          </td>
                          <td className="px-4 py-2">
                             {row.responsible.length === 0 ? (
                               <span className="text-[10px] text-ink-soft/20 uppercase font-black">Pendiente</span>
                             ) : (
                               row.responsible.map((item) => (
                                 <p key={item.userId} className="text-[11px] font-bold text-brand">{item.displayName}</p>
                               ))
                             )}
                          </td>
                          <td className="px-4 py-2">
                             {!row.allowsAlternate ? (
                               <span className="text-[9px] text-ink-soft/20 uppercase font-black tracking-tighter">No aplica</span>
                             ) : row.alternates.length === 0 ? (
                               <span className="text-[10px] text-ink-soft/20 uppercase font-black">Pendiente</span>
                             ) : (
                               row.alternates.map((item) => (
                                 <p key={item.userId} className="text-[11px] font-medium text-ink-soft">{item.displayName}</p>
                               ))
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
