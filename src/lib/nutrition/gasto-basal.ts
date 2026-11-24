/**
 * Gasto energético basal (GEB / BMR): las kcal que gasta el cuerpo en reposo.
 *
 * Fórmulas disponibles:
 * - Mifflin-St Jeor (1990): la más precisa en población general. Por defecto.
 * - Harris-Benedict revisada (Roza y Shizgal, 1984).
 * - Katch-McArdle: usa la masa magra, así que solo sirve si hay % de grasa.
 */
import { type Calculo, type Sexo, fmt } from "./tipos";

export type FormulaBasal = "mifflin" | "harris_benedict" | "katch_mcardle";

export const NOMBRE_FORMULA_BASAL: Record<FormulaBasal, string> = {
  mifflin: "Mifflin-St Jeor",
  harris_benedict: "Harris-Benedict (revisada)",
  katch_mcardle: "Katch-McArdle",
};

export interface DatosBasal {
  sexo: Sexo;
  pesoKg: number;
  alturaCm: number;
  edad: number;
  /** % de grasa corporal; necesario para Katch-McArdle. */
  grasaPct?: number | null;
}

export function mifflinStJeor({ sexo, pesoKg, alturaCm, edad }: DatosBasal): Calculo {
  const constante = sexo === "hombre" ? 5 : -161;
  const valor = 10 * pesoKg + 6.25 * alturaCm - 5 * edad + constante;
  const signo = constante >= 0 ? `+ ${constante}` : `− ${Math.abs(constante)}`;
  return {
    valor,
    formula: `10 × peso (kg) + 6,25 × altura (cm) − 5 × edad ${signo}`,
    pasos: [
      `10 × ${fmt(pesoKg, 1)} + 6,25 × ${fmt(alturaCm)} − 5 × ${edad} ${signo}`,
      `= ${fmt(10 * pesoKg, 1)} + ${fmt(6.25 * alturaCm, 2)} − ${5 * edad} ${signo}`,
      `= ${fmt(valor, 1)} kcal`,
    ],
  };
}

export function harrisBenedict({ sexo, pesoKg, alturaCm, edad }: DatosBasal): Calculo {
  const c =
    sexo === "hombre"
      ? { base: 88.362, peso: 13.397, altura: 4.799, edad: 5.677 }
      : { base: 447.593, peso: 9.247, altura: 3.098, edad: 4.33 };
  const valor = c.base + c.peso * pesoKg + c.altura * alturaCm - c.edad * edad;
  return {
    valor,
    formula: `${fmt(c.base, 3)} + ${fmt(c.peso, 3)} × peso + ${fmt(c.altura, 3)} × altura − ${fmt(c.edad, 3)} × edad`,
    pasos: [
      `${fmt(c.base, 3)} + ${fmt(c.peso, 3)} × ${fmt(pesoKg, 1)} + ${fmt(c.altura, 3)} × ${fmt(alturaCm)} − ${fmt(c.edad, 3)} × ${edad}`,
      `= ${fmt(valor, 1)} kcal`,
    ],
  };
}

export function katchMcArdle({ pesoKg, grasaPct }: DatosBasal): Calculo {
  if (grasaPct == null) {
    throw new Error("Katch-McArdle necesita el % de grasa corporal.");
  }
  const masaMagra = pesoKg * (1 - grasaPct / 100);
  const valor = 370 + 21.6 * masaMagra;
  return {
    valor,
    formula: "370 + 21,6 × masa magra (kg), con masa magra = peso × (1 − % grasa / 100)",
    pasos: [
      `Masa magra = ${fmt(pesoKg, 1)} × (1 − ${fmt(grasaPct, 1)} / 100) = ${fmt(masaMagra, 1)} kg`,
      `370 + 21,6 × ${fmt(masaMagra, 1)} = ${fmt(valor, 1)} kcal`,
    ],
  };
}

/** Calcula el gasto basal con la fórmula elegida. */
export function calcularGastoBasal(formula: FormulaBasal, datos: DatosBasal): Calculo {
  switch (formula) {
    case "mifflin":
      return mifflinStJeor(datos);
    case "harris_benedict":
      return harrisBenedict(datos);
    case "katch_mcardle":
      return katchMcArdle(datos);
  }
}
