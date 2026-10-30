"use client";

/**
 * Cada pantalla del portal entra con un fundido corto, como el contenido que llega en Slack
 * (200 ms, sin desplazamiento ni animación de salida). Un template, no un layout: se vuelve a
 * montar en cada navegación.
 */
import { motion } from "framer-motion";
import { contentIn } from "@/components/minisitio/motion";

export default function PortalTemplate({ children }: { children: React.ReactNode }) {
  return <motion.div {...contentIn}>{children}</motion.div>;
}
