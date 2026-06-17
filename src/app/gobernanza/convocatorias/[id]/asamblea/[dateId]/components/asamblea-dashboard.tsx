"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleAttendanceAction,
  registerVoteAction,
  saveTopicConclusionsAction,
  closeAsambleaAction
} from "../../actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  UserCheck,
  CheckCircle,
  Users,
  Award,
  Vote,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Save,
  Check,
  X,
  ClipboardList
} from "lucide-react";

interface AsambleaDashboardProps {
  announcement: any;
  dateSession: any;
  invitedPositions: any[];
  topics: any[];
  userMap: Record<string, string>;
  positionMap: Record<string, string>;
}

export function AsambleaDashboard({
  announcement,
  dateSession,
  invitedPositions,
  topics,
  userMap,
  positionMap
}: AsambleaDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"attendance" | "voting">("attendance");
  const [checkedIds, setCheckedIds] = useState<string[]>(
    dateSession.checkedPositions
      ? dateSession.checkedPositions.split(",").map((id: string) => id.trim()).filter(Boolean)
      : []
  );

  // Topics local conclusions state
  const [conclusionsMap, setConclusionsMap] = useState<Record<string, string>>(
    topics.reduce((acc, t) => {
      acc[t.id] = t.conclusions || "";
      return acc;
    }, {} as Record<string, string>)
  );

  // Topics local votes map state (stores { [topicId]: { [positionId]: "FAVOR" | "AGAINST" | "ABSTAIN" } })
  const [votesMap, setVotesMap] = useState<Record<string, Record<string, string>>>(
    topics.reduce((acc, t) => {
      let v: Record<string, string> = {};
      if (t.votesJson) {
        try {
          v = JSON.parse(t.votesJson);
        } catch (e) {
          v = {};
        }
      }
      acc[t.id] = v;
      return acc;
    }, {} as Record<string, Record<string, string>>)
  );

  const [isPending, startTransition] = useTransition();
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null);

  // Computations
  const specialGuests = announcement.specialGuests || [];
  const totalCalled = invitedPositions.length + specialGuests.length;
  
  // Calculate total present based on both invited positions and special guests
  const presentPositions = invitedPositions.filter(p => checkedIds.includes(p.positionId));
  const presentGuests = specialGuests.filter((g: any) => checkedIds.includes(g.id));
  const totalPresent = presentPositions.length + presentGuests.length;
  
  const presentPercent = totalCalled > 0 ? (totalPresent / totalCalled) * 100 : 0;
  
  // Set minimum quórum to 50.00%
  const minimumRequired = 50.00;
  const isQuorumMet = presentPercent >= minimumRequired;

  const handleToggleAttendance = async (targetId: string, isChecked: boolean) => {
    // Update local state first for instant reaction
    const updated = isChecked
      ? [...checkedIds, targetId]
      : checkedIds.filter(id => id !== targetId);
    setCheckedIds(updated);

    startTransition(async () => {
      const res = await toggleAttendanceAction(dateSession.id, targetId, isChecked);
      if (res.success && res.checkedPositions !== undefined) {
        setCheckedIds(res.checkedPositions ? res.checkedPositions.split(",") : []);
      }
    });
  };

  const handleCastVote = async (topicId: string, positionId: string, type: "FAVOR" | "AGAINST" | "ABSTAIN" | "NONE") => {
    // Update local state first
    const currentTopicVotes = { ...votesMap[topicId] };
    if (type === "NONE") {
      delete currentTopicVotes[positionId];
    } else {
      currentTopicVotes[positionId] = type;
    }
    setVotesMap({
      ...votesMap,
      [topicId]: currentTopicVotes
    });

    startTransition(async () => {
      const res = await registerVoteAction(topicId, positionId, type);
      if (res.success && res.votesJson) {
        setVotesMap({
          ...votesMap,
          [topicId]: JSON.parse(res.votesJson)
        });
      }
    });
  };

  const handleSaveConclusions = async (topicId: string) => {
    setSavingTopicId(topicId);
    const res = await saveTopicConclusionsAction(topicId, conclusionsMap[topicId] || "");
    setSavingTopicId(null);
    if (!res.success) {
      alert("Error al guardar conclusiones: " + res.error);
    }
  };

  const handleCloseAssembly = async (isCompleted: boolean) => {
    const message = isCompleted 
      ? "¿Está seguro de que desea cerrar la asamblea como REALIZADA y concluida?" 
      : "¿Desea cerrar la asamblea como NO REALIZADA (cancelada/sin quórum)?";
      
    if (confirm(message)) {
      startTransition(async () => {
        const res = await closeAsambleaAction(dateSession.id, isCompleted);
        if (res.success) {
          router.push(`/gobernanza/convocatorias/${announcement.id}`);
          router.refresh();
        } else {
          alert("Error al cerrar asamblea: " + res.error);
        }
      });
    }
  };

  const fieldCls = "w-full min-h-20 p-3 rounded-xl border border-line bg-white text-xs text-ink outline-none focus:ring-1 focus:ring-brand transition-colors resize-none";
  const sectionHeaderCls = "px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2";
  const sectionTitleCls = "text-[10px] font-bold uppercase tracking-widest text-white";
  const sectionBodyCls = "p-5";
  const sectionCls = "overflow-hidden rounded-card border border-line/40 bg-white shadow-sm";

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Info */}
      <div className="p-5 bg-white border border-line rounded-card shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">Asamblea en Proceso</span>
          <h2 className="text-sm font-bold text-ink uppercase tracking-tight truncate">{announcement.name}</h2>
          <Badge variant="brand" className="mt-1">{dateSession.callType}</Badge>
        </div>
        
        {/* Indicators */}
        <div className="grid grid-cols-2 gap-3 md:border-l md:border-r md:border-line/60 md:px-6">
          <div className="bg-canvas p-2.5 rounded-card text-center border border-line/50">
            <div className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Convocados</div>
            <div className="text-xl font-bold text-brand">{totalCalled}</div>
          </div>
          <div className="bg-canvas p-2.5 rounded-card text-center border border-line/50">
            <div className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Presentes</div>
            <div className="text-xl font-bold text-brand">{totalPresent}</div>
          </div>
        </div>

        {/* Quorum Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase">
            <span className="text-ink-soft">Asistencia Lograda</span>
            <span className={isQuorumMet ? "text-success" : "text-amber-600"}>{presentPercent.toFixed(2)}%</span>
          </div>
          <div className="h-2 w-full bg-canvas border border-line/60 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${isQuorumMet ? "bg-success" : "bg-amber-500"}`}
              style={{ width: `${Math.min(presentPercent, 100)}%` }}
            />
          </div>
          <p className="text-[9px] font-medium text-ink-soft text-right">
            Mínimo requerido para iniciar: {minimumRequired}%
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-line gap-2">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`h-10 px-5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "attendance" 
              ? "border-brand text-brand font-extrabold" 
              : "border-transparent text-ink-soft hover:text-brand"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          1. Pase de Lista
        </button>
        <button
          onClick={() => setActiveTab("voting")}
          className={`h-10 px-5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "voting" 
              ? "border-brand text-brand font-extrabold" 
              : "border-transparent text-ink-soft hover:text-brand"
          }`}
        >
          <Vote className="h-4 w-4" />
          2. Votación de Temas
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "attendance" ? (
        <div className="space-y-6">
          
          {/* Quorum Banner Alert */}
          <div className={`p-4 rounded-card border flex items-center gap-3 animate-in fade-in duration-200 ${
            isQuorumMet 
              ? "bg-success/10 border-success/30 text-success" 
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isQuorumMet ? "bg-success/20" : "bg-amber-100"
            }`}>
              <CheckCircle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider">
                {isQuorumMet ? "Quórum Logrado" : "Quórum Insuficiente"}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5 leading-snug">
                {isQuorumMet 
                  ? "Se ha superado el porcentaje de indiviso mínimo requerido. Puede proceder a la votación de temas de la agenda."
                  : `Se necesita registrar al menos el ${minimumRequired}% de los convocados para iniciar votaciones.`
                }
              </p>
            </div>
            {isQuorumMet && (
              <button
                onClick={() => setActiveTab("voting")}
                className="h-8 px-4 rounded-full bg-success text-white text-[9px] font-bold uppercase tracking-widest hover:bg-success/90 transition-colors whitespace-nowrap"
              >
                Ir a Votación
              </button>
            )}
          </div>

          {/* Attendance Checklist Grid */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>
              <Users className="h-4 w-4 text-white/90" />
              <h2 className={sectionTitleCls}>Asistentes</h2>
            </div>
            <div className={`${sectionBodyCls} space-y-4`}>
              {invitedPositions.length === 0 && specialGuests.length === 0 ? (
                <div className="py-8 text-center text-ink-soft text-xs italic border border-dashed border-line/60 rounded-card bg-canvas">
                  No se han registrado convocados ni invitados especiales para esta asamblea.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {invitedPositions.map(pos => {
                    const posName = positionMap[pos.positionId] || pos.positionId;
                    const isChecked = checkedIds.includes(pos.positionId);
                    
                    return (
                      <div 
                        key={pos.id} 
                        onClick={() => handleToggleAttendance(pos.positionId, !isChecked)}
                        className={`flex items-center justify-between p-3.5 rounded-card border cursor-pointer select-none transition-all active-scale ${
                          isChecked 
                            ? "bg-brand/5 border-brand/40 shadow-sm" 
                            : "bg-white border-line hover:bg-canvas"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            isChecked ? "bg-brand text-white" : "bg-canvas text-ink-soft"
                          }`}>
                            <UserCheck className="w-3.5 h-3.5" />
                          </div>
                          <span className={`text-[11px] font-bold leading-tight truncate ${
                            isChecked ? "text-brand" : "text-ink"
                          }`}>{posName}</span>
                        </div>

                        {/* Toggle status indicator */}
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isChecked ? "bg-brand border-brand text-white" : "border-line bg-canvas text-transparent"
                        }`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    );
                  })}

                  {specialGuests.map((guest: any) => {
                    const isChecked = checkedIds.includes(guest.id);
                    
                    return (
                      <div 
                        key={guest.id} 
                        onClick={() => handleToggleAttendance(guest.id, !isChecked)}
                        className={`flex items-center justify-between p-3.5 rounded-card border cursor-pointer select-none transition-all active-scale ${
                          isChecked 
                            ? "bg-brand/5 border-brand/40 shadow-sm" 
                            : "bg-white border-line hover:bg-canvas"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            isChecked ? "bg-brand text-white" : "bg-canvas text-ink-soft"
                          }`}>
                            <UserCheck className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-[11px] font-bold leading-tight truncate ${
                              isChecked ? "text-brand" : "text-ink"
                            }`}>{guest.name}</span>
                            <span className="text-[9px] text-ink-soft truncate">{guest.email || "Invitado Especial"}</span>
                          </div>
                        </div>

                        {/* Toggle status indicator */}
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isChecked ? "bg-brand border-brand text-white" : "border-line bg-canvas text-transparent"
                        }`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Action Buttons Bottom */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => handleCloseAssembly(false)}
              className="flex items-center gap-2 h-9 px-6 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
            >
              Cancelar/No Ejecutar
            </button>
            <button
              onClick={() => setActiveTab("voting")}
              className="flex items-center gap-2 h-9 px-6 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors"
            >
              Siguiente: Votación
            </button>
          </div>
        </div>
      ) : (
        // Tab 2: Votación de Temas
        <div className="space-y-6">
          {topics.length > 0 ? (
            topics.map((topic, topicIdx) => {
              const topicVotes = votesMap[topic.id] || {};
              const presenterName = topic.presenterId ? userMap[topic.presenterId] : undefined;

              // Filter called positions to show only checked (present) positions
              const presentPositions = invitedPositions.filter(p => checkedIds.includes(p.positionId));
              const presentGuests = specialGuests.filter((g: any) => checkedIds.includes(g.id));

              const presentParticipants = [
                ...presentPositions.map(p => ({
                  id: p.positionId,
                  key: p.positionId,
                  name: positionMap[p.positionId] || p.positionId,
                  type: "POSITION"
                })),
                ...presentGuests.map((g: any) => ({
                  id: g.id,
                  key: g.id,
                  name: g.name,
                  type: "GUEST"
                }))
              ];

              // Compute vote outcomes based on the checked present attendees
              const voteCount = presentParticipants.length;
              let favorCount = 0;
              let againstCount = 0;
              let abstainCount = 0;

              presentParticipants.forEach(p => {
                const vt = topicVotes[p.key];
                if (vt === "FAVOR") favorCount++;
                else if (vt === "AGAINST") againstCount++;
                else if (vt === "ABSTAIN") abstainCount++;
              });

              // Coeffient calculations (weighted based on presence)
              const favorPercent = voteCount > 0 ? (favorCount / voteCount) * 100 : 0;
              const againstPercent = voteCount > 0 ? (againstCount / voteCount) * 100 : 0;
              const abstainPercent = voteCount > 0 ? (abstainCount / voteCount) * 100 : 0;

              return (
                <div key={topic.id} className={sectionCls}>
                  <div className={sectionHeaderCls}>
                    <Badge variant="default" className="bg-white/20 text-white border-0 font-extrabold text-[9px]">
                      Tema {topicIdx + 1}
                    </Badge>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-white truncate max-w-xl">
                      {topic.title}
                    </h3>
                  </div>

                  <div className={`${sectionBodyCls} space-y-5`}>
                    
                    {/* Present positions list with real-time casting */}
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">
                        Votos de Asistentes Presentes
                      </span>
                      
                      {presentParticipants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {presentParticipants.map(p => {
                            const voteType = topicVotes[p.key];

                            return (
                              <div key={p.id} className="flex items-center justify-between p-3 rounded-card bg-canvas border border-line">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-bold text-ink max-w-[200px] truncate">{p.name}</span>
                                  {p.type === "GUEST" && (
                                    <span className="text-[8px] text-ink-soft uppercase tracking-wider">Invitado Especial</span>
                                  )}
                                </div>
                                
                                <div className="flex gap-1.5">
                                  {topic.actionType === "VOTE" ? (
                                    <>
                                      {/* Favor button */}
                                      <button
                                        type="button"
                                        onClick={() => handleCastVote(topic.id, p.key, voteType === "FAVOR" ? "NONE" : "FAVOR")}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                                          voteType === "FAVOR"
                                            ? "bg-success border-success text-white shadow-sm"
                                            : "bg-white border-line text-ink-soft hover:bg-success/15 hover:text-success hover:border-success/30"
                                        }`}
                                        title="A Favor"
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                      </button>

                                      {/* Abstain button */}
                                      <button
                                        type="button"
                                        onClick={() => handleCastVote(topic.id, p.key, voteType === "ABSTAIN" ? "NONE" : "ABSTAIN")}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                                          voteType === "ABSTAIN"
                                            ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                            : "bg-white border-line text-ink-soft hover:bg-amber-500/15 hover:text-amber-500 hover:border-amber-500/30"
                                        }`}
                                        title="Abstención"
                                      >
                                        <HelpCircle className="h-3.5 w-3.5" />
                                      </button>

                                      {/* Against button */}
                                      <button
                                        type="button"
                                        onClick={() => handleCastVote(topic.id, p.key, voteType === "AGAINST" ? "NONE" : "AGAINST")}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                                          voteType === "AGAINST"
                                            ? "bg-danger border-danger text-white shadow-sm"
                                            : "bg-white border-line text-ink-soft hover:bg-danger/15 hover:text-danger hover:border-danger/30"
                                        }`}
                                        title="En Contra"
                                      >
                                        <ThumbsDown className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  ) : topic.actionType === "CONFIRMATION" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCastVote(topic.id, p.key, voteType === "FAVOR" ? "NONE" : "FAVOR")}
                                      className={`h-7 px-4 rounded-full flex items-center justify-center border text-[9px] font-bold uppercase tracking-widest transition-all gap-1.5 ${
                                        voteType === "FAVOR"
                                          ? "bg-success border-success text-white shadow-sm"
                                          : "bg-white border-line text-ink-soft hover:bg-success/15 hover:text-success hover:border-success/30"
                                      }`}
                                    >
                                      <Check className="h-3 w-3 stroke-[3]" />
                                      {voteType === "FAVOR" ? "Confirmado" : "Confirmar"}
                                    </button>
                                  ) : (
                                    <span className="text-[9px] font-semibold text-ink-soft/70 uppercase">Informativo</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="py-4 text-center text-ink-soft text-[10px] italic border-2 border-dashed border-line/60 rounded-card">
                          Por favor, registre presentes en la pestaña 'Pase de Lista' primero para poder emitir votos.
                        </p>
                      )}
                    </div>

                    {/* Dynamic voting results cards */}
                    {presentParticipants.length > 0 && topic.actionType !== "NONE" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-line/50">
                        {topic.actionType === "VOTE" ? (
                          <>
                            <div className="p-3 bg-success/5 border border-success/15 rounded-card text-center">
                              <span className="text-[9px] font-bold text-success uppercase tracking-wider block">A Favor</span>
                              <span className="text-xl font-black text-success block mt-1">{favorPercent.toFixed(2)}%</span>
                              <span className="text-[9px] font-medium text-ink-soft block">({favorCount} asistentes)</span>
                            </div>
                            
                            <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-card text-center">
                              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block">Abstenciones</span>
                              <span className="text-xl font-black text-amber-500 block mt-1">{abstainPercent.toFixed(2)}%</span>
                              <span className="text-[9px] font-medium text-ink-soft block">({abstainCount} condóminos)</span>
                            </div>

                            <div className="p-3 bg-danger/5 border border-danger/15 rounded-card text-center">
                              <span className="text-[9px] font-bold text-danger uppercase tracking-wider block">En Contra</span>
                              <span className="text-xl font-black text-danger block mt-1">{againstPercent.toFixed(2)}%</span>
                              <span className="text-[9px] font-medium text-ink-soft block">({againstCount} condóminos)</span>
                            </div>
                          </>
                        ) : (
                          <div className="p-3 bg-success/5 border border-success/15 rounded-card text-center sm:col-span-3">
                            <span className="text-[9px] font-bold text-success uppercase tracking-wider block">Confirmados</span>
                            <span className="text-xl font-black text-success block mt-1">{favorPercent.toFixed(2)}%</span>
                            <span className="text-[9px] font-medium text-ink-soft block">({favorCount} de {voteCount} presentes confirmaron)</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text area for conclusions */}
                    <div className="space-y-1.5 pt-3 border-t border-line/50">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-ink-soft flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        Comentarios / Conclusiones del Tema
                      </span>
                      <div className="flex gap-2 items-end">
                        <textarea
                          className={fieldCls}
                          value={conclusionsMap[topic.id] || ""}
                          onChange={(e) => setConclusionsMap({ ...conclusionsMap, [topic.id]: e.target.value })}
                          placeholder="Redacte los comentarios, resoluciones o acuerdos logrados para este punto..."
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveConclusions(topic.id)}
                          disabled={savingTopicId === topic.id}
                          className="h-9 px-4 rounded-xl bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                          title="Guardar comentario"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingTopicId === topic.id ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-10 text-center text-ink-soft text-sm">No hay temas registrados en el orden del día.</p>
          )}

          {/* Action buttons Bottom */}
          <div className="p-5 bg-white border border-line rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-ink uppercase tracking-tight">Finalizar Asamblea</p>
              <p className="text-[10px] text-ink-soft leading-snug mt-0.5">
                Cierre la toma de asamblea para registrar definitivamente los votos y la asistencia en el historial de Gobernanza.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleCloseAssembly(false)}
                className="h-9 px-6 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors whitespace-nowrap"
              >
                No Realizada
              </button>
              <button
                onClick={() => handleCloseAssembly(true)}
                className="h-9 px-6 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors whitespace-nowrap"
              >
                Cerrar Asamblea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
