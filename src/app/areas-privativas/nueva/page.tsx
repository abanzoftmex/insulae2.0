import Link from "next/link";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { createPrivateAreaAction } from "../actions";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Nueva Área Privativa | Insulae 2.0",
  description: "Formulario para la creación de nuevas áreas privativas en Sassi.",
};

export const dynamic = "force-dynamic";

export default async function NuevaAreaPrivativaPage() {
  // 1. Obtener el condominio activo
  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: {
      id: true,
      zoneCatalogs: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
      landUseCatalogs: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
      users: {
        where: { isActive: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  if (!condominium) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-6 py-20">
        <Card className="w-full max-w-sm text-center border-transparent shadow-layered p-8">
          <Badge variant="brand" className="w-fit mx-auto rounded-full px-4 py-2 text-[10px] tracking-widest mb-4">
            Nueva AP
          </Badge>
          <h1 className="text-2xl font-bold text-ink tracking-tighter uppercase">Sin condominio activo</h1>
          <p className="mt-3 text-[12px] text-ink-soft">
            No se encontró un condominio activo configurado en el sistema.
          </p>
          <Button variant="dark" size="sm" asChild className="mt-6">
            <Link href="/areas-privativas">Volver a Áreas Privativas</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const zones = condominium.zoneCatalogs;
  const landUses = condominium.landUseCatalogs;
  const users = condominium.users.map((u) => ({
    id: u.id,
    name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Usuario sin nombre",
    email: u.email,
  }));

  const fieldCls =
    "flex h-9 w-full rounded-md border border-line bg-card px-3 py-1 text-[13px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent";
  const labelCls = "text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none";

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-20 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Crear Nueva AP</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
              Alta Lote
            </Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Ingresa los datos generales, superficies y configuración para dar de alta una nueva área privativa.
            </p>
          </div>
        </div>

        <div>
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25">
            <Link href="/areas-privativas">
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" /> Volver al Listado
            </Link>
          </Button>
        </div>
      </div>

      {/* Form */}
      <form action={createPrivateAreaAction} className="space-y-5">
        
        {/* Sección 1: Información General */}
        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Información General</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-3">
                <label className={labelCls}>¿Es una fusión?</label>
                <div className="flex items-center gap-6 text-[12px] font-medium text-ink h-9">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isFusion"
                      value="0"
                      defaultChecked
                      className="accent-brand cursor-pointer"
                    />
                    No
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isFusion"
                      value="1"
                      className="accent-brand cursor-pointer"
                    />
                    Sí
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Nombre / Identificador"
                  type="text"
                  name="name"
                  placeholder="Ej. Lote 12"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Input
                label="Nomenclatura / Código"
                type="text"
                name="code"
                placeholder="Ej. L-12"
              />

              <Input
                label="Número de ordenamiento"
                type="number"
                name="sortOrder"
                placeholder="Ej. 12"
                defaultValue="0"
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className={labelCls}>Zona / Barrio</label>
                <select
                  name="zoneId"
                  className={fieldCls}
                  defaultValue=""
                >
                  <option value="">Selecciona una zona</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Sección 2: Superficies y Parámetros */}
        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Superficies y Métricas (M2)</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Input
                label="M2 del área privativa"
                type="number"
                step="0.0001"
                name="m2Updated"
                placeholder="0.0000"
              />

              <Input
                label="M2 iniciales (Original)"
                type="number"
                step="0.0001"
                name="m2Original"
                placeholder="0.0000"
              />

              <Input
                label="M2 de construcción"
                type="number"
                step="0.0001"
                name="m2Construction"
                placeholder="0.0000"
              />

              <Input
                label="M2 del área común"
                type="number"
                step="0.0001"
                name="m2CommonArea"
                placeholder="0.0000"
              />

              <Input
                label="Porcentaje VCCC"
                type="number"
                step="0.000001"
                name="vccc"
                placeholder="0.000000"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sección 3: Uso de Suelo y Administración */}
        <Card className="border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Uso de Suelo y Administración</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5 w-full">
                <label className={labelCls}>Uso de Suelo</label>
                <select
                  name="landUseId"
                  className={fieldCls}
                  defaultValue=""
                >
                  <option value="">Selecciona el uso de suelo</option>
                  {landUses.map((use) => (
                    <option key={use.id} value={use.id}>
                      {use.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className={labelCls}>Administrador del Subcondominio</label>
                <select
                  name="administratorId"
                  className={fieldCls}
                  defaultValue=""
                >
                  <option value="">Sin asignar administrador</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.email ? `(${user.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Submit Actions */}
        <Card className="border-transparent shadow-layered">
          <CardContent className="p-4 flex gap-3 justify-end bg-card rounded-card border border-line/45">
            <Button variant="outline" size="md" asChild className="font-bold uppercase tracking-widest text-[11px]">
              <Link href="/areas-privativas">Cancelar</Link>
            </Button>
            <Button type="submit" variant="dark" size="md" className="font-bold uppercase tracking-widest text-[11px] px-8 bg-gold hover:bg-[#bca065] text-white">
              Crear Área Privativa
            </Button>
          </CardContent>
        </Card>

      </form>
    </div>
  );
}
