/**
 * Ilustraciones del portal en SVG, con los colores del sello y de las fachadas de Val'Quirico
 * (docs/valquirico-marca-analisis.md §1.3): cantera, teja, ocre y olivo. Son decorativas
 * (aria-hidden) y escalan con su contenedor.
 *
 * - `ValquiricoVista`: el pueblo, con sus torres almenadas, el arco de la entrada, el campanario
 *   y la Malinche detrás. Encabeza el bloque de ayuda de Bienvenida.
 * - `ComunicadoCover`: portada de un comunicado sin imagen. El tono sale del id, así que cada
 *   aviso conserva el suyo entre visitas.
 *
 * La bandera ondea y la campana se mece (clases `vq-flag` y `vq-bell` de minisitio.css); con
 * movimiento reducido se quedan quietas.
 */
import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import { Megaphone } from "lucide-react";

const C = {
  cantera: "#e6d1b4",
  canteraSombra: "#d8bf9c",
  fachada: "#ead3bf",
  fachadaSombra: "#dcbca3",
  ocreFachada: "#e2b893",
  ocreSombra: "#d3a37c",
  teja: "#be4511",
  tejaSombra: "#a13a0e",
  olivo: "#5d5b35",
  olivoProfundo: "#3d3c22",
  olivoClaro: "#757242",
  ocre: "#b58c42",
  crema: "#fdd28d",
  monte: "#ebe7d8",
  suelo: "#d9d4be",
};

/** Almenas: `n` merlones de `w` px con `gap` px entre ellos, a partir de `x`. */
function almenas(x: number, y: number, n: number, w: number, gap: number, h: number, fill: string) {
  return Array.from({ length: n }, (_, i) => <rect key={i} x={x + i * (w + gap)} y={y} width={w} height={h} fill={fill} />);
}

/** Ventana de arco de medio punto con base en `y`. */
function arco(x: number, y: number, w: number, h: number) {
  const r = w / 2;
  return `M${x} ${y} V${y - h + r} A${r} ${r} 0 0 1 ${x + w} ${y - h + r} V${y} Z`;
}

/** Ciprés: una flama alta con base en `y`. */
function cipres(x: number, y: number, h: number, w: number) {
  const r = w / 2;
  return `M${x} ${y} C${x - r} ${y - h * 0.3} ${x - r * 0.8} ${y - h * 0.75} ${x} ${y - h} C${x + r * 0.8} ${y - h * 0.75} ${x + r} ${y - h * 0.3} ${x} ${y} Z`;
}

/** `bandera="hover"`: la bandera ondea solo al pasar el cursor por la escena (en el rail, un
 *  movimiento constante en la orilla de la vista distrae). */
export function ValquiricoVista({ className, bandera = "siempre" }: { className?: string; bandera?: "siempre" | "hover" }) {
  return (
    <svg viewBox="0 0 400 150" className={className} aria-hidden focusable="false" preserveAspectRatio="xMidYMax meet">
      {/* La Malinche y el sol de la tarde */}
      <circle cx="338" cy="40" r="15" fill={C.crema} opacity="0.55" />
      <path
        d="M0 104 C44 100 84 90 116 74 C136 64 150 56 162 56 C174 56 186 63 204 72 C236 88 280 98 330 96 C360 95 384 92 400 90 V150 H0 Z"
        fill={C.monte}
      />

      {/* Cipreses de la izquierda */}
      <path d={cipres(14, 150, 62, 13)} fill={C.olivoClaro} />
      <path d={cipres(28, 150, 50, 11)} fill={C.olivo} />

      {/* Casa de teja */}
      <rect x="36" y="108" width="64" height="42" fill={C.cantera} />
      <rect x="84" y="108" width="16" height="42" fill={C.canteraSombra} />
      <path d="M30 110 L68 90 L106 110 Z" fill={C.teja} />
      <path d="M68 90 L106 110 H68 Z" fill={C.tejaSombra} />
      <path d={arco(48, 132, 9, 13)} fill={C.olivo} />
      <path d={arco(66, 132, 9, 13)} fill={C.olivo} />

      {/* Torre almenada con bandera */}
      <rect x="100" y="60" width="30" height="90" fill={C.fachada} />
      <rect x="118" y="60" width="12" height="90" fill={C.fachadaSombra} />
      {almenas(100, 52, 2, 7, 4.5, 8, C.fachada)}
      <rect x="123" y="52" width="7" height="8" fill={C.fachadaSombra} />
      <path d={arco(112, 92, 6, 12)} fill={C.olivoProfundo} />
      <path d={arco(112, 120, 6, 12)} fill={C.olivoProfundo} />
      <line x1="115" y1="52" x2="115" y2="29" stroke={C.olivoProfundo} strokeWidth="1.5" strokeLinecap="round" />
      <path className={bandera === "hover" ? "vq-flag-hover" : "vq-flag"} d="M115.75 29.5 L132 34.5 L115.75 39.5 Z" fill={C.ocre} />

      {/* Muralla con la puerta de arco */}
      <rect x="130" y="96" width="132" height="54" fill={C.cantera} />
      {almenas(131, 86, 11, 6, 6.5, 7, C.cantera)}
      <rect x="126" y="92" width="140" height="5" rx="1.5" fill={C.canteraSombra} />
      <path d="M173 150 V128 A23 23 0 0 1 219 128 V150 Z" fill={C.canteraSombra} />
      <path d="M178 150 V128 A18 18 0 0 1 214 128 V150 Z" fill={C.olivoProfundo} />
      <path d={arco(142, 150, 20, 18)} fill={C.olivo} />
      <path d={arco(230, 150, 20, 18)} fill={C.olivo} />
      <path d={arco(148, 117, 8, 11)} fill={C.olivo} opacity="0.85" />
      <path d={arco(236, 117, 8, 11)} fill={C.olivo} opacity="0.85" />

      {/* Campanario con reloj */}
      <rect x="262" y="34" width="36" height="116" fill={C.fachada} />
      <rect x="284" y="34" width="14" height="116" fill={C.fachadaSombra} />
      {almenas(262, 26, 2, 7, 7.5, 8, C.fachada)}
      <rect x="291" y="26" width="7" height="8" fill={C.fachadaSombra} />
      <path d="M271 66 V54 A9 9 0 0 1 289 54 V66 Z" fill={C.olivoProfundo} />
      <g className="vq-bell">
        <path d="M276 63 C276 57.5 277.6 55.5 280 55.5 C282.4 55.5 284 57.5 284 63 Z" fill={C.ocre} />
        <circle cx="280" cy="64.3" r="1.3" fill={C.ocre} />
      </g>
      <rect x="266" y="66" width="28" height="3" rx="1" fill={C.fachadaSombra} />
      <circle cx="280" cy="92" r="7.5" fill="#fbf8f0" stroke={C.ocre} strokeWidth="1.5" />
      <path d="M280 92 V87 M280 92 L283.5 93.6" stroke={C.olivoProfundo} strokeWidth="1.25" strokeLinecap="round" fill="none" />
      <path d={arco(277, 128, 6, 12)} fill={C.olivoProfundo} />

      {/* Casa ocre */}
      <rect x="298" y="114" width="64" height="36" fill={C.ocreFachada} />
      <rect x="346" y="114" width="16" height="36" fill={C.ocreSombra} />
      <path d="M292 116 L330 98 L368 116 Z" fill={C.teja} />
      <path d="M330 98 L368 116 H330 Z" fill={C.tejaSombra} />
      <rect x="310" y="124" width="8" height="10" rx="1" fill={C.olivo} />
      <rect x="328" y="124" width="8" height="10" rx="1" fill={C.olivo} />

      {/* Cipreses de la derecha */}
      <path d={cipres(374, 150, 62, 13)} fill={C.olivo} />
      <path d={cipres(388, 150, 46, 10)} fill={C.olivoClaro} />

      <rect x="0" y="147" width="400" height="3" fill={C.suelo} />
    </svg>
  );
}

