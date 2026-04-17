"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { LandUseApplicationMode } from "@/modules/land-uses/domain/land-use-listing";

import { saveLandUseAction } from "./actions";

type ChargeCellInput = {
  key: string;
  year: number;
  chargeGroupId: string;
  chargeGroupName: string;
  amount: string;
  applicationMode: LandUseApplicationMode;
};

interface UsoSueloFormShellProps {
  mode: "create" | "edit";
  landUseId?: string;
  usesLandUseFormula?: boolean;
  initialData: {
    name: string;
    initials: string;
    order: string;
    weight: string;
    percentage: string;
    charges: ChargeCellInput[];
  };
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M10.78 3.22a.75.75 0 0 1 0 1.06L5.81 9.25H17a.75.75 0 0 1 0 1.5H5.81l4.97 4.97a.75.75 0 0 1-1.06 1.06l-6.25-6.25a.75.75 0 0 1 0-1.06l6.25-6.25a.75.75 0 0 1 1.06 0" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M3 4a2 2 0 0 1 2-2h8.59a2 2 0 0 1 1.41.59l2.41 2.41A2 2 0 0 1 18 6.41V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm3 0v4h8V4zm8 12v-4H6v4z" />
    </svg>
  );
}

function toNumericOrNull(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export function UsoSueloFormShell({
  mode,
  landUseId,
  usesLandUseFormula = false,
  initialData,
}: UsoSueloFormShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const [name, setName] = useState(initialData.name);
  const [initials, setInitials] = useState(initialData.initials);
  const [order, setOrder] = useState(initialData.order);
  const [weight, setWeight] = useState(initialData.weight);
  const [percentage, setPercentage] = useState(initialData.percentage);
  const [charges, setCharges] = useState<ChargeCellInput[]>(initialData.charges);

  const title = mode === "create" ? "Nuevo uso de suelo" : "Editar uso de suelo";
  const subtitle =
    mode === "create"
      ? "Crea un nuevo uso de suelo y define montos por año/grupo con una captura guiada."
      : "Actualiza nombre, metricas y configuracion de montos para este uso de suelo.";

  const chargesByYear = useMemo(() => {
    const bucket = new Map<number, ChargeCellInput[]>();

    for (const charge of charges) {
      const current = bucket.get(charge.year) ?? [];
      current.push(charge);
      bucket.set(charge.year, current);
    }

    return [...bucket.entries()].sort((a, b) => a[0] - b[0]);
  }, [charges]);

  const setChargeAmount = (key: string, amount: string) => {
    setCharges((prev) => prev.map((cell) => (cell.key === key ? { ...cell, amount } : cell)));
  };

  const setChargeMode = (key: string, applicationMode: LandUseApplicationMode) => {
    setCharges((prev) => prev.map((cell) => (cell.key === key ? { ...cell, applicationMode } : cell)));
  };

  const save = () => {
    setMessage("");

    startTransition(async () => {
      const response = await saveLandUseAction({
        id: landUseId,
        name,
        initials,
        order: toNumericOrNull(order),
        weight: toNumericOrNull(weight),
        percentage: toNumericOrNull(percentage),
        charges: charges.map((cell) => ({
          year: cell.year,
          chargeGroupId: cell.chargeGroupId,
          amount: Number(cell.amount) || 0,
          applicationMode: cell.applicationMode,
        })),
      });

      setMessage(response.message);
      if (!response.ok) {
        return;
      }

      router.push("/listado-usos-suelo");
      router.refresh();
    });
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#ebe5d8] px-5 pb-16 pt-8 text-[#1e1712] sm:px-8 lg:px-12">
      {/* VISUAL GUIDE: Fondo atmosférico; puedes cambiar colores y blur para otra narrativa visual. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-9rem] top-[-7rem] h-[21rem] w-[24rem] rounded-full bg-[#8b5238]/18 blur-3xl" />
        <div className="absolute right-[-9rem] top-[8rem] h-[20rem] w-[24rem] rounded-full bg-[#3e6656]/16 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.45),transparent_35%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        {/* VISUAL GUIDE: Header principal (volver + badge + título). Modifica aquí si deseas un look más editorial o más corporativo. */}
        <header className="rounded-[2rem] border border-[#c0a386]/45 bg-[linear-gradient(130deg,rgba(255,249,237,0.95)_0%,rgba(247,236,220,0.92)_58%,rgba(237,223,204,0.9)_100%)] p-6 shadow-[0_20px_45px_rgba(43,28,18,0.13)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/listado-usos-suelo"
              className="inline-flex items-center gap-2 rounded-xl border border-[#c8ae95] bg-white/86 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f4834] transition hover:bg-[#fff4e8]"
            >
              <ArrowLeftIcon />
              Volver a usos de suelo
            </Link>

            <span className="inline-flex rounded-full border border-[#8c5a3e]/35 bg-[#8c5a3e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#7a4b33]">
              Configuracion financiera
            </span>
          </div>

          <h1 className="mt-5 font-[var(--font-landuse-display)] text-4xl leading-none text-[#2d2018] sm:text-5xl">
            {title}
          </h1>

          <p className="mt-3 max-w-4xl font-[var(--font-landuse-body)] text-sm leading-relaxed text-[#5f5044] sm:text-base">
            {subtitle}
          </p>

          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[#7f5f49]">
            {usesLandUseFormula
              ? "Formula global activa: los montos por metraje afectan cargos de areas al guardar."
              : "Formula global inactiva: los montos se aplican directamente por configuracion."}
          </p>
        </header>

        <section className="rounded-3xl border border-[#c5ad95]/50 bg-white/65 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.11)] backdrop-blur-sm sm:p-6">
          {/* VISUAL GUIDE: Inputs de identidad. Bloque seguro para cambiar layout sin tocar comportamiento. */}
          <article className="rounded-2xl border border-[#d2bdab] bg-[#fff9f0] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6348]">Informacion general</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Nombre</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre"
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Iniciales</span>
                <input
                  value={initials}
                  onChange={(event) => setInitials(event.target.value.toUpperCase())}
                  placeholder="Iniciales"
                  maxLength={8}
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm uppercase tracking-[0.06em] text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Orden</span>
                <input
                  value={order}
                  onChange={(event) => setOrder(event.target.value)}
                  type="number"
                  placeholder="Orden"
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Ponderador</span>
                <input
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  type="number"
                  step="0.0001"
                  placeholder="Ponderador"
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">% presupuesto</span>
                <input
                  value={percentage}
                  onChange={(event) => setPercentage(event.target.value)}
                  type="number"
                  step="0.0001"
                  placeholder="Porcentaje"
                  className="w-full rounded-xl border border-[#d9c2ad] bg-white px-3 py-2.5 text-sm text-[#2c1f17] outline-none transition focus:border-[#9a6949] focus:ring-2 focus:ring-[#9a6949]/15"
                />
              </label>
            </div>
          </article>

          {/* VISUAL GUIDE: Matriz de montos por año/grupo. Puedes migrar de cards a tabla sin cambiar la lógica de estado. */}
          <article className="mt-5 rounded-2xl border border-[#d2bdab] bg-[#fff9f0] p-5">
            <div className="flex items-center justify-between gap-3 border-b border-[#d8c4b0] pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6348]">Matriz de cuotas</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#83604c]">
                Pago unico o por metraje por cada grupo y año
              </p>
            </div>

            <div className="mt-4 space-y-5">
              {chargesByYear.map(([year, cells]) => (
                <section key={year} className="rounded-xl border border-[#d9c3af] bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b5e46]">Año {year}</p>

                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {cells.map((cell) => (
                      <article key={cell.key} className="rounded-lg border border-[#d8c6b2] bg-[#fffbf5] p-3">
                        <p className="text-xs font-semibold text-[#5f4739]">{cell.chargeGroupName}</p>

                        <input
                          value={cell.amount}
                          onChange={(event) => setChargeAmount(cell.key, event.target.value)}
                          type="number"
                          step="0.01"
                          className="mt-2 w-full rounded-lg border border-[#d9c2ad] bg-white px-3 py-2 text-sm text-[#2f2017] outline-none transition focus:border-[#986645] focus:ring-2 focus:ring-[#986645]/15"
                          placeholder="Monto"
                        />

                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <label className="inline-flex items-center gap-2 rounded-md border border-[#d7c3ad] bg-white px-2 py-1.5 text-[#654c3e]">
                            <input
                              type="radio"
                              name={`mode-${cell.key}`}
                              checked={cell.applicationMode === "ONE_TIME"}
                              onChange={() => setChargeMode(cell.key, "ONE_TIME")}
                            />
                            Pago unico
                          </label>

                          <label className="inline-flex items-center gap-2 rounded-md border border-[#d7c3ad] bg-white px-2 py-1.5 text-[#654c3e]">
                            <input
                              type="radio"
                              name={`mode-${cell.key}`}
                              checked={cell.applicationMode === "PER_METER"}
                              onChange={() => setChargeMode(cell.key, "PER_METER")}
                            />
                            Por metraje
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#d8c4b0] pt-5">
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2f4c73] bg-[linear-gradient(155deg,#3e638f_0%,#2f4c73_100%)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#eff6ff] shadow-[0_12px_22px_rgba(46,71,106,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SaveIcon />
              {isPending ? "Guardando..." : "Guardar informacion"}
            </button>

            <Link
              href="/listado-usos-suelo"
              className="inline-flex rounded-xl border border-[#c8ae95] bg-white/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#694938] transition hover:bg-[#fff4e8]"
            >
              Cancelar
            </Link>

            {message ? (
              <p
                className={`text-xs font-semibold uppercase tracking-[0.1em] ${
                  message.toLowerCase().includes("correctamente") ? "text-[#2f6a40]" : "text-[#9c3d2b]"
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
