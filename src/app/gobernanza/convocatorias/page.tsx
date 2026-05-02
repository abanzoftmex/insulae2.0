import { getAnnouncementsUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { AnnouncementCard } from "./components/announcement-card";
import Link from "next/link";

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncementsUseCase.execute();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e8dbcc] pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-[ui-serif] font-bold text-[#2f221a]">
            Convocatorias
          </h1>
          <p className="text-[#958172] text-sm">
            Gobernanza y asambleas condominales de Val'Quirico.
          </p>
        </div>

        <Link
          href="/gobernanza/convocatorias/nuevo"
          className="px-6 py-3 bg-[#6d422a] text-white rounded-xl font-bold text-sm hover:bg-[#5a3622] transition-colors shadow-lg shadow-[#6d422a]/20 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Nueva convocatoria
        </Link>
      </div>

      {/* Announcements Grid */}
      {announcements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-[#e8dbcc] space-y-4">
          <div className="w-16 h-16 bg-[#fcf9f5] rounded-2xl flex items-center justify-center text-[#6d422a]">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-[#2f221a]">No hay convocatorias</h3>
            <p className="text-[#958172] text-sm">Aún no se han registrado convocatorias en este condominio.</p>
          </div>
          <Link
            href="/gobernanza/convocatorias/nuevo"
            className="text-[#6d422a] font-bold text-sm hover:underline"
          >
            Crear la primera convocatoria
          </Link>
        </div>
      )}
    </div>
  );
}