const COVER_TONOS = [
  { fondo: "#3d3c22", monte: "#47462a", silueta: "#2d2c18", trazo: "#f1eac1" }, // olivo
  { fondo: "#922f12", monte: "#9e3a1b", silueta: "#6e230d", trazo: "#fdd28d" }, // teja
  { fondo: "#8d6928", monte: "#987431", silueta: "#6c501d", trazo: "#fbf8f0" }, // ocre
] as const;

function tonoDe(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_TONOS[h % COVER_TONOS.length];
}

/**
 * Portada de un comunicado sin imagen: arcos en celosía, la silueta del pueblo y el ícono al
 * centro. Llena su contenedor, que debe estar posicionado. `compact` la ajusta para miniaturas.
 */
export function ComunicadoCover({
  seed,
  icon: Icon = Megaphone,
  compact = false,
}: {
  seed: string;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  const t = tonoDe(seed);
  const patternId = useId();
  return (
    <span aria-hidden className="absolute inset-0 block overflow-hidden" style={{ backgroundColor: t.fondo }}>
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" focusable="false">
        <defs>
          <pattern id={patternId} width="16" height="20" patternUnits="userSpaceOnUse">
            <path d="M2 20 V10 A6 6 0 0 1 14 10 V20" fill="none" stroke={t.trazo} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="320" height="200" fill={`url(#${patternId})`} opacity="0.08" />
        <path d="M0 150 C40 146 80 134 112 118 C130 108 144 100 160 100 C176 100 190 108 208 118 C240 134 280 144 320 146 V200 H0 Z" fill={t.monte} />
        <g fill={t.silueta}>
          <path d={cipres(14, 200, 54, 11)} />
          <rect x="24" y="170" width="52" height="30" />
          <path d="M18 172 L50 156 L82 172 Z" />
          <rect x="82" y="126" width="26" height="74" />
          {[82, 92, 102].map((x) => (
            <rect key={x} x={x} y="119" width="6" height="7" />
          ))}
          <rect x="108" y="158" width="104" height="42" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={108 + i * 10.9} y="152" width="6" height="6" />
          ))}
          <rect x="212" y="112" width="30" height="88" />
          {[212, 224, 236].map((x) => (
            <rect key={x} x={x} y="105" width="6" height="7" />
          ))}
          <rect x="242" y="166" width="50" height="34" />
          <path d="M236 168 L267 152 L298 168 Z" />
          <path d={cipres(304, 200, 58, 11)} />
        </g>
        <path d="M146 200 V182 A14 14 0 0 1 174 182 V200 Z" fill={t.fondo} />
        <path d="M220 140 V131 A7 7 0 0 1 234 131 V140 Z" fill={t.fondo} />
        <path d="M224 139.5 C224 135 225.3 133.4 227 133.4 C228.7 133.4 230 135 230 139.5 Z" fill={t.trazo} opacity="0.85" />
      </svg>
      <span className={`absolute inset-x-0 flex justify-center ${compact ? "top-[22%]" : "top-[24%]"}`}>
        <span
          className={`inline-flex items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-inset ring-white/20 ${compact ? "h-8 w-8" : "h-14 w-14"}`}
          style={{ color: t.trazo }}
        >
          <Icon className={compact ? "h-4 w-4" : "h-6 w-6"} strokeWidth={1.75} />
        </span>
      </span>
    </span>
  );
}
