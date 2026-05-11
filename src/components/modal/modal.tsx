"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/components/ui/button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md"
}: ModalProps) {
  // Handle Escape key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Scrim */}
      <div 
        className="absolute inset-0 bg-brand-deep/40 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Content */}
      <div className={cn(
        "relative w-full bg-card rounded-card shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]",
        sizeClasses[size]
      )}>
        {/* Header */}
        <div className="h-14 px-5 border-b border-line flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-tight text-brand">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-canvas text-ink-soft/40 hover:text-ink transition-standard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>

        {/* Footer */}
        {footer !== undefined && (
          <div className="px-5 py-4 border-t border-line bg-canvas/30 flex items-center justify-end gap-3 rounded-b-card">
            {footer || (
              <>
                <Button variant="ghost" onClick={onClose} className="h-9 px-4 text-[11px] font-bold uppercase">Cancelar</Button>
                <Button className="h-9 px-6 text-[11px] font-bold uppercase">Guardar</Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
