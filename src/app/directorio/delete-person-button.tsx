"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Trash2, 
  X, 
  AlertTriangle, 
  Building2, 
  Store, 
  Users, 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";
import { 
  getPersonRelationsForDeletionAction, 
  deleteDirectoryPersonAction, 
  type PersonRelationsSummary 
} from "./actions";
import { Button } from "@/components/ui/button";

interface DeletePersonButtonProps {
  personId: string;
  personName: string;
  isNested?: boolean;
}

export function DeletePersonButton({
  personId,
  personName,
  isNested = false,
}: DeletePersonButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [relationsData, setRelationsData] = useState<PersonRelationsSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
    setErrorMessage(null);
    setIsLoadingRelations(true);

    getPersonRelationsForDeletionAction(personId)
      .then((data) => {
        setRelationsData(data);
      })
      .catch((err) => {
        console.error("Error loading person relations", err);
        setErrorMessage("No se pudieron cargar las relaciones de la persona.");
      })
      .finally(() => {
        setIsLoadingRelations(false);
      });
  };

  const handleCloseModal = () => {
    if (isDeleting) return;
    setIsOpen(false);
    setRelationsData(null);
    setErrorMessage(null);
  };

  const handleConfirmDelete = () => {
    setErrorMessage(null);
    startDeleteTransition(async () => {
      try {
        const result = await deleteDirectoryPersonAction(personId);
        if (result.ok) {
          setIsOpen(false);
          router.refresh();
        } else {
          setErrorMessage(result.message);
        }
      } catch (err: any) {
        console.error("Error deleting person", err);
        setErrorMessage(err?.message || "Ocurrió un error al eliminar a la persona.");
      }
    });
  };

  const hasRelations = relationsData?.hasRelations ?? false;
  const person = relationsData?.person;
  const displayName = person?.fullName || personName;

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={
          isNested
            ? "inline-flex items-center justify-center h-7 w-7 rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow shrink-0"
            : "inline-flex items-center justify-center h-8 w-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow shrink-0"
        }
        title={`Eliminar a ${displayName} del directorio`}
      >
        <Trash2 className={isNested ? "h-3 w-3" : "h-3.5 w-3.5"} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-md transition-opacity"
            onClick={handleCloseModal}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-[1.6rem] border border-[#c8b59d] bg-[#faf6f0] shadow-[0_24px_50px_rgba(30,18,8,0.30)] animate-in zoom-in-95 duration-200 my-auto">
            {/* Close button */}
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleCloseModal}
              className="absolute right-4 top-4 z-10 rounded-full border border-[#ddd0be] bg-white/80 p-1.5 text-[#5a4838] hover:bg-[#e8ddd0] transition-colors disabled:opacity-30"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-[#ddd0be] flex items-start gap-3 bg-white/40">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  hasRelations
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-rose-100 text-rose-800 border border-rose-200"
                }`}
              >
                {hasRelations ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 pr-6">
                <h2 className="text-lg font-bold tracking-tight text-[#3a2a18]">
                  {hasRelations
                    ? "Eliminar persona y desvincular relaciones"
                    : "Eliminar persona del Directorio"}
                </h2>
                <p className="text-xs text-[#6b5847] mt-0.5">
                  Confirmación de baja de registro en el condominio
                </p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-[#3a2a18] text-xs">
              {isLoadingRelations ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-ink-soft">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  <p className="text-xs font-semibold tracking-wide">
                    Consultando relaciones y registros de la persona...
                  </p>
                </div>
              ) : (
                <>
                  {/* Identificación de la persona */}
                  <div className="rounded-xl border border-[#ddd0be] bg-white p-3.5 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">
                        Persona seleccionada
                      </span>
                      {person?.hasCredentials && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <KeyRound className="h-2.5 w-2.5" /> Cuenta con acceso
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-ink">{displayName}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#6b5847]">
                      {person?.email && <span>📧 {person.email}</span>}
                      {person?.phone && <span>📞 {person.phone}</span>}
                      {person?.rfc && <span>RFC: {person.rfc}</span>}
                    </div>
                  </div>

                  {/* Mensaje de error si ocurrió alguno */}
                  {errorMessage && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 text-xs font-medium flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {hasRelations ? (
                    /* CASO: TIENE RELACIONES (CONFIRMACIÓN AMPLIADA) */
                    <div className="space-y-3.5">
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-900 text-xs leading-relaxed space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                          Esta persona cuenta con relaciones activas en el condominio
                        </p>
                        <p className="text-[11px] text-amber-800/90">
                          Al continuar, la persona será eliminada del Directorio y sus
                          asignaciones quedarán <strong>sin asignar</strong>. Las áreas
                          privativas, comercios y toda la información contable y documental se
                          conservarán íntegramente.
                        </p>
                      </div>

                      {/* Desglose de relaciones */}
                      <div className="space-y-2">
                        {/* 1. Áreas privativas */}
                        {relationsData?.relations.privateAreas &&
                          relationsData.relations.privateAreas.length > 0 && (
                            <div className="rounded-xl border border-[#ddd0be] bg-white p-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a2a18]">
                                <Building2 className="h-3.5 w-3.5 text-brand" />
                                <span>
                                  Áreas privativas asignadas (
                                  {relationsData.relations.privateAreas.length})
                                </span>
                              </div>
                              <ul className="space-y-1.5 text-[11px]">
                                {relationsData.relations.privateAreas.map((area) => (
                                  <li
                                    key={area.id}
                                    className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#faf6f0] border border-[#e8dfd3]"
                                  >
                                    <span className="font-bold text-ink">{area.name}</span>
                                    <span className="text-[10px] text-[#6b5847] font-medium">
                                      Rol: {area.role} ·{" "}
                                      <span className="text-amber-700 font-bold">
                                        Quedará sin asignar
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* 2. Comercios */}
                        {relationsData?.relations.commerces &&
                          relationsData.relations.commerces.length > 0 && (
                            <div className="rounded-xl border border-[#ddd0be] bg-white p-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a2a18]">
                                <Store className="h-3.5 w-3.5 text-brand" />
                                <span>
                                  Comercios vinculados (
                                  {relationsData.relations.commerces.length})
                                </span>
                              </div>
                              <ul className="space-y-1.5 text-[11px]">
                                {relationsData.relations.commerces.map((comm) => (
                                  <li
                                    key={comm.id}
                                    className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#faf6f0] border border-[#e8dfd3]"
                                  >
                                    <span className="font-bold text-ink">{comm.name}</span>
                                    <span className="text-[10px] text-[#6b5847] font-medium">
                                      {comm.relationType} ·{" "}
                                      <span className="text-amber-700 font-bold">
                                        Se desvincula contacto
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* 3. Arrendamientos */}
                        {relationsData?.relations.rentals &&
                          relationsData.relations.rentals.length > 0 && (
                            <div className="rounded-xl border border-[#ddd0be] bg-white p-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a2a18]">
                                <Building2 className="h-3.5 w-3.5 text-brand" />
                                <span>
                                  Arrendamientos vinculados (
                                  {relationsData.relations.rentals.length})
                                </span>
                              </div>
                              <ul className="space-y-1.5 text-[11px]">
                                {relationsData.relations.rentals.map((r) => (
                                  <li
                                    key={r.id}
                                    className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#faf6f0] border border-[#e8dfd3]"
                                  >
                                    <span className="font-bold text-ink">{r.areaName}</span>
                                    <span className="text-[10px] text-[#6b5847] font-medium">
                                      {r.relationType} ·{" "}
                                      <span className="text-amber-700 font-bold">
                                        Quedará sin asignar
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* 4. Usuarios anidados */}
                        {relationsData?.relations.nestedUsers &&
                          relationsData.relations.nestedUsers.length > 0 && (
                            <div className="rounded-xl border border-[#ddd0be] bg-white p-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a2a18]">
                                <Users className="h-3.5 w-3.5 text-brand" />
                                <span>
                                  Usuarios anidados dependientes (
                                  {relationsData.relations.nestedUsers.length})
                                </span>
                              </div>
                              <ul className="space-y-1.5 text-[11px]">
                                {relationsData.relations.nestedUsers.map((child) => (
                                  <li
                                    key={child.id}
                                    className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#faf6f0] border border-[#e8dfd3]"
                                  >
                                    <span className="font-bold text-ink">{child.fullName}</span>
                                    <span className="text-[10px] text-rose-700 font-medium">
                                      {child.roleDesc} · Se da de baja
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>

                      {/* Garantías de integridad */}
                      <div className="rounded-xl border border-[#ddd0be] bg-[#faf6f0] p-3 text-[11px] text-[#5a4838] space-y-1">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-[#3a2a18]">
                          Garantías de integridad:
                        </p>
                        <div className="flex items-center gap-1.5 text-[#3a2a18]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          <span>Las áreas privativas y los comercios se conservan íntegramente.</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#3a2a18]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          <span>
                            El historial de pagos, cargos, cuotas, gastos y documentos no se alteran.
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#3a2a18]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          <span>
                            Se revoca el acceso y credenciales para evitar accesos indebidos.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CASO: SIN RELACIONES (CONFIRMACIÓN SENCILLA) */
                    <div className="space-y-3">
                      <p className="text-xs text-[#3a2a18] leading-relaxed">
                        ¿Estás seguro de que deseas eliminar permanentemente a{" "}
                        <strong className="text-ink">{displayName}</strong> del Directorio?
                      </p>
                      <div className="rounded-xl border border-[#ddd0be] bg-white p-3 text-[11px] text-[#6b5847] space-y-1">
                        <p className="flex items-center gap-1.5 text-[#3a2a18]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          <span>
                            Esta persona no cuenta con áreas privativas ni comercios asignados.
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5 text-[#3a2a18]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          <span>
                            La eliminación no afectará otros registros del condominio.
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-[#ddd0be] flex items-center justify-end gap-2 bg-white/60">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={handleCloseModal}
                className="h-9 px-4 text-[10px] font-bold uppercase rounded-full border-[#ddd0be] bg-white text-[#5a4838] hover:bg-[#e8ddd0]"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting || isLoadingRelations}
                onClick={handleConfirmDelete}
                className="h-9 px-5 text-[10px] font-bold uppercase rounded-full gap-1.5 shadow-md shadow-rose-950/15 bg-rose-700 hover:bg-rose-800 text-white border-0 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>
                      {hasRelations ? "Confirmar y eliminar" : "Eliminar persona"}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
