/**
 * Texto del aviso de privacidad. En la base llega como texto plano escrito en un textarea (títulos
 * en mayúsculas, "1. SECCIÓN", incisos "I." y "a)" separados con tabuladores), no como HTML:
 * pintado con innerHTML se volvía un solo bloque sin saltos. Aquí se reconstruye su estructura
 * —título, secciones, párrafos e incisos con sangría— y los correos se vuelven enlaces. Si un
 * proyecto sí guarda HTML, se pinta como tal con los estilos `.aviso-privacidad-html`.
 */
import { Fragment } from "react";

/** "I." abre un grupo; los "a)" que le siguen van anidados; sin "I." previo, son una lista simple. */
type Inciso = { marca: string; texto: string; nivel: "grupo" | "anidado" | "simple" };
type Bloque =
  | { tipo: "titulo"; texto: string; principal: boolean }
  | { tipo: "seccion"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "incisos"; items: Inciso[] };

const ES_HTML = /<\/?[a-z][^>]*>/i;
const SECCION = /^\d+\.\s/;
const ROMANO = /^([IVX]+\.)\s+(.+)$/;
const LETRA = /^([a-z]\))\s*(.+)$/;
const ENLACE = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|https?:\/\/[^\s]*[^\s.,;:)])/;

const enMayusculas = (linea: string) => /[A-ZÁÉÍÓÚÑ]/.test(linea) && !/[a-záéíóúñü]/.test(linea);

function bloques(texto: string): Bloque[] {
  const out: Bloque[] = [];
  let hayTitulo = false;
  let enRomano = false;
  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.replace(/\s+/g, " ").trim();
    if (!linea) continue;
    const romano = linea.match(ROMANO);
    const letra = romano ? null : linea.match(LETRA);
    const marcado = romano ?? letra;
    if (enMayusculas(linea) && SECCION.test(linea)) {
      out.push({ tipo: "seccion", texto: linea });
      enRomano = false;
    } else if (enMayusculas(linea) && !romano) {
      out.push({ tipo: "titulo", texto: linea, principal: !hayTitulo });
      hayTitulo = true;
    } else if (marcado) {
      const [, marca, resto] = marcado;
      if (romano) enRomano = true;
      const inciso: Inciso = { marca, texto: resto, nivel: romano ? "grupo" : enRomano ? "anidado" : "simple" };
      const previo = out.at(-1);
      if (previo?.tipo === "incisos") previo.items.push(inciso);
      else out.push({ tipo: "incisos", items: [inciso] });
    } else {
      out.push({ tipo: "parrafo", texto: linea });
    }
  }
  return out;
}

function conEnlaces(texto: string) {
  return texto.split(ENLACE).map((parte, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{parte}</Fragment>;
    const web = parte.startsWith("http");
    return (
      <a
        key={i}
        href={web ? parte : `mailto:${parte}`}
        {...(web ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="font-medium break-all text-brand underline underline-offset-2 hover:text-brand-hover"
      >
        {parte}
      </a>
    );
  });
}

export function AvisoPrivacidadTexto({ texto, nivelSeccion = 2 }: { texto: string; nivelSeccion?: 2 | 3 }) {
  if (ES_HTML.test(texto)) {
    return <div className="aviso-privacidad-html text-message" dangerouslySetInnerHTML={{ __html: texto }} />;
  }
  const Seccion = nivelSeccion === 2 ? "h2" : "h3";
  return (
    <div className="text-message text-fg-2">
      {bloques(texto).map((b, i) => {
        if (b.tipo === "titulo") {
          return (
            <p key={i} className={b.principal ? "text-body-lg font-bold text-fg" : "text-body font-semibold text-fg-3"}>
              {b.texto}
            </p>
          );
        }
        if (b.tipo === "seccion") {
          return (
            <Seccion key={i} className="mt-7 mb-2 text-body font-bold text-fg">
              {b.texto}
            </Seccion>
          );
        }
        if (b.tipo === "parrafo") {
          return (
            <p key={i} className="mb-2.5">
              {conEnlaces(b.texto)}
            </p>
          );
        }
        return (
          <ul key={i} className="mb-2.5 space-y-1">
            {b.items.map((item, j) => (
              <li key={j} className={`flex gap-2 ${item.nivel === "anidado" ? "pl-8" : item.nivel === "grupo" && j > 0 ? "pt-2" : ""}`}>
                <span className="w-6 shrink-0 text-fg-3 tabular-nums">{item.marca}</span>
                <span className="min-w-0">{conEnlaces(item.texto)}</span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
