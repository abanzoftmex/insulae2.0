"use client";

import * as React from "react";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  ArrowUpDown,
  Plus
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface DataTableColumn<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

export interface DataTableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
}

interface DataTableProps<T> {
  title: string;
  count?: number;
  data: T[];
  columns: DataTableColumn<T>[];
  actions?: DataTableAction<T>[];
  onSearch?: (query: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    totalRows: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}

export function DataTable<T extends { id: string | number }>({
  title,
  count,
  data,
  columns,
  actions,
  onSearch,
  onAdd,
  addLabel = "Nuevo",
  isLoading,
  emptyState,
  pagination
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <Card className="overflow-hidden border-transparent shadow-layered">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-white">{title}</h2>
          {count !== undefined && (
            <span className="px-2.5 py-1 rounded-full bg-white text-[9px] font-bold text-brand">
              {count}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {onSearch && (
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-soft/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="h-8 w-48 lg:w-64 pl-8 pr-3 bg-white border-none rounded-full text-[12px] font-medium text-ink placeholder:text-ink-soft/50 focus:ring-2 focus:ring-white/30 transition-all"
              />
            </form>
          )}
          
          {onAdd && (
            <Button onClick={onAdd} size="sm" className="h-8 px-4 gap-1.5 text-[10px] font-bold uppercase tracking-tight rounded-full bg-white text-brand hover:bg-brand-mint border-0 shadow-none">
              <Plus className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-10 bg-canvas/30 border-b border-line">
              {columns.map((col) => (
                <th 
                  key={String(col.accessorKey)} 
                  className={cn(
                    "px-4 text-[10px] font-bold uppercase tracking-widest text-ink-soft/70",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  <div className={cn(
                    "flex items-center gap-1",
                    col.align === "right" && "justify-end",
                    col.align === "center" && "justify-center"
                  )}>
                    {col.header}
                    {col.sortable && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                </th>
              ))}
              {actions && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="h-12 animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4">
                      <div className="h-3 bg-canvas rounded w-2/3" />
                    </td>
                  ))}
                  {actions && <td />}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((row, index) => (
                <tr key={row.id} className={cn("hover:bg-brand-mint/20 transition-colors group", index % 2 === 0 ? "bg-white" : "bg-canvas/60")}>
                  {columns.map((col) => (
                    <td 
                      key={String(col.accessorKey)} 
                      className={cn(
                        "px-4 py-3 text-sm font-medium text-ink",
                        col.align === "right" && "text-right font-mono",
                        col.align === "center" && "text-center"
                      )}
                    >
                      {col.cell ? col.cell(row) : (row as Record<string, any>)[col.accessorKey as string]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 text-right">
                      <button className="p-1.5 rounded-md hover:bg-canvas text-ink-soft/40 hover:text-ink transition-standard">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-20">
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center text-ink-soft/30">
                      <p className="text-[11px] font-bold uppercase tracking-widest">Sin registros</p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="h-12 px-4 border-t border-line flex items-center justify-between bg-card text-[11px] font-bold text-ink-soft/60 uppercase">
          <div>
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.totalRows)} de {pagination.totalRows}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={pagination.page === 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="p-1 rounded hover:bg-canvas disabled:opacity-30 transition-standard"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pagination.page}
            <button 
              disabled={pagination.page * pagination.pageSize >= pagination.totalRows}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="p-1 rounded hover:bg-canvas disabled:opacity-30 transition-standard"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
