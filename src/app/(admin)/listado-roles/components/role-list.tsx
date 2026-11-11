"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Edit2,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type {
  ModuleCatalog,
  Role,
  RoleDeactivationImpact,
} from "@/modules/role/domain/role.types";
import { summarizeRolePermissions } from "@/modules/role/domain/role-permissions-summary";
import {
  deactivateRoleAction,
  deleteRoleAction,
  getRoleDeactivationImpactAction,
} from "../actions";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { DeactivateRoleModal } from "./deactivate-role-modal";
import { RolePermissionsModal } from "./role-permissions-modal";
import { cn } from "@/shared/utils/cn";

interface Props {
  roles: Role[];
  modules: ModuleCatalog[];
  condominiumId: string;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

interface NotificationState {
  type: "success" | "error";
  title: string;
  detail: string;
}

type StatusFilter = "all" | "active" | "inactive";

export function RoleList({
  roles,
  modules,
  condominiumId,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [detailRole, setDetailRole] = useState<Role | null>(null);

  // Deactivate modal state
  const [targetRole, setTargetRole] = useState<Role | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [impact, setImpact] = useState<RoleDeactivationImpact | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const canDeactivate = canUpdate && canDelete;

  const activeRolesCount = useMemo(
    () => roles.filter((r) => r.isActive).length,
    [roles]
  );
  const inactiveRolesCount = roles.length - activeRolesCount;

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return roles.filter((r) => {
      if (statusFilter === "active" && !r.isActive) return false;
      if (statusFilter === "inactive" && r.isActive) return false;
      return (
        !term ||
        [r.name, r.description || "", r.isActive ? "activo" : "inactivo bloqueado"].some(
          (f) => f.toLowerCase().includes(term)
        )
      );
    });
  }, [roles, search, statusFilter]);

  const handleOpenDeactivateModal = (role: Role) => {
    if (!canDeactivate || !role.isActive) return;
    setTargetRole(role);
    setImpact(null);
    setModalError(null);
    setIsDeactivateModalOpen(true);
    setIsLoadingImpact(true);

    getRoleDeactivationImpactAction(role.id, condominiumId)
      .then((res) => {
        if (res.success) {
          setImpact(res.impact);
        } else {
          setModalError(res.error);
        }
      })
      .catch((err) => {
        setModalError(
          err instanceof Error
            ? err.message
            : "No se pudo consultar el impacto de desactivación."
        );
      })
      .finally(() => {
        setIsLoadingImpact(false);
      });
  };

  const handleCloseDeactivateModal = () => {
    if (isDeactivating) return;
    setIsDeactivateModalOpen(false);
    setTargetRole(null);
    setImpact(null);
    setModalError(null);
  };

