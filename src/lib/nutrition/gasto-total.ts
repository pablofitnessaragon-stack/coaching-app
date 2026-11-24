/**
 * Gasto energético total diario (GET / TDEE).
 *
 * Dos métodos:
 *
 * 1. "factor": gasto basal × factor de actividad clásico (1,2 a 1,9).
 *    Da el mismo número todos los días.
 *
 * 2. "desglosado" (recomendado): suma por separado cada parte del día,
 *    así el día de entreno sale más alto que el de descanso:
 *      GET = basal × factor de estilo de vida   (trabajo y vida diaria + digestión)
 *          + kcal de los pasos                  (pasos × 0,0005 × peso)
 *          + kcal del entreno                   ((MET − 1) × peso × horas)
 *    Se usa MET − 1 para no contar dos veces el gasto basal de esa hora.
 *
 * Todos los factores son valores por defecto razonables: el entrenador puede
 * cambiarlos en la pantalla de la calculadora.
 */
import { type Calculo, type TipoDia, fmt } from "./tipos";

/** Factores clásicos para el método "factor". */
export const FACTORES_ACTIVIDAD = [
  { valor: 1.2, nombre: "Sedentario (poco o ningún ejercicio)" },
  { valor: 1.375, nombre: "Ligero (1-3 días/semana)" },
  { valor: 1.55, nombre: "Moderado (3-5 días/semana)" },
  { valor: 1.725, nombre: "Alto (6-7 días/semana)" },
  { valor: 1.9, nombre: "Muy alto (doble sesión o trabajo físico)" },
] as const;

export type EstiloVida = "sedentario" | "de_pie" | "fisico";

/**
 * Factores de estilo de vida para el método desglosado. Son más bajos que los
 * clásicos porque aquí los pasos y el entreno se suman aparte.
 */
export const FACTOR_ESTILO_VIDA: Record<EstiloVida, { valor: number; nombre: string }> = {
  sedentario: { valor: 1.15, nombre: "Trabajo sentado" },
  de_pie: { valor: 1.25, nombre: "Trabajo de pie / en movimiento" },
  fisico: { valor: 1.4, nombre: "Trabajo físico intenso" },
};

/** kcal por paso y por kg de peso (≈ 0,04 kcal/paso para 80 kg). */
export const KCAL_POR_PASO_Y_KG = 0.0005;

export type TipoEntreno = "fuerza" | "cardio" | "hiit" | "deporte";

/** MET orientativos (Compendium of Physical Activities). */
export const MET_ENTRENO: Record<TipoEntreno, { valor: number; nombre: string }> = {
  fuerza: { valor: 5, nombre: "Fuerza / pesas" },
  cardio: { valor: 7, nombre: "Cardio moderado" },
  hiit: { valor: 8, nombre: "HIIT / intervalos" },
  deporte: { valor: 7, nombre: "Deporte (fútbol, pádel...)" },
};

export function gastoTotalPorFactor(basal: number, factor: number): Calculo {
  const valor = basal * factor;
  return {
    valor,
    formula: "gasto basal × factor de actividad",
    pasos: [`${fmt(basal, 1)} × ${fmt(factor, 3)} = ${fmt(valor, 1)} kcal`],
  };
}

/** Sesión de entreno de un tipo de día. */
export interface SesionEntreno {
  met: number;
  minutos: number;
}

export interface DatosDesglose {
  basal: number;
  pesoKg: number;
  factorEstiloVida: number;
  pasosDiarios: number;
  /** null en día de descanso. */
  sesion: SesionEntreno | null;
}

export function kcalPasos(pasos: number, pesoKg: number): number {
  return pasos * KCAL_POR_PASO_Y_KG * pesoKg;
}

export function kcalEntreno(sesion: SesionEntreno | null, pesoKg: number): number {
  if (!sesion || sesion.minutos <= 0) return 0;
  return Math.max(sesion.met - 1, 0) * pesoKg * (sesion.minutos / 60);
}

export function gastoTotalDesglosado(d: DatosDesglose): Calculo {
  const base = d.basal * d.factorEstiloVida;
  const pasos = kcalPasos(d.pasosDiarios, d.pesoKg);
  const entreno = kcalEntreno(d.sesion, d.pesoKg);
  const valor = base + pasos + entreno;
  const pasosTexto = [
    `Vida diaria: ${fmt(d.basal, 1)} × ${fmt(d.factorEstiloVida, 2)} = ${fmt(base, 1)} kcal`,
    `Pasos: ${fmt(d.pasosDiarios)} × ${fmt(KCAL_POR_PASO_Y_KG, 4)} × ${fmt(d.pesoKg, 1)} = ${fmt(pasos, 1)} kcal`,
    d.sesion && d.sesion.minutos > 0
      ? `Entreno: (${fmt(d.sesion.met, 1)} − 1) × ${fmt(d.pesoKg, 1)} × ${fmt(d.sesion.minutos)}/60 h = ${fmt(entreno, 1)} kcal`
      : "Entreno: 0 kcal (día sin entreno)",
    `Total: ${fmt(base, 1)} + ${fmt(pasos, 1)} + ${fmt(entreno, 1)} = ${fmt(valor, 1)} kcal`,
  ];
  return {
    valor,
    formula: "basal × factor estilo de vida + pasos × 0,0005 × peso + (MET − 1) × peso × horas de entreno",
    pasos: pasosTexto,
  };
}

/** Sesiones por defecto según el tipo de día. */
export function sesionPorDefecto(tipo: TipoDia, entreno: TipoEntreno, minutos: number): SesionEntreno | null {
  if (tipo === "descanso") return null;
  const met = MET_ENTRENO[entreno].valor;
  // Día intenso: misma sesión con +1 MET (más volumen/intensidad). Editable.
  return { met: tipo === "entreno_intenso" ? met + 1 : met, minutos };
}
