"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Briefcase,
  IdCard,
  Eye,
  Receipt,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  updateRequiresInvoiceAction,
  uploadConstanciaFiscalAction,
} from "@/app/(minisitio)/minisitio/_actions/account";
import type { Profile } from "@/modules/minisitio/infrastructure/queries/profile.queries";
import { isUsableFileUrl } from "@/shared/infrastructure/storage/storage-paths";
import { SidePanel } from "./side-panel";
import { AsignacionesList, type Asignacion } from "./asignaciones-list";

interface ContactoComercio {
  nombre?: string | null;
  email?: string | null;
}

interface Comercio {
  nombre: string;
  razonSocial?: string | null;
  rfc?: string | null;
  email?: string | null;
  telefono?: string | null;
  directorioAdministrativo?: ContactoComercio | null;
  directorioContable?: ContactoComercio | null;
}

interface PerfilData {
  datosGenerales: Profile["datosGenerales"] | null;
  comercios: Comercio[];
  asignaciones: Asignacion[];
  tipoDirectorio: Profile["tipoDirectorio"] | null;
}

const EMPTY_PERFIL: PerfilData = {
  datosGenerales: null,
  comercios: [],
  asignaciones: [],
  tipoDirectorio: null,
};

const CONSTANCIA_LEGACY_BASE = "https://sistemasabanza.com/insulae/imagenes/constanciaFiscal/";

/** insulae2.0 guarda la URL del archivo (`/api/archivos/...`); se conserva la ruta legacy si llega solo el nombre. */
function constanciaFiscalUrl(archivo: string) {
  return isUsableFileUrl(archivo) ? archivo : `${CONSTANCIA_LEGACY_BASE}${archivo}`;
}

const formatTelefono = (telefono: string | null | undefined) => {
  if (!telefono) return "No registrado";
  // Formatear teléfono mexicano (10 dígitos)
  const cleaned = telefono.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return telefono;
};

const getTipoPersona = (idTipo: number | null | undefined) => {
  switch (idTipo) {
    case 1: return { tipo: "Persona Física", icon: User };
    case 2: return { tipo: "Persona Moral", icon: Building };
    case 3: return { tipo: "Persona Física con Actividad Empresarial", icon: Briefcase };
    default: return { tipo: "No especificado", icon: User };
  }
};

