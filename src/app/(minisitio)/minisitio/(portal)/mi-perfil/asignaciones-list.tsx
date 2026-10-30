import { Building, FileText, Users, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/minisitio/status-badge";

/** Asignación del condómino (forma de `getProfile().asignaciones`). */
export interface Asignacion {
  id_roles_condominal?: string | number | null;
  id?: string | number | null;
  activo: number | boolean;
  rolNombre: string;
  tabla: string;
  campo?: string | null;
  entidadNombre: string;
}

// Icono por tabla (Users para cualquier otra). Mapa a nivel de módulo en vez de la función
// getIcon() de antes: el lint de React Compiler no permite componentes "creados" en render.
const ICONS_BY_TABLA: Record<string, LucideIcon> = {
  AREAS_PRIVATIVAS: Building,
  ARRENDAMIENTOS: FileText,
};

const getDescripcion = (tabla: string) => {
  switch (tabla) {
    case "AREAS_PRIVATIVAS":
      return "Área Privativa";
    case "ARRENDAMIENTOS":
      return "Arrendamiento";
    default:
      return "Asignación";
  }
};

/** Tarjeta de una asignación (antes components/AsignacionesList.js). */
export function AsignacionItem({ asignacion, showDetails = false }: { asignacion: Asignacion; showDetails?: boolean }) {
  const Icon = ICONS_BY_TABLA[asignacion.tabla] ?? Users;

  return (
    <div className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
      showDetails ? "bg-surface-2" : ""
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-light bg-opacity-20 rounded-lg">
            <Icon className="w-5 h-5 text-primary-dark" />
          </div>
          <div>
            <h4 className="font-medium text-fg">{asignacion.rolNombre}</h4>
            <p className="text-sm text-fg-3">{getDescripcion(asignacion.tabla)}</p>
          </div>
        </div>
        {/* El StatusBadge viejo ignoraba la prop `text` (pinta "Al día" / "Pendiente"): igual aquí. */}
        <StatusBadge status={asignacion.activo ? 1 : 2} />
      </div>

      <div className="pl-11">
        <p className="text-sm font-medium text-fg-2 mb-1">
          {asignacion.entidadNombre}
        </p>

        {showDetails && (
          <div className="mt-3 space-y-2 text-sm text-fg-3">
            <div className="flex items-center space-x-2">
              <span className="font-medium">ID:</span>
              <span>{asignacion.id}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Tabla:</span>
              <span className="tabular-nums text-xs bg-surface-4 px-2 py-1 rounded">
                {asignacion.tabla}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Campo:</span>
              <span className="tabular-nums text-xs bg-surface-4 px-2 py-1 rounded">
                {asignacion.campo}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AsignacionesList({
  asignaciones,
  showAll = false,
  showDetails = false,
}: {
  asignaciones: Asignacion[] | null | undefined;
  showAll?: boolean;
  showDetails?: boolean;
}) {
  if (!asignaciones || asignaciones.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-fg-4 mx-auto mb-3" />
        <p className="text-fg-3">No hay asignaciones registradas</p>
      </div>
    );
  }

  const asignacionesToShow = showAll ? asignaciones : asignaciones.slice(0, 4);

  return (
    <div className="space-y-4">
      {asignacionesToShow.map((asignacion, index) => (
        <AsignacionItem
          key={`${asignacion.id_roles_condominal}-${asignacion.id}-${index}`}
          asignacion={asignacion}
          showDetails={showDetails}
        />
      ))}

      {!showAll && asignaciones.length > 4 && (
        <div className="text-center py-2">
          <p className="text-sm text-fg-3">
            Mostrando 4 de {asignaciones.length} asignaciones
          </p>
        </div>
      )}
    </div>
  );
}
