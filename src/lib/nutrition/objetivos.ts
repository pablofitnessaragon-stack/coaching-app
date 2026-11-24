/**
 * De gasto total a objetivos diarios: ajuste por objetivo, macros, fibra y agua.
 */
import { type Calculo, type Objetivo, fmt } from "./tipos";

/* ---------- Ajuste por objetivo (déficit / superávit) ---------- */

export type ModoAjuste = "porcentaje" | "kcal";

export interface Ajuste {
  modo: ModoAjuste;
  /** Negativo = déficit, positivo = superávit. En % o en kcal según el modo. */
  valor: number;
}

/** Ajustes por defecto según objetivo. Todos editables. */
export const AJUSTE_POR_DEFECTO: Record<Objetivo, Ajuste> = {
  perdida_grasa: { modo: "porcentaje", valor: -20 },
  ganancia_muscular: { modo: "porcentaje", valor: 10 },
  recomposicion: { modo: "porcentaje", valor: -5 },
  mantenimiento: { modo: "porcentaje", valor: 0 },
  rendimiento: { modo: "porcentaje", valor: 5 },
};

export function aplicarAjuste(gastoTotal: number, ajuste: Ajuste): Calculo {
  if (ajuste.modo === "porcentaje") {
    const valor = gastoTotal * (1 + ajuste.valor / 100);
    return {
      valor,
      formula: "gasto total × (1 + ajuste % / 100)",
      pasos: [`${fmt(gastoTotal, 1)} × (1 ${ajuste.valor >= 0 ? "+" : "−"} ${fmt(Math.abs(ajuste.valor), 1)} / 100) = ${fmt(valor, 1)} kcal`],
    };
  }
  const valor = gastoTotal + ajuste.valor;
  return {
    valor,
    formula: "gasto total + ajuste en kcal",
    pasos: [`${fmt(gastoTotal, 1)} ${ajuste.valor >= 0 ? "+" : "−"} ${fmt(Math.abs(ajuste.valor))} = ${fmt(valor, 1)} kcal`],
  };
}

/* ---------- Macros ---------- */

export const KCAL_POR_GRAMO = { proteina: 4, carbohidratos: 4, grasa: 9 } as const;

export type ModoMacros = "g_kg" | "porcentaje";

export interface RepartoMacros {
  modo: ModoMacros;
  /** g/kg o % de las kcal, según el modo. */
  proteina: number;
  grasa: number;
  /** Solo en modo %; en g/kg los carbohidratos son "lo que sobra". */
  carbohidratos?: number;
}

export const MACROS_POR_DEFECTO: Record<Objetivo, RepartoMacros> = {
  perdida_grasa: { modo: "g_kg", proteina: 2.2, grasa: 0.8 },
  ganancia_muscular: { modo: "g_kg", proteina: 1.8, grasa: 1.0 },
  recomposicion: { modo: "g_kg", proteina: 2.2, grasa: 0.9 },
  mantenimiento: { modo: "g_kg", proteina: 1.8, grasa: 1.0 },
  rendimiento: { modo: "g_kg", proteina: 1.8, grasa: 1.0 },
};

export interface ResultadoMacros {
  proteinaG: number;
  grasaG: number;
  carbohidratosG: number;
  pasos: string[];
  /** Avisos para el entrenador (p. ej., carbohidratos negativos). */
  avisos: string[];
}

export function calcularMacros(kcal: number, pesoKg: number, reparto: RepartoMacros): ResultadoMacros {
  const avisos: string[] = [];
  if (reparto.modo === "g_kg") {
    const proteinaG = reparto.proteina * pesoKg;
    const grasaG = reparto.grasa * pesoKg;
    const kcalPG = proteinaG * 4 + grasaG * 9;
    const restante = kcal - kcalPG;
    const carbohidratosG = Math.max(restante / 4, 0);
    if (restante < 0) {
      avisos.push("La proteína y la grasa ya superan las kcal objetivo: baja los g/kg o sube las kcal.");
    } else if (carbohidratosG < 50) {
      avisos.push("Menos de 50 g de carbohidratos: revisa si es lo que quieres.");
    }
    return {
      proteinaG,
      grasaG,
      carbohidratosG,
      avisos,
      pasos: [
        `Proteína: ${fmt(reparto.proteina, 2)} g/kg × ${fmt(pesoKg, 1)} kg = ${fmt(proteinaG, 1)} g (${fmt(proteinaG * 4)} kcal)`,
        `Grasa: ${fmt(reparto.grasa, 2)} g/kg × ${fmt(pesoKg, 1)} kg = ${fmt(grasaG, 1)} g (${fmt(grasaG * 9)} kcal)`,
        `Carbohidratos: (${fmt(kcal, 1)} − ${fmt(kcalPG, 1)}) / 4 = ${fmt(carbohidratosG, 1)} g`,
      ],
    };
  }
  const pctC = reparto.carbohidratos ?? 100 - reparto.proteina - reparto.grasa;
  const suma = reparto.proteina + reparto.grasa + pctC;
  if (Math.abs(suma - 100) > 0.01) avisos.push(`Los porcentajes suman ${fmt(suma, 1)} %, no 100 %.`);
  const proteinaG = (kcal * reparto.proteina) / 100 / 4;
  const grasaG = (kcal * reparto.grasa) / 100 / 9;
  const carbohidratosG = (kcal * pctC) / 100 / 4;
  return {
    proteinaG,
    grasaG,
    carbohidratosG,
    avisos,
    pasos: [
      `Proteína: ${fmt(kcal, 1)} × ${fmt(reparto.proteina, 1)} % / 4 = ${fmt(proteinaG, 1)} g (${fmt(proteinaG / pesoKg, 2)} g/kg)`,
      `Grasa: ${fmt(kcal, 1)} × ${fmt(reparto.grasa, 1)} % / 9 = ${fmt(grasaG, 1)} g (${fmt(grasaG / pesoKg, 2)} g/kg)`,
      `Carbohidratos: ${fmt(kcal, 1)} × ${fmt(pctC, 1)} % / 4 = ${fmt(carbohidratosG, 1)} g`,
    ],
  };
}

/* ---------- Fibra y agua ---------- */

/** Fibra: 14 g por cada 1000 kcal (referencia del IOM de EE. UU.). */
export function calcularFibra(kcal: number): Calculo {
  const valor = (kcal / 1000) * 14;
  return {
    valor,
    formula: "14 g por cada 1000 kcal",
    pasos: [`${fmt(kcal, 1)} / 1000 × 14 = ${fmt(valor, 1)} g`],
  };
}

/** Agua: 35 ml/kg + 500 ml por cada hora de entreno. */
export function calcularAgua(pesoKg: number, minutosEntreno: number): Calculo {
  const base = pesoKg * 35;
  const extra = (minutosEntreno / 60) * 500;
  const valor = (base + extra) / 1000;
  return {
    valor,
    formula: "35 ml × peso (kg) + 500 ml por hora de entreno",
    pasos: [`(35 × ${fmt(pesoKg, 1)} + 500 × ${fmt(minutosEntreno)}/60) / 1000 = ${fmt(valor, 2)} L`],
  };
}