export function MiPerfilView({ initialPerfil }: { initialPerfil: Profile | null }) {
  const [showAsignacionesPanel, setShowAsignacionesPanel] = useState(false);
  const [showComerciosPanel, setShowComerciosPanel] = useState(false);
  const [requiereFactura, setRequiereFactura] = useState(Boolean(initialPerfil?.datosGenerales?.requiereFactura));
  const [actualizandoFactura, setActualizandoFactura] = useState(false);
  const [subiendoConstancia, setSubiendoConstancia] = useState(false);
  const [mensajeConstancia, setMensajeConstancia] = useState("");
  const [tipoMensajeConstancia, setTipoMensajeConstancia] = useState<"" | "success" | "error">(""); // 'success' o 'error'
  const [perfilData, setPerfilData] = useState<PerfilData>(initialPerfil ?? EMPTY_PERFIL);

  const handleToggleRequiereFactura = async (nuevoValor: boolean) => {
    setActualizandoFactura(true);

    try {
      const data = await updateRequiresInvoiceAction(nuevoValor);

      if (data.success) {
        setRequiereFactura(nuevoValor);
      } else {
        console.error("Error actualizando campo:", data.message);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
    } finally {
      setActualizandoFactura(false);
    }
  };

  const handleSubirConstanciaFiscal = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validar que sea un PDF
    if (file.type !== "application/pdf") {
      setMensajeConstancia("Por favor selecciona un archivo PDF");
      setTipoMensajeConstancia("error");
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMensajeConstancia("El archivo no puede superar los 10MB");
      setTipoMensajeConstancia("error");
      return;
    }

    setSubiendoConstancia(true);
    setMensajeConstancia("");

    try {
      const formData = new FormData();
      formData.append("constanciaFiscal", file);

      const data = await uploadConstanciaFiscalAction(formData);

      if (data.success) {
        setMensajeConstancia("Constancia fiscal subida exitosamente");
        setTipoMensajeConstancia("success");

        // Actualizar los datos del perfil para reflejar la nueva constancia
        const fileName = (data as { fileName?: string | null }).fileName ?? null;
        setPerfilData((prev) => ({
          ...prev,
          datosGenerales: prev.datosGenerales
            ? { ...prev.datosGenerales, constanciaFiscal: fileName }
            : prev.datosGenerales,
        }));
      } else {
        setMensajeConstancia(data.message || "Error al subir la constancia fiscal");
        setTipoMensajeConstancia("error");
      }
    } catch (error) {
      console.error("Error subiendo constancia:", error);
      setMensajeConstancia("Error de conexión. Intenta nuevamente.");
      setTipoMensajeConstancia("error");
    } finally {
      setSubiendoConstancia(false);
      // Limpiar el input
      input.value = "";
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setMensajeConstancia(""), 5000);
    }
  };

  const renderComercio = (comercio: Comercio, index: number) => (
    <div key={index} className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-2">{comercio.nombre}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Razón Social</p>
          <p className="font-medium">{comercio.razonSocial || "No registrado"}</p>
        </div>
        <div>
          <p className="text-gray-500">RFC</p>
          <p className="font-medium">{comercio.rfc || "No registrado"}</p>
        </div>
        <div>
          <p className="text-gray-500">Email</p>
          <p className="font-medium">{comercio.email || "No registrado"}</p>
        </div>
        <div>
          <p className="text-gray-500">Teléfono</p>
          <p className="font-medium">{formatTelefono(comercio.telefono)}</p>
        </div>
      </div>

      {(comercio.directorioAdministrativo || comercio.directorioContable) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Contactos:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {comercio.directorioAdministrativo && (
              <div>
                <p className="text-gray-500">Administrativo</p>
                <p className="font-medium">{comercio.directorioAdministrativo.nombre}</p>
                <p className="text-gray-400">{comercio.directorioAdministrativo.email}</p>
              </div>
            )}
            {comercio.directorioContable && (
              <div>
                <p className="text-gray-500">Contable</p>
                <p className="font-medium">{comercio.directorioContable.nombre}</p>
                <p className="text-gray-400">{comercio.directorioContable.email}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const { datosGenerales, comercios, asignaciones, tipoDirectorio } = perfilData;
  const tipoInfo = getTipoPersona(datosGenerales?.id_cat_tipos_directorio);
  const TipoIcon = tipoInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header Completo con Toda la Información Personal */}
      <div className="bg-primary-dark rounded-xl p-6 text-white">
        <div className="space-y-4">
          {/* Fila 1: Información principal */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary-light rounded-xl flex items-center justify-center">
                <TipoIcon className="w-8 h-8 text-primary-dark" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {datosGenerales?.id_cat_tipos_directorio === 2
                    ? datosGenerales?.razon_social
                    : `${datosGenerales?.nombre || ""} ${datosGenerales?.apaterno || ""} ${datosGenerales?.amaterno || ""}`.trim()
                  }
                </h1>
                <p className="text-gray-100">{tipoInfo.tipo}</p>
              </div>
            </div>

            {/* Toggle de Factura */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-gray-300" />
                <span className="text-sm text-gray-100">Factura</span>
              </div>
              <button
                onClick={() => handleToggleRequiereFactura(!requiereFactura)}
                disabled={actualizandoFactura}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-dark ${
                  requiereFactura ? "bg-green-500" : "bg-gray-400"
                } ${actualizandoFactura ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    requiereFactura ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              {actualizandoFactura && (
                <div className="ml-2">
                  <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                </div>
              )}
            </div>

            {/* Subida de Constancia Fiscal */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {/* Botón de ver - ANTES del ícono */}
                {datosGenerales?.constanciaFiscal && (
                  <a
                    href={constanciaFiscalUrl(datosGenerales.constanciaFiscal)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2 py-1 text-xs text-green-300 hover:text-green-100 transition-colors rounded-md hover:bg-green-800/20"
                    title="Ver constancia fiscal actual"
                  >
                    <Eye className="w-3 h-3" />
                  </a>
                )}

                <FileText className="w-4 h-4 text-gray-300" />
                <span className="text-sm text-gray-100">Constancia Fiscal</span>
              </div>

              <div className="flex items-center space-x-2">
                <label className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleSubirConstanciaFiscal}
                    disabled={subiendoConstancia}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      subiendoConstancia
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : datosGenerales?.constanciaFiscal
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                    disabled={subiendoConstancia}
                  >
                    {subiendoConstancia ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-2"></div>
                        Subiendo...
                      </>
                    ) : datosGenerales?.constanciaFiscal ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Actualizar
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-1" />
                        Subir PDF
                      </>
                    )}
                  </button>
                </label>
              </div>
            </div>
          </div>

          {/* Mensaje de estado para constancia fiscal */}
          {mensajeConstancia && (
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
              tipoMensajeConstancia === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}>
              {tipoMensajeConstancia === "success" ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{mensajeConstancia}</span>
            </div>
          )}

          {/* Fila 2: Información de contacto y detalles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-primary-light border-opacity-20">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-300" />
              <div>
                <p className="text-xs text-gray-300">Email</p>
                <p className="text-sm text-white truncate">
                  {datosGenerales?.email || "No registrado"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-300" />
              <div>
                <p className="text-xs text-gray-300">Teléfono</p>
                <p className="text-sm text-white">
                  {formatTelefono(datosGenerales?.telefono)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-300" />
              <div>
                <p className="text-xs text-gray-300">Dirección</p>
                <p className="text-sm text-white truncate">
                  {datosGenerales?.direccion || "No registrado"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <IdCard className="w-4 h-4 text-gray-300" />
              <div>
                <p className="text-xs text-gray-300">Tipo</p>
                <p className="text-sm text-white">
                  {tipoDirectorio?.nombre || "No especificado"}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Side Panel para todas las asignaciones */}
      <SidePanel
        isOpen={showAsignacionesPanel}
        onClose={() => setShowAsignacionesPanel(false)}
        title="Todas las Asignaciones"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">
              Total de asignaciones: {asignaciones?.length || 0}
            </h3>
            <p className="text-sm text-blue-700">
              Estas son todas las asignaciones activas e inactivas en el condominio para tu cuenta.
            </p>
          </div>

          <AsignacionesList
            asignaciones={asignaciones}
            showAll={true}
            showDetails={true}
          />
        </div>
      </SidePanel>

      {/* Side Panel para todos los comercios */}
      <SidePanel
        isOpen={showComerciosPanel}
        onClose={() => setShowComerciosPanel(false)}
        title="Todos los Comercios Asociados"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">
              Total de comercios: {comercios?.length || 0}
            </h3>
            <p className="text-sm text-green-700">
              Estos son todos los comercios asociados a tu cuenta en el directorio.
            </p>
          </div>

          <div className="space-y-4">
            {comercios?.map((comercio, index) => renderComercio(comercio, index))}
          </div>
        </div>
      </SidePanel>
    </div>
  );
}
