"use client";

import React from "react";
import type { OrganigramGroupSection } from "@/modules/condominium-organigram/domain/condominium-organigram";
import { Building2, ShieldCheck, UserCheck, Layers, Award, ChevronDown } from "lucide-react";

interface OrganigramaDiagramProps {
  condominiumName: string;
  groups: OrganigramGroupSection[];
}

export function OrganigramaDiagram({ condominiumName, groups }: OrganigramaDiagramProps) {
  // Sort groups strictly by groupPosition (orden) and their rows by sortOrder (orden)
  const sortedGroups = [...groups]
    .filter((g) => g.rows.length > 0)
    .sort((a, b) => (a.groupPosition ?? 0) - (b.groupPosition ?? 0))
    .map((g) => ({
      ...g,
      rows: [...g.rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }));

  if (sortedGroups.length === 0) return null;

  return (
    <div className="space-y-6 pt-6 border-t border-line/60 animate-in fade-in duration-300">
      {/* Title section */}
      <div className="flex items-center justify-between pb-2 border-b border-line/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand/10 text-brand">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-brand-deep">
              Organigrama Operativo y de Gobierno
            </h2>
            <p className="text-[11px] text-ink-soft">
              Estructura jerárquica ordenada según la posición u orden de cada grupo y cargo
            </p>
          </div>
        </div>
      </div>

      {/* Main Organigrama Diagram Canvas */}
      <div className="p-6 md:p-8 rounded-2xl bg-canvas/40 border border-line/70 shadow-sm overflow-x-auto">
        <div className="min-w-[750px] flex flex-col items-center space-y-6">
          
          {/* Level 0: Top Node (Condominium Governance Apex) */}
          <div className="flex flex-col items-center">
            <div className="px-6 py-3 rounded-2xl bg-brand-deep text-white shadow-lg border border-brand-mint/30 flex items-center gap-3 text-center transition-transform duration-200 hover:scale-[1.02]">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
                <Building2 className="w-5 h-5 text-brand-mint" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-mint/90 block">
                  Máxima Autoridad Condominal
                </span>
                <h3 className="text-sm font-black tracking-wide uppercase">
                  {condominiumName || "Condominio"}
                </h3>
              </div>
            </div>

            {/* Connecting Vertical Line down */}
            <div className="w-0.5 h-6 bg-brand/40" />
            <ChevronDown className="w-4 h-4 text-brand -mt-1.5" />
          </div>

          {/* Level 1 & 2: Groups & Cargos Grid ordered by orden */}
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch justify-center">
              {sortedGroups.map((group) => (
                <div key={group.groupId} className="flex flex-col h-full">
                  
                  {/* Group Card Container */}
                  <div className="w-full h-full flex flex-col rounded-2xl border border-brand/30 bg-white shadow-md overflow-hidden hover:shadow-lg transition-all duration-200">
                    
                    {/* Group Header (Full Title visible, no truncation) */}
                    <div className="px-4 py-3 bg-brand text-white flex items-start justify-between gap-2 border-b border-brand-mint/20 min-h-[56px]">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <Award className="w-4 h-4 text-brand-mint shrink-0 mt-0.5" />
                        <h4 className="text-xs font-black uppercase tracking-wider leading-snug text-white break-words">
                          {group.groupName}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-white/20 text-white shrink-0 border border-white/30 self-start mt-0.5">
                        Orden #{group.groupPosition}
                      </span>
                    </div>

                    {/* Positions inside Group with Scroll Container for height balance */}
                    <div className="p-3 space-y-3 bg-canvas/10 divide-y divide-line/40 flex-1 max-h-[460px] overflow-y-auto">
                      {group.rows.map((row) => (
                        <div key={row.positionId} className="pt-3 first:pt-0 space-y-2">
                          
                          {/* Position Title & Orden */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-extrabold text-ink leading-tight break-words flex-1">
                              {row.positionName}
                            </span>
                            <span className="text-[9px] font-bold text-brand-accent px-1.5 py-0.5 rounded bg-brand-mint/10 border border-brand-mint/20 shrink-0">
                              Orden #{row.sortOrder}
                            </span>
                          </div>

                          {/* Responsibles / Titulares */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-green-800 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-green-700" />
                              Titular{row.responsible.length > 1 ? "es" : ""}
                            </span>
                            {row.responsible.length === 0 ? (
                              <p className="text-[10px] italic text-ink-soft/50 pl-3">Pendiente</p>
                            ) : (
                              <div className="pl-1 space-y-1">
                                {row.responsible.map((resp) => (
                                  <div
                                    key={resp.userId}
                                    className="px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-900 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" />
                                    <span className="break-words leading-tight">{resp.displayName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Alternates / Suplentes */}
                          {row.allowsAlternate && (
                            <div className="space-y-1 pt-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-amber-600" />
                                Suplente{row.alternates.length > 1 ? "s" : ""}
                              </span>
                              {row.alternates.length === 0 ? (
                                <p className="text-[10px] italic text-ink-soft/50 pl-3">Sin suplente</p>
                              ) : (
                                <div className="pl-1 space-y-1">
                                  {row.alternates.map((alt) => (
                                    <div
                                      key={alt.userId}
                                      className="px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs"
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                      <span className="break-words leading-tight">{alt.displayName}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
