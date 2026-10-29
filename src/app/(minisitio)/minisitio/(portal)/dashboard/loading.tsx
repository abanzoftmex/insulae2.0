import { LoadingSpinner } from "@/components/minisitio/loading-spinner";

/** Mismo estado de carga que tenía pages/dashboard.js mientras llegaban los datos. */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
