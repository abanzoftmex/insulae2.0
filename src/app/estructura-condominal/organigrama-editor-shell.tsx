"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type {
  OrganigramGroupSection,
  OrganigramUserOption,
} from "@/modules/condominium-organigram/domain/condominium-organigram";

import { saveCondominiumOrganigramAction } from "./actions";

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
    if (!value || seen.has(value)) {
      continue;
    }

    normalized.push(value);
    seen.add(value);

    if (maxAssignments >= 0 && normalized.length >= maxAssignments) {
      break;
    }
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
      if (!current) {
        return prev;
      }

      const nextValues = clampSelection(values, current.maxAssignments);

      return {
        ...prev,
        [positionId]: {
          ...current,
          [bucket]: nextValues,
        },
      };
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

      if (!result.ok) {
        return;
      }

      router.push("/estructura-condominal");
      router.refresh();
    });
  };

  return (
    <section className="space-y-5">
      {groups.map((group) => (
        <article
          key={group.groupId}
          className="overflow-hidden rounded-2xl border border-[#c8b09a]/55 bg-white/80 shadow-[0_14px_28px_rgba(36,23,16,0.08)]"
        >
          <header className="border-b border-[#dccab7] bg-[#fbf2e6] px-4 py-3">
            <h2 className="font-[var(--font-landuse-display)] text-2xl text-[#2f2219]">{group.groupName}</h2>
          </header>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-[#f2e7d7] text-[11px] uppercase tracking-[0.14em] text-[#82563d]">
                  <th className="border-b border-[#dcc7b2] px-4 py-3">Cargo</th>
                  <th className="border-b border-[#dcc7b2] px-4 py-3">Responsable</th>
                  <th className="border-b border-[#dcc7b2] px-4 py-3">Suplente</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, index) => {
                  const draft = draftByPositionId[row.positionId];
                  const responsible = draft?.responsibleUserIds ?? [];
                  const alternates = draft?.alternateUserIds ?? [];

                  return (
                    <tr key={row.positionId} className={index % 2 === 0 ? "bg-white/70" : "bg-[#fff7ed]/65"}>
                      <td className="border-b border-[#e4d3c1] px-4 py-3 align-top font-semibold text-[#2f241d]">{row.positionName}</td>

                      <td className="border-b border-[#e4d3c1] px-4 py-3 align-top">
                        <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-[#8b6851]">
                          Maximo {row.maxAssignments}
                        </p>
                        <select
                          multiple
                          value={responsible}
                          onChange={(event) =>
                            updateDraft(
                              row.positionId,
                              "responsibleUserIds",
                              Array.from(event.target.selectedOptions).map((option) => option.value),
                            )
                          }
                          className="min-h-28 w-full rounded-xl border border-[#d5c0ac] bg-white px-2 py-2 text-sm text-[#35281f] outline-none focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                        >
                          {userOptions.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.displayName}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="border-b border-[#e4d3c1] px-4 py-3 align-top">
                        {row.allowsAlternate ? (
                          <>
                            <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-[#8b6851]">
                              Maximo {row.maxAssignments}
                            </p>
                            <select
                              multiple
                              value={alternates}
                              onChange={(event) =>
                                updateDraft(
                                  row.positionId,
                                  "alternateUserIds",
                                  Array.from(event.target.selectedOptions).map((option) => option.value),
                                )
                              }
                              className="min-h-28 w-full rounded-xl border border-[#d5c0ac] bg-white px-2 py-2 text-sm text-[#35281f] outline-none focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                            >
                              {userOptions.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.displayName}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <p className="rounded-lg border border-dashed border-[#d4beaa] bg-[#f7eee2] px-3 py-3 text-sm text-[#6a5244]">
                            Este cargo no permite suplente.
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      ))}

      <section className="rounded-2xl border border-[#c8b09a]/55 bg-white/85 px-4 py-4 shadow-[0_14px_28px_rgba(36,23,16,0.08)]">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-xl border border-[#2f4c73] bg-[linear-gradient(155deg,#3e638f_0%,#2f4c73_100%)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#eff6ff] shadow-[0_12px_22px_rgba(46,71,106,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar informacion"}
          </button>

          <button
            type="button"
            onClick={() => {
              router.push("/estructura-condominal");
              router.refresh();
            }}
            className="rounded-xl border border-[#c8ae95] bg-white/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#694938] transition hover:bg-[#fff4e8]"
          >
            Cancelar
          </button>

          {message ? (
            <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${message.toLowerCase().includes("correct") ? "text-[#2f6a40]" : "text-[#9c3d2b]"}`}>
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
