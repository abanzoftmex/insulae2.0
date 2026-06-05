"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function GlobalLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Whenever the URL changes, we've successfully navigated, so stop loading.
    setIsLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find the closest anchor tag
      const anchor = (e.target as HTMLElement).closest("a");
      
      if (!anchor || !anchor.href) return;
      
      const isModifiedEvent =
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
        (anchor.hasAttribute("target") && anchor.getAttribute("target") === "_blank");

      if (isModifiedEvent) return;

      const currentUrl = new URL(window.location.href);
      let targetUrl: URL;
      try {
        targetUrl = new URL(anchor.href);
      } catch (err) {
        return;
      }

      // Ignore hash-only changes or exact same URLs
      if (
        currentUrl.origin === targetUrl.origin &&
        currentUrl.pathname === targetUrl.pathname &&
        currentUrl.search === targetUrl.search
      ) {
        return;
      }

      // Ignore download links
      if (anchor.hasAttribute("download")) {
        return;
      }

      // If it's a valid internal navigation, show the loader immediately
      if (targetUrl.origin === currentUrl.origin) {
        setIsLoading(true);
      }
    };

    // Use capture phase to intercept before React router handles it
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-white/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white rounded-xl px-8 py-6 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200 border border-[#b58b4f]/30">
        <Loader2 className="h-10 w-10 text-[#2c3e50] animate-spin" />
        <p className="text-[12px] font-bold uppercase tracking-widest text-[#2c3e50]">Cargando...</p>
      </div>
    </div>
  );
}
