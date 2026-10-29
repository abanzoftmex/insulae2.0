import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Home,
  Building,
  Clock,
  AlertCircle,
  Info,
  HelpCircle,
} from "lucide-react";
import type { CampoContacto } from "@/modules/minisitio/infrastructure/queries/documents.queries";

// Iconos disponibles con sus nombres
const ICONOS_DISPONIBLES = [
  { nombre: "MapPin", componente: MapPin, label: "Ubicación" },
  { nombre: "Phone", componente: Phone, label: "Teléfono" },
  { nombre: "Mail", componente: Mail, label: "Email" },
  {
    nombre: "MessageCircle",
    componente: MessageCircle,
    label: "WhatsApp/Chat",
  },
  { nombre: "Home", componente: Home, label: "Casa" },
  { nombre: "Building", componente: Building, label: "Edificio" },
  { nombre: "Clock", componente: Clock, label: "Horario" },
  { nombre: "AlertCircle", componente: AlertCircle, label: "Alerta" },
  { nombre: "Info", componente: Info, label: "Información" },
  { nombre: "HelpCircle", componente: HelpCircle, label: "Ayuda" },
];

// Colores disponibles
const COLORES_DISPONIBLES = [
  { nombre: "blue", clase: "bg-blue-100 text-blue-600", label: "Azul" },
  {
    nombre: "orange",
    clase: "bg-orange-100 text-orange-600",
    label: "Naranja",
  },
  {
    nombre: "emerald",
    clase: "bg-emerald-100 text-emerald-600",
    label: "Verde",
  },
  { nombre: "purple", clase: "bg-purple-100 text-purple-600", label: "Morado" },
  { nombre: "red", clase: "bg-red-100 text-red-600", label: "Rojo" },
  {
    nombre: "yellow",
    clase: "bg-yellow-100 text-yellow-600",
    label: "Amarillo",
  },
  { nombre: "pink", clase: "bg-pink-100 text-pink-600", label: "Rosa" },
  { nombre: "indigo", clase: "bg-indigo-100 text-indigo-600", label: "Índigo" },
];

const getIconComponent = (nombreIcono: string) => {
  const icono = ICONOS_DISPONIBLES.find((i) => i.nombre === nombreIcono);
  return icono ? icono.componente : Phone;
};

const getColorClass = (color: string) => {
  const colorObj = COLORES_DISPONIBLES.find((c) => c.nombre === color);
  return colorObj ? colorObj.clase : "bg-blue-100 text-blue-600";
};

/** Vista de "Información de Contacto". Sin estado ni interacción: se pinta en el servidor. */
export function CamposContactoView({ campos }: { campos: CampoContacto[] }) {
  return (
    <div className="px-4">
      {/* Header */}
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Información de Contacto
          </h1>
          <p className="text-gray-600">
            Consulta los diferentes medios de contacto disponibles
          </p>
        </div>
      </div>

      {/* Lista de campos */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Medios de Contacto Disponibles
          </h2>
        </div>

        {campos.length === 0 ? (
          <div className="p-12 text-center">
            <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              No hay información de contacto disponible
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {campos.map((campo) => {
              const IconComponent = getIconComponent(campo.icono);
              const colorClass = getColorClass(campo.color);

              return (
                <div
                  key={campo.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center ${colorClass}`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">
                          {campo.titulo}
                        </h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded whitespace-nowrap">
                          {campo.tipo_contacto}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm max-w-2xl">
                        {campo.contenido}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
