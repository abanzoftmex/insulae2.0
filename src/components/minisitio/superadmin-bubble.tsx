"use client";

/**
 * Burbuja flotante del modo superadministrador: cuenta regresiva de la sesión (15 min),
 * extensión con contraseña, buscador de usuarios y suplantación. Se muestra en todo el
 * portal mientras la cookie de superadmin esté vigente (la lee el layout raíz).
 *
 * Los cambios de identidad (suplantar, terminar suplantación, cerrar el modo) navegan con
 * recarga completa, igual que en el minisitio independiente, para que el servidor vuelva a
 * leer las cookies y todo el portal refleje al usuario correcto.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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
import { msPath } from "./paths";

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
  // Verde > 5 min · Amarillo 2-5 min · Rojo < 2 min
  const countdownColor = secondsLeft > 300 ? "bg-emerald-500" : secondsLeft > 120 ? "bg-amber-500" : "bg-red-500";

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-slate-900 hover:bg-slate-800 rounded-full shadow-lg ring-1 ring-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200"
        title="Modo Superadmin"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>

        {/* Contador de tiempo restante (color según urgencia) */}
        <span
          className={`absolute -top-1.5 -right-1.5 min-w-[22px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white tabular-nums ${countdownColor} ${
            secondsLeft <= 60 ? "animate-pulse" : ""
          }`}
        >
          {countdownLabel}
        </span>

        {/* Indicador: hay un usuario suplantado */}
        {impersonatedUser && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-brand rounded-full flex items-center justify-center ring-2 ring-white">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-[9999] w-96 max-h-[70vh] bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-slate-900 p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </span>
                <span className="font-semibold text-sm tracking-tight">Modo Superadmin</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info de sesión */}
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-xs text-white/70">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Expira en <span className="font-semibold text-white tabular-nums">{timeRemaining}</span></span>
              </span>
              <button
                onClick={() => {
                  setShowExtend((v) => !v);
                  setExtendError("");
                }}
                className="flex items-center space-x-1 bg-white/10 hover:bg-white/15 ring-1 ring-white/15 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                title="Extender la sesión 15 minutos"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14m7-7H5" />
                </svg>
                <span>15 min</span>
              </button>
            </div>

            {impersonatedUser && (
              <div className="mt-3 flex items-center space-x-2 bg-white/5 ring-1 ring-white/10 rounded-lg px-2.5 py-1.5">
                <svg className="w-3.5 h-3.5 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs text-white/90 truncate">
                  Sesión activa como <span className="font-semibold">{impersonatedUser.displayName}</span>
                </span>
              </div>
            )}

            {/* Formulario para extender la sesión (pide la contraseña) */}
            {showExtend && (
              <form onSubmit={handleExtend} className="mt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="password"
                    autoFocus
                    value={extendPassword}
                    onChange={(e) => setExtendPassword(e.target.value)}
                    placeholder="Contraseña para extender"
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs text-white placeholder-white/40 bg-white/10 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
                  />
                  <button
                    type="submit"
                    disabled={extending || !extendPassword}
                    className="px-3 py-2 rounded-lg bg-brand hover:bg-brand-accent text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {extending ? "..." : "+15 min"}
                  </button>
                </div>
                {extendError && (
                  <p className="text-[11px] text-white bg-red-500/30 ring-1 ring-red-400/30 rounded-md px-2 py-1">{extendError}</p>
                )}
              </form>
            )}
          </div>

          {/* Buscador y lista de usuarios: solo cuando NO hay un usuario
              suplantado. Si hay una sesión activa, se debe terminar primero
              antes de poder cambiar de usuario. */}
          {!impersonatedUser && (
            <>
          {/* Buscador */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 transition"
                placeholder="Buscar usuario por nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {impersonateError && (
            <p role="alert" className="mx-3 mb-2 rounded-md bg-critical-bg px-3 py-2 text-xs font-medium text-overdue">
              {impersonateError}
            </p>
          )}

          {/* Lista de usuarios */}
          <div className="flex-1 overflow-y-auto max-h-[40vh]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-slate-900"></div>
                <span className="ml-2 text-sm text-slate-500">Buscando...</span>
              </div>
            ) : usersError ? (
              <div className="text-center py-8 px-4">
                <svg className="w-8 h-8 mx-auto mb-2 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
                <p className="text-sm text-red-600 font-medium">No se pudieron cargar los usuarios</p>
                <p className="text-xs text-slate-500 mt-1 break-words">{usersError}</p>
                <button
                  onClick={() => fetchUsers(search)}
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {search ? "No se encontraron usuarios" : "Escribe para buscar usuarios"}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isCurrentUser = currentImpersonatedId === user.id_directorio;
                  return (
                    <button
                      key={user.id_directorio}
                      onClick={() => !isCurrentUser && handleImpersonate(user)}
                      disabled={impersonating || isCurrentUser}
                      className={`w-full text-left px-4 py-3 transition-colors flex items-center space-x-3 disabled:cursor-default ${
                        isCurrentUser
                          ? "bg-brand-mint/40 border-l-2 border-brand"
                          : "hover:bg-slate-50 border-l-2 border-transparent"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isCurrentUser
                          ? "bg-brand text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {user.email || user.user || `ID: ${user.id_directorio}`}
                        </p>
                      </div>
                      {isCurrentUser ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-brand font-semibold flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                          Activo
                        </span>
                      ) : (
                        <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
            </>
          )}

          {/* Loading overlay al suplantar */}
          {impersonating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900 mx-auto mb-2"></div>
                <p className="text-sm font-medium text-slate-700">Cambiando de usuario...</p>
              </div>
            </div>
          )}

          {/* Footer - Acciones */}
          <div className="border-t border-slate-200 p-3 space-y-2">
            {/* Terminar sesión del usuario suplantado (mantiene el modo superadmin) */}
            {impersonatedUser && (
              <button
                onClick={handleEndImpersonation}
                disabled={endingImpersonation}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors duration-200 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {endingImpersonation ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-700"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 17l5-5m0 0l-5-5m5 5H9m3 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h3a3 3 0 013 3v1" />
                  </svg>
                )}
                <span className="truncate">
                  Terminar sesión de {impersonatedUser.displayName}
                </span>
              </button>
            )}

            {/* Cerrar modo superadministrador */}
            <button
              onClick={handleDeactivate}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 border border-red-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
              </svg>
              <span>Cerrar modo superadministrador</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default SuperAdminBubble;
