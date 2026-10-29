"use client";

import { useState } from "react";
import { Sanction } from "@/modules/sanction/domain/sanction.types";
import { deleteSanctionAction } from "../actions";
import { useRouter } from "next/navigation";
import Link from "next/link";


interface Props {
  sanctions: Sanction[];
}

export function SanctionList({ sanctions }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta sanción?")) return;
    
    setIsDeleting(id);
    const result = await deleteSanctionAction(id);
    if (!result.success) {
      alert(result.error);
    }
    setIsDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#2f221a]">Tipos de Sanciones</h1>
          <p className="text-[#6d422a] mt-1 text-sm">Administra el catálogo de sanciones y sus fundamentos legales.</p>
        </div>
        <Link 
          href="/sanciones/nuevo"
          className="inline-flex items-center gap-2 bg-[#5a7b56] hover:bg-[#4a6b46] text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Nueva sanción
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-[#ccb49c]/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcf9f5] border-b border-[#ccb49c]/30">
                <th className="px-6 py-4 font-semibold text-[#6d422a] w-1/3">Nombre</th>
                <th className="px-6 py-4 font-semibold text-[#6d422a] w-1/2">Fundamento en Artículo</th>
                <th className="px-6 py-4 font-semibold text-[#6d422a] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ccb49c]/10 text-sm">
              {sanctions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-[#958172]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-50"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <p>No hay sanciones registradas</p>
                  </td>
                </tr>
              ) : (
                sanctions.map((sanction) => (
                  <tr key={sanction.id} className="hover:bg-[#fcf9f5]/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#2f221a]">{sanction.name}</td>
                    <td className="px-6 py-4 text-[#6d422a]">
                      {sanction.article ? (
                        <span className="inline-flex items-center gap-1.5 bg-[#fcf9f5] px-3 py-1 rounded-full border border-[#ccb49c]/20">
                          {sanction.article}
                        </span>
                      ) : (
                        <span className="text-[#ccb49c] italic">Sin fundamento</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link 
                          href={`/sanciones/${sanction.id}`}
                          className="p-2 text-[#6d422a] hover:bg-[#e8dbcc] rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(sanction.id)}
                          disabled={isDeleting === sanction.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
    </div>
  );
}
