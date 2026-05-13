"use client";

import { Role, ModuleCatalog } from "@/modules/role/domain/role.types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoleAction, updateRoleAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Save } from "lucide-react";

interface Props {
  initialData?: Role;
  modules: ModuleCatalog[];
  condominiumId: string;
}

export function RoleForm({ initialData, modules, condominiumId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");

  // Initialize permissions state
  const [permissions, setPermissions] = useState<{ [moduleId: string]: any }>(() => {
    const state: { [moduleId: string]: any } = {};
    modules.forEach((mod) => {
      const existing = initialData?.permissions?.find((p) => p.moduleId === mod.id);
      state[mod.id] = {
        canCreate: existing?.canCreate || false,
        canUpdate: existing?.canUpdate || false,
        canRead: existing?.canRead || false,
        canDelete: existing?.canDelete || false,
      };
    });
    return state;
  });

  const handlePermissionChange = (moduleId: string, field: string, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const permissionArray = Object.keys(permissions).map((moduleId) => ({
      moduleId,
      ...permissions[moduleId],
    }));

    const result = initialData
      ? await updateRoleAction({
          id: initialData.id,
          condominiumId,
          name,
          description,
          permissions: permissionArray,
        })
      : await createRoleAction({
          condominiumId,
          name,
          description,
          permissions: permissionArray,
        });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/listado-roles");
        router.refresh();
      }, 1500);
    } else {
      setError(result.error || "Ocurrió un error al guardar.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">
              {initialData ? "Editar Rol" : "Nuevo Rol"}
            </h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
              Control de Acceso
            </Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {initialData ? "Modifica nombre, descripción y permisos del rol" : "Define nombre y permisos para el nuevo rol"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Datos básicos */}
        <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white">Información General</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Nombre del Rol *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej. Administrador de Ingresos"
            />
            <Input
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción de las responsabilidades"
            />
          </div>
        </div>

        {/* Permisos */}
        <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white">Permisos por Módulo</p>
          </div>
          <div className="max-h-125 overflow-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-30">
                <tr className="bg-canvas/95 backdrop-blur-sm border-b border-line">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand">Módulo</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 text-center">Leer</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 text-center">Crear</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 text-center">Editar</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 text-center">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/30">
                {modules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-canvas/30 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-bold text-ink">{mod.name}</td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={permissions[mod.id]?.canRead} onChange={(e) => handlePermissionChange(mod.id, "canRead", e.target.checked)} className="w-4 h-4 rounded border-line text-brand focus:ring-brand" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={permissions[mod.id]?.canCreate} onChange={(e) => handlePermissionChange(mod.id, "canCreate", e.target.checked)} className="w-4 h-4 rounded border-line text-brand focus:ring-brand" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={permissions[mod.id]?.canUpdate} onChange={(e) => handlePermissionChange(mod.id, "canUpdate", e.target.checked)} className="w-4 h-4 rounded border-line text-brand focus:ring-brand" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={permissions[mod.id]?.canDelete} onChange={(e) => handlePermissionChange(mod.id, "canDelete", e.target.checked)} className="w-4 h-4 rounded border-line text-brand focus:ring-brand" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-danger/5 border border-danger/20 text-danger rounded-md text-[11px] font-bold">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-success/5 border border-success/20 text-success rounded-md text-[11px] font-bold">Información guardada con éxito. Redirigiendo...</div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" type="button" onClick={() => router.push("/listado-roles")} className="h-8 text-[10px] font-bold uppercase tracking-widest">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || success} className="h-8 px-6 text-[10px] font-bold uppercase tracking-widest gap-2">
            <Save className="h-3.5 w-3.5" />
            {loading ? "Guardando..." : "Guardar Rol"}
          </Button>
        </div>

      </form>
    </div>
  );
}
