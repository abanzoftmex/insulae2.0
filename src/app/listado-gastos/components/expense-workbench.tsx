"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { 
  Plus, 
  FileDown, 
  Upload, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Layers,
  ArrowRight,
  Loader2,
  FileText,
  Briefcase
} from "lucide-react";
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from "../actions";
import { importExpensesAction } from "../import-actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { read, utils } from "xlsx";
import type { ExpenseRecord } from "@/modules/expense";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";

type BudgetConceptItem = { id: string; name: string; budgetGroup: string };

interface ExpenseWorkbenchProps {
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

const PAYMENT_METHOD_VARIANT: Record<string, "success" | "brand" | "warning" | "outline"> = {
  CASH: "success",
  TRANSFER: "brand",
  CARD: "warning",
  CHECK: "outline",
  OTHER: "outline",
};

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "CHECK", "OTHER"];

const BUDGET_GROUP_LABELS: Record<string, string> = {
  ADMINISTRATION: "Administración",
  MAINTENANCE: "Mantenimiento",
};

export function ExpenseWorkbench({ 
  initialExpenses, 
  budgetConcepts, 
  condominiumSlug, 
  projectId 
}: ExpenseWorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formDate, setFormDate] = useState("");
  const [formConcept, setFormConcept] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("CASH");
  const [formNotes, setFormNotes] = useState("");
  const [formBudgetConceptId, setFormBudgetConceptId] = useState("");
  const [formProjectName, setFormProjectName] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Import State
  const [importing, setImporting] = useState(false);

  const filteredExpenses = useMemo(() => {
    const term = search.toLowerCase().trim();
    return initialExpenses.filter(e => {
      const bySearch = !term || [
        e.concept, 
        e.budgetConceptName || "", 
        e.projectName || "", 
        e.notes || ""
      ].some(f => f.toLowerCase().includes(term));
      return bySearch;
    });
  }, [initialExpenses, search]);

  const totalAmount = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);

  const openAddModal = () => {
    setEditingId(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormConcept("");
    setFormAmount("");
    setFormMethod("CASH");
    setFormNotes("");
    setFormBudgetConceptId("");
    setFormProjectName("");
    setReceiptUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (expense: ExpenseRecord) => {
    setEditingId(expense.id);
    setFormDate(new Date(expense.date).toISOString().split("T")[0]);
    setFormConcept(expense.concept);
    setFormAmount(String(expense.amount));
    setFormMethod(expense.paymentMethod || "CASH");
    setFormNotes(expense.notes || "");
    setFormBudgetConceptId(expense.budgetConceptId || "");
    setFormProjectName(expense.projectName || "");
    setReceiptUrl(expense.receiptUrl || null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload = {
        date: formDate,
        concept: formConcept,
        amount: parseFloat(formAmount),
        paymentMethod: formMethod,
        notes: formNotes || undefined,
        budgetConceptId: formBudgetConceptId || undefined,
        projectName: formProjectName || undefined,
        receiptUrl: receiptUrl || undefined
      };

      const res = editingId 
        ? await updateExpenseAction(editingId, payload)
        : await createExpenseAction(payload);

      if (res.success) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este egreso?")) return;
    startTransition(async () => {
      const res = await deleteExpenseAction(id);
      if (res.success) window.location.reload();
      else alert(res.error);
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = utils.sheet_to_json(ws, { header: 1 });
      const rows = raw.slice(1).filter(r => r.some(c => c != null && c !== "")).map(r => ({
        budgetConceptId: String(r[0] ?? "").trim() || undefined,
        date: String(r[1] ?? ""),
        amount: parseFloat(String(r[2] ?? "0")),
        paymentMethod: String(r[3] ?? "CASH"),
        concept: String(r[4] ?? ""),
        projectName: String(r[5] ?? "") || undefined,
        notes: String(r[6] ?? "") || undefined,
      }));
      const res = await importExpensesAction(rows);
      if (res.success) {
        alert(`Éxito: ${res.imported} egresos importados.`);
        window.location.reload();
      } else {
        alert("Error: " + res.error);
      }
    } catch {
      alert("Error al procesar archivo");
    } finally {
      setImporting(false);
    }
  };

  const columns: DataTableColumn<ExpenseRecord>[] = [
    {
      header: "Concepto / Categoría",
      accessorKey: "budgetConceptName",
      cell: (row) => (
        <div className="max-w-50 space-y-1">
          <p className="text-[13px] font-bold text-ink truncate leading-tight">{row.budgetConceptName || "Sin Concepto"}</p>
          <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest">
            {row.budgetGroupName ? BUDGET_GROUP_LABELS[row.budgetGroupName] || row.budgetGroupName : "N/A"}
          </Badge>
        </div>
      )
    },
    {
      header: "Proyecto",
      accessorKey: "projectName",
      cell: (row) => row.projectName
        ? <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">{row.projectName}</Badge>
        : <span className="text-[11px] text-ink-soft/40 font-bold uppercase">—</span>
    },
    {
      header: "Método",
      accessorKey: "paymentMethod",
      cell: (row) => (
        <Badge
          variant={PAYMENT_METHOD_VARIANT[row.paymentMethod || ""] ?? "outline"}
          className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest"
        >
          {PAYMENT_METHOD_LABELS[row.paymentMethod || ""] || "N/A"}
        </Badge>
      )
    },
    {
      header: "Monto",
      accessorKey: "amount",
      align: "right",
      cell: (row) => (
        <span className="text-[13px] font-bold text-danger tabular-nums">
          {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(row.amount)}
        </span>
      )
    },
    {
      header: "Fecha",
      accessorKey: "date",
      cell: (row) => (
        <span className="text-[11px] font-bold text-ink-soft/60 uppercase tracking-tight">
          {new Date(row.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" })}
        </span>
      )
    },
    {
      header: "Dcto",
      accessorKey: "receiptUrl",
      align: "center",
      cell: (row) => row.receiptUrl ? (
        <a href={row.receiptUrl} target="_blank" rel="noreferrer" className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-brand-mint/30 text-brand hover:bg-brand-mint/60 transition-colors">
          <FileText className="h-3.5 w-3.5" />
        </a>
      ) : <span className="text-ink-soft/20 text-[10px]">—</span>
    },
    {
      header: "Acciones",
      accessorKey: "id",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors"
            title="Editar"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-danger/15 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard accent="brand" label="Total Registros" value={filteredExpenses.length} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard accent="gold" label="Egreso Acumulado" value={new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(totalAmount)} icon={<DollarSign className="h-3.5 w-3.5" />} className="bg-danger/3 border-danger/10" />
        <StatCard accent="cyan" label="Conceptos" value={budgetConcepts.length} icon={<Briefcase className="h-3.5 w-3.5" />} />
      </div>

      <div className="flex items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-2">
          <Badge variant="danger">Flujo de Salida</Badge>
          <Badge variant="brand">{initialExpenses.length} Total</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/listado-gastos/plantilla" className="h-7 px-3 flex items-center justify-center rounded-pill border border-line text-ink-soft text-[9px] font-bold uppercase hover:bg-canvas transition-standard">
            <FileDown className="h-3 w-3 mr-1" /> Plantilla
          </Link>
          <label className="h-7 px-3 flex items-center justify-center rounded-pill border border-brand-accent text-brand-accent text-[9px] font-bold uppercase cursor-pointer hover:bg-brand-accent/5 transition-standard">
            <Upload className="h-3 w-3 mr-1" />
            {importing ? "..." : "Importar"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      <DataTable
        title="Historial de Egresos"
        count={filteredExpenses.length}
        data={filteredExpenses}
        columns={columns}
        onSearch={setSearch}
        onAdd={openAddModal}
        addLabel="Nuevo Egreso"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Egreso" : "Nuevo Egreso"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-bold uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !formConcept || !formAmount} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-bold uppercase"
            >
              {isPending ? "Guardando..." : "Guardar Registro"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Concepto Presupuestal</label>
              <select
                value={formBudgetConceptId}
                onChange={(e) => setFormBudgetConceptId(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
              >
                <option value="">Sin Categoría</option>
                {budgetConcepts.map(c => <option key={c.id} value={c.id}>{c.name} ({BUDGET_GROUP_LABELS[c.budgetGroup] || c.budgetGroup})</option>)}
              </select>
            </div>
            <Input label="Proyecto / Centro de Costo" value={formProjectName} onChange={(e) => setFormProjectName(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            <Input label="Monto (MXN)" type="number" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Método de Pago</label>
            <select
              value={formMethod}
              onChange={(e) => setFormMethod(e.target.value)}
              className="h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
            >
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
            </select>
          </div>

          <Textarea label="Concepto / Descripción" value={formConcept} onChange={(e) => setFormConcept(e.target.value)} className="min-h-15" />
          <Input label="Notas Internas" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />

          <div className="pt-2 border-t border-line/50">
            <p className="text-[10px] font-bold uppercase text-ink-soft/40 tracking-widest mb-2">Soporte Digital</p>
            {receiptUrl ? (
              <div className="flex items-center justify-between p-2 bg-canvas rounded-md">
                <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-brand-accent flex items-center gap-1 uppercase">
                  Ver Factura <ArrowRight className="h-3 w-3" />
                </a>
                <button onClick={() => setReceiptUrl(null)} className="text-danger p-1 rounded hover:bg-danger/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="h-9 flex items-center justify-center gap-2 border border-dashed border-line rounded-md cursor-pointer hover:bg-canvas transition-colors text-[10px] font-bold uppercase text-brand-accent">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Subir Factura o Recibo
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={async (e) => {
                  if(!e.target.files?.[0]) return;
                  const file = e.target.files[0];
                  setUploading(true);
                  try {
                    const res = await uploadCondominiumAsset({ file, condominiumSlug, projectId, kind: "expense-receipt" });
                    setReceiptUrl(res.url);
                  } finally { setUploading(false); }
                }} />
              </label>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
