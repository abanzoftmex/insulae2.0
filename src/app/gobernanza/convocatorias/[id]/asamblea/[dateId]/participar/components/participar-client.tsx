"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  toggleAttendanceAction,
  registerVoteAction
} from "../../../actions";
import {
  UserCheck,
  CheckCircle,
  Users,
  Vote,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Check,
  Calendar,
  Clock,
  MapPin,
  ClipboardList
} from "lucide-react";

interface RepresentedKeyData {
  key: string;
  name: string;
  type: "POSITION" | "GUEST";
}

interface ParticiparClientProps {
  announcement: any;
  dateSession: any;
  topics: any[];
  representedKeys: RepresentedKeyData[];
}

export function ParticiparClient({
  announcement,
  dateSession,
  topics,
  representedKeys
}: ParticiparClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"attendance" | "voting">("attendance");
  const [checkedIds, setCheckedIds] = useState<string[]>(
    dateSession.checkedPositions
      ? dateSession.checkedPositions.split(",").map((id: string) => id.trim()).filter(Boolean)
      : []
  );

  // Local state for votes (stores { [topicId]: { [key]: "FAVOR" | "AGAINST" | "ABSTAIN" } })
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

  const handleToggleAttendance = async (targetId: string, isChecked: boolean) => {
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

  const handleCastVote = async (topicId: string, targetId: string, type: "FAVOR" | "AGAINST" | "ABSTAIN" | "NONE") => {
    const currentTopicVotes = { ...votesMap[topicId] };
    if (type === "NONE") {
      delete currentTopicVotes[targetId];
    } else {
      currentTopicVotes[targetId] = type;
    }
    setVotesMap({
      ...votesMap,
      [topicId]: currentTopicVotes
    });

    startTransition(async () => {
      const res = await registerVoteAction(topicId, targetId, type);
      if (res.success && res.votesJson) {
        setVotesMap({
          ...votesMap,
          [topicId]: JSON.parse(res.votesJson)
        });
      }
    });
  };

  const presentRepresentations = representedKeys.filter(rk => checkedIds.includes(rk.key));
  const isPresentAtAll = presentRepresentations.length > 0;

  const sectionHeaderCls = "px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2";
  const sectionTitleCls = "text-[10px] font-bold uppercase tracking-widest text-white";
  const sectionBodyCls = "p-5";
  const sectionCls = "overflow-hidden rounded-card border border-line/40 bg-white shadow-sm";

  return (
    <div className="space-y-6 pb-20">
      
      {/* Overview Card */}
      <div className="p-5 bg-white border border-line rounded-card shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-brand block">Asamblea en Curso</span>
          <h2 className="text-base font-bold text-ink uppercase tracking-tight truncate">{announcement.name}</h2>
          <Badge variant="brand" className="mt-1">{dateSession.callType}</Badge>
        </div>

        <div className="space-y-2 text-xs text-ink-soft/90 md:border-l md:border-line md:pl-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-brand shrink-0" />
            <span>{new Date(dateSession.date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-brand shrink-0" />
            <span>Hora: {dateSession.time} hrs</span>
          </div>
          {dateSession.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
              <span className="truncate">{dateSession.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
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
          1. Registrar Asistencia
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

      {/* Content */}
      {activeTab === "attendance" ? (
        <div className="space-y-6">
          {/* Attendance Checklist */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>
              <Users className="h-4 w-4 text-white/90" />
              <h2 className={sectionTitleCls}>Registrar mi Asistencia</h2>
            </div>
            <div className={`${sectionBodyCls} space-y-4`}>
              <p className="text-xs text-ink-soft leading-relaxed">
                Por favor, marque la casilla de las propiedades o representaciones de las cuales desea registrar su asistencia en esta sesión. Debe estar registrado como presente para poder emitir votos.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {representedKeys.map(rep => {
                  const isChecked = checkedIds.includes(rep.key);
                  return (
                    <div 
                      key={rep.key} 
                      onClick={() => handleToggleAttendance(rep.key, !isChecked)}
                      className={`flex items-center justify-between p-4 rounded-card border cursor-pointer select-none transition-all active-scale ${
                        isChecked 
                          ? "bg-brand/5 border-brand/40 shadow-sm" 
                          : "bg-white border-line hover:bg-canvas"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isChecked ? "bg-brand text-white" : "bg-canvas text-ink-soft"
                        }`}>
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-bold leading-tight truncate ${
                            isChecked ? "text-brand" : "text-ink"
                          }`}>{rep.name}</span>
                          <span className="text-[9px] text-ink-soft uppercase tracking-wider mt-0.5">
                            {rep.type === "GUEST" ? "Invitado Especial" : "Representante"}
                          </span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isChecked ? "bg-brand border-brand text-white" : "border-line bg-canvas text-transparent"
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Quick Info Alert */}
          {isPresentAtAll ? (
            <div className="p-4 rounded-card border bg-success/10 border-success/30 text-success flex items-center gap-3 animate-in fade-in duration-200">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1 text-xs">
                <p className="font-bold uppercase tracking-wider">Asistencia registrada correctamente</p>
                <p className="opacity-90 mt-0.5">Ya puede proceder a la pestaña de "Votación de Temas" para emitir su opinión.</p>
              </div>
              <button
                onClick={() => setActiveTab("voting")}
                className="h-8 px-4 rounded-full bg-success text-white text-[9px] font-bold uppercase tracking-widest hover:bg-success/90 transition-colors"
              >
                Ir a Votación
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-card border bg-amber-50 border-amber-200 text-amber-800 flex items-center gap-3">
              <HelpCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1 text-xs">
                <p className="font-bold uppercase tracking-wider">Esperando registro de asistencia</p>
                <p className="opacity-90 mt-0.5">Registre su asistencia en al menos una propiedad para ser habilitado para votar.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Tab 2: Voting
        <div className="space-y-6">
          {!isPresentAtAll ? (
            <div className="py-12 text-center border-2 border-dashed border-line/60 rounded-card bg-white flex flex-col items-center justify-center p-6 space-y-3">
              <ClipboardList className="h-8 w-8 text-ink-soft/60" />
              <h3 className="text-sm font-bold text-ink">Registro de asistencia requerido</h3>
              <p className="text-xs text-ink-soft max-w-sm">
                Debe registrar su asistencia en la primera pestaña antes de poder participar en las votaciones del orden del día.
              </p>
              <button
                onClick={() => setActiveTab("attendance")}
                className="h-8 px-4 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors"
              >
                Registrar Asistencia
              </button>
            </div>
          ) : (
            topics.map((topic, topicIdx) => {
              const topicVotes = votesMap[topic.id] || {};
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

                  <div className={`${sectionBodyCls} space-y-4`}>
                    {topic.description && (
                      <p className="text-xs text-ink-soft leading-relaxed border-l-2 border-brand/30 pl-3 italic">
                        {topic.description}
                      </p>
                    )}

                    <div className="space-y-2.5 pt-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-ink-soft block">
                        Tus propiedades / Representaciones habilitadas
                      </span>

                      <div className="space-y-2">
                        {presentRepresentations.map(rep => {
                          const voteType = topicVotes[rep.key];

                          return (
                            <div key={rep.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-card bg-canvas border border-line">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-ink">{rep.name}</span>
                                <span className="text-[9px] text-ink-soft mt-0.5">
                                  Emitir voto como: {rep.type === "GUEST" ? "Invitado Especial" : "Representante"}
                                </span>
                              </div>

                              <div className="flex gap-2">
                                {topic.actionType === "VOTE" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleCastVote(topic.id, rep.key, voteType === "FAVOR" ? "NONE" : "FAVOR")}
                                      className={`h-8 px-4 rounded-full flex items-center justify-center border text-[9px] font-bold uppercase tracking-widest transition-all gap-1.5 ${
                                        voteType === "FAVOR"
                                          ? "bg-success border-success text-white shadow-sm"
                                          : "bg-white border-line text-ink-soft hover:bg-success/15 hover:text-success hover:border-success/30"
                                      }`}
                                    >
                                      <ThumbsUp className="h-3 w-3" />
                                      A Favor
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCastVote(topic.id, rep.key, voteType === "ABSTAIN" ? "NONE" : "ABSTAIN")}
                                      className={`h-8 px-4 rounded-full flex items-center justify-center border text-[9px] font-bold uppercase tracking-widest transition-all gap-1.5 ${
                                        voteType === "ABSTAIN"
                                          ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                          : "bg-white border-line text-ink-soft hover:bg-amber-500/15 hover:text-amber-500 hover:border-amber-500/30"
                                      }`}
                                    >
                                      <HelpCircle className="h-3.5 w-3.5" />
                                      Abstención
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCastVote(topic.id, rep.key, voteType === "AGAINST" ? "NONE" : "AGAINST")}
                                      className={`h-8 px-4 rounded-full flex items-center justify-center border text-[9px] font-bold uppercase tracking-widest transition-all gap-1.5 ${
                                        voteType === "AGAINST"
                                          ? "bg-danger border-danger text-white shadow-sm"
                                          : "bg-white border-line text-ink-soft hover:bg-danger/15 hover:text-danger hover:border-danger/30"
                                      }`}
                                    >
                                      <ThumbsDown className="h-3 w-3" />
                                      En Contra
                                    </button>
                                  </>
                                ) : topic.actionType === "CONFIRMATION" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCastVote(topic.id, rep.key, voteType === "FAVOR" ? "NONE" : "FAVOR")}
                                    className={`h-8 px-5 rounded-full flex items-center justify-center border text-[9px] font-bold uppercase tracking-widest transition-all gap-1.5 ${
                                      voteType === "FAVOR"
                                        ? "bg-success border-success text-white shadow-sm"
                                        : "bg-white border-line text-ink-soft hover:bg-success/15 hover:text-success"
                                    }`}
                                  >
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    {voteType === "FAVOR" ? "Confirmado" : "Confirmar"}
                                  </button>
                                ) : (
                                  <span className="text-[9px] font-bold text-ink-soft/75 uppercase tracking-wider py-1.5">Informativo</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
