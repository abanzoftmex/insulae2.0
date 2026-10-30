"use client";

/**
 * Pinta los avisos efímeros como los toasts de Slack: suben 20 px en 80 ms y se van solos a los
 * 5 s. Al pasar el cursor se pausan y crece la sombra. Abajo al centro (sobre la barra de
 * pestañas en el celular), anunciados a lectores de pantalla.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useToastStore, type ToastItem } from "@/stores/minisitio-toast.store";
import { toast as toastMotion } from "../motion";

const TONE_ICON = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const DISMISS_MS = 5000;

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <Toast key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const Icon = TONE_ICON[item.tone];

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => useToastStore.getState().dismiss(item.id), DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [paused, item.id]);

  return (
    <motion.div
      layout
      {...toastMotion}
      role={item.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-[460px] items-center gap-3 rounded-panel bg-chrome-strong py-2.5 pr-2 pl-3.5 text-body text-chrome-ink shadow-toast transition-shadow hover:shadow-modal"
    >
      <Icon className={`h-[18px] w-[18px] shrink-0 ${item.tone === "error" ? "text-chrome-danger" : "text-unread"}`} aria-hidden />
      <span className="min-w-0 flex-1">{item.message}</span>
      <button
        type="button"
        onClick={() => useToastStore.getState().dismiss(item.id)}
        aria-label="Cerrar aviso"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-ctrl text-chrome-ink-soft outline-none hover:bg-chrome-hover hover:text-chrome-ink focus-visible:ring-2 focus-visible:ring-chrome-focus"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  );
}
