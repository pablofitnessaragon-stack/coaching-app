/**
 * Ingestas de referencia de micronutrientes clave para adultos sanos.
 *
 * Fuente: valores dietéticos de referencia de la EFSA (Autoridad Europea de
 * Seguridad Alimentaria). PRI = ingesta de referencia para la población;
 * AI = ingesta adecuada (cuando no hay datos para fijar una PRI).
 * Sodio: nivel "seguro y adecuado" (máximo recomendado, no mínimo).
 *
 * En la fase 2 se compararán con lo que aporta la dieta. Valores revisables:
 * si cambian las recomendaciones, solo hay que tocar esta tabla.
 */
import type { Sexo } from "./tipos";

export interface ReferenciaMicro {
  clave: string;
  nombre: string;
  unidad: "mg" | "µg" | "g";
  tipo: "PRI" | "AI" | "Máximo";
  hombre: number;
  mujer: number;
  nota?: string;
}

export const REFERENCIAS_MICRO: ReferenciaMicro[] = [
  { clave: "hierro", nombre: "Hierro", unidad: "mg", tipo: "PRI", hombre: 11, mujer: 16, nota: "Mujer: antes de la menopausia (después, 11 mg)" },
  { clave: "calcio", nombre: "Calcio", unidad: "mg", tipo: "PRI", hombre: 950, mujer: 950, nota: "1000 mg de 18 a 24 años" },
  { clave: "vitamina_d", nombre: "Vitamina D", unidad: "µg", tipo: "AI", hombre: 15, mujer: 15 },
  { clave: "vitamina_b12", nombre: "Vitamina B12", unidad: "µg", tipo: "AI", hombre: 4, mujer: 4, nota: "Suplementar siempre en dieta vegana" },
  { clave: "sodio", nombre: "Sodio", unidad: "g", tipo: "Máximo", hombre: 2, mujer: 2, nota: "≈ 5 g de sal" },
  { clave: "potasio", nombre: "Potasio", unidad: "mg", tipo: "AI", hombre: 3500, mujer: 3500 },
  { clave: "magnesio", nombre: "Magnesio", unidad: "mg", tipo: "AI", hombre: 350, mujer: 300 },
  { clave: "zinc", nombre: "Zinc", unidad: "mg", tipo: "PRI", hombre: 11.7, mujer: 9.3, nota: "Con ingesta media de fitatos" },
  { clave: "folato", nombre: "Folato", unidad: "µg", tipo: "PRI", hombre: 330, mujer: 330 },
  { clave: "vitamina_c", nombre: "Vitamina C", unidad: "mg", tipo: "PRI", hombre: 110, mujer: 95 },
];

export function referenciasPara(sexo: Sexo, edad: number) {
  return REFERENCIAS_MICRO.map((r) => {
    let valor = sexo === "hombre" ? r.hombre : r.mujer;
    if (r.clave === "calcio" && edad < 25) valor = 1000;
    return { ...r, valor };
  });
}
