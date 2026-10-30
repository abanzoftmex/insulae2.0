"use client";

/**
 * Barra lateral del portal al estilo Slack: accesos fijos arriba, secciones que se pliegan (y se
 * recuerdan), una píldora que se desliza al ítem activo y señales con un significado cada una:
 * negrita = algo nuevo sin ver; badge = pendientes que se cuentan; punto = un estado que dura
 * (saldo vencido). Así la negrita no se gasta en lo que no cambia.
 *
 * Teclado: Tab recorre los ítems; Enter abre; el encabezado de sección es un botón con
 * aria-expanded; Alt+clic pliega o despliega todas (como en Slack).
 */
import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useMinisitioNavStore } from "@/stores/minisitio-nav.store";
import { msPath } from "../paths";
import { DUR, EASE, SPRING } from "../motion";
import { isItemActive, type NavItem, type NavModel, type NavSection } from "./nav-config";

interface SidebarProps {
  model: NavModel;
  path: string;
  /** Para cerrar la hoja en el celular al navegar. */
  onNavigate?: () => void;
  /** Distinto por instancia (escritorio / hoja móvil) para que la píldora no salte entre ambas. */
  pillId?: string;
}

export function Sidebar({ model, path, onNavigate, pillId = "ms-nav-pill" }: SidebarProps) {
  const collapsed = useMinisitioNavStore((s) => s.collapsed);
  const toggle = useMinisitioNavStore((s) => s.toggle);
  const setAll = useMinisitioNavStore((s) => s.setAll);
  const expand = useMinisitioNavStore((s) => s.expand);

  // La sección de la pantalla actual se abre sola.
  useEffect(() => {
    for (const section of model.sections) {
      if (section.items.some((item) => isItemActive(item, path))) expand(section.id);
    }
  }, [path, model.sections, expand]);

  const sectionIds = model.sections.map((s) => s.id);

  return (
    <nav aria-label="Menú del portal" className="flex min-h-0 flex-1 flex-col">
      <ul className="space-y-px px-2 pb-1">
        {model.pinned.map((item) => (
          <li key={item.id}>
            <SidebarItem item={item} active={isItemActive(item, path)} onNavigate={onNavigate} pillId={pillId} />
          </li>
        ))}
      </ul>
      <div className="scrollbar-chrome min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {model.sections.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            path={path}
            open={!collapsed[section.id]}
            onToggle={() => toggle(section.id)}
            onToggleAll={(open) => setAll(sectionIds, !open)}
            onNavigate={onNavigate}
            pillId={pillId}
          />
        ))}
      </div>
    </nav>
  );
}

function SidebarSection({
  section,
  path,
  open,
  onToggle,
  onToggleAll,
  onNavigate,
  pillId,
}: {
  section: NavSection;
  path: string;
  open: boolean;
  onToggle: () => void;
  onToggleAll: (open: boolean) => void;
  onNavigate?: () => void;
  pillId: string;
}) {
  const panelId = `ms-nav-${section.id}`;
  // Plegada, la sección sigue mostrando la pantalla activa (como el canal abierto en Slack).
  const activeItems = section.items.filter((item) => isItemActive(item, path));
  // Plegada con algo pendiente, el título se marca (Slack lo pone en negrita).
  const pending = !open && section.items.some((item) => item.unread || item.attention || item.count);

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => (e.altKey ? onToggleAll(!open) : onToggle())}
        title="Alt+clic para plegar o abrir todas"
        className={`flex h-7 w-full items-center gap-1.5 rounded-ctrl px-2 text-body outline-none hover:bg-chrome-hover focus-visible:ring-2 focus-visible:ring-chrome-focus ${
          pending ? "font-bold text-chrome-ink" : "text-chrome-ink-soft"
        }`}
      >
        <motion.span
          aria-hidden
          className="inline-flex"
          initial={false}
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: DUR.fast, ease: EASE.slack }}
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2} />
        </motion.span>
        <span className="truncate">{section.label}</span>
        {!open && section.collapsedHint && (
          <span className="ml-auto shrink-0 text-caption font-medium text-chrome-label">{section.collapsedHint}</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={panelId}
            key="items"
            className="space-y-px overflow-hidden pt-0.5"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: { height: { duration: DUR.fast, ease: EASE.slack }, opacity: { duration: DUR.fast, ease: "linear" } },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { height: { duration: DUR.fast, ease: EASE.slack }, opacity: { duration: DUR.instant, ease: "linear" } },
            }}
          >
            {section.items.map((item) => (
              <li key={item.id}>
                <SidebarItem item={item} active={isItemActive(item, path)} onNavigate={onNavigate} pillId={pillId} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      {!open && activeItems.length > 0 && (
        // Aparece cuando terminó de salir la lista completa.
        <motion.ul
          className="space-y-px pt-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: DUR.fast, duration: DUR.instant } }}
        >
          {activeItems.map((item) => (
            <li key={item.id}>
              <SidebarItem item={item} active onNavigate={onNavigate} pillId={pillId} />
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

function SidebarItem({
  item,
  active,
  onNavigate,
  pillId,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  pillId: string;
}) {
  const Icon = item.icon;
  // Como los no leídos de Slack: solo lo nuevo va en negrita y tinta plena.
  const emphasized = !active && item.unread;
  const className = [
    // 28 px, radio 6, 8 px de padding y de separación: las medidas de la fila de Slack. El
    // hover es instantáneo, como allá.
    "group relative flex h-7 items-center gap-2 rounded-surface px-2 text-body outline-none",
    "focus-visible:ring-2 focus-visible:ring-chrome-focus",
    active
      ? "font-semibold text-chrome-selected-ink"
      : `${emphasized ? "font-bold text-chrome-ink" : "text-chrome-ink-soft"} hover:bg-chrome-hover active:bg-chrome-pressed`,
  ].join(" ");

  const content = (
    <>
      {active && (
        <motion.span
          layoutId={pillId}
          aria-hidden
          className="absolute inset-0 rounded-surface bg-chrome-selected"
          transition={SPRING.indicator}
        />
      )}
      <Icon className="relative h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="relative min-w-0 flex-1 truncate">
        {item.label}
        {item.detail && <span className={active ? "font-normal opacity-70" : "text-chrome-label"}> · {item.detail}</span>}
      </span>
      {item.external && <ArrowUpRight className="relative h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />}
      {item.count ? (
        <motion.span
          key={item.count}
          aria-hidden
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          transition={SPRING.badge}
          className="relative inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-unread px-1.5 text-[11px] leading-none font-bold text-chrome-strong tabular-nums"
        >
          {item.count}
        </motion.span>
      ) : item.attention ? (
        <span aria-hidden className={`relative h-2 w-2 shrink-0 rounded-full ${active ? "bg-mention" : "bg-unread"}`} />
      ) : null}
      {item.attentionLabel && <span className="sr-only">, {item.attentionLabel}</span>}
    </>
  );

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
        <span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
    );
  }
  return (
    <Link href={msPath(item.href)} aria-current={active ? "page" : undefined} onClick={onNavigate} className={className}>
      {content}
    </Link>
  );
}
