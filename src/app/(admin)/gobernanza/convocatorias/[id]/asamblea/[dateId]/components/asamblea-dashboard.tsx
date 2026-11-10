"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleAttendanceAction,
  registerVoteAction,
  saveTopicConclusionsAction,
  closeAsambleaAction
} from "../../actions";
import {
  isAsamblea,
  getMeetingNoun,
  isTopicVote,
  isTopicConfirmation,
  getTopicsActionSummary,
  parseTopicConclusions,
  TopicConclusionsData,
  AgreementFile
} from "@/app/(admin)/gobernanza/convocatorias/_lib/governance-terms";
import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/storage-client";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck,
  CheckCircle,
  Users,
  Vote,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Save,
  Check,
  ClipboardList,
  Paperclip,
  FileText,
  ExternalLink,
  Download,
  Trash2,
  FileCheck2,
  Loader2,
  CheckCircle2
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

  // Terminología dinámica basada en configuración persistida
  const isAsambleaType = isAsamblea(announcement);
  const meetingNoun = getMeetingNoun(isAsambleaType, { capitalized: true });
  const meetingNounLower = getMeetingNoun(isAsambleaType, { capitalized: false });
  const topicsSummary = getTopicsActionSummary(topics);
  const isOnlyConfirmation = topicsSummary.isOnlyConfirmation;

  // Topics structured data state: { [topicId]: { conclusions, agreement, agreementFiles, responsible } }
  const [topicDataMap, setTopicDataMap] = useState<Record<string, TopicConclusionsData>>(
    topics.reduce((acc, t) => {
      acc[t.id] = parseTopicConclusions(t.conclusions);
      return acc;
    }, {} as Record<string, TopicConclusionsData>)
  );

  // Topics local votes map state (stores { [topicId]: { [positionId]: "FAVOR" | "AGAINST" | "ABSTAIN" } })
  const [votesMap, setVotesMap] = useState<Record<string, Record<string, string>>>(
    topics.reduce((acc, t) => {
      let v: Record<string, string> = {};
      if (t.votesJson) {
        try {
          v = JSON.parse(t.votesJson);
        } catch {
          v = {};
        }
      }
      acc[t.id] = v;
      return acc;
    }, {} as Record<string, Record<string, string>>)
  );

  const [isPending, startTransition] = useTransition();
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null);
  const [savedSuccessTopicId, setSavedSuccessTopicId] = useState<string | null>(null);
  const [uploadingTopicId, setUploadingTopicId] = useState<string | null>(null);

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

  const handleUploadPdf = async (topicId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      alert("Únicamente se permiten archivos en formato PDF.");
      e.target.value = "";
      return;
    }

    setUploadingTopicId(topicId);
    try {
      const result = await uploadCondominiumAsset({
        file,
        condominiumSlug: "valquirico",
        projectId: "governance",
        kind: "announcement-pdf",
      });

      const newFile: AgreementFile = {
        name: file.name,
        url: result.url,
        size: file.size,
      };

      setTopicDataMap((prev) => {
        const current = prev[topicId] || { conclusions: "", agreement: "", agreementFiles: [], responsible: "" };
        return {
          ...prev,
          [topicId]: {
            ...current,
            agreementFiles: [...current.agreementFiles, newFile],
          },
        };
      });
    } catch (error: any) {
      console.error("Error subiendo archivo PDF:", error);
      alert("Error al subir el archivo PDF: " + (error?.message || "Error desconocido"));
    } finally {
      setUploadingTopicId(null);
      e.target.value = "";
    }
  };

  const handleDeleteFile = (topicId: string, fileIdx: number) => {
    if (confirm("¿Desea eliminar este documento adjunto del acuerdo?")) {
      setTopicDataMap((prev) => {
        const current = prev[topicId] || { conclusions: "", agreement: "", agreementFiles: [], responsible: "" };
        return {
          ...prev,
          [topicId]: {
            ...current,
            agreementFiles: current.agreementFiles.filter((_, idx) => idx !== fileIdx),
          },
        };
      });
    }
  };

  const handleSaveTopicData = async (topicId: string) => {
    setSavingTopicId(topicId);
    setSavedSuccessTopicId(null);
    const data = topicDataMap[topicId] || { conclusions: "", agreement: "", agreementFiles: [], responsible: "" };
    const res = await saveTopicConclusionsAction(topicId, data);
    setSavingTopicId(null);
    if (!res.success) {
      alert("Error al guardar información del tema: " + res.error);
    } else {
      setSavedSuccessTopicId(topicId);
      setTimeout(() => {
        setSavedSuccessTopicId((cur) => (cur === topicId ? null : cur));
      }, 3500);
    }
  };

  const handleCloseAssembly = async (isCompleted: boolean) => {
    const message = isCompleted 
      ? `¿Está seguro de que desea cerrar la ${meetingNounLower} como REALIZADA y concluida?` 
      : `¿Desea cerrar la ${meetingNounLower} como NO REALIZADA (cancelada/sin quórum)?`;
      
    if (confirm(message)) {
      startTransition(async () => {
        const res = await closeAsambleaAction(dateSession.id, isCompleted);
        if (res.success) {
          router.push(`/gobernanza/convocatorias/${announcement.id}`);
          router.refresh();
        } else {
          alert(`Error al cerrar ${meetingNounLower}: ` + res.error);
        }
      });
    }
  };

  const sectionHeaderCls = "px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2";
  const sectionTitleCls = "text-[10px] font-bold uppercase tracking-widest text-white";
  const sectionBodyCls = "p-5";
  const sectionCls = "overflow-hidden rounded-card border border-line/40 bg-white shadow-sm";

  const tab2Title = isOnlyConfirmation
    ? "2. Confirmación y Acuerdos"
    : topicsSummary.hasVotes && topicsSummary.hasConfirmations
    ? "2. Votación y Confirmación"
    : "2. Votación y Acuerdos";

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Info */}
      <div className="p-5 bg-white border border-line rounded-card shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">
            {meetingNoun} en Proceso
          </span>
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
          {isOnlyConfirmation ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Vote className="h-4 w-4" />
          )}
          {tab2Title}
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
                  ? `Se ha superado el porcentaje de asistencia mínimo requerido. Puede proceder a ${
                      isOnlyConfirmation ? "la confirmación de temas y registro de acuerdos" : "la votación de temas del orden del día"
                    }.`
                  : `Se necesita registrar al menos el ${minimumRequired}% de los convocados para iniciar formalmente la sesión.`
                }
              </p>
            </div>
            {isQuorumMet && (
              <button
                onClick={() => setActiveTab("voting")}
                className="h-8 px-4 rounded-full bg-success text-white text-[9px] font-bold uppercase tracking-widest hover:bg-success/90 transition-colors whitespace-nowrap"
              >
                Ir a {isOnlyConfirmation ? "Confirmación" : "Votación"}
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
                  No se han registrado convocados ni invitados especiales para esta {meetingNounLower}.
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
              Siguiente: {isOnlyConfirmation ? "Confirmación" : "Votación"}
            </button>
          </div>
        </div>
      ) : (
        // Tab 2: Votación o Confirmación de Temas y Acuerdos
        <div className="space-y-6">
          {topics.length > 0 ? (
            topics.map((topic, topicIdx) => {
              const topicVotes = votesMap[topic.id] || {};
              const presenterName = topic.presenterId ? userMap[topic.presenterId] : undefined;
              const currentTopicData = topicDataMap[topic.id] || {
                conclusions: "",
                agreement: "",
                agreementFiles: [],
                responsible: ""
              };

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

              // Percentage calculations
              const favorPercent = voteCount > 0 ? (favorCount / voteCount) * 100 : 0;
              const againstPercent = voteCount > 0 ? (againstCount / voteCount) * 100 : 0;
              const abstainPercent = voteCount > 0 ? (abstainCount / voteCount) * 100 : 0;

              const isVote = isTopicVote(topic.actionType);
              const isConfirmation = isTopicConfirmation(topic.actionType);

              // Título dinámico para la lista de asistentes según el tipo de acción
              const attendeesSectionTitle = isConfirmation
                ? "Confirmaciones de Asistentes Presentes"
                : isVote
                ? "Votos de Asistentes Presentes"
                : "Registro de Asistentes Presentes";

              return (
                <div key={topic.id} className={sectionCls}>
                  <div className={sectionHeaderCls}>
                    <Badge variant="default" className="bg-white/20 text-white border-0 font-extrabold text-[9px]">
                      Tema {topicIdx + 1}
                    </Badge>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-white truncate max-w-xl">
                      {topic.title}
                    </h3>
                    <span className="ml-auto rounded-full bg-white/15 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                      {isVote ? "VOTACIÓN" : isConfirmation ? "CONFIRMACIÓN" : "INFORMATIVO"}
                    </span>
                  </div>

                  <div className={`${sectionBodyCls} space-y-5`}>
                    
                    {/* Present positions list with real-time casting */}
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">
                        {attendeesSectionTitle}
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
                                  {isVote ? (
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
                                  ) : isConfirmation ? (
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
                          Por favor, registre presentes en la pestaña 'Pase de Lista' primero para poder registrar participación.
                        </p>
                      )}
                    </div>

                    {/* Dynamic voting / confirmation results cards */}
                    {presentParticipants.length > 0 && topic.actionType !== "NONE" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-line/50">
                        {isVote ? (
                          <>
                            <div className="p-3 bg-success/5 border border-success/15 rounded-card text-center">
                              <span className="text-[9px] font-bold text-success uppercase tracking-wider block">A Favor</span>
                              <span className="text-xl font-black text-success block mt-1">{favorPercent.toFixed(2)}%</span>
                              <span className="text-[9px] font-medium text-ink-soft block">({favorCount} votos emitidos)</span>
                            </div>
                            
                            <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-card text-center">
                              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block">Abstenciones</span>
                              <span className="text-xl font-black text-amber-500 block mt-1">{abstainPercent.toFixed(2)}%</span>
                              <span className="text-[9px] font-medium text-ink-soft block">({abstainCount} votos)</span>
                            </div>

                            <div className="p-3 bg-danger/5 border border-danger/15 rounded-card text-center">
                              <span className="text-[9px] font-bold text-danger uppercase tracking-wider block">En Contra</span>
                              <span className="text-xl font-black text-danger block mt-1">{againstPercent.toFixed(2)}%</span>
                              <span className="text-[9px] font-medium text-ink-soft block">({againstCount} votos)</span>
                            </div>
                          </>
                        ) : isConfirmation ? (
                          <div className="p-3 bg-success/5 border border-success/15 rounded-card text-center sm:col-span-3">
                            <span className="text-[9px] font-bold text-success uppercase tracking-wider block">Confirmados</span>
                            <span className="text-xl font-black text-success block mt-1">{favorPercent.toFixed(2)}%</span>
                            <span className="text-[9px] font-medium text-ink-soft block">({favorCount} de {voteCount} presentes confirmaron)</span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* 3 APARTADOS DIFERENCIADOS: CONCLUSIONES, ACUERDO, RESPONSABLE */}
                    {/* ======================================================== */}
                    <div className="space-y-4 pt-4 border-t border-line/60">
                      
                      {/* Apartado 1: Comentarios / Conclusiones del Tema (campo existente) */}
                      <div className="rounded-xl border border-line/70 bg-[#faf8f5]/60 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-[#304854]" />
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#304854]">
                            1. Comentarios / Conclusiones del Tema
                          </span>
                        </div>
                        <textarea
                          className="w-full min-h-20 p-3 rounded-xl border border-line bg-white text-xs text-ink outline-none focus:ring-1 focus:ring-[#304854] transition-colors resize-y leading-relaxed"
                          value={currentTopicData.conclusions}
                          onChange={(e) =>
                            setTopicDataMap((prev) => ({
                              ...prev,
                              [topic.id]: { ...currentTopicData, conclusions: e.target.value },
                            }))
                          }
                          placeholder="Redacte comentarios, observaciones o notas generales discutidas durante el desahogo de este tema..."
                        />
                      </div>

                      {/* Apartado 2: Acuerdo (texto amplio + capacidad para adjuntar PDFs) */}
                      <div className="rounded-xl border border-amber-200/80 bg-[#fefcf8] p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <FileCheck2 className="h-4 w-4 text-[#947133]" />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#947133]">
                              2. Acuerdo Formal del Tema
                            </span>
                          </div>

                          {/* Botón para adjuntar documento PDF */}
                          <label className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-white border border-[#d0b685] text-[9px] font-extrabold uppercase tracking-wider text-[#947133] hover:bg-[#fcf8f0] transition-colors cursor-pointer shadow-2xs">
                            {uploadingTopicId === topic.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-[#947133]" />
                                <span>Subiendo PDF...</span>
                              </>
                            ) : (
                              <>
                                <Paperclip className="w-3 h-3 text-[#947133]" />
                                <span>Adjuntar PDF</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              disabled={uploadingTopicId === topic.id}
                              className="hidden"
                              onChange={(e) => handleUploadPdf(topic.id, e)}
                            />
                          </label>
                        </div>

                        {/* Descripción formal del acuerdo */}
                        <textarea
                          className="w-full min-h-24 p-3 rounded-xl border border-amber-200/80 bg-white text-xs text-ink outline-none focus:ring-1 focus:ring-[#947133] transition-colors resize-y leading-relaxed font-medium"
                          value={currentTopicData.agreement}
                          onChange={(e) =>
                            setTopicDataMap((prev) => ({
                              ...prev,
                              [topic.id]: { ...currentTopicData, agreement: e.target.value },
                            }))
                          }
                          placeholder="Redacte la descripción formal del acuerdo o resolución alcanzado por los condóminos o asistentes..."
                        />

                        {/* Lista de documentos PDF adjuntos */}
                        <div className="space-y-2 pt-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748b] block">
                            Documentos adjuntos al acuerdo ({currentTopicData.agreementFiles.length})
                          </span>

                          {currentTopicData.agreementFiles.length === 0 ? (
                            <p className="text-[11px] text-[#94a3b8] italic py-1">
                              No hay documentos PDF adjuntos para este acuerdo.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {currentTopicData.agreementFiles.map((file, fileIdx) => (
                                <div
                                  key={fileIdx}
                                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span className="font-semibold text-[#1e293b] truncate" title={file.name}>
                                      {file.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded text-[#304854] hover:bg-slate-100 transition-colors"
                                      title="Visualizar documento PDF"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                    <a
                                      href={file.url}
                                      download={file.name}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded text-[#304854] hover:bg-slate-100 transition-colors"
                                      title="Descargar documento PDF"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFile(topic.id, fileIdx)}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                                      title="Eliminar archivo adjunto"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Apartado 3: Responsable */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-[#304854]" />
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#304854]">
                            3. Responsable del Acuerdo
                          </span>
                        </div>
                        <div>
                          <input
                            type="text"
                            className="w-full h-10 px-3 rounded-xl border border-line bg-white text-xs font-semibold text-ink outline-none focus:ring-1 focus:ring-[#304854] transition-colors"
                            value={currentTopicData.responsible}
                            onChange={(e) =>
                              setTopicDataMap((prev) => ({
                                ...prev,
                                [topic.id]: { ...currentTopicData, responsible: e.target.value },
                              }))
                            }
                            placeholder={presenterName ? `Ej. ${presenterName} (o nombre del responsable del seguimiento)` : "Nombre de la persona o cargo responsable de dar seguimiento al acuerdo..."}
                          />
                        </div>
                      </div>

                      {/* Botón de guardado del tema */}
                      <div className="flex justify-end items-center gap-3 pt-1">
                        {savedSuccessTopicId === topic.id && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Guardado correctamente
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSaveTopicData(topic.id)}
                          disabled={savingTopicId === topic.id}
                          className="h-9 px-5 rounded-xl bg-[#304854] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#23353e] transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                        >
                          {savingTopicId === topic.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Guardando...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5 text-[#d0b685]" />
                              <span>Guardar Acuerdos del Tema</span>
                            </>
                          )}
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
              <p className="text-xs font-bold text-ink uppercase tracking-tight">
                Finalizar {meetingNoun}
              </p>
              <p className="text-[10px] text-ink-soft leading-snug mt-0.5">
                Cierre la sesión de {meetingNounLower} para registrar definitivamente {isOnlyConfirmation ? "las confirmaciones" : "los votos"} y la asistencia en el historial de Gobernanza.
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
                Cerrar {meetingNoun}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
