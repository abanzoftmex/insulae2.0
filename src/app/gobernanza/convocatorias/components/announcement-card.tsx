import { Announcement } from "@/modules/announcement/domain/announcement.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AnnouncementCardProps {
  announcement: Announcement;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const statusColor = announcement.status.color || "#6d422a";
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#e8dbcc] overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span 
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
              >
                {announcement.type.name}
              </span>
              <span className="text-[10px] font-medium text-[#958172] uppercase tracking-widest">
                {announcement.subtype.name}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#2f221a] leading-tight">
              {announcement.name}
            </h3>
          </div>
          <div 
            className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: statusColor }}
          >
            {announcement.status.name}
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-3 pt-2">
          {announcement.dates.map((date, idx) => (
            <div key={date.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#fcf9f5] border border-[#f3e9dc]">
              <div className="bg-[#6d422a] text-white p-2 rounded-lg text-center min-w-[50px]">
                <div className="text-[10px] uppercase font-bold opacity-80">
                  {format(date.date, "MMM", { locale: es })}
                </div>
                <div className="text-lg font-bold leading-none">
                  {format(date.date, "dd")}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#6d422a]">{date.callType}</span>
                  <span className="text-[10px] font-medium text-[#958172]">{date.time}</span>
                </div>
                <p className="text-xs text-[#2f221a] line-clamp-1">
                  <span className="font-medium">Lugar:</span> {date.location}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="pt-4 flex items-center justify-between border-t border-[#f3e9dc]">
          <div className="flex items-center gap-4 text-[11px] text-[#958172]">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#6d422a]">{announcement.topics.length}</span> Temas
            </div>
            {announcement.actualAttendance > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-bold text-[#6d422a]">{announcement.attendancePercentage}%</span> Asistencia
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {announcement.pdfUrl && (
              <a 
                href={announcement.pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[#fcf9f5] text-[#6d422a] hover:bg-[#6d422a] hover:text-white transition-colors border border-[#e8dbcc]"
                title="Ver PDF"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              </a>
            )}
            <button className="p-2 rounded-lg bg-[#fcf9f5] text-[#6d422a] hover:bg-[#6d422a] hover:text-white transition-colors border border-[#e8dbcc]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
