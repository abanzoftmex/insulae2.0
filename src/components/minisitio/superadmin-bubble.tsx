"use client";

/**
 * Burbuja flotante del modo superadministrador: cuenta regresiva de la sesión (15 min),
 * extensión con contraseña, buscador de usuarios y suplantación. Se muestra en todo el
 * portal mientras la cookie de superadmin esté vigente (la lee el layout raíz).
 *
 * Los cambios de identidad (suplantar, terminar suplantación, cerrar el modo) navegan con
 * recarga completa, igual que en el minisitio independiente, para que el servidor vuelva a
 * leer las cookies y todo el portal refleje al usuario correcto.
 *
 * Con la paleta del portal (antes, pizarra y verde/ámbar/rojo de Tailwind): el disparador y el
 * encabezado en olivo de noche, el contador neutro que pasa a crema (< 5 min) y a teja (< 2 min),
 * y el panel con el movimiento de los popovers. En el celular queda sobre la barra de pestañas.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Loader2, LogOut, Plus, Power, ShieldCheck, X } from "lucide-react";
import {
  deactivateSuperadminAction,
  endImpersonationAction,
  extendSuperadminAction,
  impersonateAction,
  listSuperadminUsersAction,
} from "@/app/(minisitio)/minisitio/_actions/superadmin";
import type { SuperadminUserOption } from "@/modules/minisitio/infrastructure/queries/superadmin.queries";
import type { MinisitioUser } from "@/modules/minisitio/domain/types";
import { useMinisitioStore } from "@/stores/minisitio.store";
import { popover } from "./motion";
import { msPath } from "./paths";
import { buttonClass } from "./ui/button";
import { SearchField } from "./ui/search-field";

type BubbleUser = SuperadminUserOption & { user?: string };

function formatTimeRemaining(expiresAt: number | null): string {
  if (!expiresAt) return "";
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expirado";
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Iniciales para el avatar de la lista ("María López" → "ML"). */
const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "?";

/** Encima de la barra de pestañas del celular (56 px + aire); en escritorio, a 24 px. */
const ABAJO = "bottom-[calc(72px+env(safe-area-inset-bottom))] lg:bottom-6";

