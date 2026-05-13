"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Building2, Mail, Ticket, User } from "lucide-react";

import { saveTicketDepartmentAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageBackBadge } from "@/components/ui/page-back-badge";

interface DepartamentoTicketFormShellProps {
  mode: "create" | "edit";
  departmentId?: string;
  initialData: {
    name: string;
    email: string;
  };
}

function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function DepartamentoTicketFormShell({
  mode,
  departmentId,
  initialData,
}: DepartamentoTicketFormShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const [name, setName] = useState(initialData.name);
  const [email, setEmail] = useState(initialData.email);

  const title = mode === "create" ? "Nuevo Departamento" : "Editar Departamento";

  const initials = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return "DT";
    const chunks = trimmed.split(/\s+/).slice(0, 2);
    return chunks.map((chunk) => chunk.slice(0, 1).toUpperCase()).join("") || "DT";
  }, [name]);

  const save = () => {
    setMessage("");
    startTransition(async () => {
      const result = await saveTicketDepartmentAction({
        id: departmentId,
        name,
        email: sanitizeEmail(email),
      });
      setMessage(result.message);
      if (!result.ok) return;
      router.push("/departamentos-tickets");
      router.refresh();
    });
  };

  const isError = message && !message.toLowerCase().includes("correct");

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">{title}</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Mesa de Atención</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Configura el responsable y correo de atención para enrutar tickets.
            </p>
          </div>
        </div>
      </div>

      {/* ── Form + Preview grid ───────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">

        {/* Form card */}
        <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2">
            <Ticket className="h-4 w-4 text-white/80" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">Datos del departamento</span>
          </div>

          <div className="p-5 sm:p-6 grid gap-4">
            <Input
              label="Nombre del departamento"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Soporte técnico"
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="equipo@dominio.com"
            />
          </div>

          <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-wrap items-center gap-3 border-t border-line/30 pt-4">
            <Button
              type="button"
              onClick={save}
              disabled={isPending}
              className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25"
            >
              {isPending ? "Guardando..." : "Guardar departamento"}
            </Button>
            <Button variant="subtle" asChild size="sm" className="h-8 rounded-full">
              <Link href="/departamentos-tickets">Cancelar</Link>
            </Button>
            {message ? (
              <p className={`text-xs font-bold uppercase tracking-wide ${isError ? "text-danger" : "text-brand"}`}>
                {message}
              </p>
            ) : null}
          </div>
        </div>

        {/* Preview card */}
        <div className="w-64 overflow-hidden rounded-card border border-line/40 bg-brand-deep shadow-sm shrink-0">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-white/60" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">Vista previa</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-bold text-white">
                {initials}
              </div>
              <div>
                <p className="font-bold text-white leading-tight">{name.trim() || "Sin nombre"}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/50 mt-0.5">Departamento</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-white/60" />
              <span className="text-[11px] text-white/80 break-all">{sanitizeEmail(email) || "sin-correo@pendiente.com"}</span>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              Usa un correo de grupo para facilitar la continuidad operativa.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
