"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { CondominiumStructureType } from "@/modules/condominium-structure/domain/condominium-structure-listing";

import { saveCondominiumStructureAction } from "./actions";

type ConceptDraft = {
  localId: string;
  id?: string;
  name: string;
  quantity: string;
  isAlternate: boolean;
};

interface EstructuraCondominalFormShellProps {
  mode: "create" | "edit";
  groupId?: string;
  initialData: {
    name: string;
    position: string;
    structureType: CondominiumStructureType;
    concepts: Array<{
      id: string;
      name: string;
      quantity: string;
      isAlternate: boolean;
    }>;
  };
}

function toIntOrNull(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function toType(value: string): CondominiumStructureType {
  if (value === "1" || value === "2" || value === "3") {
    return Number(value) as CondominiumStructureType;
  }

  return 0;
}

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function EstructuraCondominalFormShell({
  mode,
  groupId,
  initialData,
}: EstructuraCondominalFormShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const [name, setName] = useState(initialData.name);
  const [position, setPosition] = useState(initialData.position);
  const [structureType, setStructureType] = useState<string>(String(initialData.structureType));
  const [concepts, setConcepts] = useState<ConceptDraft[]>(
    initialData.concepts.map((concept) => ({
      localId: concept.id,
      id: concept.id,
      name: concept.name,
      quantity: concept.quantity,
      isAlternate: concept.isAlternate,
    })),
  );

  const title = mode === "create" ? "Nuevo grupo de estructura" : "Editar grupo de estructura";
  const subtitle =
    mode === "create"
      ? "Define el grupo principal y registra los conceptos que formaran la estructura condominal."
      : "Actualiza la informacion general y ajusta los conceptos del grupo seleccionado.";

  const addConcept = () => {
    setConcepts((prev) => [
      ...prev,
      {
        localId: createLocalId(),
        name: "",
        quantity: "1",
        isAlternate: false,
      },
    ]);
  };

  const removeConcept = (localId: string) => {
    setConcepts((prev) => prev.filter((concept) => concept.localId !== localId));
  };

  const updateConcept = (localId: string, patch: Partial<ConceptDraft>) => {
    setConcepts((prev) => prev.map((concept) => (concept.localId === localId ? { ...concept, ...patch } : concept)));
  };

  const save = () => {
    setMessage("");

    startTransition(async () => {
      const response = await saveCondominiumStructureAction({
        id: groupId,
        name,
        position: toIntOrNull(position),
        structureType: toType(structureType),
        concepts: concepts.map((concept) => ({
          id: concept.id,
          name: concept.name,
          quantity: toIntOrNull(concept.quantity),
          isAlternate: concept.isAlternate,
        })),
      });

      setMessage(response.message);
      if (!response.ok) {
        return;
      }

      router.push("/listado-estructura-condominal");
      router.refresh();
    });
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#ece4da] px-5 pb-16 pt-8 text-[#1f1714] sm:px-8 lg:px-12">
      {/* VISUAL GUIDE: Fondo principal con atmosfera calida para diferenciar este modulo de otros listados. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-7rem] h-[22rem] w-[26rem] rounded-full bg-[#925f3a]/16 blur-3xl" />
        <div className="absolute right-[-10rem] top-[9rem] h-[20rem] w-[24rem] rounded-full bg-[#2f5b67]/14 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(255,255,255,0.45),transparent_35%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[#c6ab93]/45 bg-[linear-gradient(130deg,rgba(255,250,242,0.94)_0%,rgba(246,236,225,0.92)_58%,rgba(235,220,203,0.9)_100%)] p-6 shadow-[0_20px_45px_rgba(40,26,18,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/listado-estructura-condominal"
              className="inline-flex items-center rounded-xl border border-[#c9af97] bg-white/86 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b4936] transition hover:bg-[#fff6ea]"
            >
              Volver al listado
            </Link>

            <span className="inline-flex rounded-full border border-[#7f5038]/35 bg-[#7f5038]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#744734]">
              Gobierno condominal
            </span>
          </div>

          <h1 className="mt-5 font-[var(--font-landuse-display)] text-4xl leading-none text-[#2d2018] sm:text-5xl">
            {title}
          </h1>

          <p className="mt-3 max-w-4xl font-[var(--font-landuse-body)] text-sm leading-relaxed text-[#5f5044] sm:text-base">
            {subtitle}
          </p>
        </header>

        <section className="rounded-3xl border border-[#c6ad95]/50 bg-white/65 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.11)] backdrop-blur-sm sm:p-6">
          {/* VISUAL GUIDE: Bloque de identidad del grupo; es el punto central para nombre, orden y clasificacion. */}
          <article className="rounded-2xl border border-[#d3beab] bg-[#fff9f1] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6348]">Informacion general</p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Nombre</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                  placeholder="Nombre del grupo"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Posicion</span>
                <input
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                  type="number"
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                  placeholder="Posicion"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Tipo</span>
                <select
                  value={String(structureType)}
                  onChange={(event) => setStructureType(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                >
                  <option value="0">N/A</option>
                  <option value="1">Consejo</option>
                  <option value="2">Comision</option>
                  <option value="3">Comite</option>
                </select>
              </label>
            </div>
          </article>

          {/* VISUAL GUIDE: Lista de conceptos editable; permite alta y baja sin recargar pantalla. */}
          <article className="mt-5 rounded-2xl border border-[#d3beab] bg-[#fff9f1] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8c4b0] pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6348]">Conceptos</p>
              <button
                type="button"
                onClick={addConcept}
                className="rounded-lg border border-[#365b79] bg-[#365b79] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#eef6ff]"
              >
                Agregar concepto
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {concepts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#cfbaa4] bg-white/75 px-3 py-3 text-sm text-[#6b5244]">
                  Este grupo aun no tiene conceptos. Usa "Agregar concepto" para comenzar.
                </p>
              ) : null}

              {concepts.map((concept, index) => (
                <article
                  key={concept.localId}
                  className="rounded-lg border border-[#dbc9b7] bg-white/80 p-3 shadow-[0_6px_14px_rgba(47,30,20,0.06)]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5a46]">
                      Concepto {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeConcept(concept.localId)}
                      className="rounded-md border border-[#c89f87] bg-[#fff3eb] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8c4b2f]"
                    >
                      Eliminar
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f6348]">Nombre</span>
                      <input
                        value={concept.name}
                        onChange={(event) => updateConcept(concept.localId, { name: event.target.value })}
                        className="w-full rounded-lg border border-[#d9c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                        placeholder="Nombre del concepto"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f6348]">Cantidad</span>
                      <input
                        value={concept.quantity}
                        onChange={(event) => updateConcept(concept.localId, { quantity: event.target.value })}
                        type="number"
                        className="w-full rounded-lg border border-[#d9c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                        placeholder="0"
                      />
                    </label>
                  </div>

                  <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[#5f4a3d]">
                    <input
                      checked={concept.isAlternate}
                      onChange={(event) => updateConcept(concept.localId, { isAlternate: event.target.checked })}
                      type="checkbox"
                    />
                    Puesto suplente
                  </label>
                </article>
              ))}
            </div>
          </article>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#d8c4b0] pt-5">
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="rounded-xl border border-[#2f4c73] bg-[linear-gradient(155deg,#3e638f_0%,#2f4c73_100%)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#eff6ff] shadow-[0_12px_22px_rgba(46,71,106,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Guardar informacion"}
            </button>

            <Link
              href="/listado-estructura-condominal"
              className="inline-flex rounded-xl border border-[#c8ae95] bg-white/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#694938] transition hover:bg-[#fff4e8]"
            >
              Cancelar
            </Link>

            {message ? (
              <p
                className={`text-xs font-semibold uppercase tracking-[0.1em] ${
                  message.toLowerCase().includes("correct") ? "text-[#2f6a40]" : "text-[#9c3d2b]"
                }`}
              >
                {message}
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
