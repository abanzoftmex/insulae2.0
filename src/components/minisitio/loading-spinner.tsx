const SIZE_CLASSES = {
  small: "h-4 w-4",
  medium: "h-8 w-8",
  large: "h-12 w-12",
  // El AuthProvider del minisitio usaba size="lg"; se conserva el alias.
  lg: "h-12 w-12",
} as const;

export function LoadingSpinner({
  size = "medium",
  text = "Cargando...",
}: {
  size?: keyof typeof SIZE_CLASSES;
  text?: string | null;
}) {
  return (
    // Aparece a los 400 ms: si la pantalla llega antes, no parpadea.
    <div className="flex animate-appear-late items-center justify-center p-4" role="status">
      <div className="flex flex-col items-center gap-3">
        <div className={`animate-spin rounded-full border-2 border-brand/15 border-t-brand ${SIZE_CLASSES[size]}`} />
        {text ? <p className="text-[13px] text-fg-3">{text}</p> : <span className="sr-only">Cargando</span>}
      </div>
    </div>
  );
}

export default LoadingSpinner;
