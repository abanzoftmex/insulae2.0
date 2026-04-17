"use client";

import { useMemo, useState, useTransition } from "react";

import {
  createContactAction,
  deleteContactAction,
  updateContactAction,
  type ContactEntryInput,
} from "./actions";
import type {
  ContactDirectoryEntryVM,
  ContactDirectoryTypeVM,
} from "@/modules/contacts/presentation/contact-directory.vm";

interface ContactosWorkbenchProps {
  types: ContactDirectoryTypeVM[];
  entries: ContactDirectoryEntryVM[];
}

type EditableEntry = ContactDirectoryEntryVM & {
  isEditing?: boolean;
};

function createEmptyForm(types: ContactDirectoryTypeVM[]): ContactEntryInput {
  return {
    typeId: types[0]?.id ?? "",
    name: "",
    value: "",
    linkUrl: "",
    target: "SAME_TAB",
    sortOrder: "0",
  };
}

function toDraft(entry: ContactDirectoryEntryVM): ContactEntryInput {
  return {
    id: entry.id,
    typeId: entry.typeId,
    name: entry.name,
    value: entry.value,
    linkUrl: entry.linkUrl,
    target: entry.linkTarget,
    sortOrder: entry.sortOrder,
  };
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function ContactosWorkbench({ types, entries }: ContactosWorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [newContact, setNewContact] = useState<ContactEntryInput>(createEmptyForm(types));
  const [contactCards, setContactCards] = useState<EditableEntry[]>(entries);
  const [draftById, setDraftById] = useState<Record<string, ContactEntryInput>>({});

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return contactCards.filter((entry) => {
      const byType = typeFilter === "all" || entry.typeId === typeFilter;
      if (!byType) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${entry.typeName} ${entry.name} ${entry.value} ${entry.linkUrl}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [contactCards, search, typeFilter]);

  const beginEdit = (entry: EditableEntry) => {
    setContactCards((prev) => prev.map((item) => ({ ...item, isEditing: item.id === entry.id })));
    setDraftById((prev) => ({
      ...prev,
      [entry.id]: toDraft(entry),
    }));
  };

  const cancelEdit = (id: string) => {
    setContactCards((prev) => prev.map((item) => ({ ...item, isEditing: false })));
    setDraftById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateDraft = (id: string, key: keyof ContactEntryInput, value: string) => {
    setDraftById((prev) => {
      const base = prev[id] ?? createEmptyForm(types);
      return {
        ...prev,
        [id]: {
          ...base,
          [key]: value,
        },
      };
    });
  };

  const saveNewContact = () => {
    setMessage("");

    startTransition(async () => {
      const response = await createContactAction({
        ...newContact,
        linkUrl: normalizeUrl(newContact.linkUrl),
      });

      setMessage(response.message);
      if (!response.ok) {
        return;
      }

      window.location.reload();
    });
  };

  const saveEdit = (id: string) => {
    const draft = draftById[id];
    if (!draft) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      const response = await updateContactAction({
        ...draft,
        id,
        linkUrl: normalizeUrl(draft.linkUrl),
      });

      setMessage(response.message);
      if (!response.ok) {
        return;
      }

      window.location.reload();
    });
  };

  const removeContact = (id: string) => {
    const accepted = window.confirm("Se eliminara este contacto. ¿Quieres continuar?");
    if (!accepted) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      const response = await deleteContactAction(id);
      setMessage(response.message);
      if (!response.ok) {
        return;
      }

      window.location.reload();
    });
  };

  return (
    <section className="rounded-[2rem] border border-[#bf9a7a]/40 bg-[linear-gradient(160deg,#fffdf7_0%,#faefe0_62%,#fff7ea_100%)] p-5 shadow-[0_18px_45px_rgba(57,33,17,0.11)] sm:p-7">
      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <article className="rounded-3xl border border-[#d6bba1] bg-[#fffdf9]/90 p-5 shadow-[0_12px_24px_rgba(57,33,17,0.07)]">
          <p className="font-[var(--font-condo-body)] text-xs uppercase tracking-[0.2em] text-[#8b583b]">
            Alta rapida
          </p>
          <h2 className="mt-2 font-[var(--font-condo-display)] text-3xl text-[#2f2118]">Nuevo contacto</h2>

          <div className="mt-4 grid gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Tipo</span>
              <select
                value={newContact.typeId}
                onChange={(event) =>
                  setNewContact((prev) => ({
                    ...prev,
                    typeId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
              >
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Nombre</span>
              <input
                value={newContact.name}
                onChange={(event) =>
                  setNewContact((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Ej. Atencion residentes"
                className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Dato</span>
              <input
                value={newContact.value}
                onChange={(event) =>
                  setNewContact((prev) => ({
                    ...prev,
                    value: event.target.value,
                  }))
                }
                placeholder="Ej. 222-555-8123"
                className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Enlace</span>
              <input
                value={newContact.linkUrl}
                onChange={(event) =>
                  setNewContact((prev) => ({
                    ...prev,
                    linkUrl: event.target.value,
                  }))
                }
                placeholder="https://"
                className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
              />
            </label>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Visualizacion</span>
                <select
                  value={newContact.target}
                  onChange={(event) =>
                    setNewContact((prev) => ({
                      ...prev,
                      target: event.target.value as "SAME_TAB" | "NEW_TAB",
                    }))
                  }
                  className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
                >
                  <option value="SAME_TAB">Misma pestana</option>
                  <option value="NEW_TAB">Nueva pestana</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Orden</span>
                <input
                  type="number"
                  value={newContact.sortOrder}
                  onChange={(event) =>
                    setNewContact((prev) => ({
                      ...prev,
                      sortOrder: event.target.value,
                    }))
                  }
                  className="w-24 rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={saveNewContact}
            className="mt-5 w-full rounded-full bg-[#2f2017] px-5 py-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#fff2e2] transition hover:-translate-y-0.5 hover:bg-[#20150f] hover:shadow-[0_12px_24px_rgba(47,32,23,0.3)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? "Guardando..." : "Agregar contacto"}
          </button>
        </article>

        <article className="rounded-3xl border border-[#d6bba1] bg-[#fffdf9]/90 p-5 shadow-[0_12px_24px_rgba(57,33,17,0.07)]">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[12rem] flex-1 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Buscar</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, dato o enlace"
                className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
              />
            </label>

            <label className="w-[13rem] space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Tipo</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
              >
                <option value="all">Todos</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {filteredEntries.map((entry) => {
              const draft = draftById[entry.id] ?? toDraft(entry);

              return (
                <article
                  key={entry.id}
                  className="group rounded-2xl border border-[#d7bca4] bg-white/95 p-4 shadow-[0_8px_16px_rgba(57,33,17,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_24px_rgba(57,33,17,0.12)]"
                >
                  {!entry.isEditing ? (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cfa989] bg-[#f7ebdc] text-xs font-bold uppercase tracking-[0.08em] text-[#774a30]">
                          {entry.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs uppercase tracking-[0.14em] text-[#9e7155]">{entry.typeName}</p>
                          <h3 className="truncate font-[var(--font-condo-display)] text-2xl text-[#2b1e17]">{entry.name}</h3>
                          <p className="truncate text-sm text-[#5d4a3d]">{entry.value}</p>
                        </div>
                      </div>

                      <a
                        href={entry.linkUrl}
                        target={entry.linkTarget === "NEW_TAB" ? "_blank" : "_self"}
                        rel="noreferrer"
                        className="mt-3 block truncate rounded-xl border border-[#dbc2ac] bg-[#fff9ef] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5037] transition hover:border-[#be9a7a] hover:bg-[#fdf3e4]"
                      >
                        {entry.linkUrl}
                      </a>

                      <div className="mt-3 flex items-center justify-between text-xs text-[#7f624f]">
                        <span>Orden {entry.sortOrder}</span>
                        <span>{entry.linkTargetLabel}</span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(entry)}
                          className="flex-1 rounded-xl border border-[#ccb096] bg-[#fff9f0] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6e422a] transition hover:bg-[#f9ecdc]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removeContact(entry.id)}
                          className="flex-1 rounded-xl border border-[#cb9f8f] bg-[#fff2ee] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#893a28] transition hover:bg-[#fde5de]"
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={draft.typeId}
                        onChange={(event) => updateDraft(entry.id, "typeId", event.target.value)}
                        className="w-full rounded-lg border border-[#d8c2ad] bg-white px-3 py-2 text-xs text-[#2c1f17] outline-none"
                      >
                        {types.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>

                      <input
                        value={draft.name}
                        onChange={(event) => updateDraft(entry.id, "name", event.target.value)}
                        className="w-full rounded-lg border border-[#d8c2ad] bg-white px-3 py-2 text-xs text-[#2c1f17] outline-none"
                      />

                      <input
                        value={draft.value}
                        onChange={(event) => updateDraft(entry.id, "value", event.target.value)}
                        className="w-full rounded-lg border border-[#d8c2ad] bg-white px-3 py-2 text-xs text-[#2c1f17] outline-none"
                      />

                      <input
                        value={draft.linkUrl}
                        onChange={(event) => updateDraft(entry.id, "linkUrl", event.target.value)}
                        className="w-full rounded-lg border border-[#d8c2ad] bg-white px-3 py-2 text-xs text-[#2c1f17] outline-none"
                      />

                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <select
                          value={draft.target}
                          onChange={(event) =>
                            updateDraft(entry.id, "target", event.target.value as "SAME_TAB" | "NEW_TAB")
                          }
                          className="w-full rounded-lg border border-[#d8c2ad] bg-white px-3 py-2 text-xs text-[#2c1f17] outline-none"
                        >
                          <option value="SAME_TAB">Misma pestana</option>
                          <option value="NEW_TAB">Nueva pestana</option>
                        </select>
                        <input
                          type="number"
                          value={draft.sortOrder}
                          onChange={(event) => updateDraft(entry.id, "sortOrder", event.target.value)}
                          className="w-20 rounded-lg border border-[#d8c2ad] bg-white px-3 py-2 text-xs text-[#2c1f17] outline-none"
                        />
                      </div>

                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(entry.id)}
                          className="flex-1 rounded-lg bg-[#2f2017] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#fff2e2]"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(entry.id)}
                          className="flex-1 rounded-lg border border-[#d0b49d] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6e422a]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {filteredEntries.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#cfb49a] bg-[#fff8ef] p-5 text-center">
              <p className="font-[var(--font-condo-display)] text-2xl text-[#3e2a1f]">Sin resultados</p>
              <p className="mt-1 text-sm text-[#6f5849]">Prueba otro filtro o registra un nuevo contacto.</p>
            </div>
          ) : null}
        </article>
      </div>

      <div className="mt-4 rounded-xl border border-[#d2b69d] bg-[#fff8ee] px-4 py-3 text-sm text-[#5f4b3f]">
        {message || "Desde legacy: tipo, nombre, dato, enlace, orden y visualizacion ahora viven en una experiencia de tablero editable."}
      </div>
    </section>
  );
}
