"use client";

/**
 * Avisos efímeros del portal (toasts), en lugar de alert(). `toast("Solicitud enviada")` desde
 * cualquier pantalla; el shell los pinta (components/minisitio/ui/toaster.tsx).
 */
import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

let nextId = 0;

/** Como mucho tres a la vez: el más viejo se va. */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "success") => set((s) => ({ toasts: [...s.toasts.slice(-2), { id: ++nextId, message, tone }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, tone?: ToastTone): void {
  useToastStore.getState().push(message, tone);
}
