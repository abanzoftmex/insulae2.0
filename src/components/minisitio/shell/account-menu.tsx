"use client";

/**
 * Menú de cuenta (avatar): quién eres, Mi perfil, Aviso de privacidad y Cerrar sesión. Como los
 * menús de Slack: filas de 32 px, resaltado sólido con teclado o puntero, Esc cierra y el foco
 * regresa al botón.
 */
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CircleUser, LogOut, Shield } from "lucide-react";
import type { MinisitioUser } from "@/modules/minisitio/domain/types";
import { msPath } from "../paths";
import { popover } from "../motion";

const USER_TYPE_LABEL: Record<string, string> = {
  propietario: "Propietario",
  arrendatario: "Comercio",
  both: "Propietario y comercio",
};

export function userInitials(user: MinisitioUser | null): string {
  const parts = [user?.nombre, user?.apaterno].filter(Boolean).join(" ").trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "") || "VQ";
}

export function userDisplayName(user: MinisitioUser | null): string {
  return [user?.nombre, user?.apaterno].filter(Boolean).join(" ").trim() || "Condómino";
}

export function Avatar({ user, size = 28 }: { user: MinisitioUser | null; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      // Radio proporcional como Slack: el 22 % del lado.
      className="inline-flex shrink-0 items-center justify-center rounded-[22%] bg-chrome-selected font-bold text-chrome-selected-ink uppercase"
    >
      {userInitials(user)}
    </span>
  );
}

export function AccountMenu({
  user,
  onLogout,
  align = "right",
  triggerClassName = "",
}: {
  user: MinisitioUser | null;
  onLogout: () => void;
  align?: "right" | "left-up";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    requestAnimationFrame(() => items()[0]?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const list = items();
        const i = list.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        list[next]?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const itemClass =
    "flex h-8 w-full items-center gap-2.5 rounded-surface px-3 text-body text-fg outline-none hover:bg-brand hover:text-white focus-visible:bg-brand focus-visible:text-white";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Cuenta de ${userDisplayName(user)}`}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName}
      >
        <Avatar user={user} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Cuenta"
            {...popover}
            style={{ transformOrigin: align === "right" ? "top right" : "bottom left" }}
            className={`absolute z-50 w-[260px] rounded-panel bg-surface p-1.5 shadow-menu ${
              align === "right" ? "top-full right-0 mt-2" : "bottom-full left-0 mb-2"
            }`}
          >
            <div className="flex items-center gap-3 px-3 pt-2 pb-3">
              <Avatar user={user} size={36} />
              <div className="min-w-0">
                <p className="truncate text-body font-semibold text-fg">{userDisplayName(user)}</p>
                <p className="truncate text-caption text-fg-3">{USER_TYPE_LABEL[user?.userType ?? ""] ?? "Condómino"}</p>
              </div>
            </div>
            <div className="my-1 h-px bg-stroke-3" role="separator" />
            <Link role="menuitem" href={msPath("/mi-perfil")} onClick={() => setOpen(false)} className={itemClass}>
              <CircleUser className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Mi perfil
            </Link>
            <Link role="menuitem" href={msPath("/aviso-privacidad")} onClick={() => setOpen(false)} className={itemClass}>
              <Shield className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Aviso de privacidad
            </Link>
            <div className="my-1 h-px bg-stroke-3" role="separator" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex h-8 w-full items-center gap-2.5 rounded-surface px-3 text-body text-fg outline-none hover:bg-danger hover:text-white focus-visible:bg-danger focus-visible:text-white"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
