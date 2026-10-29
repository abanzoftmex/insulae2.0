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
    <div className="flex items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-2">
        <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${SIZE_CLASSES[size]}`}></div>
        {text && <p className="text-sm text-gray-600">{text}</p>}
      </div>
    </div>
  );
}

export default LoadingSpinner;
