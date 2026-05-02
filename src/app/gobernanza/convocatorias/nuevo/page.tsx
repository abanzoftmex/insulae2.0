import { getAnnouncementFormDataUseCase } from "@/modules/announcement/application/get-form-data.use-case";
import { AnnouncementForm } from "./components/announcement-form";

export default async function NewAnnouncementPage() {
  const formData = await getAnnouncementFormDataUseCase.execute();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-[#e8dbcc] pb-8">
        <h1 className="text-3xl font-[ui-serif] font-bold text-[#2f221a]">
          Nueva convocatoria
        </h1>
        <p className="text-[#958172] text-sm">
          Cree una nueva asamblea u orden del día para el condominio.
        </p>
      </div>

      <AnnouncementForm initialData={formData} />
    </div>
  );
}
