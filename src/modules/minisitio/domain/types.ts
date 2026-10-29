/**
 * Tipos compartidos del portal de condóminos.
 *
 * Los nombres de campo (snake_case en español, `id_areas_privativas`, `saldo_pendiente`…)
 * son el contrato que heredaron las pantallas del minisitio independiente: se conservan
 * tal cual para que la UI portada siga leyendo los mismos datos.
 */

export type MinisitioUserType = "propietario" | "arrendatario" | "both";

export interface UserIndicators {
  hasPropiedades: boolean;
  hasComerciosArrendamientos: boolean;
}

export interface MinisitioUser {
  id: string;
  /** Alias de compatibilidad con el minisitio (antes `DIRECTORIO.id_directorio`). */
  id_directorio: string;
  nombre: string;
  apaterno: string;
  amaterno: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  razon_social: string | null;
  id_cat_tipos_directorio: number | null;
  userType: MinisitioUserType;
  /** No existe campo en la base: el login siempre lo da por aceptado (igual que el minisitio). */
  aceptoAvisoPrivacidad: boolean;
}

export interface MinisitioSessionInfo {
  user: MinisitioUser;
  userIndicators: UserIndicators;
}

/** Resultado estándar de las server actions del portal. */
export type ActionResult<T extends object = object> =
  | ({ success: true; message?: string } & T)
  | { success: false; message: string };
