/**
 * Tipos compartidos por todas las fórmulas.
 *
 * Idea clave: cada cálculo devuelve no solo el número, sino también la fórmula
 * y los pasos con los números sustituidos, para que el entrenador pueda
 * revisarlo (requisito de "cálculos transparentes").
 */

export type Sexo = "hombre" | "mujer";

export type TipoDia = "entreno" | "descanso" | "entreno_intenso";

export const TIPOS_DIA: TipoDia[] = ["entreno", "descanso", "entreno_intenso"];

export const NOMBRE_TIPO_DIA: Record<TipoDia, string> = {
  entreno: "Día de entreno",
  descanso: "Día de descanso",
  entreno_intenso: "Día de entreno intenso",
};

export type Objetivo =
  | "perdida_grasa"
  | "ganancia_muscular"
  | "recomposicion"
  | "mantenimiento"
  | "rendimiento";

export const NOMBRE_OBJETIVO: Record<Objetivo, string> = {
  perdida_grasa: "Pérdida de grasa",
  ganancia_muscular: "Ganancia muscular",
  recomposicion: "Recomposición",
  mantenimiento: "Mantenimiento",
  rendimiento: "Rendimiento",
};

/** Resultado de un cálculo, con su explicación. */
export interface Calculo {
  /** Valor final (sin redondear; se redondea solo al mostrarlo). */
  valor: number;
  /** Fórmula en texto, p. ej. "10 × peso + 6,25 × altura − 5 × edad + 5". */
  formula: string;
  /** Pasos con los números sustituidos. */
  pasos: string[];
}

/** Formatea un número al estilo español (coma decimal). */
export function fmt(n: number, decimales = 0): string {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}