  const handleConfirmDeactivate = async () => {
    if (!targetRole || isDeactivating) return;
    setModalError(null);
    setIsDeactivating(true);

    try {
      const res = await deactivateRoleAction(targetRole.id, condominiumId);
      if (res.success) {
        const {
          roleName,
          disabledPermissionsCount,
          deactivatedUsersCount,
          retainedUsersCount,
        } = res.data;

        setIsDeactivateModalOpen(false);
        setTargetRole(null);
        setImpact(null);
        if (statusFilter === "active") {
          setStatusFilter("all");
        }

        const parts = [
          `Rol «${roleName}» desactivado`,
          `${disabledPermissionsCount} registro${disabledPermissionsCount !== 1 ? "s" : ""} de permiso deshabilitado${disabledPermissionsCount !== 1 ? "s" : ""}`,
          `${deactivatedUsersCount} usuario${deactivatedUsersCount !== 1 ? "s" : ""} desactivado${deactivatedUsersCount !== 1 ? "s" : ""}`,
        ];
        if (retainedUsersCount > 0) {
          parts.push(
            `${retainedUsersCount} usuario${retainedUsersCount !== 1 ? "s" : ""} mantenido${retainedUsersCount !== 1 ? "s" : ""} activo${retainedUsersCount !== 1 ? "s" : ""} por otro rol`
          );
        }

        setNotification({
          type: "success",
          title: "Rol bloqueado y desactivado correctamente",
          detail: `${parts.join(" · ")}.`,
        });

        startTransition(() => {
          router.refresh();
        });
      } else {
        setModalError(res.error);
      }
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado al desactivar el rol."
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDelete = (role: Role) => {
    if (!canDelete || !role.isActive) return;
    if (!confirm(`¿Eliminar el rol «${role.name}»?`)) return;
    startTransition(async () => {
      const res = await deleteRoleAction(role.id, condominiumId);
      if (res.success) {
        setNotification({
          type: "success",
          title: "Rol eliminado",
          detail: `El rol «${role.name}» pasó a estado inactivo.`,
        });
        router.refresh();
      } else {
        setNotification({
          type: "error",
          title: "No se pudo eliminar el rol",
          detail: res.error || "Ocurrió un error al eliminar el rol.",
        });
      }
    });
  };

  const columns: DataTableColumn<Role>[] = [
    {
      header: "Nombre del Rol",
      accessorKey: "name",
      cell: (row) => (
        <div className={row.isActive ? "flex items-center gap-2" : "flex items-center gap-2 opacity-60"}>
          <Badge
            variant={row.isActive ? "brand" : "outline"}
            className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest shrink-0"
          >
            Rol
          </Badge>
          <span className="font-bold text-sm text-ink">{row.name}</span>
        </div>
      ),
    },
    {
      header: "Descripción",
      accessorKey: "description",
      cell: (row) =>
        row.description ? (
          <span className={row.isActive ? "text-[11px] text-ink-soft" : "text-[11px] text-ink-soft/60"}>
            {row.description}
          </span>
        ) : (
          <span className="text-[10px] text-ink-soft/30 italic">Sin descripción</span>
        ),
    },
    {
      header: "Estado",
      accessorKey: "isActive",
      cell: (row) =>
        row.isActive ? (
          <Badge
            variant="success"
            className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest"
          >
            Activo
          </Badge>
        ) : (
          <Badge
            variant="danger"
            className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest"
          >
            Inactivo
          </Badge>
        ),
    },
    {
      header: "Permisos",
      accessorKey: "permissions",
      cell: (row) => {
        const summary = summarizeRolePermissions(
          row.permissions,
          modules,
          row.isActive
        );
        if (!row.isActive) {
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest text-ink-soft/70"
              >
                Deshabilitados (0 / {summary.maxPermissions})
              </Badge>
            </div>
          );
        }
        if (summary.totalGranted === 0) {
          return (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-ink-soft/50 italic">
                0 / {summary.maxPermissions} permisos
              </span>
              <button
                type="button"
                onClick={() => setDetailRole(row)}
                aria-label={`Ver detalle de permisos del rol ${row.name}`}
                className="inline-flex min-h-6 items-center gap-1 rounded-full border border-line bg-canvas/60 px-2 py-0.5 text-[10px] font-semibold text-brand hover:bg-brand-mint/60 transition-colors"
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                <span>Ver</span>
              </button>
            </div>
          );
        }

        const chips = [
          { label: "Leer", count: summary.readCount, activeTone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
          { label: "Crear", count: summary.createCount, activeTone: "bg-cyan-50 text-cyan-800 border-cyan-200" },
          { label: "Editar", count: summary.updateCount, activeTone: "bg-amber-50 text-amber-800 border-amber-200" },
          { label: "Eliminar", count: summary.deleteCount, activeTone: "bg-rose-50 text-rose-800 border-rose-200" },
        ];

        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="success"
                className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest"
              >
                {summary.totalGranted} / {summary.maxPermissions} permisos
              </Badge>
              <span className="text-[10px] font-semibold text-ink-soft">
                {summary.modulesWithAccess} módulo{summary.modulesWithAccess !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setDetailRole(row)}
                aria-label={`Ver detalle de permisos del rol ${row.name}`}
                className="inline-flex min-h-6 items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-semibold text-brand hover:bg-brand-mint/60 transition-colors"
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                <span>Detalle</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className={cn(
                    "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums",
                    chip.count > 0
                      ? chip.activeTone
                      : "bg-canvas/50 text-ink-soft/45 border-line"
                  )}
                >
                  {chip.label} {chip.count}
                </span>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      header: "Acción",
      accessorKey: "_actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {canUpdate &&
            (row.isActive ? (
              <Link
                href={`/listado-roles/${row.id}`}
                title="Editar rol"
                aria-label={`Editar rol ${row.name}`}
                className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <span
                title="Un rol inactivo no puede editarse"
                aria-label={`Editar rol ${row.name} (deshabilitado)`}
                className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-full bg-canvas text-ink-soft/35 border border-line cursor-not-allowed"
              >
                <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            ))}

          {canDeactivate && (
            <button
              type="button"
              onClick={() => handleOpenDeactivateModal(row)}
              disabled={!row.isActive || isPending || isDeactivating}
              title={
                row.isActive
                  ? "Bloquear / Desactivar rol"
                  : "Este rol ya está desactivado"
              }
              aria-label={`Bloquear / desactivar rol ${row.name}`}
              className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-600 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => handleDelete(row)}
              disabled={!row.isActive || isPending || isDeactivating}
              className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-full bg-danger/15 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={row.isActive ? "Eliminar rol" : "Este rol ya está inactivo"}
              aria-label={`Eliminar rol ${row.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-2">
        <div className="w-full sm:max-w-xs">
          <StatCard
            accent="brand"
            label="Roles Configurados"
            value={activeRolesCount}
            hint={
              inactiveRolesCount > 0
                ? `${inactiveRolesCount} inactivo${inactiveRolesCount !== 1 ? "s" : ""}`
                : undefined
            }
            icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
          />
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-white p-1 shadow-xs self-start sm:self-end" role="group" aria-label="Filtrar roles por estado">
          {(
            [
              { id: "all", label: `Todos (${roles.length})` },
              { id: "active", label: `Activos (${activeRolesCount})` },
              { id: "inactive", label: `Inactivos (${inactiveRolesCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              aria-pressed={statusFilter === tab.id}
              className={cn(
                "min-h-8 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                statusFilter === tab.id
                  ? "bg-brand text-white shadow-xs"
                  : "text-ink-soft hover:bg-canvas hover:text-ink"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {notification && (
        <div
          role={notification.type === "error" ? "alert" : "status"}
          aria-live={notification.type === "error" ? "assertive" : "polite"}
          className={
            notification.type === "success"
              ? "mb-2 flex items-start justify-between gap-3 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm"
              : "mb-2 flex items-start justify-between gap-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-danger shadow-sm"
          }
        >
          <div className="flex items-start gap-2.5 min-w-0">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-4 w-4 shrink-0 text-danger mt-0.5" aria-hidden="true" />
            )}
            <div className="min-w-0 space-y-0.5 text-xs">
              <p className="font-bold">{notification.title}</p>
              <p className="text-[11px] opacity-90 break-words">{notification.detail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Cerrar notificación"
            className="min-h-7 min-w-7 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <DataTable
        title="Configuración de Roles"
        count={filtered.length}
        data={filtered}
        columns={columns}
        onSearch={setSearch}
        addLabel={canCreate ? "Nuevo Rol" : undefined}
        onAdd={canCreate ? () => router.push("/listado-roles/nuevo") : undefined}
      />

      <DeactivateRoleModal
        isOpen={isDeactivateModalOpen}
        role={targetRole}
        impact={impact}
        isLoadingImpact={isLoadingImpact}
        isSubmitting={isDeactivating}
        errorMessage={modalError}
        onClose={handleCloseDeactivateModal}
        onConfirm={handleConfirmDeactivate}
      />

      <RolePermissionsModal
        isOpen={detailRole !== null}
        role={detailRole}
        modules={modules}
        canUpdate={canUpdate}
        onClose={() => setDetailRole(null)}
      />
    </>
  );
}
