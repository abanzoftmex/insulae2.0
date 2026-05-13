"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Role } from "@/modules/role/domain/role.types";
import { deleteRoleAction } from "../actions";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Edit2, Trash2, ShieldCheck } from "lucide-react";

interface Props {
  roles: Role[];
  condominiumId: string;
}

export function RoleList({ roles, condominiumId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return roles.filter((r) =>
      !term || [r.name, r.description || ""].some((f) => f.toLowerCase().includes(term))
    );
  }, [roles, search]);

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este rol?")) return;
    startTransition(async () => {
      const res = await deleteRoleAction(id, condominiumId);
      if (res.success) window.location.reload();
      else alert(res.error);
    });
  };

  const columns: DataTableColumn<Role>[] = [
    {
      header: "Nombre del Rol",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant="brand" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest shrink-0">
            Rol
          </Badge>
          <span className="font-bold text-sm text-ink">{row.name}</span>
        </div>
      ),
    },
    {
      header: "Descripción",
      accessorKey: "description",
      cell: (row) => row.description ? (
        <span className="text-[11px] text-ink-soft">{row.description}</span>
      ) : (
        <span className="text-[10px] text-ink-soft/30 italic">Sin descripción</span>
      ),
    },
    {
      header: "Permisos",
      accessorKey: "id",
      cell: (row) => {
        const count = row.permissions?.length ?? 0;
        return count > 0 ? (
          <Badge variant="success" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
            {count} módulo{count !== 1 ? "s" : ""}
          </Badge>
        ) : (
          <span className="text-[10px] text-ink-soft/30 italic">Sin permisos</span>
        );
      },
    },
    {
      header: "Acción",
      accessorKey: "id",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/listado-roles/${row.id}`}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={isPending}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-danger/15 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <StatCard accent="brand" label="Roles Configurados" value={roles.length} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
      </div>

      <DataTable
        title="Configuración de Roles"
        count={filtered.length}
        data={filtered}
        columns={columns}
        onSearch={setSearch}
        addLabel="Nuevo Rol"
        onAdd={() => window.location.assign("/listado-roles/nuevo")}
      />
    </>
  );
}
