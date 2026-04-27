"use client";

import { deleteBudgetGroupAction, deleteBudgetConceptAction } from "../../presupuestos/actions";

interface DeleteProps {
  id: string;
  type: "group" | "concept";
}

export function DeleteButton({ id, type }: DeleteProps) {
  const handleDelete = async () => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar este ${type === "group" ? "grupo" : "concepto"}?`
    );
    if (!confirmed) return;

    if (type === "group") {
      await deleteBudgetGroupAction(id);
    } else {
      await deleteBudgetConceptAction(id);
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-white rounded-lg border border-gray-100 hover:border-red-100"
      title={`Eliminar ${type === "group" ? "grupo" : "concepto"}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
      </svg>
    </button>
  );
}

export function DeleteConceptTrigger({ id, name }: { id: string; name: string }) {
  const handleDelete = async () => {
    const confirmed = window.confirm(`¿Estás seguro de eliminar el concepto "${name}"?`);
    if (!confirmed) return;
    await deleteBudgetConceptAction(id);
  };

  return (
    <button
      onClick={handleDelete}
      className="text-[#ccb49c] hover:text-red-500 transition-colors ml-1"
      title="Eliminar concepto"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
