import { notFound } from "next/navigation";

/** Cualquier ruta desconocida bajo /minisitio muestra la 404 del portal (not-found.tsx). */
export default function MinisitioCatchAll() {
  notFound();
}
