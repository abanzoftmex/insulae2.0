import { redirect } from "next/navigation";
import { msPath } from "@/components/minisitio/paths";

/**
 * El "historial de avisos" repetía los mismos comunicados que Avisos, paginados. Avisos ya muestra
 * toda la historia, así que la ruta vieja (por si alguien la guardó) lleva allá.
 */
export default function NotificacionesPage() {
  redirect(msPath("/comunicados"));
}
