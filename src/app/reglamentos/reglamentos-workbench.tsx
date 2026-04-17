"use client";

import { useMemo, useState, useTransition } from "react";

import { uploadCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import type { RegulationDirectoryVM, RegulationDocumentVM } from "@/modules/regulations/presentation/regulation-directory.vm";
import type { RegulationDocumentType } from "@/modules/regulations/domain/regulation-directory";

import {
  archiveRegulationDocumentAction,
  createRegulationDocumentAction,
  updateRegulationDocumentAction,
} from "./actions";

interface ReglamentosWorkbenchProps {
  directory: RegulationDirectoryVM;
}

interface DocumentFormState {
  name: string;
  documentType: RegulationDocumentType;
}

const ACCEPTED_FILE_TYPES = ["application/pdf"];

function isPdfFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_FILE_TYPES.includes(file.type) || extension === "pdf";
}

function createEmptyForm(): DocumentFormState {
  return {
    name: "",
    documentType: "REGULATION",
  };
}

function toDraft(document: RegulationDocumentVM): DocumentFormState {
  return {
    name: document.name,
    documentType: document.documentType,
  };
}

export function ReglamentosWorkbench({ directory }: ReglamentosWorkbenchProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [newDocument, setNewDocument] = useState<DocumentFormState>(createEmptyForm());
  const [newFile, setNewFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DocumentFormState>(createEmptyForm());
  const [editFile, setEditFile] = useState<File | null>(null);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return directory.documents;
    }

    return directory.documents.filter((document) => {
      const haystack = `${document.name} ${document.documentTypeLabel}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [directory.documents, search]);

  const beginEdit = (document: RegulationDocumentVM) => {
    setEditingId(document.id);
    setEditForm(toDraft(document));
    setEditFile(null);
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(createEmptyForm());
    setEditFile(null);
    setMessage("");
  };

  const saveNewDocument = () => {
    if (!newDocument.name.trim()) {
      setMessage("El nombre es obligatorio.");
      return;
    }

    if (!newFile) {
      setMessage("Selecciona un archivo PDF.");
      return;
    }

    if (!isPdfFile(newFile)) {
      setMessage("Solo se permiten archivos PDF.");
      return;
    }

    setMessage("");

    startTransition(async () => {
      try {
        const uploaded = await uploadCondominiumAsset({
          file: newFile,
          condominiumSlug: directory.condominiumSlug,
          projectId: directory.projectId,
          kind: "project-document",
        });

        const response = await createRegulationDocumentAction({
          name: newDocument.name,
          documentType: newDocument.documentType,
          fileUrl: uploaded.url,
          mimeType: newFile.type || "application/pdf",
          sizeBytes: newFile.size,
          storageBucket: "firebase",
          storageObjectPath: uploaded.fullPath,
        });

        setMessage(response.message);
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error("[Reglamentos] saveNewDocument failed", error);
        setMessage("No se pudo subir/guardar el documento.");
      }
    });
  };

  const saveEdit = (id: string) => {
    if (!editForm.name.trim()) {
      setMessage("El nombre es obligatorio.");
      return;
    }

    if (editFile && !isPdfFile(editFile)) {
      setMessage("Solo se permiten archivos PDF.");
      return;
    }

    setMessage("");

    startTransition(async () => {
      try {
        let uploadedUrl: string | undefined;
        let uploadedPath: string | null | undefined;
        let mimeType: string | null | undefined;
        let sizeBytes: number | null | undefined;

        if (editFile) {
          const uploaded = await uploadCondominiumAsset({
            file: editFile,
            condominiumSlug: directory.condominiumSlug,
            projectId: directory.projectId,
            kind: "project-document",
          });

          uploadedUrl = uploaded.url;
          uploadedPath = uploaded.fullPath;
          mimeType = editFile.type || "application/pdf";
          sizeBytes = editFile.size;
        }

        const response = await updateRegulationDocumentAction({
          id,
          name: editForm.name,
          documentType: editForm.documentType,
          fileUrl: uploadedUrl,
          mimeType,
          sizeBytes,
          storageBucket: uploadedUrl ? "firebase" : undefined,
          storageObjectPath: uploadedPath,
        });

        setMessage(response.message);
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error("[Reglamentos] saveEdit failed", error);
        setMessage("No se pudo actualizar el documento.");
      }
    });
  };

  const removeDocument = (id: string) => {
    const accepted = window.confirm("Se eliminara este documento. ¿Quieres continuar?");
    if (!accepted) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      const response = await archiveRegulationDocumentAction(id);
      setMessage(response.message);
      if (response.ok) {
        window.location.reload();
      }
    });
  };

  return (
    <section className="rounded-[2rem] border border-[#bc9a80]/45 bg-[linear-gradient(155deg,#fffdf8_0%,#f8eee1_58%,#fff8ef_100%)] p-5 shadow-[0_20px_44px_rgba(61,36,19,0.11)] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
        <article className="rounded-3xl border border-[#d5bba6] bg-[#fffdf8]/90 p-5 shadow-[0_10px_24px_rgba(45,27,14,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#885638]">Alta de documento</p>
          <h2 className="mt-2 font-[var(--font-reglamentos-display)] text-3xl text-[#2f221a]">Nuevo reglamento</h2>

          <div className="mt-4 grid gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Nombre</span>
              <input
                value={newDocument.name}
                onChange={(event) =>
                  setNewDocument((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Ej. Reglamento general 2026"
                className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
              />
            </label>

            <fieldset className="space-y-2 rounded-xl border border-[#d8c2ad] bg-white px-3 py-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Tipo</legend>
              <label className="flex items-center gap-2 text-sm text-[#2f2017]">
                <input
                  type="radio"
                  name="new-document-type"
                  checked={newDocument.documentType === "REGULATION"}
                  onChange={() =>
                    setNewDocument((prev) => ({
                      ...prev,
                      documentType: "REGULATION",
                    }))
                  }
                />
                Reglamento
              </label>
              <label className="flex items-center gap-2 text-sm text-[#2f2017]">
                <input
                  type="radio"
                  name="new-document-type"
                  checked={newDocument.documentType === "INTERNAL_DOCUMENT"}
                  onChange={() =>
                    setNewDocument((prev) => ({
                      ...prev,
                      documentType: "INTERNAL_DOCUMENT",
                    }))
                  }
                />
                Documento interno
              </label>
            </fieldset>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setNewFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={saveNewDocument}
            className="mt-5 w-full rounded-full bg-[#2f2017] px-5 py-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#fff2e2] transition hover:-translate-y-0.5 hover:bg-[#20150f] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? "Guardando..." : "Guardar documento"}
          </button>
        </article>

        <article className="rounded-3xl border border-[#d5bba6] bg-[#fffdf8]/90 p-5 shadow-[0_10px_24px_rgba(45,27,14,0.08)]">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[12rem] flex-1 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#936347]">Buscar</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o tipo"
                className="w-full rounded-xl border border-[#d8c2ad] bg-white px-3 py-2 text-sm text-[#2c1f17] outline-none focus:border-[#9a6949]"
              />
            </label>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[#d8c2ad] bg-white">
            <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.8fr] gap-3 border-b border-[#e9d8c8] bg-[#f8efe5] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8a5a3c]">
              <span>Nombre</span>
              <span>Tipo</span>
              <span>Archivo</span>
              <span>Acciones</span>
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {filteredDocuments.length === 0 ? (
                <p className="px-3 py-5 text-sm text-[#6d5d52]">No hay documentos para mostrar.</p>
              ) : (
                filteredDocuments.map((document) => {
                  const isEditing = editingId === document.id;

                  return (
                    <div
                      key={document.id}
                      className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.8fr] gap-3 border-b border-[#f0e4d7] px-3 py-3 text-sm text-[#2c1f17]"
                    >
                      <div>
                        {isEditing ? (
                          <input
                            value={editForm.name}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-[#d8c2ad] bg-white px-2 py-1 text-sm outline-none focus:border-[#9a6949]"
                          />
                        ) : (
                          <>
                            <p className="font-medium">{document.name}</p>
                            <p className="text-xs text-[#7b6a5f]">Subido: {document.uploadedAtLabel}</p>
                          </>
                        )}
                      </div>

                      <div>
                        {isEditing ? (
                          <select
                            value={editForm.documentType}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                documentType: event.target.value as RegulationDocumentType,
                              }))
                            }
                            className="w-full rounded-lg border border-[#d8c2ad] bg-white px-2 py-1 text-sm outline-none focus:border-[#9a6949]"
                          >
                            <option value="REGULATION">Reglamento</option>
                            <option value="INTERNAL_DOCUMENT">Documento interno</option>
                          </select>
                        ) : (
                          <span className="inline-flex rounded-full border border-[#9f6d50]/30 bg-[#fff4e6] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#885638]">
                            {document.documentTypeLabel}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center">
                        {isEditing ? (
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(event) => setEditFile(event.target.files?.[0] ?? null)}
                            className="w-full rounded-lg border border-[#d8c2ad] bg-white px-2 py-1 text-xs outline-none focus:border-[#9a6949]"
                          />
                        ) : document.publicUrl ? (
                          <a
                            href={document.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6f3f25] hover:underline"
                          >
                            PDF
                          </a>
                        ) : (
                          <span className="text-xs text-[#7f7066]">Sin link</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => saveEdit(document.id)}
                              className="rounded-full border border-[#2f2017] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2f2017] hover:bg-[#2f2017] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={cancelEdit}
                              className="rounded-full border border-[#7f6f64] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7f6f64] hover:bg-[#7f6f64] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => beginEdit(document)}
                              className="rounded-full border border-[#2f2017] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2f2017] hover:bg-[#2f2017] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => removeDocument(document.id)}
                              className="rounded-full border border-[#9d2f24] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9d2f24] hover:bg-[#9d2f24] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </article>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl border border-[#cba98e] bg-[#fff5e8] px-4 py-3 text-sm text-[#5a473b]">
          {message}
        </p>
      ) : null}
    </section>
  );
}
