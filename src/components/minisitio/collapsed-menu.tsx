"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { NavEntry } from "./minisitio-shell";

/** Megamenú para los ítems con hijos cuando el rail está colapsado. */
export function CollapsedMenu({
  isOpen,
  onClose,
  item,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: NavEntry | null;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !item?.children) return null;

  const Icon = item.icon;

  return (
    <div
      ref={menuRef}
      className="fixed left-20 top-20 bg-card rounded-lg shadow-2xl z-[9998] border border-line overflow-hidden max-w-xs"
    >
      {/* Header del megamenu */}
      <div className="bg-canvas/60 border-b border-line px-4 py-3 flex items-center gap-3">
        <Icon className="w-5 h-5 text-brand" />
        <h3 className="font-semibold text-ink">{item.name}</h3>
      </div>

      {/* Items del menú */}
      <nav className="py-2">
        {item.children.map((child) => {
          const ChildIcon = child.icon;
          return (
            <Link key={child.name} href={child.href || "#"} onClick={onClose}>
              <div
                className={`px-4 py-3 flex items-center gap-3 hover:bg-[#f5f4f0] transition-colors duration-150 cursor-pointer group ${
                  child.current ? "bg-canvas border-l-2 border-brand-accent" : ""
                }`}
              >
                <ChildIcon
                  className={`w-4 h-4 flex-shrink-0 ${child.current ? "text-brand" : "text-ink-soft group-hover:text-ink"}`}
                />
                <span className={`text-sm font-medium ${child.current ? "text-brand" : "text-ink group-hover:text-ink"}`}>
                  {child.name}
                </span>
                {child.current && <ChevronRight className="w-4 h-4 ml-auto text-brand" />}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default CollapsedMenu;
