"use client";

import { Role } from "@/modules/role/domain/role.types";
import { deleteRoleAction } from "../actions";
import Link from "next/link";
import { useState } from "react";

interface Props {
  roles: Role[];
  condominiumId: string;
}

export function RoleList({ roles, condominiumId }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este rol?")) return;
    setLoading(id);
    const result = await deleteRoleAction(id, condominiumId);
    if (!result.success) {
      alert("Error: " + result.error);
    }
    setLoading(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href="/listado-roles/nuevo"
          className="bg-[#5a7b56] hover:bg-[#4a6b46] text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
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
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Nuevo rol
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8dbcc] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#fcf9f5] border-b border-[#e8dbcc]">
              <th className="px-6 py-4 text-sm font-semibold text-[#6d422a]">Nombre del Rol</th>
              <th className="px-6 py-4 text-sm font-semibold text-[#6d422a]">Descripción</th>
              <th className="px-6 py-4 text-sm font-semibold text-[#6d422a] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8dbcc]">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-[#958172]">
                  No hay roles registrados.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="hover:bg-[#fcf9f5]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#2f221a]">{role.name}</td>
                  <td className="px-6 py-4 text-[#6d422a] text-sm">{role.description || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/listado-roles/${role.id}`}
                        className="p-2 text-[#6d422a] hover:bg-[#e8dbcc] rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDelete(role.id)}
                        disabled={loading === role.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
