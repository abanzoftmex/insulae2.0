"use client";

import type { ReactNode, UIEvent } from "react";
import { useState } from "react";

type StickyHorizontalTableFrameProps = {
  header: ReactNode;
  children: ReactNode;
};

export function StickyHorizontalTableFrame({
  header,
  children,
}: StickyHorizontalTableFrameProps) {
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleBodyScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollLeft(event.currentTarget.scrollLeft);
  };

  return (
    <div className="relative">
      <div className="sticky top-0 z-40 overflow-hidden border-b border-[#c3ad94] bg-[#d8c6af]">
        <div style={{ transform: `translateX(-${scrollLeft}px)` }} className="will-change-transform">
          {header}
        </div>
      </div>

      <div className="overflow-x-auto" onScroll={handleBodyScroll}>
        {children}
      </div>
    </div>
  );
}
