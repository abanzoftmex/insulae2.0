"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncementAction } from "../actions";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";

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
  topicIds: string[]; // For invited positions from organigrama
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
}

export function AnnouncementForm({ initialData }: AnnouncementFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    typeId: "",
    subtypeId: "",
    comments: "",
    conveningPosition: "",
    moderatorPosition: "",
    dates: [
      { callType: "1ra Convocatoria", date: "", time: "", location: "" },
      { callType: "2da Convocatoria", date: "", time: "", location: "" },
      { callType: "3ra Convocatoria", date: "", time: "", location: "" },
    ],
    topicIds: [],
    specialGuests: [],
    agendaTopics: [
      { title: "", presenterId: undefined, durationMinutes: undefined, actionType: "NONE" }
    ],
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
      // We use a dummy project ID or fetch a real one if needed. 
      // For now, using "general" as projectId since announcements are condominium-level.
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
    
    const result = await createAnnouncementAction(formData);
    
    if (result.success) {
      router.push("/gobernanza/convocatorias");
      router.refresh();
    } else {
      alert("Error al guardar: " + result.error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      {/* Información General */}
      <section className="bg-white rounded-3xl border border-[#e8dbcc] overflow-hidden shadow-sm">
        <div className="bg-[#fcf9f5] px-6 py-4 border-b border-[#f3e9dc]">
          <h2 className="text-lg font-bold text-[#2f221a]">Información general</h2>
        </div>
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#958172] uppercase tracking-wider">Convoca</label>
              <select 
                className="w-full h-12 px-4 rounded-xl border border-[#e8dbcc] focus:ring-2 focus:ring-[#6d422a] outline-none transition-all text-sm"
                value={formData.conveningPersonId || ""}
                onChange={(e) => setFormData({...formData, conveningPersonId: e.target.value})}
              >
                <option value="">Seleccione</option>
                {initialData.directory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#958172] uppercase tracking-wider">Puesto de quien convoca</label>
              <input 
                type="text" 
                className="w-full h-12 px-4 rounded-xl border border-[#e8dbcc] focus:ring-2 focus:ring-[#6d422a] outline-none transition-all text-sm"
                value={formData.conveningPosition}
                onChange={(e) => setFormData({...formData, conveningPosition: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#958172] uppercase tracking-wider">Moderador</label>
              <select 
                className="w-full h-12 px-4 rounded-xl border border-[#e8dbcc] focus:ring-2 focus:ring-[#6d422a] outline-none transition-all text-sm"
                value={formData.moderatorPersonId || ""}
                onChange={(e) => setFormData({...formData, moderatorPersonId: e.target.value})}
              >
                <option value="">Seleccione</option>
                {initialData.directory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#958172] uppercase tracking-wider">Puesto del moderador</label>
              <input 
                type="text" 
                className="w-full h-12 px-4 rounded-xl border border-[#e8dbcc] focus:ring-2 focus:ring-[#6d422a] outline-none transition-all text-sm"
                value={formData.moderatorPosition}
                onChange={(e) => setFormData({...formData, moderatorPosition: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#958172] uppercase tracking-wider">Tipo de convocatoria</label>
              <select 
                className="w-full h-12 px-4 rounded-xl border border-[#e8dbcc] focus:ring-2 focus:ring-[#6d422a] outline-none transition-all text-sm"
                value={formData.typeId}
                onChange={(e) => setFormData({...formData, typeId: e.target.value})}
                required
              >
                <option value="">Seleccione</option>
                {initialData.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#958172] uppercase tracking-wider">Subtipo</label>
              <select 
                className="w-full h-12 px-4 rounded-xl border border-[#e8dbcc] focus:ring-2 focus:ring-[#6d422a] outline-none transition-all text-sm"
                value={formData.subtypeId}
                onChange={(e) => setFormData({...formData, subtypeId: e.target.value})}
                required
              >
                <option value="">Seleccione</option>
                {initialData.subtypes.filter(s => s.typeId === formData.typeId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2 space-y-2">
              <label className="text-xs font-bold text-[#958172] uppercase tracking-wider">Nombre</label>
              <input 
                type="text" 
                className="w-full h-12 px-4 rounded-xl border border-[#e8dbcc] focus:ring-2 focus:ring-[#6d422a] outline-none transition-all text-sm"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[#958172] uppercase tracking-wider">Archivo PDF</label>
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-[#2a364e] text-white rounded-xl text-sm font-bold hover:bg-[#1e2738] transition-colors flex items-center gap-2"
                disabled={uploadingFile}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
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
                <div className="flex items-center gap-2 text-[#5a7b56] font-bold text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Archivo cargado correctamente
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Llamados */}
      <section className="bg-white rounded-3xl border border-[#e8dbcc] overflow-hidden shadow-sm">
        <div className="bg-[#fcf9f5] px-6 py-4 border-b border-[#f3e9dc]">
          <h2 className="text-lg font-bold text-[#2f221a]">Llamados</h2>
        </div>
        <div className="p-6 space-y-6">
          {formData.dates.map((call, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end pb-6 border-b border-[#f3e9dc] last:border-0 last:pb-0">
              <div className="text-sm font-bold text-[#6d422a] pb-3">{call.callType}</div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#958172] uppercase">Fecha</label>
                <input 
                  type="date" 
                  className="w-full h-10 px-4 rounded-lg border border-[#e8dbcc] text-sm outline-none"
                  value={call.date}
                  onChange={(e) => {
                    const newDates = [...formData.dates];
                    newDates[idx].date = e.target.value;
                    setFormData({...formData, dates: newDates});
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#958172] uppercase">Hora</label>
                <input 
                  type="time" 
                  className="w-full h-10 px-4 rounded-lg border border-[#e8dbcc] text-sm outline-none"
                  value={call.time}
                  onChange={(e) => {
                    const newDates = [...formData.dates];
                    newDates[idx].time = e.target.value;
                    setFormData({...formData, dates: newDates});
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#958172] uppercase">Lugar</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-4 rounded-lg border border-[#e8dbcc] text-sm outline-none"
                  value={call.location}
                  onChange={(e) => {
                    const newDates = [...formData.dates];
                    newDates[idx].location = e.target.value;
                    setFormData({...formData, dates: newDates});
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Convocados */}
      <section className="bg-white rounded-3xl border border-[#e8dbcc] overflow-hidden shadow-sm">
        <div className="bg-[#fcf9f5] px-6 py-4 border-b border-[#f3e9dc]">
          <h2 className="text-lg font-bold text-[#2f221a]">Convocados</h2>
        </div>
        <div className="p-6">
          <div className="space-y-12">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#6d422a]">Organigrama</h3>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => handleSelectAll(initialData.departments.flatMap(d => d.positions.map((p:any) => p.id)))}
                  className="px-4 py-2 bg-white border border-[#e8dbcc] rounded-lg text-xs font-bold text-[#2f221a] flex items-center gap-2 hover:bg-[#fcf9f5] transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-[#6d422a] bg-[#6d422a] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  Seleccionar todos
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeselectAll(initialData.departments.flatMap(d => d.positions.map((p:any) => p.id)))}
                  className="px-4 py-2 bg-white border border-[#e8dbcc] rounded-lg text-xs font-bold text-[#2f221a] flex items-center gap-2 hover:bg-[#fcf9f5] transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-[#e8dbcc]" />
                  Deseleccionar todos
                </button>
              </div>
            </div>

            {initialData.departments
              .filter(dept => dept.name && dept.positions.length > 0)
              .map(dept => (
              <div key={dept.id} className="space-y-4">
                <div className="flex items-center justify-between bg-[#fcf9f5]/50 py-3 px-4 rounded-xl border-l-[6px] border-[#6d422a]">
                  <h4 className="text-sm font-bold text-[#2f221a] uppercase tracking-wider">{dept.name}</h4>
                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => handleSelectAll(dept.positions.map((p:any) => p.id))}
                      className="text-[10px] font-bold text-[#6d422a] hover:underline"
                    >
                      Todos
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDeselectAll(dept.positions.map((p:any) => p.id))}
                      className="text-[10px] font-bold text-[#958172] hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 pl-6">
                  {dept.positions.map((pos: any) => (
                    <label key={pos.id} className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="peer appearance-none w-5 h-5 rounded border-2 border-[#e8dbcc] checked:bg-[#6d422a] checked:border-[#6d422a] transition-all cursor-pointer"
                          checked={formData.topicIds.includes(pos.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, topicIds: [...formData.topicIds, pos.id]});
                            } else {
                              setFormData({...formData, topicIds: formData.topicIds.filter(id => id !== pos.id)});
                            }
                          }}
                        />
                        <svg className="absolute w-3 h-3 text-white pointer-events-none hidden peer-checked:block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="text-sm text-[#958172] group-hover:text-[#2f221a] transition-colors">{pos.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Invitados especiales */}
      <section className="bg-white rounded-3xl border border-[#e8dbcc] overflow-hidden shadow-sm">
        <div className="bg-[#fcf9f5] px-6 py-4 border-b border-[#f3e9dc] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#2f221a]">Invitados especiales</h2>
          <button 
            type="button" 
            onClick={handleAddSpecialGuest}
            className="px-4 py-2 bg-[#bf9441] text-white rounded-xl text-xs font-bold hover:bg-[#a67d35] transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Agregar un invitado especial
          </button>
        </div>
        <div className="p-6 space-y-4">
          {formData.specialGuests.length > 0 ? (
            <div className="space-y-4">
              {formData.specialGuests.map((guest) => (
                <div key={guest.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#fcf9f5]/50 border border-[#f3e9dc] relative group">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#958172] uppercase">Nombre completo</label>
                    <input 
                      type="text"
                      className="w-full h-10 px-4 rounded-xl border border-[#e8dbcc] text-sm outline-none"
                      value={guest.name}
                      onChange={(e) => handleSpecialGuestChange(guest.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#958172] uppercase">Correo electrónico</label>
                    <input 
                      type="email"
                      className="w-full h-10 px-4 rounded-xl border border-[#e8dbcc] text-sm outline-none"
                      value={guest.email}
                      onChange={(e) => handleSpecialGuestChange(guest.id, "email", e.target.value)}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, specialGuests: prev.specialGuests.filter(g => g.id !== guest.id) }))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-red-200 text-red-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[#958172] text-sm italic">
              No se han agregado invitados externos para esta convocatoria.
            </div>
          )}
        </div>
      </section>

      {/* Orden del Día */}
      <section className="bg-white rounded-3xl border border-[#e8dbcc] overflow-hidden shadow-sm">
        <div className="bg-[#fcf9f5] px-6 py-4 border-b border-[#f3e9dc] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#2f221a]">Orden del día</h2>
          <button 
            type="button" 
            onClick={handleAddTopic}
            className="px-4 py-2 bg-[#6d422a] text-white rounded-xl text-xs font-bold hover:bg-[#5a3622] transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Agregar tema
          </button>
        </div>
        <div className="p-6 space-y-8">
          {formData.agendaTopics.map((topic, idx) => (
            <div key={idx} className="p-6 rounded-2xl border border-[#f3e9dc] bg-[#fcf9f5]/30 space-y-6 relative group">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#958172] uppercase tracking-widest">Tema</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-[#e8dbcc] focus:ring-2 focus:ring-[#6d422a] outline-none transition-all text-sm min-h-[100px] resize-none"
                    value={topic.title}
                    onChange={(e) => handleTopicChange(idx, "title", e.target.value)}
                    placeholder="Describa el punto a tratar..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#958172] uppercase tracking-widest">Presentador</label>
                    <select 
                      className="w-full h-10 px-4 rounded-xl border border-[#e8dbcc] text-sm outline-none"
                      value={topic.presenterId || ""}
                      onChange={(e) => handleTopicChange(idx, "presenterId", e.target.value)}
                    >
                      <option value="">Seleccione</option>
                      {initialData.directory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#958172] uppercase tracking-widest">Tiempo (minutos)</label>
                    <input 
                      type="number" 
                      className="w-full h-10 px-4 rounded-xl border border-[#e8dbcc] text-sm outline-none"
                      value={topic.durationMinutes || ""}
                      onChange={(e) => handleTopicChange(idx, "durationMinutes", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#958172] uppercase tracking-widest block pb-2">Tipo de acción</label>
                    <div className="flex gap-4">
                      {["VOTE", "CONFIRMATION", "NONE"].map(action => (
                        <label key={action} className="flex items-center gap-2 cursor-pointer group/radio">
                          <div className="relative flex items-center justify-center">
                            <input 
                              type="radio" 
                              name={`action-${idx}`}
                              className="peer appearance-none w-4 h-4 rounded-full border-2 border-[#e8dbcc] checked:border-[#6d422a] transition-all"
                              checked={topic.actionType === action}
                              onChange={() => handleTopicChange(idx, "actionType", action)}
                            />
                            <div className="absolute w-2 h-2 bg-[#6d422a] rounded-full hidden peer-checked:block" />
                          </div>
                          <span className="text-xs text-[#958172] group-hover/radio:text-[#6d422a] transition-colors">
                            {action === "VOTE" ? "Votación" : action === "CONFIRMATION" ? "Confirmación" : "Nada"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {formData.agendaTopics.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ ...prev, agendaTopics: prev.agendaTopics.filter((_, i) => i !== idx) }))}
                  className="absolute top-4 right-4 p-2 text-[#958172] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Comentarios */}
      <section className="bg-white rounded-3xl border border-[#e8dbcc] overflow-hidden shadow-sm">
        <div className="bg-[#fcf9f5] px-6 py-4 border-b border-[#f3e9dc]">
          <h2 className="text-lg font-bold text-[#2f221a]">Comentarios generales</h2>
        </div>
        <div className="p-6">
          <textarea 
            className="w-full px-4 py-3 rounded-xl border border-[#e8dbcc] focus:ring-2 focus:ring-[#6d422a] outline-none transition-all text-sm min-h-[120px] resize-none"
            value={formData.comments}
            onChange={(e) => setFormData({...formData, comments: e.target.value})}
            placeholder="Observaciones adicionales..."
          />
        </div>
      </section>

      {/* Footer Actions */}
      <div className="flex justify-end gap-4">
        <button 
          type="button" 
          onClick={() => router.back()}
          className="px-8 py-3 bg-[#fcf9f5] text-[#6d422a] rounded-xl font-bold text-sm hover:bg-[#f3e9dc] transition-colors border border-[#e8dbcc]"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting || uploadingFile}
          className="px-8 py-3 bg-[#6d422a] text-white rounded-xl font-bold text-sm hover:bg-[#5a3622] transition-colors shadow-lg shadow-[#6d422a]/20 disabled:opacity-50"
        >
          {isSubmitting ? "Guardando..." : "Guardar convocatoria"}
        </button>
      </div>
    </form>
  );
}
