/**
 * Movimiento del portal de condóminos, con los tiempos verificados de Slack
 * (docs/slack-design-analysis.md §6): casi todo en 80 ms con una sola curva propia, salidas
 * tan cortas como las entradas, nada rebota. Los mismos números que los tokens de
 * minisitio.css (--transition-duration-*, --ease-slack).
 *
 * Dos detalles propios, más cortos que en el admin: la píldora del ítem activo se desliza y las
 * secciones se pliegan con su alto. El hover es instantáneo y los botones no se encogen: el
 * estado presionado es un velo más oscuro. Todo el shell va dentro de
 * <MotionConfig reducedMotion="user">.
 */
import type { Transition } from "framer-motion";

export const EASE = {
  slack: [0.36, 0.19, 0.29, 1],
  /** Peek / paneles que entran deslizándose. */
  peek: [0.25, 1, 0.5, 1],
  smooth: [0.32, 0.72, 0, 1],
} as const;

export const DUR = {
  instant: 0.08,
  fast: 0.16,
  base: 0.2,
  moderate: 0.24,
  slow: 0.32,
} as const;

export const SPRING = {
  /** Píldora del ítem activo: asienta en ≈140 ms, sin rebote. */
  indicator: { type: "spring", stiffness: 720, damping: 52, mass: 0.6 },
  /** Hoja lateral del celular: ≈220 ms, sin rebote. */
  drawer: { type: "spring", stiffness: 520, damping: 48, mass: 0.8 },
  /** Conteos que cambian: un pulso corto. */
  badge: { type: "spring", stiffness: 600, damping: 32, mass: 0.5 },
} as const satisfies Record<string, Transition>;

/** Contenido que llega (página, lista): fundido corto, como el texto enriquecido de Slack. */
export const contentIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DUR.base, ease: "linear", delay: 0.04 } },
} as const;

/** Menús y popovers. */
export const popover = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: DUR.instant, ease: EASE.slack } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: DUR.instant, ease: EASE.slack } },
} as const;

/** Diálogos centrados: de .95 a 1 en 80 ms. */
export const dialog = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: DUR.instant, ease: EASE.slack } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: DUR.instant, ease: EASE.slack } },
} as const;

/** Velo de diálogos y hojas: 80 ms lineal. */
export const scrim = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DUR.instant, ease: "linear" } },
  exit: { opacity: 0, transition: { duration: DUR.instant, ease: "linear" } },
} as const;

/** Avisos efímeros: suben 20 px en 80 ms. */
export const toast = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.instant, ease: EASE.slack } },
  exit: { opacity: 0, y: 20, transition: { duration: DUR.instant, ease: EASE.slack } },
} as const;
