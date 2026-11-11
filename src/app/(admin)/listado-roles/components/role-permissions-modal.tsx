"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Edit2, Minus, Search, ShieldCheck, X } from "lucide-react";
import type { ModuleCatalog, Role } from "@/modules/role/domain/role.types";
import {
  indexPermissionsByModuleId,
  summarizeRolePermissions,
} from "@/modules/role/domain/role-permissions-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/cn";

interface RolePermissionsModalProps {
  isOpen: boolean;
  role: Role | null;
  modules: ModuleCatalog[];
  canUpdate?: boolean;
  onClose: () => void;
}

function PermissionFlag({ granted, label }: { granted: boolean; label: string }) {
  return granted ? (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"
      title={`${label}: Permitido`}
    >
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Permitido</span>
    </span>
  ) : (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-canvas text-ink-soft/35 border border-line"
      title={`${label}: Sin permiso`}
    >
      <Minus className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">No permitido</span>
    </span>
  );
}

export function RolePermissionsModal({
  isOpen,
  role,
  modules,
  canUpdate = false,
  onClose,
}: RolePermissionsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [showAllModules, setShowAllModules] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setShowAllModules(false);
      setSearch("");
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [isOpen]);

  const summary = useMemo(
    () => summarizeRolePermissions(role?.permissions, modules, role?.isActive ?? false),
    [role, modules]
  );

  const permByModuleId = useMemo(
    () => indexPermissionsByModuleId(role?.permissions),
    [role]
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return modules
      .filter((mod) => mod.isActive)
      .map((mod) => {
        const perm = role?.isActive ? permByModuleId.get(mod.id) : undefined;
        const canRead = Boolean(perm?.canRead);
        const canCreate = Boolean(perm?.canCreate);
        const canUpdatePerm = Boolean(perm?.canUpdate);
        const canDelete = Boolean(perm?.canDelete);
        const hasAny = canRead || canCreate || canUpdatePerm || canDelete;
        return {
          module: mod,
          canRead,
          canCreate,
          canUpdate: canUpdatePerm,
          canDelete,
          hasAny,
        };
      })
      .filter((row) => (showAllModules ? true : row.hasAny))
      .filter((row) => !term || row.module.name.toLowerCase().includes(term));
  }, [modules, permByModuleId, role?.isActive, showAllModules, search]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-card border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-brand-deep/50 backdrop:backdrop-blur-xs"
    >
      <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-card">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line bg-canvas/40 px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand border border-brand/20">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id={titleId}
                  className="text-sm font-bold uppercase tracking-tight text-brand text-balance"
                >
                  Detalle de Permisos · {role?.name ?? ""}
                </h2>
                {role && (
                  <Badge
                    variant={role.isActive ? "success" : "danger"}
                    className="rounded-full px-2.5 py-0.5 text-[9px]"
                  >
                    {role.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">
                {role?.isActive
                  ? `${summary.totalGranted} de ${summary.maxPermissions} permisos habilitados (${summary.totalModules} módulos × 4 acciones) en ${summary.modulesWithAccess} módulo${summary.modulesWithAccess !== 1 ? "s" : ""}.`
                  : "Este rol está inactivo; todos sus permisos se encuentran deshabilitados."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de permisos"
            className="min-h-8 min-w-8 flex items-center justify-center rounded-full hover:bg-canvas text-ink-soft/60 hover:text-ink transition-standard"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Summary & Controls */}
        <div className="border-b border-line bg-white px-5 py-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { label: "Leer", count: summary.readCount, tone: "bg-emerald-50 text-emerald-900 border-emerald-200" },
                { label: "Crear", count: summary.createCount, tone: "bg-cyan-50 text-cyan-900 border-cyan-200" },
                { label: "Editar", count: summary.updateCount, tone: "bg-amber-50 text-amber-900 border-amber-200" },
                { label: "Eliminar", count: summary.deleteCount, tone: "bg-rose-50 text-rose-900 border-rose-200" },
              ] as const
            ).map((item) => (
              <div
                key={item.label}
                className={cn(
                  "rounded-xl border px-3 py-2 flex items-center justify-between text-xs",
                  item.count > 0 ? item.tone : "bg-canvas/40 text-ink-soft/60 border-line"
                )}
              >
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  {item.label}
                </span>
                <span className="font-extrabold text-sm tabular-nums">
                  {item.count}/{summary.totalModules}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas/40 p-1">
              <button
                type="button"
                onClick={() => setShowAllModules(false)}
                aria-pressed={!showAllModules}
                className={cn(
                  "min-h-7 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                  !showAllModules
                    ? "bg-brand text-white"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                Con acceso ({summary.modulesWithAccess})
              </button>
              <button
                type="button"
                onClick={() => setShowAllModules(true)}
                aria-pressed={showAllModules}
                className={cn(
                  "min-h-7 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                  showAllModules
                    ? "bg-brand text-white"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                Todos ({summary.totalModules})
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-soft/50"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar módulo..."
                aria-label="Filtrar módulo por nombre"
                className="h-8 w-full rounded-full border border-line bg-canvas/40 pl-8 pr-3 text-xs text-ink placeholder:text-ink-soft/50 focus:border-brand focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Permissions Table */}
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="py-12 px-5 text-center text-xs text-ink-soft">
              {role?.isActive
                ? "Este rol no tiene módulos con permisos habilitados que coincidan con el filtro."
                : "Este rol está inactivo y no otorga permisos en ningún módulo."}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-canvas/95 backdrop-blur-xs border-b border-line">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand">
                    Módulo
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-ink-soft/75">
                    Leer
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-ink-soft/75">
                    Crear
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-ink-soft/75">
                    Editar
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-ink-soft/75">
                    Eliminar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-xs">
                {rows.map((row) => (
                  <tr key={row.module.id} className="hover:bg-canvas/40 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-ink">
                      {row.module.name}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PermissionFlag granted={row.canRead} label={`Leer en ${row.module.name}`} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PermissionFlag granted={row.canCreate} label={`Crear en ${row.module.name}`} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PermissionFlag granted={row.canUpdate} label={`Editar en ${row.module.name}`} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PermissionFlag granted={row.canDelete} label={`Eliminar en ${row.module.name}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-canvas/40 px-5 py-3.5">
          {canUpdate && role?.isActive && (
            <Button variant="outline" asChild className="h-9 px-4 text-[11px] font-bold uppercase tracking-wider gap-1.5">
              <Link href={`/listado-roles/${role.id}`}>
                <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Editar permisos</span>
              </Link>
            </Button>
          )}
          <Button
            type="button"
            autoFocus
            onClick={onClose}
            className="h-9 px-5 text-[11px] font-bold uppercase tracking-wider"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </dialog>
  );
}

