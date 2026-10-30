"use client";

/**
 * Interruptor (role="switch"): pista de 36 × 20, olivo encendido, y la perilla se desliza en
 * 160 ms. Para preferencias que se guardan al momento.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  describedBy,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Nombre accesible si no hay un <label> visible asociado. */
  label?: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-fast outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 ${
        checked ? "bg-brand" : "bg-stroke-accessible/60"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-surface shadow-button transition-transform duration-fast ease-slack ${checked ? "translate-x-4" : ""}`}
      />
    </button>
  );
}
