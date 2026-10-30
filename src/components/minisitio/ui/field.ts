/**
 * Campos de formulario del portal, con las medidas de Slack: 40 px de alto, radio 8, borde de
 * 1 px y anillo olivo al enfocar. Clases (no componentes) para usarlas en input, select y textarea.
 * En el celular el texto mide 16 px: con menos, iOS hace zoom al enfocar.
 */
export const labelClass = "mb-1.5 block text-body font-semibold text-fg";

/** Sin ancho: para un select junto a otros controles (con `w-full` y `w-auto` juntos ganaba `w-full`). */
export const fieldBaseClass =
  "rounded-panel border border-stroke-accessible/50 bg-surface px-3 text-body-lg text-fg sm:text-body outline-none placeholder:text-fg-4 transition-[border-color,box-shadow] hover:border-stroke-accessible focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:bg-surface-2";

export const fieldClass = `w-full ${fieldBaseClass}`;

export const inputClass = `${fieldClass} h-10`;
export const textareaClass = `${fieldClass} min-h-24 resize-y py-2.5`;
