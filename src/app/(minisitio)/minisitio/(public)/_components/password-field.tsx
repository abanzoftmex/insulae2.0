"use client";

/** Campo de contraseña con "Mostrar / Ocultar" (botón de texto, accesible por teclado). */
import { useState } from "react";
import { inputClass } from "@/components/minisitio/ui/field";

export function PasswordField({
  id,
  name,
  value,
  onChange,
  autoComplete,
  required = true,
  describedBy,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        className={`${inputClass} pr-20`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute top-1/2 right-1.5 h-7 -translate-y-1/2 rounded-ctrl px-2 text-[13px] font-semibold text-brand outline-none hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-brand"
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
