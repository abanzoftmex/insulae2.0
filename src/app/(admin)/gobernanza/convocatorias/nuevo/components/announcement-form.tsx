"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAnnouncementAction, updateAnnouncementAction } from "../actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/storage-client";
import {
  Upload,
  Check,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Search,
  FileText,
  ArrowLeft,
  Loader2,
  Save,
  Send,
  AlertCircle
} from "lucide-react";

interface SpecialGuest {
  id: string;
  name: string;
  email: string;
}

interface FormData {
  name: string;
  typeId: string;
  subtypeId: string;
  comments: string;
  pdfUrl?: string;
  conveningPersonId?: string;
  conveningPosition: string;
  moderatorPersonId?: string;
  moderatorPosition: string;
  dates: {
    callType: string;
    date: string;
    time: string;
    location: string;
  }[];
  topicIds: string[];
  specialGuests: SpecialGuest[];
  agendaTopics: {
    title: string;
    presenterId?: string;
    durationMinutes?: number;
    actionType: string;
  }[];
}

interface AnnouncementFormProps {
  initialData: {
    types: any[];
    subtypes: any[];
    directory: any[];
    departments: any[];
  };
  announcement?: any;
}

export function AnnouncementForm({ initialData, announcement }: AnnouncementFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchPosition, setSearchPosition] = useState("");
  const [convocadosTab, setConvocadosTab] = useState<"todos" | "personalizado" | "ninguno">("personalizado");
  const [activeSection, setActiveSection] = useState("section-1");

  const isEditing = !!announcement?.id;

  const [formData, setFormData] = useState<FormData>({
    name: announcement?.name || "",
    typeId: announcement?.typeId || initialData.types[0]?.id || "",
    subtypeId: announcement?.subtypeId || initialData.subtypes[0]?.id || "",
    comments: announcement?.comments || "",
    pdfUrl: announcement?.pdfUrl || undefined,
    conveningPersonId: announcement?.conveningPersonId || "",
    conveningPosition: announcement?.conveningPosition || "",
    moderatorPersonId: announcement?.moderatorPersonId || "",
    moderatorPosition: announcement?.moderatorPosition || "",
    dates:
      announcement?.dates && announcement.dates.length > 0
        ? announcement.dates.map((d: any) => ({
            callType: d.callType,
            date: d.date ? new Date(d.date).toISOString().split("T")[0] : "",
            time: d.time || "",
            location: d.location || "",
          }))
        : [
            { callType: "1RA CONVOCATORIA", date: "", time: "12:00", location: "Bunkersito" },
          ],
    topicIds: announcement?.invitedPositions ? announcement.invitedPositions.map((p: any) => p.positionId) : [],
    specialGuests: announcement?.specialGuests
      ? announcement.specialGuests.map((g: any) => ({
          id: g.id || Math.random().toString(36).substr(2, 9),
          name: g.name,
          email: g.email || "",
        }))
      : [],
    agendaTopics:
      announcement?.topics && announcement.topics.length > 0
        ? announcement.topics.map((t: any) => ({
            title: t.title,
            presenterId: t.presenterId || undefined,
            durationMinutes: t.durationMinutes || 10,
            actionType: t.actionType || "VOTE",
          }))
        : [
            { title: "Revisión general", presenterId: undefined, durationMinutes: 15, actionType: "VOTE" },
          ],
  });

  // Calculate metrics
  const totalDuration = useMemo(() => {
    return formData.agendaTopics.reduce((acc, t) => acc + (Number(t.durationMinutes) || 0), 0);
  }, [formData.agendaTopics]);

  const voteTopicsCount = useMemo(() => {
    return formData.agendaTopics.filter((t) => t.actionType === "VOTE" || t.actionType === "VOTACION").length;
  }, [formData.agendaTopics]);

  const confirmationTopicsCount = useMemo(() => {
    return formData.agendaTopics.filter((t) => t.actionType === "CONFIRMATION" || t.actionType === "CONFIRMACION").length;
  }, [formData.agendaTopics]);

  const infoTopicsCount = useMemo(() => {
    return formData.agendaTopics.filter(
      (t) =>
        t.actionType !== "VOTE" &&
        t.actionType !== "VOTACION" &&
        t.actionType !== "CONFIRMATION" &&
        t.actionType !== "CONFIRMACION"
    ).length;
  }, [formData.agendaTopics]);

  // Handlers for Llamados
  const handleAddDate = () => {
    const nextCallNumber = formData.dates.length + 1;
    const callLabel = `${nextCallNumber}RA CONVOCATORIA`;
    setFormData((prev) => ({
      ...prev,
      dates: [...prev.dates, { callType: callLabel, date: "", time: "12:00", location: "" }],
    }));
  };

  const handleRemoveDate = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== index),
    }));
  };

  // Handlers for Special Guests
  const handleAddSpecialGuest = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setFormData((prev) => ({
      ...prev,
      specialGuests: [...prev.specialGuests, { id, name: "", email: "" }],
    }));
  };

  const handleSpecialGuestChange = (id: string, field: keyof SpecialGuest, value: string) => {
    setFormData((prev) => ({
      ...prev,
      specialGuests: prev.specialGuests.map((g) => (g.id === id ? { ...g, [field]: value } : g)),
    }));
  };

  const handleRemoveSpecialGuest = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      specialGuests: prev.specialGuests.filter((g) => g.id !== id),
    }));
  };

  // Handlers for Agenda Topics
  const handleAddTopic = () => {
    setFormData((prev) => ({
      ...prev,
      agendaTopics: [
        ...prev.agendaTopics,
        { title: "", presenterId: prev.moderatorPersonId || undefined, durationMinutes: 10, actionType: "VOTE" },
      ],
    }));
  };

  const handleTopicChange = (index: number, field: string, value: any) => {
    const newTopics = [...formData.agendaTopics];
    newTopics[index] = { ...newTopics[index], [field]: value };
    setFormData((prev) => ({ ...prev, agendaTopics: newTopics }));
  };

  const handleRemoveTopic = (index: number) => {
    if (formData.agendaTopics.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      agendaTopics: prev.agendaTopics.filter((_, i) => i !== index),
    }));
  };

  // Positions selection
  const allPositionIds = useMemo(() => {
    return initialData.departments.flatMap((d) => d.positions.map((p: any) => p.id));
  }, [initialData.departments]);

  const handleSelectAllPositions = () => {
    setConvocadosTab("todos");
    setFormData((prev) => ({ ...prev, topicIds: allPositionIds }));
  };

  const handleDeselectAllPositions = () => {
    setConvocadosTab("ninguno");
    setFormData((prev) => ({ ...prev, topicIds: [] }));
  };

  const handleSelectGroup = (positionIds: string[]) => {
    setConvocadosTab("personalizado");
    setFormData((prev) => ({
      ...prev,
      topicIds: Array.from(new Set([...prev.topicIds, ...positionIds])),
    }));
  };

  const handleDeselectGroup = (positionIds: string[]) => {
    setConvocadosTab("personalizado");
    setFormData((prev) => ({
      ...prev,
      topicIds: prev.topicIds.filter((id) => !positionIds.includes(id)),
    }));
  };

  const togglePosition = (positionId: string) => {
    setConvocadosTab("personalizado");
    setFormData((prev) => {
      const exists = prev.topicIds.includes(positionId);
      return {
        ...prev,
        topicIds: exists ? prev.topicIds.filter((id) => id !== positionId) : [...prev.topicIds, positionId],
      };
    });
  };

  // PDF Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const result = await uploadCondominiumAsset({
        file,
        condominiumSlug: "valquirico",
        projectId: "governance",
        kind: "announcement-pdf",
      });
      setFormData((prev) => ({ ...prev, pdfUrl: result.url }));
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error al subir el archivo PDF.");
    } finally {
      setUploadingFile(false);
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result;
      if (announcement?.id) {
        result = await updateAnnouncementAction(announcement.id, formData);
      } else {
        result = await createAnnouncementAction(formData);
      }

      if (result.success) {
        router.push(announcement?.id ? `/gobernanza/convocatorias/${announcement.id}` : "/gobernanza/convocatorias");
        router.refresh();
      } else {
        alert("Error al guardar la convocatoria: " + (result.error || "Ocurrió un error inesperado"));
      }
    } catch (err: any) {
      alert("Error inesperado: " + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered departments based on search
  const filteredDepartments = useMemo(() => {
    if (!searchPosition.trim()) return initialData.departments;
    const q = searchPosition.toLowerCase();
    return initialData.departments
      .map((d) => ({
        ...d,
        positions: d.positions.filter((p: any) => p.name.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)),
      }))
      .filter((d) => d.positions.length > 0);
  }, [initialData.departments, searchPosition]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28">
      {/* Top Breadcrumbs & Page Header Matching Image 1 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#cbd5e1]/60">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-1">
            <Link href="/gobernanza/convocatorias" className="hover:text-[#304854] transition-colors">
              Gobernanza
            </Link>
            <span>&gt;</span>
            <Link href="/gobernanza/convocatorias" className="hover:text-[#304854] transition-colors">
              Convocatoria
            </Link>
            <span>&gt;</span>
            <span className="text-[#304854]">{isEditing ? "Editar" : "Nueva"}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#304854] tracking-tight uppercase">
              {isEditing ? "Editar convocatoria" : "Nueva convocatoria"}
            </h1>
            <span className="rounded-full border border-[#d0b685] bg-[#faf8f5] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#304854]">
              Gobernanza
            </span>
            <span className="rounded-full border border-[#cbd5e1] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#64748b]">
              {announcement?.status?.name || "Borrador"}
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-1 font-medium">
            Modifique los detalles de la asamblea u orden del día registrada.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isEditing && (
            <Link
              href={`/gobernanza/convocatorias/${announcement.id}`}
              className="flex items-center gap-1.5 rounded-full border border-[#304854] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#304854] hover:bg-[#faf8f5] transition-colors shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Vista previa
            </Link>
          )}
        </div>
      </div>

      {/* Two-Column Grid: Left Sidebar + Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sticky Sidebar (Col 1-3) */}
        <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-6">
          {/* Section Navigation Card */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-3 px-1">
              Secciones
            </p>
            <nav className="space-y-1">
              {[
                { id: "section-1", num: "1", title: "Información general", count: null },
                { id: "section-2", num: "2", title: "Llamados", count: formData.dates.length },
                { id: "section-3", num: "3", title: "Convocados", count: formData.topicIds.length },
                { id: "section-4", num: "4", title: "Invitados especiales", count: formData.specialGuests.length },
                { id: "section-5", num: "5", title: "Orden del día", count: formData.agendaTopics.length },
                { id: "section-6", num: "6", title: "Comentarios generales", count: null },
              ].map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#faf8f5] text-[#304854] border border-[#d0b685] shadow-xs"
                        : "text-[#64748b] hover:bg-slate-50 hover:text-[#1e293b]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isActive
                            ? "bg-[#304854] text-white"
                            : "bg-slate-100 text-[#64748b]"
                        }`}
                      >
                        {item.num}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </div>
                    {item.count !== null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-[#304854] text-white"
                            : "bg-slate-100 text-[#64748b]"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Summary Box (Navy Card Matching Image 1) */}
          <div className="rounded-2xl bg-[#304854] text-white p-5 shadow-sm space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#d0b685]">
              Resumen
            </p>
            <ul className="space-y-2 text-xs text-slate-200">
              <li className="flex items-center justify-between">
                <span>Llamados registrados</span>
                <span className="font-bold text-white">{formData.dates.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Convocados del organigrama</span>
                <span className="font-bold text-white">{formData.topicIds.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Invitados especiales</span>
                <span className="font-bold text-white">{formData.specialGuests.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Temas en orden del día</span>
                <span className="font-bold text-white">{formData.agendaTopics.length}</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Main Form Sections (Col 4-12) */}
        <div className="lg:col-span-9 space-y-6">
          {/* SECTION 1: Información General */}
          <section
            id="section-1"
            className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs space-y-5"
          >
            <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-full bg-[#304854] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                1
              </span>
              <div>
                <h2 className="text-base font-bold text-[#1e293b]">Información general</h2>
                <p className="text-xs text-[#64748b]">
                  Detalles generales, quién convoca y tipo de reunión.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Convoca
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                  value={formData.conveningPersonId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, conveningPersonId: e.target.value })
                  }
                >
                  <option value="">Seleccione a la persona que convoca</option>
                  {initialData.directory.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Puesto de quien convoca
                </label>
                <input
                  type="text"
                  placeholder="Ej. Gerente, Consejero Presidente"
                  className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                  value={formData.conveningPosition}
                  onChange={(e) =>
                    setFormData({ ...formData, conveningPosition: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Moderador
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                  value={formData.moderatorPersonId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, moderatorPersonId: e.target.value })
                  }
                >
                  <option value="">Seleccione al moderador</option>
                  {initialData.directory.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Puesto del moderador
                </label>
                <input
                  type="text"
                  placeholder="Ej. Gerente, Moderador de Asamblea"
                  className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                  value={formData.moderatorPosition}
                  onChange={(e) =>
                    setFormData({ ...formData, moderatorPosition: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Tipo de convocatoria
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                  value={formData.typeId}
                  onChange={(e) =>
                    setFormData({ ...formData, typeId: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccione el tipo</option>
                  {initialData.types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Tipo de reunión
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                  value={formData.subtypeId}
                  onChange={(e) =>
                    setFormData({ ...formData, subtypeId: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccione el subtipo</option>
                  {initialData.subtypes
                    .filter((s) => !formData.typeId || s.typeId === formData.typeId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Nombre de la convocatoria
                </label>
                <input
                  type="text"
                  placeholder="Ej. Prueba de Gobernanza, Asamblea General Ordinaria 2026"
                  className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Convocatoria firmada PDF Upload box */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                Convocatoria firmada (PDF)
              </label>

              {formData.pdfUrl ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-[#cbd5e1] bg-[#faf8f5]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#304854]/10 text-[#304854] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#304854]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1e293b] truncate max-w-xs">
                          {formData.name ? `${formData.name}.pdf` : "Convocatoria_firmada.pdf"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                          <Check className="w-2.5 h-2.5" />
                          CARGADO
                        </span>
                      </div>
                      <p className="text-[10px] text-[#64748b]">Documento PDF listo</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={formData.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#304854] hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </a>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#64748b] hover:text-[#304854] hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${uploadingFile ? "animate-spin" : ""}`} />
                      Reemplazar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#cbd5e1] hover:border-[#304854] rounded-xl bg-slate-50/50 hover:bg-[#faf8f5] transition-colors cursor-pointer text-center"
                >
                  <Upload className="w-6 h-6 text-[#64748b] mb-2" />
                  <p className="text-xs font-bold text-[#304854]">
                    {uploadingFile ? "Subiendo archivo..." : "Subir documento en formato PDF"}
                  </p>
                  <p className="text-[10px] text-[#64748b] mt-0.5">
                    Haga clic aquí para seleccionar el archivo oficial firmado (máx. 15MB)
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </section>

          {/* SECTION 2: Llamados */}
          <section
            id="section-2"
            className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs space-y-5"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#304854] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1e293b]">Llamados</h2>
                  <p className="text-xs text-[#64748b]">
                    Fechas, hora y lugar de cada llamado a asamblea.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddDate}
                className="flex items-center gap-1.5 rounded-full border border-[#304854] bg-[#faf8f5] px-3.5 py-1.5 text-xs font-bold text-[#304854] hover:bg-[#304854] hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar llamado
              </button>
            </div>

            <div className="space-y-4">
              {formData.dates.map((call, idx) => (
                <div
                  key={idx}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-[#cbd5e1] bg-[#faf8f5]/60 relative group"
                >
                  <div className="shrink-0">
                    <span className="rounded-lg bg-[#304854] text-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest block text-center">
                      {call.callType || `${idx + 1}RA CONVOCATORIA`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#304854]" /> Fecha
                      </label>
                      <input
                        type="date"
                        className="w-full h-9 px-2.5 rounded-lg border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                        value={call.date}
                        onChange={(e) => {
                          const d = [...formData.dates];
                          d[idx].date = e.target.value;
                          setFormData({ ...formData, dates: d });
                        }}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#304854]" /> Hora
                      </label>
                      <input
                        type="time"
                        className="w-full h-9 px-2.5 rounded-lg border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                        value={call.time}
                        onChange={(e) => {
                          const d = [...formData.dates];
                          d[idx].time = e.target.value;
                          setFormData({ ...formData, dates: d });
                        }}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#304854]" /> Lugar
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Bunkersito, Casa Club"
                        className="w-full h-9 px-2.5 rounded-lg border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                        value={call.location}
                        onChange={(e) => {
                          const d = [...formData.dates];
                          d[idx].location = e.target.value;
                          setFormData({ ...formData, dates: d });
                        }}
                        required
                      />
                    </div>
                  </div>

                  {formData.dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(idx)}
                      className="w-8 h-8 rounded-lg bg-white border border-[#cbd5e1] text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors flex items-center justify-center shrink-0 self-end lg:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: Convocados del Organigrama */}
          <section
            id="section-3"
            className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs space-y-5"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#304854] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1e293b]">Convocados</h2>
                  <p className="text-xs text-[#64748b]">
                    Selecciona a quiénes se convoca según los puestos del organigrama del condominio.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-[#faf8f5] border border-[#d0b685] px-3 py-1 text-xs font-bold text-[#304854] shrink-0">
                {formData.topicIds.length} CONVOCADOS
              </span>
            </div>

            {/* Filter toolbar matching Image 1 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 rounded-xl bg-[#faf8f5] border border-[#e2e8f0]">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSelectAllPositions}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    convocadosTab === "todos"
                      ? "bg-[#304854] text-white shadow-xs"
                      : "bg-white text-[#64748b] border border-[#cbd5e1] hover:text-[#1e293b]"
                  }`}
                >
                  TODOS
                </button>
                <button
                  type="button"
                  onClick={() => setConvocadosTab("personalizado")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    convocadosTab === "personalizado"
                      ? "bg-[#304854] text-white shadow-xs"
                      : "bg-white text-[#64748b] border border-[#cbd5e1] hover:text-[#1e293b]"
                  }`}
                >
                  PERSONALIZADO
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllPositions}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    convocadosTab === "ninguno"
                      ? "bg-[#304854] text-white shadow-xs"
                      : "bg-white text-[#64748b] border border-[#cbd5e1] hover:text-[#1e293b]"
                  }`}
                >
                  NINGUNO
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar puesto u órgano..."
                  value={searchPosition}
                  onChange={(e) => setSearchPosition(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-[#cbd5e1] bg-white text-xs font-medium text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                />
              </div>
            </div>

            {/* Grid of Committees / Groups */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDepartments.map((dept) => {
                const groupPosIds = dept.positions.map((p: any) => p.id);
                const selectedInGroup = dept.positions.filter((p: any) =>
                  formData.topicIds.includes(p.id)
                ).length;

                return (
                  <div
                    key={dept.id}
                    className="rounded-xl border border-[#e2e8f0] bg-[#faf8f5]/40 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#304854]">
                          {dept.name}
                        </span>
                        <span className="text-[10px] font-bold text-[#64748b]">
                          {selectedInGroup}/{dept.positions.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                        <button
                          type="button"
                          onClick={() => handleSelectGroup(groupPosIds)}
                          className="hover:text-[#304854] transition-colors"
                        >
                          TODOS
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => handleDeselectGroup(groupPosIds)}
                          className="hover:text-[#304854] transition-colors"
                        >
                          NINGUNO
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {dept.positions.map((pos: any) => {
                        const isChecked = formData.topicIds.includes(pos.id);
                        return (
                          <label
                            key={pos.id}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                              isChecked
                                ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold"
                                : "bg-white border-[#e2e8f0] text-[#475569] hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePosition(pos.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                            />
                            <span className="text-xs truncate">{pos.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 4: Invitados Especiales */}
          <section
            id="section-4"
            className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs space-y-5"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#304854] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1e293b]">Invitados especiales</h2>
                  <p className="text-xs text-[#64748b]">
                    Personas que asistirán pero no forman parte del organigrama del condominio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddSpecialGuest}
                className="flex items-center gap-1.5 rounded-full border border-[#304854] bg-[#faf8f5] px-3.5 py-1.5 text-xs font-bold text-[#304854] hover:bg-[#304854] hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar invitado
              </button>
            </div>

            <div className="space-y-3">
              {formData.specialGuests.length > 0 ? (
                formData.specialGuests.map((guest, idx) => (
                  <div
                    key={guest.id}
                    className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl border border-[#cbd5e1] bg-[#faf8f5]/40"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#d0b685]/30 text-[#304854] flex items-center justify-center font-bold text-xs shrink-0">
                      P{idx + 1}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                          Nombre completo
                        </label>
                        <input
                          type="text"
                          placeholder="Nombre del invitado"
                          className="w-full h-9 px-3 rounded-lg border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                          value={guest.name}
                          onChange={(e) =>
                            handleSpecialGuestChange(guest.id, "name", e.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                          Correo electrónico
                        </label>
                        <input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          className="w-full h-9 px-3 rounded-lg border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                          value={guest.email}
                          onChange={(e) =>
                            handleSpecialGuestChange(guest.id, "email", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialGuest(guest.id)}
                      className="w-8 h-8 rounded-lg bg-white border border-[#cbd5e1] text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-xs text-[#64748b]">
                  No se han registrado invitados especiales para esta convocatoria.
                </p>
              )}
            </div>
          </section>

          {/* SECTION 5: Orden del Día */}
          <section
            id="section-5"
            className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs space-y-5"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#304854] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  5
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1e293b]">Orden del día</h2>
                  <p className="text-xs text-[#64748b]">
                    Puntos a tratar, orden de exposición y duración estimada de cada tema.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddTopic}
                className="flex items-center gap-1.5 rounded-full border border-[#304854] bg-[#faf8f5] px-3.5 py-1.5 text-xs font-bold text-[#304854] hover:bg-[#304854] hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar tema
              </button>
            </div>

            {/* Metrics Pills Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#faf8f5] border border-[#cbd5e1] px-3 py-1 font-bold text-[#304854]">
                {formData.agendaTopics.length} Temas
              </span>
              <span className="rounded-full bg-[#faf8f5] border border-[#cbd5e1] px-3 py-1 font-bold text-[#304854]">
                {totalDuration} Minutos estimados
              </span>
              {voteTopicsCount > 0 && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-800">
                  {voteTopicsCount} Para votación
                </span>
              )}
              {confirmationTopicsCount > 0 && (
                <span className="rounded-full bg-emerald-50 border border-emerald-300 px-3 py-1 font-bold text-emerald-800">
                  {confirmationTopicsCount} Para confirmación
                </span>
              )}
              {infoTopicsCount > 0 && (
                <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 font-bold text-[#64748b]">
                  {infoTopicsCount} Informativo / Debate
                </span>
              )}
            </div>

            {/* Topics List */}
            <div className="space-y-4">
              {formData.agendaTopics.map((topic, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#cbd5e1] bg-[#faf8f5]/40 p-4 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#304854] text-white flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#304854]">
                        Punto {idx + 1} del orden del día
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        ⏱ {topic.durationMinutes || 0} MIN
                      </span>
                      {formData.agendaTopics.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(idx)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Título o descripción del punto a tratar"
                      className="w-full h-10 px-3 rounded-lg border border-[#cbd5e1] bg-white text-xs font-bold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                      value={topic.title}
                      onChange={(e) => handleTopicChange(idx, "title", e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                        Presentador
                      </label>
                      <select
                        className="w-full h-9 px-2.5 rounded-lg border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                        value={topic.presenterId || ""}
                        onChange={(e) =>
                          handleTopicChange(idx, "presenterId", e.target.value)
                        }
                      >
                        <option value="">Seleccione al presentador</option>
                        {initialData.directory.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                        Tiempo (minutos)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="240"
                        className="w-full h-9 px-2.5 rounded-lg border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854]"
                        value={topic.durationMinutes || ""}
                        onChange={(e) =>
                          handleTopicChange(idx, "durationMinutes", Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                        Tipo de acción
                      </label>
                      <div className="flex items-center gap-1.5 h-9">
                        {[
                          { key: "VOTE", label: "Votación" },
                          { key: "CONFIRMATION", label: "Confirmación" },
                          { key: "NONE", label: "Debate / Info" },
                        ].map((act) => {
                          const isActActive = topic.actionType === act.key;
                          return (
                            <button
                              key={act.key}
                              type="button"
                              onClick={() => handleTopicChange(idx, "actionType", act.key)}
                              className={`flex-1 h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                isActActive
                                  ? "bg-[#304854] text-white shadow-2xs"
                                  : "bg-white border border-[#cbd5e1] text-[#64748b] hover:bg-slate-50"
                              }`}
                            >
                              {act.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 6: Comentarios Generales */}
          <section
            id="section-6"
            className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs space-y-4"
          >
            <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-full bg-[#304854] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                6
              </span>
              <div>
                <h2 className="text-base font-bold text-[#1e293b]">Comentarios generales</h2>
                <p className="text-xs text-[#64748b]">
                  Notas adicionales visibles en la convocatoria oficial.
                </p>
              </div>
            </div>

            <textarea
              className="w-full p-3 rounded-xl border border-[#cbd5e1] bg-white text-xs font-medium text-[#1e293b] outline-none focus:ring-2 focus:ring-[#304854] min-h-[90px] resize-y"
              placeholder="Observaciones, notas de logística o aclaraciones para los convocados..."
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            />
          </section>
        </div>
      </div>

      {/* Sticky Bottom Action Bar matching Image 1 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#cbd5e1] px-6 py-3.5 shadow-2xl flex items-center justify-between">
        <div className="text-[11px] text-[#64748b] font-medium hidden sm:flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Cambios guardados automáticamente en el formulario
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-[#cbd5e1] bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#64748b] hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting || uploadingFile}
            className="flex items-center gap-2 rounded-full bg-[#304854] px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#23353e] transition-colors shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#d0b685]" />
            )}
            {isSubmitting
              ? "Guardando..."
              : isEditing
              ? "Guardar y enviar convocatoria"
              : "Guardar convocatoria"}
          </button>
        </div>
      </div>
    </form>
  );
}
