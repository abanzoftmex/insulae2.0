"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncementAction, updateAnnouncementAction } from "../actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { Upload, Check, Plus, Trash2 } from "lucide-react";

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
  const [formData, setFormData] = useState<FormData>({
    name: announcement?.name || "",
    typeId: announcement?.typeId || "",
    subtypeId: announcement?.subtypeId || "",
    comments: announcement?.comments || "",
    pdfUrl: announcement?.pdfUrl || undefined,
    conveningPersonId: announcement?.conveningPersonId || "",
    conveningPosition: announcement?.conveningPosition || "",
    moderatorPersonId: announcement?.moderatorPersonId || "",
    moderatorPosition: announcement?.moderatorPosition || "",
    dates: announcement?.dates && announcement.dates.length > 0 
      ? announcement.dates.map((d: any) => ({
          callType: d.callType,
          date: d.date ? new Date(d.date).toISOString().split("T")[0] : "",
          time: d.time || "",
          location: d.location || "",
        }))
      : [
          { callType: "1ra Convocatoria", date: "", time: "", location: "" },
          { callType: "2da Convocatoria", date: "", time: "", location: "" },
          { callType: "3ra Convocatoria", date: "", time: "", location: "" },
        ],
    topicIds: announcement?.invitedPositions ? announcement.invitedPositions.map((p: any) => p.positionId) : [],
    specialGuests: announcement?.specialGuests ? announcement.specialGuests.map((g: any) => ({
      id: g.id || Math.random().toString(36).substr(2, 9),
      name: g.name,
      email: g.email || "",
    })) : [],
    agendaTopics: announcement?.topics && announcement.topics.length > 0
      ? announcement.topics.map((t: any) => ({
          title: t.title,
          presenterId: t.presenterId || undefined,
          durationMinutes: t.durationMinutes || undefined,
          actionType: t.actionType || "NONE",
        }))
      : [{ title: "", presenterId: undefined, durationMinutes: undefined, actionType: "NONE" }],
  });

  const handleAddTopic = () => {
    setFormData(prev => ({
      ...prev,
      agendaTopics: [...prev.agendaTopics, { title: "", presenterId: undefined, durationMinutes: undefined, actionType: "NONE" }]
    }));
  };

  const handleTopicChange = (index: number, field: string, value: any) => {
    const newTopics = [...formData.agendaTopics];
    newTopics[index] = { ...newTopics[index], [field]: value };
    setFormData(prev => ({ ...prev, agendaTopics: newTopics }));
  };

  const handleAddSpecialGuest = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setFormData(prev => ({
      ...prev,
      specialGuests: [...prev.specialGuests, { id, name: "", email: "" }]
    }));
  };

  const handleSpecialGuestChange = (id: string, field: keyof SpecialGuest, value: string) => {
    setFormData(prev => ({
      ...prev,
      specialGuests: prev.specialGuests.map(g => g.id === id ? { ...g, [field]: value } : g)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const result = await uploadCondominiumAsset({
        file,
        condominiumSlug: "valquirico",
        projectId: "governance",
        kind: "announcement-pdf"
      });
      setFormData(prev => ({ ...prev, pdfUrl: result.url }));
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error al subir el archivo");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSelectAll = (positionIds: string[]) => {
    const uniqueIds = Array.from(new Set([...formData.topicIds, ...positionIds]));
    setFormData(prev => ({ ...prev, topicIds: uniqueIds }));
  };

  const handleDeselectAll = (positionIds: string[]) => {
    const filteredIds = formData.topicIds.filter(id => !positionIds.includes(id));
    setFormData(prev => ({ ...prev, topicIds: filteredIds }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let result;
    if (announcement?.id) {
      result = await updateAnnouncementAction(announcement.id, formData);
    } else {
      result = await createAnnouncementAction(formData);
    }

    if (result.success) {
      router.push("/gobernanza/convocatorias");
      router.refresh();
    } else {
      alert("Error al guardar: " + result.error);
    }

    setIsSubmitting(false);
  };

  const fieldCls = "w-full h-9 px-3 rounded-sm border border-line bg-white text-sm text-ink outline-none focus:ring-1 focus:ring-brand transition-colors";
  const labelCls = "text-[10px] font-bold uppercase tracking-widest text-ink-soft";
  const sectionHeaderCls = "px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card";
  const sectionTitleCls = "text-[10px] font-bold uppercase tracking-widest text-white";
  const sectionBodyCls = "p-5";
  const sectionCls = "overflow-hidden rounded-card border border-line/40 bg-white shadow-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-20">

      {/* Información General */}
      <section className={sectionCls}>
        <div className={sectionHeaderCls}>
          <h2 className={sectionTitleCls}>Información general</h2>
        </div>
        <div className={`${sectionBodyCls} space-y-5`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Convoca</label>
              <select
                className={fieldCls}
                value={formData.conveningPersonId || ""}
                onChange={(e) => setFormData({...formData, conveningPersonId: e.target.value})}
              >
                <option value="">Seleccione</option>
                {initialData.directory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Puesto de quien convoca</label>
              <input
                type="text"
                className={fieldCls}
                value={formData.conveningPosition}
                onChange={(e) => setFormData({...formData, conveningPosition: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Moderador</label>
              <select
                className={fieldCls}
                value={formData.moderatorPersonId || ""}
                onChange={(e) => setFormData({...formData, moderatorPersonId: e.target.value})}
              >
                <option value="">Seleccione</option>
                {initialData.directory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Puesto del moderador</label>
              <input
                type="text"
                className={fieldCls}
                value={formData.moderatorPosition}
                onChange={(e) => setFormData({...formData, moderatorPosition: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Tipo de convocatoria</label>
              <select
                className={fieldCls}
                value={formData.typeId}
                onChange={(e) => setFormData({...formData, typeId: e.target.value})}
                required
              >
                <option value="">Seleccione</option>
                {initialData.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Subtipo</label>
              <select
                className={fieldCls}
                value={formData.subtypeId}
                onChange={(e) => setFormData({...formData, subtypeId: e.target.value})}
                required
              >
                <option value="">Seleccione</option>
                {initialData.subtypes.filter(s => s.typeId === formData.typeId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2 space-y-1.5">
              <label className={labelCls}>Nombre</label>
              <input
                type="text"
                className={fieldCls}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Archivo PDF</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 h-8 px-4 rounded-full bg-brand-deep text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand transition-colors disabled:opacity-50"
                disabled={uploadingFile}
              >
                <Upload className="h-3 w-3" />
                {uploadingFile ? "Subiendo..." : "Seleccionar archivo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              {formData.pdfUrl && (
                <span className="flex items-center gap-1.5 text-brand text-[10px] font-bold uppercase tracking-widest">
                  <Check className="h-3.5 w-3.5" />
                  Archivo cargado
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Llamados */}
      <section className={sectionCls}>
        <div className={sectionHeaderCls}>
          <h2 className={sectionTitleCls}>Llamados</h2>
        </div>
        <div className={`${sectionBodyCls} space-y-4`}>
          {formData.dates.map((call, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pb-4 border-b border-line last:border-0 last:pb-0">
              <div className="text-[10px] font-bold text-brand uppercase tracking-widest pb-1">{call.callType}</div>
              <div className="space-y-1.5">
                <label className={labelCls}>Fecha</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={call.date}
                  onChange={(e) => {
                    const d = [...formData.dates];
                    d[idx].date = e.target.value;
                    setFormData({...formData, dates: d});
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Hora</label>
                <input
                  type="time"
                  className={fieldCls}
                  value={call.time}
                  onChange={(e) => {
                    const d = [...formData.dates];
                    d[idx].time = e.target.value;
                    setFormData({...formData, dates: d});
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Lugar</label>
                <input
                  type="text"
                  className={fieldCls}
                  value={call.location}
                  onChange={(e) => {
                    const d = [...formData.dates];
                    d[idx].location = e.target.value;
                    setFormData({...formData, dates: d});
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Convocados */}
      <section className={sectionCls}>
        <div className={sectionHeaderCls}>
          <h2 className={sectionTitleCls}>Convocados</h2>
        </div>
        <div className={`${sectionBodyCls} space-y-6`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(initialData.departments.flatMap(d => d.positions.map((p: any) => p.id)))}
              className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-white border border-line text-[9px] font-bold uppercase tracking-widest text-ink hover:bg-brand hover:text-white hover:border-brand transition-colors"
            >
              <div className="w-3 h-3 rounded-sm border-2 border-current flex items-center justify-center">
                <Check className="w-2 h-2" />
              </div>
              Todos
            </button>
            <button
              type="button"
              onClick={() => handleDeselectAll(initialData.departments.flatMap(d => d.positions.map((p: any) => p.id)))}
              className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-white border border-line text-[9px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
            >
              <div className="w-3 h-3 rounded-sm border border-line" />
              Ninguno
            </button>
          </div>

          <div className="space-y-5">
            {initialData.departments
              .filter(dept => dept.name && dept.positions.length > 0)
              .map(dept => (
                <div key={dept.id} className="space-y-3">
                  <div className="flex items-center justify-between bg-canvas py-2 px-3 rounded-sm border-l-2 border-brand">
                    <h4 className="text-[10px] font-bold text-ink uppercase tracking-widest">{dept.name}</h4>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectAll(dept.positions.map((p: any) => p.id))}
                        className="text-[9px] font-bold text-brand hover:underline uppercase tracking-widest"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeselectAll(dept.positions.map((p: any) => p.id))}
                        className="text-[9px] font-bold text-ink-soft hover:underline uppercase tracking-widest"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2.5 gap-x-6 pl-4">
                    {dept.positions.map((pos: any) => (
                      <label key={pos.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <div className="relative flex items-center justify-center shrink-0">
                          <input
                            type="checkbox"
                            className="peer appearance-none w-4 h-4 rounded-sm border border-line checked:bg-brand checked:border-brand transition-all cursor-pointer"
                            checked={formData.topicIds.includes(pos.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, topicIds: [...formData.topicIds, pos.id]});
                              } else {
                                setFormData({...formData, topicIds: formData.topicIds.filter(id => id !== pos.id)});
                              }
                            }}
                          />
                          <Check className="absolute w-2.5 h-2.5 text-white pointer-events-none hidden peer-checked:block" />
                        </div>
                        <span className="text-[11px] text-ink-soft group-hover:text-ink transition-colors">{pos.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Invitados especiales */}
      <section className={sectionCls}>
        <div className={`${sectionHeaderCls} flex justify-between items-center`}>
          <h2 className={sectionTitleCls}>Invitados especiales</h2>
          <button
            type="button"
            onClick={handleAddSpecialGuest}
            className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-brand text-white text-[9px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors"
          >
            <Plus className="h-3 w-3" />
            Agregar
          </button>
        </div>
        <div className={`${sectionBodyCls} space-y-3`}>
          {formData.specialGuests.length > 0 ? (
            formData.specialGuests.map((guest) => (
              <div key={guest.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-card bg-canvas border border-line relative group">
                <div className="space-y-1.5">
                  <label className={labelCls}>Nombre completo</label>
                  <input
                    type="text"
                    className={fieldCls}
                    value={guest.name}
                    onChange={(e) => handleSpecialGuestChange(guest.id, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Correo electrónico</label>
                  <input
                    type="email"
                    className={fieldCls}
                    value={guest.email}
                    onChange={(e) => handleSpecialGuestChange(guest.id, "email", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, specialGuests: prev.specialGuests.filter(g => g.id !== guest.id) }))}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-line text-danger rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-ink-soft text-[11px]">
              No se han agregado invitados externos para esta convocatoria.
            </p>
          )}
        </div>
      </section>

      {/* Orden del Día */}
      <section className={sectionCls}>
        <div className={`${sectionHeaderCls} flex justify-between items-center`}>
          <h2 className={sectionTitleCls}>Orden del día</h2>
          <button
            type="button"
            onClick={handleAddTopic}
            className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-brand text-white text-[9px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors"
          >
            <Plus className="h-3 w-3" />
            Agregar tema
          </button>
        </div>
        <div className={`${sectionBodyCls} space-y-3`}>
          {formData.agendaTopics.map((topic, idx) => (
            <div key={idx} className="p-4 rounded-card border border-line bg-canvas space-y-4 relative group">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-sm bg-brand text-white text-[9px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                <span className={labelCls}>Punto del orden del día</span>
              </div>
              <textarea
                className="w-full px-3 py-2 rounded-sm border border-line bg-white text-sm text-ink outline-none focus:ring-1 focus:ring-brand transition-colors min-h-20 resize-none"
                value={topic.title}
                onChange={(e) => handleTopicChange(idx, "title", e.target.value)}
                placeholder="Describa el punto a tratar..."
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Presentador</label>
                  <select
                    className={fieldCls}
                    value={topic.presenterId || ""}
                    onChange={(e) => handleTopicChange(idx, "presenterId", e.target.value)}
                  >
                    <option value="">Seleccione</option>
                    {initialData.directory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Tiempo (minutos)</label>
                  <input
                    type="number"
                    className={fieldCls}
                    value={topic.durationMinutes || ""}
                    onChange={(e) => handleTopicChange(idx, "durationMinutes", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Tipo de acción</label>
                  <div className="flex items-center gap-4 h-9">
                    {["VOTE", "CONFIRMATION", "NONE"].map(action => (
                      <label key={action} className="flex items-center gap-1.5 cursor-pointer group/radio">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="radio"
                            name={`action-${idx}`}
                            className="peer appearance-none w-3.5 h-3.5 rounded-full border border-line checked:border-brand transition-all"
                            checked={topic.actionType === action}
                            onChange={() => handleTopicChange(idx, "actionType", action)}
                          />
                          <div className="absolute w-1.5 h-1.5 bg-brand rounded-full hidden peer-checked:block" />
                        </div>
                        <span className="text-[10px] text-ink-soft group-hover/radio:text-brand transition-colors">
                          {action === "VOTE" ? "Votación" : action === "CONFIRMATION" ? "Confirmación" : "Nada"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {formData.agendaTopics.length > 1 && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, agendaTopics: prev.agendaTopics.filter((_, i) => i !== idx) }))}
                  className="absolute top-3 right-3 w-6 h-6 rounded-sm bg-white border border-line text-ink-soft hover:text-danger hover:border-danger transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Comentarios */}
      <section className={sectionCls}>
        <div className={sectionHeaderCls}>
          <h2 className={sectionTitleCls}>Comentarios generales</h2>
        </div>
        <div className={sectionBodyCls}>
          <textarea
            className="w-full px-3 py-2 rounded-sm border border-line bg-white text-sm text-ink outline-none focus:ring-1 focus:ring-brand transition-colors min-h-25 resize-none"
            value={formData.comments}
            onChange={(e) => setFormData({...formData, comments: e.target.value})}
            placeholder="Observaciones adicionales..."
          />
        </div>
      </section>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 h-9 px-6 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploadingFile}
          className="flex items-center gap-2 h-9 px-6 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Guardando..." : "Guardar convocatoria"}
        </button>
      </div>
    </form>
  );
}