export function SuperAdminBubble({
  expiresAt: initialExpiresAt,
  impersonatedUser: impersonated,
}: {
  expiresAt: number;
  impersonatedUser: MinisitioUser | null;
}) {
  const [expiresAt, setExpiresAt] = useState<number | null>(initialExpiresAt);
  const impersonatedUser = impersonated
    ? { id_directorio: impersonated.id_directorio, displayName: impersonated.nombre }
    : null;

  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<BubbleUser[]>([]);
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  // En línea y no con toast: la burbuja también aparece fuera del portal (en el login), sin Toaster.
  const [impersonateError, setImpersonateError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [showExtend, setShowExtend] = useState(false);
  const [extendPassword, setExtendPassword] = useState("");
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState("");
  const [endingImpersonation, setEndingImpersonation] = useState(false);
  const [, setTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = Boolean(expiresAt);

  // Actualizar el tiempo restante cada segundo (mm:ss)
  useEffect(() => {
    if (!expiresAt) return;

    const updateTime = () => {
      if (Date.now() > expiresAt) {
        // Sesión de superadmin expirada: cerrar el modo, cerrar la sesión activa del
        // usuario suplantado y enviar al login.
        setExpiresAt(null);
        useMinisitioStore.getState().clearData();
        deactivateSuperadminAction().finally(() => {
          window.location.href = msPath("/login");
        });
        return;
      }
      setTimeRemaining(formatTimeRemaining(expiresAt));
      setTick((t) => t + 1);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Cerrar panel al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Esc cierra el panel (como los demás popovers del portal).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Enfocar el campo de búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Buscar usuarios con debounce. Un fallo debe distinguirse de una búsqueda sin
  // resultados: si no, la UI muestra "No se encontraron usuarios" y esconde el error real.
  const fetchUsers = useCallback(async (query: string) => {
    setLoading(true);
    setUsersError("");
    try {
      const data = await listSuperadminUsersAction(query);
      if (data.success) {
        setUsers(data.users);
      } else {
        setUsers([]);
        setUsersError(data.message || "No se pudieron cargar los usuarios.");
      }
    } catch (err) {
      console.error("Error buscando usuarios:", err);
      setUsers([]);
      setUsersError("Error de conexión al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchUsers(search);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search, isOpen, fetchUsers]);

  // Suplantar usuario
  const handleImpersonate = async (user: BubbleUser) => {
    setImpersonating(true);
    setImpersonateError("");
    try {
      const data = await impersonateAction(user.id_directorio);
      if (data.success) {
        useMinisitioStore.getState().clearData();
        setIsOpen(false);
        // Navegación completa: el servidor vuelve a leer la cookie del usuario suplantado.
        window.location.href = msPath("/");
      } else {
        setImpersonateError(data.message || "No se pudo entrar como ese usuario.");
      }
    } catch (error) {
      console.error("Error suplantando usuario:", error);
      setImpersonateError("No hay conexión. Inténtalo otra vez.");
    } finally {
      setImpersonating(false);
    }
  };

  // Extender la sesión 15 minutos más (requiere la contraseña)
  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtending(true);
    setExtendError("");
    try {
      const data = await extendSuperadminAction(extendPassword);
      if (data.success) {
        setExpiresAt(data.expiresAt);
        setTimeRemaining(formatTimeRemaining(data.expiresAt));
        setExtendPassword("");
        setShowExtend(false);
      } else {
        setExtendError(data.message || "No se pudo extender la sesión");
      }
    } catch {
      setExtendError("Error de conexión");
    } finally {
      setExtending(false);
    }
  };

  // Terminar la sesión del usuario suplantado, manteniendo el modo superadmin
  const handleEndImpersonation = async () => {
    setEndingImpersonation(true);
    try {
      await endImpersonationAction();
    } catch {
      // aunque falle el server, limpiamos el cliente
    }
    useMinisitioStore.getState().clearData();
    setIsOpen(false);
    // Volver al login; la burbuja sigue activa para elegir otro usuario
    window.location.href = msPath("/login");
  };

  // Cerrar modo superadmin
  const handleDeactivate = async () => {
    try {
      await deactivateSuperadminAction();
    } catch {
      // aunque falle el server, limpiamos el cliente
    }
    setExpiresAt(null);
    setIsOpen(false);
    useMinisitioStore.getState().clearData();
    window.location.href = msPath("/login");
  };

  if (!isActive) return null;

  const currentImpersonatedId: string | null = impersonatedUser?.id_directorio ?? null;

  // Tiempo restante para el contador de la burbuja (se recalcula con cada tick).
  const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : 0;
  const countdownLabel = secondsLeft >= 60 ? `${Math.floor(secondsLeft / 60)}m` : `${secondsLeft}s`;
  // Neutro > 5 min · crema 2–5 min · teja < 2 min (tokens de aviso del portal).
  const countdownColor = secondsLeft > 300 ? "bg-chrome-selected text-chrome-selected-ink" : secondsLeft > 120 ? "bg-unread text-chrome-strong" : "bg-mention text-white";

  return (
    <>
      {/* Burbuja flotante */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="superadmin-panel"
        aria-label={`Modo superadministrador, expira en ${timeRemaining}${impersonatedUser ? `, sesión de ${impersonatedUser.displayName}` : ""}`}
        title="Modo superadministrador"
        className={`fixed right-4 ${ABAJO} z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-chrome-strong text-chrome-ink shadow-panel outline-none transition-colors duration-160 ease-slack hover:bg-chrome focus-visible:ring-2 focus-visible:ring-chrome-focus focus-visible:ring-offset-2 lg:right-6`}
      >
        <ShieldCheck className="h-5 w-5" aria-hidden />
        {/* Contador de tiempo restante (color según urgencia) */}
        <span
          aria-hidden
          className={`absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[22px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ring-2 ring-surface ${countdownColor} ${secondsLeft <= 60 ? "animate-pulse-soft" : ""}`}
        >
          {countdownLabel}
        </span>
        {/* Indicador: hay un usuario suplantado */}
        {impersonatedUser && (
          <span aria-hidden className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand ring-2 ring-surface">
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...popover}
            ref={panelRef}
            id="superadmin-panel"
            role="dialog"
            aria-label="Modo superadministrador"
            style={{ transformOrigin: "bottom right" }}
            className={`fixed right-4 ${ABAJO} z-[60] mb-14 flex max-h-[70vh] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-panel bg-surface shadow-menu lg:right-6`}
          >
            {/* Encabezado en olivo de noche: es un modo especial */}
            <div className="shrink-0 bg-chrome-strong px-4 pt-3 pb-3.5 text-chrome-ink">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-body font-bold">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Modo superadministrador
                </p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Cerrar"
                  title="Cerrar (Esc)"
                  className="-mr-1.5 inline-flex h-7 w-7 items-center justify-center rounded-ctrl text-chrome-ink-soft outline-none hover:bg-chrome-hover hover:text-chrome-ink focus-visible:ring-2 focus-visible:ring-chrome-focus"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-caption text-chrome-ink-soft">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Expira en <span className="font-semibold text-chrome-ink tabular-nums">{timeRemaining}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowExtend((v) => !v);
                    setExtendError("");
                  }}
                  aria-expanded={showExtend}
                  title="Extender la sesión 15 minutos"
                  className="inline-flex h-7 items-center gap-1 rounded-ctrl bg-chrome-field px-2 text-caption font-semibold text-chrome-ink outline-none hover:bg-chrome-field-hover focus-visible:ring-2 focus-visible:ring-chrome-focus"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  15 min
                </button>
              </div>

              {impersonatedUser && (
                <p className="mt-2.5 truncate rounded-surface bg-chrome-hover px-2.5 py-1.5 text-caption text-chrome-ink-soft">
                  Sesión activa como <span className="font-semibold text-chrome-ink">{impersonatedUser.displayName}</span>
                </p>
              )}

              {/* Formulario para extender la sesión (pide la contraseña) */}
              {showExtend && (
                <form onSubmit={handleExtend} className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="superadmin-extender" className="sr-only">
                      Contraseña del superadministrador
                    </label>
                    <input
                      id="superadmin-extender"
                      type="password"
                      autoComplete="current-password"
                      autoFocus
                      value={extendPassword}
                      onChange={(e) => setExtendPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="h-8 min-w-0 flex-1 rounded-ctrl bg-chrome-field px-2.5 text-body text-chrome-ink outline-none placeholder:text-chrome-label hover:bg-chrome-field-hover focus-visible:ring-2 focus-visible:ring-chrome-focus"
                    />
                    <button
                      type="submit"
                      disabled={extending || !extendPassword}
                      className="inline-flex h-8 shrink-0 items-center rounded-ctrl bg-chrome-selected px-3 text-[13px] font-semibold text-chrome-selected-ink outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-chrome-focus disabled:opacity-50"
                    >
                      {extending ? "Extendiendo…" : "Extender"}
                    </button>
                  </div>
                  {extendError && (
                    <p role="alert" className="text-caption text-chrome-danger">
                      {extendError}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Buscador y lista de usuarios: solo cuando NO hay un usuario suplantado. Si hay una
                sesión activa, se debe terminar primero antes de poder cambiar de usuario. */}
            {!impersonatedUser && (
              <>
                <div className="shrink-0 border-b border-stroke-3 p-3">
                  <SearchField value={search} onChange={setSearch} label="Buscar usuario" placeholder="Buscar por nombre o correo" />
                </div>
                {impersonateError && (
                  <p role="alert" className="mx-3 mt-2 rounded-surface bg-critical-bg px-3 py-2 text-caption font-medium text-overdue">
                    {impersonateError}
                  </p>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto py-1">
                  {loading ? (
                    <p className="flex items-center justify-center gap-2 py-8 text-body text-fg-3">
                      <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden />
                      Buscando…
                    </p>
                  ) : usersError ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-body font-semibold text-fg">No se pudieron cargar los usuarios</p>
                      <p className="mt-1 text-caption break-words text-fg-3">{usersError}</p>
                      <button type="button" onClick={() => fetchUsers(search)} className={buttonClass("outline", "sm", "mt-3")}>
                        Reintentar
                      </button>
                    </div>
                  ) : users.length === 0 ? (
                    <p className="py-8 text-center text-body text-fg-3">{search ? "Ningún usuario coincide." : "Escribe para buscar un usuario."}</p>
                  ) : (
                    <ul>
                      {users.map((user) => {
                        const isCurrentUser = currentImpersonatedId === user.id_directorio;
                        return (
                          <li key={user.id_directorio}>
                            <button
                              type="button"
                              onClick={() => !isCurrentUser && handleImpersonate(user)}
                              disabled={impersonating || isCurrentUser}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left outline-none hover:bg-surface-2 focus-visible:bg-surface-3 disabled:cursor-default"
                            >
                              <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[22%] bg-surface-3 text-caption font-bold text-fg-2">
                                {iniciales(user.displayName)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-body font-semibold text-fg">{user.displayName}</span>
                                <span className="block truncate text-caption text-fg-3">{user.email || user.user || `ID: ${user.id_directorio}`}</span>
                              </span>
                              {isCurrentUser && <span className="shrink-0 text-caption font-semibold text-brand">Activo</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}

            {/* Cambiando de usuario */}
            {impersonating && (
              <div role="status" className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-surface/85 text-body font-medium text-fg-2">
                <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden />
                Cambiando de usuario…
              </div>
            )}

            {/* Acciones */}
            <div className="shrink-0 space-y-2 border-t border-stroke-3 p-3">
              {/* Terminar sesión del usuario suplantado (mantiene el modo superadmin) */}
              {impersonatedUser && (
                <button type="button" onClick={handleEndImpersonation} disabled={endingImpersonation} className={buttonClass("outline", "md", "w-full")}>
                  {endingImpersonation ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogOut className="h-4 w-4" aria-hidden />}
                  <span className="truncate">Terminar sesión de {impersonatedUser.displayName}</span>
                </button>
              )}
              {/* Cerrar modo superadministrador */}
              <button
                type="button"
                onClick={handleDeactivate}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-panel text-body font-semibold text-overdue outline-none hover:bg-critical-bg focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Power className="h-4 w-4" aria-hidden />
                Cerrar modo superadministrador
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SuperAdminBubble;
