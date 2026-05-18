import { Announcement } from "@/modules/announcement/domain/announcement.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileText, MapPin, Clock, Users, MoreVertical } from "lucide-react";

interface AnnouncementCardProps {
  announcement: Announcement;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Brand accent bar */}
      <div className="h-0.5 bg-brand w-full" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="brand">{announcement.type.name}</Badge>
              <span className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">
                {announcement.subtype.name}
              </span>
            </div>
            <h3 className="text-sm font-bold text-ink leading-tight line-clamp-2">
              {announcement.name}
            </h3>
          </div>
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm bg-canvas border border-line text-ink-soft whitespace-nowrap">
            {announcement.status.name}
          </span>
        </div>

        {/* Dates */}
        <div className="space-y-2">
          {announcement.dates.map((date) => (
            <div key={date.id} className="flex items-start gap-3 p-3 rounded-card bg-canvas border border-line">
              <div className="bg-brand text-white text-center rounded-sm min-w-11 py-1 shrink-0">
                <div className="text-[9px] uppercase font-bold opacity-70 leading-none">
                  {format(date.date, "MMM", { locale: es })}
                </div>
                <div className="text-base font-bold leading-tight">
                  {format(date.date, "dd")}
                </div>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-tight">{date.callType}</span>
                  {date.time && (
                    <span className="flex items-center gap-0.5 text-[9px] font-medium text-ink-soft shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      {date.time}
                    </span>
                  )}
                </div>
                {date.location && (
                  <p className="flex items-center gap-0.5 text-[10px] text-ink-soft truncate">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {date.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-line">
          <div className="flex items-center gap-3 text-[10px] text-ink-soft font-bold uppercase tracking-tight">
            <span>
              <span className="text-brand">{announcement.topics.length}</span> Temas
            </span>
            {announcement.actualAttendance > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-2.5 w-2.5" />
                <span className="text-brand">{announcement.attendancePercentage}%</span> Asist.
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {announcement.pdfUrl && (
              <a
                href={announcement.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-7 h-7 rounded-sm bg-canvas border border-line text-ink-soft hover:bg-brand hover:text-white hover:border-brand transition-colors"
                title="Ver PDF"
              >
                <FileText className="h-3.5 w-3.5" />
              </a>
            )}
            <button className="flex items-center justify-center w-7 h-7 rounded-sm bg-canvas border border-line text-ink-soft hover:bg-brand hover:text-white hover:border-brand transition-colors">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
