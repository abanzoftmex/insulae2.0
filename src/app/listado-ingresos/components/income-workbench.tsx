"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { 
  FileDown, 
  Upload, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Layers,
  ArrowRight,
  Loader2,
  Filter
} from "lucide-react";
import { createIncomeAction, updateIncomeAction, deleteIncomeAction } from "../actions";
import { importIncomesAction } from "../import-actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { read, utils } from "xlsx";
import type { IncomeRecord } from "@/modules/income";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/modal/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";

type CatalogItem = { id: string; name: string };
type AreaItem = { id: string; name: string };
type ChargeGroupItem = { id: string; name: string; kind: string };

interface IncomeWorkbenchProps {
  initialIncomes: IncomeRecord[];
  catalogs: CatalogItem[];
  chargeGroups: ChargeGroupItem[];
  areas: AreaItem[];
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

export function IncomeWorkbench({ 
  initialIncomes, 
  catalogs, 
  chargeGroups, 
  areas, 
  condominiumSlug, 
  projectId 
}: IncomeWorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterCatalog, setFilterCatalog] = useState("all");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formDate, setFormDate] = useState("");
  const [formConcept, setFormConcept] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("CASH");
  const [formNotes, setFormNotes] = useState("");
  const [formCatalogId, setFormCatalogId] = useState("");
  const [formChargeGroupId, setFormChargeGroupId] = useState("");
  const [formAreaId, setFormAreaId] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Import State
  const [importing, setImporting] = useState(false);

  const filteredIncomes = useMemo(() => {
    const term = search.toLowerCase().trim();
    return initialIncomes.filter(i => {
      const byCatalog = filterCatalog === "all" || i.miscCatalogId === filterCatalog;
      const bySearch = !term || [
        i.concept, 
        i.miscCatalogName || "", 
        i.privateAreaName || "", 
        i.notes || ""
      ].some(f => f.toLowerCase().includes(term));
      return byCatalog && bySearch;
    });
  }, [initialIncomes, search, filterCatalog]);

  const totalAmount = useMemo(() => filteredIncomes.reduce((sum, i) => sum + i.amount, 0), [filteredIncomes]);

  const filteredAreas = useMemo(() => {
    if (!areaSearch.trim()) return areas.slice(0, 10);
    return areas.filter(a => a.name.toLowerCase().includes(areaSearch.toLowerCase())).slice(0, 10);
  }, [areas, areaSearch]);

  const openAddModal = () => {
    setEditingId(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormConcept("");
    setFormAmount("");
    setFormMethod("CASH");
    setFormNotes("");
    setFormCatalogId("");
    setFormChargeGroupId("");
    setFormAreaId("");
    setAreaSearch("");
    setReceiptUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (income: IncomeRecord) => {
    setEditingId(income.id);
    setFormDate(new Date(income.date).toISOString().split("T")[0]);
    setFormConcept(income.concept);
    setFormAmount(String(income.amount));
    setFormMethod(income.paymentMethod || "CASH");
    setFormNotes(income.notes || "");
    setFormCatalogId(income.miscCatalogId || "");
    setFormChargeGroupId(income.chargeGroupId || "");
    setFormAreaId(income.privateAreaId || "");
    setAreaSearch(income.privateAreaName || "");
    setReceiptUrl(income.receiptUrl || null);
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
        miscCatalogId: formCatalogId || undefined,
        chargeGroupId: formChargeGroupId || undefined,
        privateAreaId: formAreaId || undefined,
        receiptUrl: receiptUrl || undefined
      };

      const res = editingId 
        ? await updateIncomeAction(editingId, payload)
        : await createIncomeAction(payload);

      if (res.success) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este ingreso?")) return;
    startTransition(async () => {
      const res = await deleteIncomeAction(id);
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
      const raw: unknown[][] = utils.sheet_to_json(ws, { header: 1 });
      const rows = raw.slice(1).filter(r => Array.isArray(r) && r.some(c => c != null && c !== "")).map(r => {
        const row = r as any[];
        return {
          miscCatalogId: String(row[0] ?? "").trim() || undefined,
          chargeGroupId: String(row[1] ?? "").trim() || undefined,
          date: String(row[2] ?? ""),
          amount: parseFloat(String(row[3] ?? "0")),
          paymentMethod: String(row[4] ?? "CASH"),
          concept: String(row[5] ?? ""),
          notes: String(row[6] ?? "") || undefined,
        };
      });
      const res = await importIncomesAction(rows);
      if (res.success) {
        alert(`Éxito: ${res.imported} ingresos importados.`);
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

  const columns: DataTableColumn<IncomeRecord>[] = [
    {
      header: "Concepto / Categoría",
      accessorKey: "concept",
      cell: (row) => (
        <div className="max-w-[200px]">
          <p className="font-bold truncate leading-tight">{row.concept}</p>
          <p className="text-[10px] text-ink-soft/50 truncate uppercase tracking-tighter">
            {row.chargeGroupName || row.miscCatalogName || "Sin Categoría"}
          </p>
        </div>
      )
    },
    {
      header: "Propiedad",
      accessorKey: "privateAreaName",
      cell: (row) => <span className="text-[11px] font-bold text-ink-soft/70 uppercase">{row.privateAreaName || "—"}</span>
    },
    {
      header: "Método",
      accessorKey: "paymentMethod",
      cell: (row) => (
        <Badge variant="outline">
          {PAYMENT_METHOD_LABELS[row.paymentMethod || ""] || "N/A"}
        </Badge>
      )
    },
    {
      header: "Monto",
      accessorKey: "amount",
      align: "right",
      cell: (row) => (
        <span className="text-[13px] font-black text-brand">
          {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(row.amount)}
        </span>
      )
    },
    {
      header: "Fecha",
      accessorKey: "date",
      cell: (row) => <span className="text-[11px] text-ink-soft/60 uppercase">{new Date(row.date).toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: '2-digit' })}</span>
    },
    {
      header: "Acción",
      accessorKey: "id",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEditModal(row)} className="p-1.5 rounded hover:bg-canvas text-ink-soft/40 hover:text-brand transition-standard">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded hover:bg-danger/10 text-ink-soft/40 hover:text-danger transition-standard">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      {/* Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Registros" value={filteredIncomes.length} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard label="Monto Acumulado" value={new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(totalAmount)} icon={<DollarSign className="h-3.5 w-3.5" />} />
        <StatCard label="Categorías" value={catalogs.length} icon={<Filter className="h-3.5 w-3.5" />} />
      </div>

      <div className="flex items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-2">
          <select 
            value={filterCatalog} 
            onChange={(e) => setFilterCatalog(e.target.value)}
            className="h-7 px-2 rounded bg-card border border-line text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-brand-accent/30"
          >
            <option value="all">Todas las Categorías</option>
            {catalogs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Badge variant="brand">{initialIncomes.length} Total</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/listado-ingresos/plantilla" className="h-7 px-3 flex items-center justify-center rounded-pill border border-line text-ink-soft text-[9px] font-black uppercase hover:bg-canvas transition-standard">
            <FileDown className="h-3 w-3 mr-1" /> Plantilla
          </Link>
          <label className="h-7 px-3 flex items-center justify-center rounded-pill border border-brand-accent text-brand-accent text-[9px] font-black uppercase cursor-pointer hover:bg-brand-accent/5 transition-standard">
            <Upload className="h-3 w-3 mr-1" />
            {importing ? "..." : "Importar"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      <DataTable
        title="Historial de Ingresos"
        count={filteredIncomes.length}
        data={filteredIncomes}
        columns={columns}
        onSearch={setSearch}
        onAdd={openAddModal}
        addLabel="Nuevo Ingreso"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Ingreso" : "Nuevo Ingreso"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] font-black uppercase">Cancelar</Button>
            <Button 
              disabled={isPending || !formConcept || !formAmount} 
              onClick={handleSave}
              className="h-8 px-6 text-[10px] font-black uppercase"
            >
              {isPending ? "Guardando..." : "Guardar Registro"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <select
                value={formCatalogId}
                onChange={(e) => setFormCatalogId(e.target.value)}
                className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
              >
                <option value="">Sin Categoría</option>
                {catalogs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60">Categoría</label>
            </div>
            <div className="relative">
              <select
                value={formChargeGroupId}
                onChange={(e) => setFormChargeGroupId(e.target.value)}
                className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
              >
                <option value="">Sin Grupo de Cobro</option>
                {chargeGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60">Grupo Financiero</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            <Input label="Monto (MXN)" type="number" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
          </div>

          <div className="relative">
            <input
              type="text"
              value={areaSearch}
              onChange={(e) => { setAreaSearch(e.target.value); setShowAreaDropdown(true); if(!e.target.value) setFormAreaId(""); }}
              onFocus={() => setShowAreaDropdown(true)}
              placeholder="Buscar propiedad..."
              className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none"
            />
            <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60">Propiedad Vinculada</label>
            {showAreaDropdown && filteredAreas.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-line rounded-md shadow-2xl max-h-40 overflow-y-auto">
                {filteredAreas.map(a => (
                  <button key={a.id} type="button" onClick={() => { setFormAreaId(a.id); setAreaSearch(a.name); setShowAreaDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-[12px] font-bold text-ink-soft hover:bg-canvas transition-colors border-b last:border-0 border-line/30">
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <select
              value={formMethod}
              onChange={(e) => setFormMethod(e.target.value)}
              className="peer h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium focus:ring-2 focus:ring-brand-accent/30 outline-none appearance-none"
            >
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
            </select>
            <label className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-black uppercase tracking-widest text-brand-accent/60">Método de Pago</label>
          </div>

          <Textarea label="Concepto del Ingreso" value={formConcept} onChange={(e) => setFormConcept(e.target.value)} className="min-h-[60px]" />
          <Input label="Notas Internas" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />

          <div className="pt-2 border-t border-line/50">
            <p className="text-[10px] font-black uppercase text-ink-soft/40 tracking-widest mb-2">Comprobante Digital</p>
            {receiptUrl ? (
              <div className="flex items-center justify-between p-2 bg-canvas rounded-md">
                <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-[11px] font-black text-brand-accent flex items-center gap-1 uppercase">
                  Ver Comprobante <ArrowRight className="h-3 w-3" />
                </a>
                <button onClick={() => setReceiptUrl(null)} className="text-danger p-1 rounded hover:bg-danger/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="h-9 flex items-center justify-center gap-2 border border-dashed border-line rounded-md cursor-pointer hover:bg-canvas transition-colors text-[10px] font-black uppercase text-brand-accent">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Subir PDF o Imagen
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={async (e) => {
                  if(!e.target.files?.[0]) return;
                  const file = e.target.files[0];
                  setUploading(true);
                  try {
                    const res = await uploadCondominiumAsset({ file, condominiumSlug, projectId, kind: "income-receipt" });
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
