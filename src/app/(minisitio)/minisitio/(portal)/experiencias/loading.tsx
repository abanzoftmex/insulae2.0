import { Bell } from "lucide-react";

/** Mismo estado de carga que tenía pages/experiencias.js mientras llegaban los datos. */
export default function ExperienciasLoading() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#cba258] to-[#cba258] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Experiencias Val'Quirico</h3>
                <p className="text-white/80 text-sm">
                  Últimas actualizaciones importantes
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cba258] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando experiencias...</p>
        </div>
      </div>
    </div>
  );
}
