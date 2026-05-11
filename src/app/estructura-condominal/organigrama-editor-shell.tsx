"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { 
  Save, 
  X, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Info,
  Loader2
} from "lucide-react";

import type {
  OrganigramGroupSection,
  OrganigramUserOption,
} from "@/modules/condominium-organigram/domain/condominium-organigram";

import { saveCondominiumOrganigramAction } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils/cn";

type PositionDraft = {
  responsibleUserIds: string[];
  alternateUserIds: string[];
  maxAssignments: number;
  allowsAlternate: boolean;
};

interface OrganigramaEditorShellProps {
  groups: OrganigramGroupSection[];
  userOptions: OrganigramUserOption[];
}

function clampSelection(values: string[], maxAssignments: number): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) continue;
    normalized.push(value);
    seen.add(value);
    if (maxAssignments >= 0 && normalized.length >= maxAssignments) break;
  }
  return normalized;
}

export function OrganigramaEditorShell({ groups, userOptions }: OrganigramaEditorShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  const [draftByPositionId, setDraftByPositionId] = useState<Record<string, PositionDraft>>(() => {
    const entries: Array<[string, PositionDraft]> = [];
    for (const group of groups) {
      for (const row of group.rows) {
        entries.push([
          row.positionId,
          {
            responsibleUserIds: row.responsible.map((item) => item.userId),
            alternateUserIds: row.alternates.map((item) => item.userId),
            maxAssignments: row.maxAssignments,
            allowsAlternate: row.allowsAlternate,
          },
        ]);
      }
    }
    return Object.fromEntries(entries);
  });

  const allRows = useMemo(() => groups.flatMap((group) => group.rows), [groups]);

  const updateDraft = (
    positionId: string,
    bucket: "responsibleUserIds" | "alternateUserIds",
    values: string[],
  ) => {
    setDraftByPositionId((prev) => {
      const current = prev[positionId];
      if (!current) return prev;
      const nextValues = clampSelection(values, current.maxAssignments);
      return { ...prev, [positionId]: { ...current, [bucket]: nextValues } };
    });
  };

  const save = () => {
    setMessage("");
    startTransition(async () => {
      const payload = {
        positions: allRows.map((row) => {
          const draft = draftByPositionId[row.positionId];
          return {
            positionId: row.positionId,
            responsibleUserIds: draft?.responsibleUserIds ?? [],
            alternateUserIds: draft?.allowsAlternate ? draft.alternateUserIds : [],
          };
        }),
      };
      const result = await saveCondominiumOrganigramAction(payload);
      setMessage(result.message);
      if (result.ok) {
        router.push("/estructura-condominal");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map((group) => (
          <Card key={group.groupId} className="overflow-hidden border-transparent shadow-layered">
            <CardHeader className="px-4 py-3 border-b border-line bg-brand-deep/[0.03]">
              <CardTitle className="text-[12px] font-bold uppercase tracking-widest text-brand">{group.groupName}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="h-8 bg-canvas/10 text-[9px] font-bold uppercase tracking-widest text-ink-soft/40 border-b border-line/30">
                      <th className="px-4 py-2 w-[160px]">Cargo</th>
                      <th className="px-4 py-2">Titular(es)</th>
                      <th className="px-4 py-2">Suplente(s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/30">
                    {group.rows.map((row) => {
                      const draft = draftByPositionId[row.positionId];
                      const responsible = draft?.responsibleUserIds ?? [];
                      const alternates = draft?.alternateUserIds ?? [];

                      return (
                        <tr key={row.positionId} className="h-24 hover:bg-canvas/5 transition-colors">
                          <td className="px-4 py-2 align-top pt-3">
                            <p className="text-[12px] font-bold text-ink leading-tight">{row.positionName}</p>
                            <Badge variant="outline" className="mt-1.5 h-4 px-1 text-[8px]">Máx {row.maxAssignments}</Badge>
                          </td>

                          <td className="px-3 py-2 align-top">
                            <select
                              multiple
                              value={responsible}
                              onChange={(e) => updateDraft(row.positionId, "responsibleUserIds", Array.from(e.target.selectedOptions).map(o => o.value))}
                              className="h-20 w-full rounded border border-line bg-card px-1 py-1 text-[11px] font-medium outline-none focus:ring-2 focus:ring-brand-accent/20 appearance-none no-scrollbar"
                            >
                              {userOptions.map((user) => (
                                <option key={user.id} value={user.id} className="px-2 py-0.5 rounded cursor-pointer checked:bg-brand-mint/50 checked:text-brand">
                                  {user.displayName}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-3 py-2 align-top">
                            {row.allowsAlternate ? (
                              <select
                                multiple
                                value={alternates}
                                onChange={(e) => updateDraft(row.positionId, "alternateUserIds", Array.from(e.target.selectedOptions).map(o => o.value))}
                                className="h-20 w-full rounded border border-line bg-card px-1 py-1 text-[11px] font-medium outline-none focus:ring-2 focus:ring-brand-accent/20 appearance-none no-scrollbar"
                              >
                                {userOptions.map((user) => (
                                  <option key={user.id} value={user.id} className="px-2 py-0.5 rounded cursor-pointer checked:bg-brand-mint/50 checked:text-brand">
                                    {user.displayName}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="h-20 w-full flex items-center justify-center bg-canvas/30 rounded border border-dashed border-line/50">
                                 <span className="text-[9px] font-bold text-ink-soft/20 uppercase tracking-tighter">N/A</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Controls */}
      <div className="sticky bottom-0 z-40 p-4 bg-card/80 backdrop-blur-md border border-line shadow-2xl rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
           <Button 
            onClick={save} 
            disabled={isPending}
            className="h-10 px-8 text-[11px] font-bold uppercase gap-2 shadow-lg shadow-brand/10"
           >
             {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
             Guardar Estructura
           </Button>
           <Button 
            variant="ghost" 
            onClick={() => router.push("/estructura-condominal")}
            className="h-10 px-6 text-[11px] font-bold uppercase"
           >
             Cancelar
           </Button>
        </div>

        {message && (
          <div className={cn(
            "px-4 py-2 rounded-full text-[11px] font-bold uppercase flex items-center gap-2",
            message.toLowerCase().includes("correct") ? "bg-brand-mint text-brand" : "bg-danger/10 text-danger"
          )}>
            <Info className="h-3.5 w-3.5" />
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
