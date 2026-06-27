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
    whatsapp: string;
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
  const [whatsapp, setWhatsapp] = useState(initialData.whatsapp);

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
        whatsapp: whatsapp ? whatsapp.trim() : null,
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
            <Input
              label="Número de WhatsApp"
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ej. +5212212721794"
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
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-white/60" />
                <span className="text-[11px] text-white/80 break-all">{sanitizeEmail(email) || "sin-correo@pendiente.com"}</span>
              </div>
              {whatsapp && (
                <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                  <svg className="h-3.5 w-3.5 shrink-0 text-white/60 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.511 0 9.992-4.479 9.995-9.996.002-2.653-1.03-5.146-2.908-7.027-1.879-1.881-4.38-2.916-7.037-2.917-5.517 0-10.002 4.48-10.004 9.997-.001 1.714.453 3.39 1.317 4.877L.888 22.09l4.57-1.196c1.472.852 3.023 1.26 4.706 1.26zm10.743-7.466c-.294-.148-1.743-.86-2.012-.958-.269-.098-.465-.148-.66.148-.196.297-.76.958-.93 1.156-.172.196-.343.22-.637.072-.295-.148-1.246-.459-2.373-1.464-.877-.782-1.47-1.747-1.642-2.043-.172-.296-.018-.456.13-.603.133-.132.294-.344.44-.516.148-.171.197-.294.295-.49.098-.197.05-.37-.024-.517-.074-.148-.66-1.592-.906-2.18-.24-.578-.484-.5-.66-.51-.171-.007-.366-.009-.561-.009-.195 0-.514.073-.783.37-.269.296-1.027 1.006-1.027 2.454 0 1.448 1.054 2.846 1.202 3.043.147.197 2.074 3.167 5.025 4.443.702.303 1.25.485 1.678.62.705.224 1.348.193 1.856.117.566-.084 1.743-.712 1.988-1.4.246-.688.246-1.277.172-1.4-.074-.124-.27-.197-.565-.346z" />
                  </svg>
                  <span className="text-[11px] text-white/80 break-all">{whatsapp}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              Configura el correo y teléfono para recibir notificaciones y tickets.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
