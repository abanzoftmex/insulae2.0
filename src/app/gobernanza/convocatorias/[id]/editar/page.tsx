import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getAnnouncementFormDataUseCase } from "@/modules/announcement/application/get-form-data.use-case";
import { getAnnouncementByIdUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { AnnouncementForm } from "../../nuevo/components/announcement-form";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAnnouncementPage({ params }: PageProps) {
  await requirePageAccess(MODULES.CONVOCATORIAS);

  const { id } = await params;

  // 1. Fetch catalogs and current convocatoria details
  const [formData, announcement] = await Promise.all([
    getAnnouncementFormDataUseCase.execute(),
    getAnnouncementByIdUseCase.execute(id)
  ]);

  if (!announcement) notFound();

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-3 pb-5 border-b border-brand">
        <PageBackBadge className="mt-1.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Editar convocatoria</h1>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Gobernanza</Badge>
          <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
            Modifique los detalles de la asamblea u orden del día registrada.
          </p>
        </div>
      </div>

      <AnnouncementForm initialData={formData} announcement={announcement} />
    </div>
  );
}
