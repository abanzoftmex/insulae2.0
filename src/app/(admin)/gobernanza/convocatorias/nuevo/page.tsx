import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getAnnouncementFormDataUseCase } from "@/modules/announcement/application/get-form-data.use-case";
import { AnnouncementForm } from "./components/announcement-form";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";

export default async function NewAnnouncementPage() {
  await requirePageAccess(MODULES.CONVOCATORIAS, "canCreate");

  const formData = await getAnnouncementFormDataUseCase.execute();

  return (
    <div className="animate-in fade-in duration-300">
      <AnnouncementForm initialData={formData} />
    </div>
  );
}
