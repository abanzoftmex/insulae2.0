"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteExpenseAction } from "../actions";
import { deleteCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import type { ExpenseRecord } from "@/modules/expense";

type BudgetConceptItem = { id: string; name: string; budgetGroup: string };

interface ExpenseListProps {
  initialExpenses: ExpenseRecord[];
  budgetConcepts: BudgetConceptItem[];
  condominiumSlug: string;
  projectId: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  CHECK: "Cheque",
  OTHER: "Otro",
};

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "CHECK", "OTHER"];
const ROWS_PER_PAGE = 100;

const BUDGET_GROUP_LABELS: Record<string, string> = {
  ADMINISTRATION: "Gastos administración",
  MAINTENANCE: "Gastos mantenimiento",
};

function getBudgetGroupLabel(group: string | null): string {
  if (!group) return "N/A";
  return BUDGET_GROUP_LABELS[group] || group;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
}

export function ExpenseList({ initialExpenses, budgetConcepts, condominiumSlug, projectId }: ExpenseListProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);

  useEffect(() => { setExpenses(initialExpenses); }, [initialExpenses]);

  const [search, setSearch] = useState("");
  const [filterConcept, setFilterConcept] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [page, setPage] = useState(0);

  const filteredExpenses = useMemo(() => {
    let result = expenses;

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.concept.toLowerCase().includes(term) ||
          (e.projectName ?? "").toLowerCase().includes(term) ||
          (e.notes ?? "").toLowerCase().includes(term),
      );
    }

    if (filterConcept) {
      result = result.filter((e) => e.budgetConceptId === filterConcept);
    }

    if (filterMethod) {
      result = result.filter((e) => e.paymentMethod === filterMethod);
    }

    return result;
  }, [expenses, search, filterConcept, filterMethod]);

  useEffect(() => { setPage(0); }, [search, filterConcept, filterMethod]);

  const totalPages = Math.ceil(filteredExpenses.length / ROWS_PER_PAGE);
  const paginatedExpenses = useMemo(
    () => filteredExpenses.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE),
    [filteredExpenses, page],
  );

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses],
  );


  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este egreso? Esta acción es permanente y no se puede deshacer.")) return;
    const expense = expenses.find((e) => e.id === id);
    if (expense?.receiptUrl) {
      await deleteCondominiumAsset(expense.receiptUrl);
    }
    const res = await deleteExpenseAction(id);
    if (res.success) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } else {
      alert("Error: " + res.error);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-[ui-serif] text-3xl text-[#2f221a]">Egresos</h1>
          <p className="text-[#9a6a4a] text-sm mt-1 uppercase tracking-widest font-medium">
            Registro y gestión de egresos
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/listado-gastos/importar" className="border border-[#ccb49c]/40 hover:bg-[#f8efe3]/50 text-[#6d422a] px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all shadow-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            IMPORTAR
          </Link>
          <Link href="/listado-gastos/nuevo" className="bg-[#5a7b56] hover:bg-[#4a6b46] text-white px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all shadow-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            NUEVO EGRESO
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#fcf9f5] border border-[#ccb49c]/30 rounded-2xl p-6 shadow-[inset_0_2px_10px_rgba(204,180,156,0.05)]">
          <h3 className="text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1">Total Registros</h3>
          <p className="text-2xl font-[ui-serif] text-[#2f221a]">{filteredExpenses.length}</p>
        </div>
        <div className="bg-[#fcf9f5] border border-[#ccb49c]/30 rounded-2xl p-6 shadow-[inset_0_2px_10px_rgba(204,180,156,0.05)]">
          <h3 className="text-[10px] uppercase tracking-widest text-[#9a6a4a] font-bold mb-1">Monto Total</h3>
          <p className="text-2xl font-[ui-serif] text-[#5a7b56]">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#fcf9f5] border border-[#ccb49c]/30 p-3 rounded-2xl flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a6a4a]"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            type="text"
            placeholder="Buscar por concepto, proyecto, notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f8efe3]/30 border border-[#ccb49c]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5a7b56]/50 text-sm placeholder-[#9a6a4a]/60 text-[#2f221a]"
          />
        </div>
        <select
          value={filterConcept}
          onChange={(e) => setFilterConcept(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-[#f8efe3]/30 border border-[#ccb49c]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5a7b56]/50 text-sm text-[#2f221a]"
        >
          <option value="">Todos los conceptos</option>
          {budgetConcepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.budgetGroup})
            </option>
          ))}
        </select>
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-[#f8efe3]/30 border border-[#ccb49c]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5a7b56]/50 text-sm text-[#2f221a]"
        >
          <option value="">Formas de pago</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#fcf9f5] border border-[#ccb49c]/30 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ccb49c]/20 text-[10px] uppercase tracking-widest text-[#9a6a4a] bg-[#f8efe3]/30 whitespace-nowrap">
                <th className="px-6 py-4 font-bold">Tipo de egreso</th>
                <th className="px-6 py-4 font-bold">Concepto</th>
                <th className="px-6 py-4 font-bold">Forma de pago</th>
                <th className="px-6 py-4 font-bold">Monto</th>
                <th className="px-6 py-4 font-bold">Fecha</th>
                <th className="px-6 py-4 font-bold text-center">Factura/recibo</th>
                <th className="px-6 py-4 font-bold">Proyecto</th>
                <th className="px-6 py-4 font-bold">Observaciones</th>
                <th className="px-6 py-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ccb49c]/10 text-[#2f221a]">
              {paginatedExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-[#f8efe3]/20 transition-colors border-b border-[#ccb49c]/5 last:border-0">
                  <td className="px-6 py-4 font-medium whitespace-normal min-w-[160px] leading-snug">
                    {getBudgetGroupLabel(expense.budgetGroupName)}
                  </td>
                  <td className="px-6 py-4 text-[#6d422a] font-medium whitespace-normal min-w-[180px] leading-snug">
                    {expense.budgetConceptName || "Sin concepto"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-[#ebe0d3] text-[#6d422a] px-2.5 py-1 rounded-md text-xs font-medium">
                      {expense.paymentMethod ? PAYMENT_METHOD_LABELS[expense.paymentMethod] : "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-[ui-serif] font-medium text-[#5a7b56] whitespace-nowrap">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 text-[#6d422a] whitespace-nowrap">{formatDate(expense.date)}</td>
                  <td className="px-6 py-4 text-center flex justify-center whitespace-nowrap">
                    {expense.receiptUrl ? (
                      <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[#5a7b56] hover:text-[#4a6b46] transition-colors" title="Ver comprobante">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </a>
                    ) : (
                      <span className="text-[#9a6a4a]/50 text-xs italic">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[#9a6a4a] whitespace-normal min-w-[140px] leading-snug">
                    {expense.projectName || <span className="italic text-[#ccb49c]">N/A</span>}
                  </td>
                  <td className="px-6 py-4 text-[#9a6a4a] whitespace-normal min-w-[180px] leading-snug">
                    {expense.concept || expense.notes || <span className="italic text-[#ccb49c]">N/A</span>}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/listado-gastos/${expense.id}`}
                        className="w-8 h-8 rounded-full border border-[#ccb49c]/30 flex items-center justify-center text-[#9a6a4a] hover:bg-[#ebe0d3] hover:text-[#6d422a] transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </Link>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="w-8 h-8 rounded-full border border-[#ccb49c]/30 flex items-center justify-center text-[#9a6a4a] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-[#9a6a4a]">
                    No se encontraron registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#ccb49c]/20 bg-[#f8efe3]/10">
            <p className="text-xs text-[#9a6a4a]">
              Mostrando {page * ROWS_PER_PAGE + 1} a {Math.min((page + 1) * ROWS_PER_PAGE, filteredExpenses.length)} de {filteredExpenses.length}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-[#ccb49c]/30 rounded-lg text-xs font-medium text-[#6d422a] disabled:opacity-40 hover:bg-[#ebe0d3] transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-[#ccb49c]/30 rounded-lg text-xs font-medium text-[#6d422a] disabled:opacity-40 hover:bg-[#ebe0d3] transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
