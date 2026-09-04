import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Badge } from "@/components/ui/badge";
import { 
  FileDown, 
  Table as TableIcon, 
  Upload, 
  Info, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { ImportIncomeForm } from "./components/import-income-form";

export default async function ImportarIngresosPage() {
  await requirePageAccess(MODULES.COBROS);

  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  if (!condominium) return null;

  const [catalogs, chargeGroups] = await Promise.all([
    prisma.miscIncomeCatalog.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, legacyId: true },
    }),
    prisma.chargeGroup.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, legacyId: true, kind: true },
    }),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <div className="flex items-start gap-3 border-b border-brand pb-6">
        <PageBackBadge className="mt-1.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Importador Masivo de Ingresos</h1>
          <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
            {condominium.name} · Siga los pasos para cargar múltiples registros.
          </p>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-canvas p-5 rounded-xl border border-line shadow-sm space-y-3">
          <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold">1</div>
          <h3 className="font-bold text-sm uppercase tracking-tight">Descargar Plantilla</h3>
          <p className="text-[11px] text-ink-soft leading-relaxed">
            Utilice el formato oficial de Excel para asegurar que los datos se procesen correctamente.
          </p>
          <a 
            href="/listado-ingresos/plantilla" 
            download 
            className="flex items-center justify-center w-full py-2 bg-white border border-line rounded-lg text-[10px] font-bold uppercase hover:bg-canvas-dark transition-all"
          >
            <FileDown className="h-3 w-3 mr-2 text-brand" /> Descargar Excel
          </a>
        </div>

        <div className="bg-canvas p-5 rounded-xl border border-line shadow-sm space-y-3">
          <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold">2</div>
          <h3 className="font-bold text-sm uppercase tracking-tight">Llenar Información</h3>
          <p className="text-[11px] text-ink-soft leading-relaxed">
            Complete las columnas <code className="text-[10px] bg-white px-1">fecha</code>, <code className="text-[10px] bg-white px-1">monto</code>, y use los IDs de los catálogos de abajo.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-lime-600" />
            <span className="text-[10px] font-bold text-ink-soft">Formato YYYY-MM-DD</span>
          </div>
        </div>

        <div className="bg-canvas p-5 rounded-xl border border-line shadow-sm space-y-3">
          <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold">3</div>
          <h3 className="font-bold text-sm uppercase tracking-tight">Subir y Procesar</h3>
          <p className="text-[11px] text-ink-soft leading-relaxed">
            Arrastre el archivo terminado a la zona de carga para iniciar la validación e importación.
          </p>
          <div className="flex items-center gap-2 pt-1 text-amber-600">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold">Máximo 1000 filas por carga</span>
          </div>
        </div>
      </div>

      {/* Formulario de Carga */}
      <ImportIncomeForm />

      {/* Catálogos */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <TableIcon className="h-4 w-4 text-brand" />
          <h2 className="font-bold uppercase tracking-tighter text-lg">Catálogo de Categorías y Tipos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Categorías */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-ink-soft tracking-widest">Categorías de Ingresos</h4>
              <Badge variant="outline" className="text-[9px] font-bold">{catalogs.length}</Badge>
            </div>
            <div className="border border-line rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-left">
                <thead className="bg-canvas border-b border-line">
                  <tr>
                    <th className="px-4 py-2 text-[10px] font-black uppercase text-ink-soft w-16">ID (Legacy)</th>
                    <th className="px-4 py-2 text-[10px] font-black uppercase text-ink-soft">Nombre de Categoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {catalogs.map((c) => (
                    <tr key={c.id} className="hover:bg-canvas/50 transition-colors">
                      <td className="px-4 py-2 text-[11px] font-bold text-brand">{c.legacyId || "—"}</td>
                      <td className="px-4 py-2 text-[11px] font-medium text-ink-soft">{c.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-ink-soft/60 italic flex items-center gap-1.5 px-1">
              <Info className="h-3 w-3" /> Use el número en la columna <code className="bg-canvas px-1 not-italic">id_categoria</code>
            </p>
          </div>

          {/* Tipos de cuota */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-ink-soft tracking-widest">Tipos de Cuota (Grupos)</h4>
              <Badge variant="outline" className="text-[9px] font-bold">{chargeGroups.length}</Badge>
            </div>
            <div className="border border-line rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-left">
                <thead className="bg-canvas border-b border-line">
                  <tr>
                    <th className="px-4 py-2 text-[10px] font-black uppercase text-ink-soft w-16">ID (Legacy)</th>
                    <th className="px-4 py-2 text-[10px] font-black uppercase text-ink-soft">Grupo de Cobro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {chargeGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-canvas/50 transition-colors">
                      <td className="px-4 py-2 text-[11px] font-bold text-cyan-700">{g.legacyId || "—"}</td>
                      <td className="px-4 py-2 text-[11px] font-medium text-ink-soft">
                        {g.name} 
                        <span className="ml-2 opacity-50 text-[9px] uppercase">({g.kind})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-ink-soft/60 italic flex items-center gap-1.5 px-1">
              <Info className="h-3 w-3" /> Use el número en la columna <code className="bg-canvas px-1 not-italic">id_tipo_cuota</code>
            </p>
          </div>
        </div>

        {/* Formas de Pago */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between max-w-md">
            <h4 className="text-[11px] font-black uppercase text-ink-soft tracking-widest">Catálogo de Formas de Pago</h4>
          </div>
          <div className="border border-line rounded-xl overflow-hidden shadow-sm bg-white max-w-md">
            <table className="w-full text-left">
              <thead className="bg-lime-600 text-white">
                <tr>
                  <th className="px-4 py-2 text-[10px] font-black uppercase w-16">ID</th>
                  <th className="px-4 py-2 text-[10px] font-black uppercase">Forma de Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr className="hover:bg-canvas/50"><td className="px-4 py-2 text-[11px] font-bold">1</td><td className="px-4 py-2 text-[11px] font-medium text-ink-soft">N/A</td></tr>
                <tr className="hover:bg-canvas/50"><td className="px-4 py-2 text-[11px] font-bold">2</td><td className="px-4 py-2 text-[11px] font-medium text-ink-soft">Efectivo</td></tr>
                <tr className="hover:bg-canvas/50"><td className="px-4 py-2 text-[11px] font-bold">3</td><td className="px-4 py-2 text-[11px] font-medium text-ink-soft">Transferencia</td></tr>
                <tr className="hover:bg-canvas/50"><td className="px-4 py-2 text-[11px] font-bold">4</td><td className="px-4 py-2 text-[11px] font-medium text-ink-soft">Tarjeta</td></tr>
                <tr className="hover:bg-canvas/50"><td className="px-4 py-2 text-[11px] font-bold">5</td><td className="px-4 py-2 text-[11px] font-medium text-ink-soft">Cheque</td></tr>
                <tr className="hover:bg-canvas/50"><td className="px-4 py-2 text-[11px] font-bold">6</td><td className="px-4 py-2 text-[11px] font-medium text-ink-soft">Otro</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-ink-soft/60 italic flex items-center gap-1.5 px-1">
            <Info className="h-3 w-3" /> Use el número en la columna <code className="bg-canvas px-1 not-italic">id_forma_pago</code>
          </p>
        </div>
      </div>
    </div>
  );
}
