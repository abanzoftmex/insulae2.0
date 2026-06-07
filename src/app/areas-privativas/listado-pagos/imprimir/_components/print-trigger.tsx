"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    // Wait for elements/styles to render completely before printing
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
