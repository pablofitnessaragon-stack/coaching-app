/**
 * % de grasa corporal estimado con la fórmula de la Marina de EE. UU.
 * (Hodgdon y Beckett, 1984), versión en centímetros. Solo necesita una cinta
 * métrica, así que es la más práctica para clientes online.
 *
 *   Hombres: 495 / (1,0324 − 0,19077 × log10(cintura − cuello) + 0,15456 × log10(altura)) − 450
 *   Mujeres: 495 / (1,29579 − 0,35004 × log10(cintura + cadera − cuello) + 0,22100 × log10(altura)) − 450
 *
 * Cómo medir (sin apretar, por la mañana):
 *   - Cuello: justo debajo de la nuez.
 *   - Cintura: hombres a la altura del ombligo; mujeres en la parte más estrecha.
 *   - Cadera (solo mujeres): en la parte más ancha del glúteo.
 *
 * Es una estimación (error típico de ±3-4 puntos). Si el cliente tiene un dato
 * de báscula de bioimpedancia o DEXA, el entrenador decide cuál usar.
 */
import { type Calculo, type Sexo, fmt } from "./tipos";

export interface MedidasGrasa {
  sexo: Sexo;
  alturaCm: number;
  cuelloCm?: number | null;
  cinturaCm?: number | null;
  caderaCm?: number | null;
}

/** Medidas que faltan para poder calcular (vacío = se puede calcular). */
export function faltanParaGrasaMarina(m: MedidasGrasa): string[] {
  const faltan: string[] = [];
  if (!m.cuelloCm) faltan.push("cuello");
  if (!m.cinturaCm) faltan.push("cintura");
  if (m.sexo === "mujer" && !m.caderaCm) faltan.push("cadera");
  return faltan;
}

/**
 * Devuelve el cálculo, o null si faltan medidas o el resultado no tiene
 * sentido (medidas mal tomadas: fuera del 3-60 %).
 */
export function grasaMarina(m: MedidasGrasa): Calculo | null {
  if (faltanParaGrasaMarina(m).length > 0 || !m.alturaCm) return null;
  const cuello = m.cuelloCm!;
  const cintura = m.cinturaCm!;
  const logAltura = Math.log10(m.alturaCm);

  if (m.sexo === "hombre") {
    const resta = cintura - cuello;
    if (resta <= 0) return null;
    const logResta = Math.log10(resta);
    const divisor = 1.0324 - 0.19077 * logResta + 0.15456 * logAltura;
    const valor = 495 / divisor - 450;
    if (!Number.isFinite(valor) || valor < 3 || valor > 60) return null;
    return {
      valor,
      formula: "495 / (1,0324 − 0,19077 × log10(cintura − cuello) + 0,15456 × log10(altura)) − 450",
      pasos: [
        `cintura − cuello = ${fmt(cintura, 1)} − ${fmt(cuello, 1)} = ${fmt(resta, 1)} cm → log10 = ${fmt(logResta, 4)}`,
        `log10(altura) = log10(${fmt(m.alturaCm, 1)}) = ${fmt(logAltura, 4)}`,
        `divisor = 1,0324 − 0,19077 × ${fmt(logResta, 4)} + 0,15456 × ${fmt(logAltura, 4)} = ${fmt(divisor, 4)}`,
        `495 / ${fmt(divisor, 4)} − 450 = ${fmt(valor, 1)} %`,
      ],
    };
  }

  const cadera = m.caderaCm!;
  const suma = cintura + cadera - cuello;
  if (suma <= 0) return null;
  const logSuma = Math.log10(suma);
  const divisor = 1.29579 - 0.35004 * logSuma + 0.221 * logAltura;
  const valor = 495 / divisor - 450;
  if (!Number.isFinite(valor) || valor < 3 || valor > 60) return null;
  return {
    valor,
    formula: "495 / (1,29579 − 0,35004 × log10(cintura + cadera − cuello) + 0,22100 × log10(altura)) − 450",
    pasos: [
      `cintura + cadera − cuello = ${fmt(cintura, 1)} + ${fmt(cadera, 1)} − ${fmt(cuello, 1)} = ${fmt(suma, 1)} cm → log10 = ${fmt(logSuma, 4)}`,
      `log10(altura) = log10(${fmt(m.alturaCm, 1)}) = ${fmt(logAltura, 4)}`,
      `divisor = 1,29579 − 0,35004 × ${fmt(logSuma, 4)} + 0,22100 × ${fmt(logAltura, 4)} = ${fmt(divisor, 4)}`,
      `495 / ${fmt(divisor, 4)} − 450 = ${fmt(valor, 1)} %`,
    ],
  };
}
