export function StatusBadge({ status, type = "payment" }: { status: number | string | null | undefined; type?: string }) {
  const getStatusConfig = () => {
    if (type === "payment") {
      switch (status) {
        case 1: // Al día
          return { color: "bg-green-100 text-green-800", text: "Al día" };
        case 3: // Vencido
          return { color: "bg-red-100 text-red-800", text: "Vencido" };
        case 2: // En proceso
          return { color: "bg-yellow-100 text-yellow-800", text: "Pendiente" };
        default:
          return { color: "bg-gray-100 text-gray-800", text: "Sin estado" };
      }
    }

    // Para otros tipos de status
    return { color: "bg-blue-100 text-blue-800", text: status };
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  );
}

export default StatusBadge;
