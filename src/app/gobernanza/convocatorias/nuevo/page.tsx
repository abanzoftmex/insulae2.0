import { getAnnouncementFormDataUseCase } from "@/modules/announcement/application/get-form-data.use-case";
import { AnnouncementForm } from "./components/announcement-form";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";

export default async function NewAnnouncementPage() {
  const formData = await getAnnouncementFormDataUseCase.execute();

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-3 pb-5 border-b border-brand">
        <PageBackBadge className="mt-1.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Nueva convocatoria</h1>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Gobernanza</Badge>
          <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
            Registre una nueva asamblea u orden del día para el condominio.
          </p>
        </div>
      </div>

      <AnnouncementForm initialData={formData} />
    </div>
  );
}
