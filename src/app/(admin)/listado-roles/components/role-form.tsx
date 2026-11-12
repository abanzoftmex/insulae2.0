"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Palette, Save } from "lucide-react";
import { Role, ModuleCatalog } from "@/modules/role/domain/role.types";
import { summarizeRolePermissions } from "@/modules/role/domain/role-permissions-summary";
import {
  DEFAULT_ROLE_COLOR,
  ROLE_PALETTE,
  getContrastRatio,
  getRoleBadgeStyles,
  isValidRoleHexColor,
  normalizeRoleHexColor,
  resolveRoleColor,
} from "@/modules/role/domain/role-colors";
import {
  getRoleVisualCategory,
  getRoleVisualCategoryLabel,
} from "@/modules/role/domain/role-protection";
import {
  createRoleAction,
  updateRoleAction,
  updateRoleColorAction,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { cn } from "@/shared/utils/cn";

interface Props {
  initialData?: Role;
  modules: ModuleCatalog[];
  condominiumId: string;
  canUpdate?: boolean;
  canEditColor?: boolean;
  isProtectedRole?: boolean;
  suggestedColor?: string;
}

export function RoleForm({
  initialData,
  modules,
  condominiumId,
  canUpdate = true,
  canEditColor,
  isProtectedRole = false,
  suggestedColor = DEFAULT_ROLE_COLOR,
}: Props) {
  const router = useRouter();
  const effectiveCanEditColor = canEditColor ?? canUpdate;
  const canSubmitForm = canUpdate || (Boolean(initialData) && effectiveCanEditColor);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const initialResolvedColor = initialData
    ? resolveRoleColor(initialData)
    : normalizeRoleHexColor(suggestedColor) ?? DEFAULT_ROLE_COLOR;

  const [color, setColor] = useState<string>(initialResolvedColor);
  const [hexInput, setHexInput] = useState<string>(initialResolvedColor);

  // Initialize permissions state
  const [permissions, setPermissions] = useState<{ [moduleId: string]: any }>(() => {
    const state: { [moduleId: string]: any } = {};
    modules.forEach((mod) => {
      const existing = initialData?.permissions?.find((p) => p.moduleId === mod.id);
      state[mod.id] = {
        canCreate: existing?.canCreate || false,
        canUpdate: existing?.canUpdate || false,
        canRead: existing?.canRead || false,
        canDelete: existing?.canDelete || false,
      };
    });
    return state;
  });

  const summary = useMemo(
    () =>
      summarizeRolePermissions(
        modules.map((mod) => ({
          moduleId: mod.id,
          canRead: Boolean(permissions[mod.id]?.canRead),
          canCreate: Boolean(permissions[mod.id]?.canCreate),
          canUpdate: Boolean(permissions[mod.id]?.canUpdate),
          canDelete: Boolean(permissions[mod.id]?.canDelete),
        })),
        modules,
        true
      ),
    [modules, permissions]
  );

  const handlePermissionChange = (moduleId: string, field: string, value: boolean) => {
    if (!canUpdate) return;
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [field]: value,
      },
    }));
  };

  const handleSelectPaletteColor = (hex: string) => {
    if (!effectiveCanEditColor) return;
    const normalized = normalizeRoleHexColor(hex) ?? DEFAULT_ROLE_COLOR;
    setColor(normalized);
    setHexInput(normalized);
    if (error) setError(null);
  };

  const handleHexInputChange = (raw: string) => {
    if (!effectiveCanEditColor) return;
    let next = raw.trim();
    if (next && !next.startsWith("#")) {
      next = `#${next}`;
    }
    setHexInput(next);
    const normalized = normalizeRoleHexColor(next);
    if (normalized) {
      setColor(normalized);
      if (error) setError(null);
    }
  };

  const isHexInputValid = isValidRoleHexColor(hexInput);
  const activeColor = normalizeRoleHexColor(color) ?? DEFAULT_ROLE_COLOR;
  const contrastRatio = getContrastRatio(activeColor, "#ffffff");
  const previewStyles = getRoleBadgeStyles(activeColor);
  const previewRoleName = name.trim() || "Nombre del rol";
  const matchedPaletteItem = ROLE_PALETTE.find(
    (item) => item.hex.toLowerCase() === activeColor.toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitForm) return;

    const normalizedHex = normalizeRoleHexColor(hexInput);
    if (!normalizedHex) {
      setError("Ingresa un código hexadecimal válido (por ejemplo #304854 o #0e7490).");
      return;
    }

    setLoading(true);
    setError(null);

    const permissionArray = Object.keys(permissions).map((moduleId) => ({
      moduleId,
      ...permissions[moduleId],
    }));

    const result = initialData
      ? isProtectedRole || !canUpdate
        ? await updateRoleColorAction({
            id: initialData.id,
            condominiumId,
            color: normalizedHex,
          })
        : await updateRoleAction({
            id: initialData.id,
            condominiumId,
            name,
            description,
            color: normalizedHex,
            permissions: permissionArray,
          })
      : await createRoleAction({
          condominiumId,
          name,
          description,
          color: normalizedHex,
          permissions: permissionArray,
        });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/listado-roles");
        router.refresh();
      }, 1200);
    } else {
      setError(result.error || "Ocurrió un error al guardar.");
      setLoading(false);
    }
  };

  const category = initialData ? getRoleVisualCategory(initialData) : "ADMINISTRATIVO";
  const categoryLabel = getRoleVisualCategoryLabel(category);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">
                {initialData
                  ? canUpdate
                    ? "Editar Rol"
                    : effectiveCanEditColor && isProtectedRole
                      ? `Color del Rol ${categoryLabel}`
                      : "Detalles del Rol"
                  : "Nuevo Rol"}
              </h1>
              {isProtectedRole ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold tracking-widest",
                    category === "PATRIMONIAL"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  )}
                >
                  {category === "PATRIMONIAL"
                    ? "Rol Patrimonial · Identidad Reservada"
                    : category === "MINISITIO"
                      ? "Solo Minisitio · Identidad Reservada"
                      : "Rol Protegido · Identidad Reservada"}
                </Badge>
              ) : (
                !canUpdate && (
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-[10px] font-bold tracking-widest bg-ink-soft/10 text-ink-soft border-line"
                  >
                    Modo Solo Lectura
                  </Badge>
                )
              )}
            </div>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
              Control de Acceso
            </Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {isProtectedRole
                ? effectiveCanEditColor
                  ? category === "PATRIMONIAL"
                    ? "Rol patrimonial reservado. Su nombre y permisos están bloqueados para proteger el histórico, pero puedes personalizar su color para el Directorio."
                    : "Rol reservado del sistema. Nombre y permisos están bloqueados, pero puedes personalizar su color distintivo."
                  : "Rol reservado del sistema. Es de solo lectura y no puede renombrarse ni recibir permisos administrativos."
                : initialData
                  ? canUpdate
                    ? "Modifica nombre, descripción, color identificativo y permisos del rol"
                    : "Visualización de permisos del rol"
                  : "Define nombre, color identificativo y permisos para el nuevo rol"}
            </p>
          </div>
        </div>
      </div>

      {isProtectedRole && (
        <div
          className={cn(
            "rounded-card border px-4 py-3 text-xs",
            category === "PATRIMONIAL"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-900"
          )}
        >
          <p className="font-bold">
            {category === "PATRIMONIAL"
              ? `Rol patrimonial reservado: «${initialData?.name}»`
              : `Rol protegido por seguridad del sistema: «${initialData?.name}»`}
          </p>
          <p className="text-[11px] mt-0.5">
            {category === "PATRIMONIAL"
              ? "Este rol patrimonial proviene de asignaciones residenciales y legales. Su nombre y permisos de módulos están bloqueados para mantener la integridad histórica del condominio, pero su color visual puede personalizarse libremente para distinguirlo en el Directorio."
              : "Los roles reservados (como «Solo Minisitio» o roles con legacyIdGral distinto de 0) no pueden renombrarse, desactivarse, eliminarse ni recibir permisos sobre módulos del panel administrativo. Su color visual sí puede configurarse para distinguirlos en el Directorio."}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Datos básicos */}
        <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white">
              Información General
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Nombre del Rol *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!canUpdate}
                placeholder="Ej. Administrador de Ingresos"
              />
              <Input
                label="Descripción"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canUpdate}
                placeholder="Breve descripción de las responsabilidades"
              />
            </div>

            {/* Color identificativo y vista previa */}
            <div className="border-t border-line/40 pt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-brand flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                    Color Distintivo del Rol
                  </label>
                  <span className="text-[10px] font-semibold text-ink-soft">
                    {matchedPaletteItem ? matchedPaletteItem.name : "Color personalizado"}
                  </span>
                </div>

                {/* Paleta visual */}
                <div
                  className="grid grid-cols-6 sm:grid-cols-9 gap-2"
                  role="radiogroup"
                  aria-label="Paleta de colores para el rol"
                >
                  {ROLE_PALETTE.map((swatch) => {
                    const isSelected = activeColor.toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${swatch.name} (${swatch.hex})`}
                        title={`${swatch.name} · ${swatch.hex}`}
                        disabled={!effectiveCanEditColor}
                        onClick={() => handleSelectPaletteColor(swatch.hex)}
                        style={{ backgroundColor: swatch.hex }}
                        className={cn(
                          "h-9 w-full rounded-lg border-2 flex items-center justify-center transition-all",
                          isSelected
                            ? "border-ink ring-2 ring-brand/40 scale-105 shadow-sm"
                            : "border-white/80 hover:scale-105 shadow-xs",
                          !effectiveCanEditColor && "opacity-60 cursor-not-allowed hover:scale-100"
                        )}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white drop-shadow" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>

                {/* Selector libre y código hexadecimal */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="role-color-picker"
                      className="text-[11px] font-semibold text-ink-soft"
                    >
                      Selector:
                    </label>
                    <input
                      id="role-color-picker"
                      type="color"
                      value={activeColor}
                      disabled={!effectiveCanEditColor}
                      onChange={(e) => handleSelectPaletteColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-md border border-line bg-white p-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Seleccionar color personalizado"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="role-hex-input"
                      className="text-[11px] font-semibold text-ink-soft"
                    >
                      HEX:
                    </label>
                    <input
                      id="role-hex-input"
                      type="text"
                      value={hexInput}
                      maxLength={7}
                      disabled={!effectiveCanEditColor}
                      onChange={(e) => handleHexInputChange(e.target.value)}
                      placeholder="#304854"
                      aria-invalid={!isHexInputValid}
                      className={cn(
                        "h-9 w-28 rounded-md border px-2.5 font-mono text-xs font-semibold uppercase outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                        isHexInputValid
                          ? "border-line bg-white text-ink focus:border-brand focus:ring-1 focus:ring-brand"
                          : "border-danger bg-danger/5 text-danger"
                      )}
                    />
                  </div>

                  {!isHexInputValid && (
                    <span className="text-[11px] font-semibold text-danger">
                      Formato inválido (usa #RRGGBB)
                    </span>
                  )}
                </div>

                {contrastRatio < 4.5 && (
                  <p className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                    Este tono personalizado es claro sobre fondo blanco; para mantener la legibilidad WCAG AA, las insignias aplicarán automáticamente texto oscuro con borde reforzado.
                  </p>
                )}
              </div>

              {/* Vista previa */}
              <div className="lg:col-span-5 rounded-xl border border-line/60 bg-canvas/40 p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                  Vista previa en el sistema
                </p>

                <div className="rounded-lg border border-line/60 bg-white p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                      En /listado-roles
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
                      style={{
                        color: previewStyles.color,
                        backgroundColor: previewStyles.backgroundColor,
                        borderColor: previewStyles.borderColor,
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: previewStyles.dotColor }}
                      />
                      {previewRoleName}
                    </span>
                  </div>

                  <div className="border-t border-line/40 pt-2.5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">
                      En /directorio
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide"
                        style={{
                          color: previewStyles.color,
                          backgroundColor: previewStyles.backgroundColor,
                          borderColor: previewStyles.borderColor,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: previewStyles.dotColor }}
                        />
                        {previewRoleName}
                      </span>
                      <span className="text-xs font-bold" style={{ color: previewStyles.color }}>
                        {previewRoleName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Permisos */}
        <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white">
              Permisos por Módulo
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-white/90">
              <span className="rounded-full bg-white/15 px-2.5 py-1">
                {summary.totalGranted} / {summary.maxPermissions} permisos
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">
                {summary.modulesWithAccess} / {summary.totalModules} módulos · Leer {summary.readCount} · Crear {summary.createCount} · Editar {summary.updateCount} · Eliminar {summary.deleteCount}
              </span>
            </div>
          </div>
          <div className="max-h-[420px] sm:max-h-112 overflow-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-30">
                <tr className="bg-canvas/95 backdrop-blur-sm border-b border-line">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand">
                    Módulo
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 text-center">
                    Leer
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 text-center">
                    Crear
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 text-center">
                    Editar
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 text-center">
                    Eliminar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/30">
                {modules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-canvas/30 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-bold text-ink">{mod.name}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        disabled={!canUpdate}
                        checked={permissions[mod.id]?.canRead}
                        onChange={(e) => handlePermissionChange(mod.id, "canRead", e.target.checked)}
                        className="w-4 h-4 rounded border-line text-brand focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        disabled={!canUpdate}
                        checked={permissions[mod.id]?.canCreate}
                        onChange={(e) => handlePermissionChange(mod.id, "canCreate", e.target.checked)}
                        className="w-4 h-4 rounded border-line text-brand focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        disabled={!canUpdate}
                        checked={permissions[mod.id]?.canUpdate}
                        onChange={(e) => handlePermissionChange(mod.id, "canUpdate", e.target.checked)}
                        className="w-4 h-4 rounded border-line text-brand focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        disabled={!canUpdate}
                        checked={permissions[mod.id]?.canDelete}
                        onChange={(e) => handlePermissionChange(mod.id, "canDelete", e.target.checked)}
                        className="w-4 h-4 rounded border-line text-brand focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-danger/5 border border-danger/20 text-danger rounded-md text-[11px] font-bold">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-success/5 border border-success/20 text-success rounded-md text-[11px] font-bold">
            Información guardada con éxito. Redirigiendo...
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 pb-4 pr-16 sm:pr-44">
          <Button
            variant="ghost"
            type="button"
            onClick={() => router.push("/listado-roles")}
            className="h-9 sm:h-8 text-[10px] font-bold uppercase tracking-widest"
          >
            {canSubmitForm ? "Cancelar" : "Volver"}
          </Button>
          {canSubmitForm && (
            <Button
              type="submit"
              disabled={loading || success || !isHexInputValid}
              className="h-9 sm:h-8 px-6 text-[10px] font-bold uppercase tracking-widest gap-2"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {loading
                ? "Guardando..."
                : isProtectedRole || !canUpdate
                  ? "Guardar Color"
                  : "Guardar Rol"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
