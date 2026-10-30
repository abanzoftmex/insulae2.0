"use client";

/**
 * Al llegar desde el buscador global con `?id=…`, lleva a la vista el elemento que tenga ese
 * `data-search-id` y lo resalta un momento (anillo dorado que se desvanece). La pantalla puede
 * tardar en pintarlo (loading.tsx), así que lo busca unas cuantas veces antes de rendirse.
 */
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SearchHitFocus() {
  const pathname = usePathname();
  const id = useSearchParams().get("id");

  useEffect(() => {
    if (!id) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-search-id="${CSS.escape(id)}"]`);
      if (!el) {
        if (++tries < 40) timer = setTimeout(find, 100);
        return;
      }
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      el.removeAttribute("data-search-hit");
      // Reinicia la animación aunque se busque dos veces lo mismo.
      void el.offsetWidth;
      el.setAttribute("data-search-hit", "");
      timer = setTimeout(() => el.removeAttribute("data-search-hit"), 2600);
    };
    find();
    return () => clearTimeout(timer);
  }, [id, pathname]);

  return null;
}
