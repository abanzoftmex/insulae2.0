"use client";

import { Role, ModuleCatalog } from "@/modules/role/domain/role.types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoleAction, updateRoleAction } from "../actions";
import Link from "next/link";

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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href="/listado-roles"
          className="p-2 hover:bg-[#e8dbcc] text-[#6d422a] rounded-xl transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#2f221a]">
            {initialData ? "Editar Rol" : "Nuevo Rol"}
          </h1>
          <p className="text-[#958172] text-sm">Define el nombre y los permisos del rol.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-[#e8dbcc]">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#6d422a]">Nombre del rol</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ej. Administrador de Ingresos"
            className="w-full px-4 py-3 rounded-xl border border-[#e8dbcc] focus:outline-none focus:ring-2 focus:ring-[#5a7b56]/20 focus:border-[#5a7b56] transition-all bg-[#fcf9f5]/30"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#6d422a]">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descripción de las responsabilidades"
            className="w-full px-4 py-3 rounded-xl border border-[#e8dbcc] focus:outline-none focus:ring-2 focus:ring-[#5a7b56]/20 focus:border-[#5a7b56] transition-all bg-[#fcf9f5]/30"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8dbcc] overflow-hidden">
        <div className="p-6 border-b border-[#e8dbcc] bg-[#fcf9f5]/50">
          <h2 className="font-bold text-[#2f221a]">Permisos por módulo</h2>
          <p className="text-[#958172] text-sm mt-1">Configura las acciones permitidas para cada sección del sistema.</p>
        </div>
        <div className="max-h-[500px] overflow-auto border-t border-[#e8dbcc] scrollbar-thin scrollbar-thumb-[#e8dbcc] scrollbar-track-transparent">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-30">
              <tr className="bg-[#fcf9f5]">
                <th className="sticky top-0 bg-[#fcf9f5] border-b border-[#e8dbcc] px-6 py-4 text-sm font-semibold text-[#6d422a] z-30">Módulo</th>
                <th className="sticky top-0 bg-[#fcf9f5] border-b border-[#e8dbcc] px-6 py-4 text-sm font-semibold text-[#6d422a] text-center z-30">Leer</th>
                <th className="sticky top-0 bg-[#fcf9f5] border-b border-[#e8dbcc] px-6 py-4 text-sm font-semibold text-[#6d422a] text-center z-30">Crear</th>
                <th className="sticky top-0 bg-[#fcf9f5] border-b border-[#e8dbcc] px-6 py-4 text-sm font-semibold text-[#6d422a] text-center z-30">Editar</th>
                <th className="sticky top-0 bg-[#fcf9f5] border-b border-[#e8dbcc] px-6 py-4 text-sm font-semibold text-[#6d422a] text-center z-30">Eliminar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8dbcc]">
              {modules.map((mod) => (
                <tr key={mod.id} className="hover:bg-[#fcf9f5]/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#2f221a]">{mod.name}</td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permissions[mod.id]?.canRead}
                      onChange={(e) => handlePermissionChange(mod.id, "canRead", e.target.checked)}
                      className="w-5 h-5 rounded border-[#e8dbcc] text-[#5a7b56] focus:ring-[#5a7b56]"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permissions[mod.id]?.canCreate}
                      onChange={(e) => handlePermissionChange(mod.id, "canCreate", e.target.checked)}
                      className="w-5 h-5 rounded border-[#e8dbcc] text-[#5a7b56] focus:ring-[#5a7b56]"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permissions[mod.id]?.canUpdate}
                      onChange={(e) => handlePermissionChange(mod.id, "canUpdate", e.target.checked)}
                      className="w-5 h-5 rounded border-[#e8dbcc] text-[#5a7b56] focus:ring-[#5a7b56]"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permissions[mod.id]?.canDelete}
                      onChange={(e) => handlePermissionChange(mod.id, "canDelete", e.target.checked)}
                      className="w-5 h-5 rounded border-[#e8dbcc] text-[#5a7b56] focus:ring-[#5a7b56]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium">Información guardada con éxito. Redirigiendo...</div>}

      <div className="flex justify-end gap-4">
        <Link
          href="/listado-roles"
          className="px-6 py-3 rounded-xl border border-[#e8dbcc] text-[#6d422a] font-medium hover:bg-[#fcf9f5] transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading || success}
          className="px-8 py-3 rounded-xl bg-[#5a7b56] text-white font-semibold hover:bg-[#4a6b46] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
          Guardar información
        </button>
      </div>
    </form>
  );
}
