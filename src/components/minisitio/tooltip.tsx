"use client";

import { useRef, useState } from "react";

type TooltipPosition = "right" | "left" | "top" | "bottom";

export function Tooltip({
  children,
  title,
  position = "right",
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  position?: TooltipPosition;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 12; // espaciado entre trigger y tooltip

    let top = rect.top + rect.height / 2;
    let left = rect.left;

    if (position === "right") {
      left = rect.right + gap;
      top = top - 20; // ajuste para centrar verticalmente
    } else if (position === "left") {
      left = rect.left - gap;
      top = top - 20;
    } else if (position === "top") {
      left = rect.left + rect.width / 2;
      top = rect.top - gap;
    } else if (position === "bottom") {
      left = rect.left + rect.width / 2;
      top = rect.bottom + gap;
    }

    setTooltipPos({ top, left });
    setIsVisible(true);
  };

  return (
    <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={() => setIsVisible(false)} className="inline-block">
      {children}

      {isVisible && (
        <div
          className="fixed bg-brand-deep text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap z-[9999] pointer-events-none shadow-lg animate-in fade-in duration-200"
          style={{
            top: `${tooltipPos.top}px`,
            left: `${tooltipPos.left}px`,
            transform:
              position === "right" || position === "left"
                ? "translateY(-50%)"
                : position === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
}

export default Tooltip;
