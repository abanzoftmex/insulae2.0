"use client";

import { useEffect, useId, useRef } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import type { Role, RoleDeactivationImpact } from "@/modules/role/domain/role.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DeactivateRoleModalProps {
  isOpen: boolean;
  role: Role | null;
  impact: RoleDeactivationImpact | null;
  isLoadingImpact: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeactivateRoleModal({
  isOpen,
  role,
  impact,
  isLoadingImpact,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: DeactivateRoleModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [isOpen]);

  const handleDialogCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    if (isSubmitting) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    onClose();
  };

  const roleName = impact?.role.name ?? role?.name ?? "";
  const activePermsCount =
    impact?.role.activePermissionsCount ??
    role?.permissions?.filter((p) => p.canRead || p.canCreate || p.canUpdate || p.canDelete)
      .length ??
    0;

  const assignedUsers = impact?.assignedUsers ?? [];
  const totalAssigned = assignedUsers.length;
  const toDeactivateCount = impact?.usersToDeactivateCount ?? 0;
  const retainedCount = impact?.usersRetainedCount ?? 0;
  const isBlocked = Boolean(impact && !impact.canDeactivate);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleDialogCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-card border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-brand-deep/50 backdrop:backdrop-blur-xs"
    >
      <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-card">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line bg-canvas/40 px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger border border-danger/20">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-sm font-bold uppercase tracking-tight text-brand text-balance"
              >
                Bloquear / Desactivar Rol
              </h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                Revisa el impacto sobre permisos y usuarios antes de confirmar.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="min-h-8 min-w-8 flex items-center justify-center rounded-full hover:bg-canvas text-ink-soft/60 hover:text-ink transition-standard disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Rol seleccionado */}
          <div className="rounded-xl border border-line bg-canvas/35 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70">
                Rol seleccionado
              </span>
              <Badge variant="brand" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
                {activePermsCount} módulo{activePermsCount !== 1 ? "s" : ""} con permisos activos
              </Badge>
            </div>
            <p className="text-base font-bold text-ink break-words">{roleName}</p>
            {role?.description && (
              <p className="text-xs text-ink-soft">{role.description}</p>
            )}
          </div>

          {/* Advertencia principal sobre rol y permisos */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-bold">
                El rol y todos sus permisos quedarán inactivos
              </p>
              <p className="text-[11px] text-amber-900">
                Al confirmar, el rol <strong className="font-bold">{roleName}</strong> cambiará a estado
                inactivo y todos los permisos asociados se deshabilitarán de inmediato, por lo que
                dejarán de otorgar acceso o capacidades en el sistema. No se eliminará ningún registro
                histórico.
              </p>
            </div>
          </div>

          {/* Estado de carga o error */}
          {isLoadingImpact ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-ink-soft">
              <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden="true" />
              <p className="text-xs font-semibold">
                Validando usuarios asignados y reglas de seguridad...
              </p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-danger flex items-start gap-2"
                >
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="font-semibold leading-snug">{errorMessage}</p>
                </div>
              )}

              {isBlocked && impact?.blockReason && (
                <div
                  role="alert"
                  className="rounded-xl border border-danger/35 bg-danger/10 p-4 text-danger space-y-1.5"
                >
                  <p className="font-bold flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                    <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Operación bloqueada por seguridad
                  </p>
                  <p className="text-xs font-medium leading-relaxed text-danger/90">
                    {impact.blockReason}
                  </p>
                </div>
              )}

              {impact && (
                <div className="space-y-3">
                  {/* Resumen numérico de usuarios */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3">
                    <div className="flex items-center gap-2 font-bold text-brand">
                      <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Usuarios afectados actualmente asignados</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="brand" className="rounded-full px-2.5 py-1 text-[10px]">
                        Total asignados: {totalAssigned}
                      </Badge>
                      {toDeactivateCount > 0 && (
                        <Badge variant="danger" className="rounded-full px-2.5 py-1 text-[10px]">
                          Quedarán inactivos: {toDeactivateCount}
                        </Badge>
                      )}
                      {retainedCount > 0 && (
                        <Badge variant="success" className="rounded-full px-2.5 py-1 text-[10px]">
                          Conservan otro rol activo: {retainedCount}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {totalAssigned === 0 ? (
                    <div className="rounded-xl border border-line bg-canvas/30 p-4 text-ink-soft flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand mt-0.5" aria-hidden="true" />
                      <div className="space-y-1">
                        <p className="font-bold text-ink">
                          Este rol no tiene usuarios activos asignados.
                        </p>
                        <p className="text-[11px]">
                          Ninguna cuenta de usuario será desactivada. Puedes continuar para bloquear
                          el rol y deshabilitar sus permisos.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Advertencia explícita de desactivación de usuarios */}
                      <div
                        className={
                          toDeactivateCount > 0
                            ? "rounded-xl border border-danger/25 bg-danger/5 p-3.5 text-ink flex items-start gap-2.5"
                            : "rounded-xl border border-brand/20 bg-brand-mint/40 p-3.5 text-ink flex items-start gap-2.5"
                        }
                      >
                        {toDeactivateCount > 0 ? (
                          <UserX className="h-4 w-4 shrink-0 text-danger mt-0.5" aria-hidden="true" />
                        ) : (
                          <UserCheck className="h-4 w-4 shrink-0 text-brand mt-0.5" aria-hidden="true" />
                        )}
                        <div className="space-y-1 text-[11px] leading-relaxed">
                          {toDeactivateCount === totalAssigned ? (
                            <p className="font-semibold text-danger">
                              Advertencia: Todos estos {totalAssigned} usuario
                              {totalAssigned !== 1 ? "s" : ""} también quedarán inactivos al
                              confirmar esta operación y perderán el acceso al sistema.
                            </p>
                          ) : toDeactivateCount > 0 ? (
                            <p className="font-semibold text-danger">
                              Advertencia: {toDeactivateCount} usuario
                              {toDeactivateCount !== 1 ? "s" : ""} sin otros roles activos también
                              quedará{toDeactivateCount !== 1 ? "n" : ""} inactivo
                              {toDeactivateCount !== 1 ? "s" : ""}. Los {retainedCount} usuario
                              {retainedCount !== 1 ? "s" : ""} restante
                              {retainedCount !== 1 ? "s" : ""} conservará
                              {retainedCount !== 1 ? "n" : ""} su cuenta activa gracias a otro rol
                              activo, pero perderá{retainedCount !== 1 ? "n" : ""} los permisos de{" "}
                              <strong>{roleName}</strong>.
                            </p>
                          ) : (
                            <p className="font-semibold text-brand">
                              Los {totalAssigned} usuario{totalAssigned !== 1 ? "s" : ""} asignado
                              {totalAssigned !== 1 ? "s" : ""} conservará
                              {totalAssigned !== 1 ? "n" : ""} su cuenta habilitada porque tienen otro
                              rol activo, pero dejarán de tener los permisos de{" "}
                              <strong>{roleName}</strong>.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Listado de usuarios asignados */}
                      <ul
                        aria-label="Listado de usuarios asignados al rol"
                        className="max-h-56 overflow-y-auto divide-y divide-line rounded-xl border border-line bg-white"
                      >
                        {assignedUsers.map((user) => (
                          <li
                            key={user.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-bold text-ink text-xs break-words">
                                {user.fullName}
                              </p>
                              <p className="text-[11px] text-ink-soft flex items-center gap-1 break-all">
                                <Mail className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                                <span>
                                  {user.email || "Sin correo electrónico registrado"}
                                </span>
                              </p>
                            </div>

                            <div className="shrink-0">
                              {user.willBeDeactivated ? (
                                <Badge variant="danger" className="rounded-full px-2.5 py-1 text-[9px]">
                                  Quedará inactivo
                                </Badge>
                              ) : (
                                <Badge
                                  variant="success"
                                  className="rounded-full px-2.5 py-1 text-[9px] max-w-[240px] truncate"
                                  title={user.retentionReason ?? undefined}
                                >
                                  {user.otherActiveRoles.length > 0
                                    ? `Conserva: ${user.otherActiveRoles.join(", ")}`
                                    : user.retentionReason || "Permanece activo"}
                                </Badge>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-canvas/40 px-5 py-3.5">
          <Button
            type="button"
            variant="ghost"
            autoFocus
            disabled={isSubmitting}
            onClick={onClose}
            className="h-9 px-4 text-[11px] font-bold uppercase tracking-wider"
          >
            {isBlocked ? "Cerrar" : "Cancelar"}
          </Button>

          {!isBlocked && (
            <Button
              type="button"
              variant="destructive"
              disabled={isLoadingImpact || isSubmitting || !impact?.canDeactivate}
              onClick={onConfirm}
              className="h-9 px-5 text-[11px] font-bold uppercase tracking-wider gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Desactivando...</span>
                </>
              ) : (
                <>
                  <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Confirmar desactivación</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}

