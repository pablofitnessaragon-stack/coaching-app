/**
 * Une todas las piezas: a partir de los datos del cliente y de la
 * configuración elegida por el entrenador, calcula los objetivos de cada tipo
 * de día (entreno, descanso y, opcionalmente, entreno intenso).
 *
 * Cada número puede sobrescribirse a mano: el valor calculado se sigue
 * mostrando al lado para poder comparar.
 */
import { calcularGastoBasal, type FormulaBasal } from "./gasto-basal";
import {
  gastoTotalDesglosado,
  gastoTotalPorFactor,
  type SesionEntreno,
} from "./gasto-total";
import {
  aplicarAjuste,
  calcularAgua,
  calcularFibra,
  calcularMacros,
  AJUSTE_POR_DEFECTO,
  MACROS_POR_DEFECTO,
  type Ajuste,
  type RepartoMacros,
} from "./objetivos";
import { type Calculo, type Objetivo, type Sexo, type TipoDia, fmt } from "./tipos";

export interface DatosCliente {
  sexo: Sexo;
  pesoKg: number;
  alturaCm: number;
  edad: number;
  grasaPct?: number | null;
}

export interface Sobrescritura {
  kcal?: number | null;
  proteinaG?: number | null;
  grasaG?: number | null;
  carbohidratosG?: number | null;
}

/** Configuración que se guarda con cada versión del plan nutricional. */
export interface ConfigPlan {
  formulaBasal: FormulaBasal;
  /** Si el entrenador escribe su propio gasto basal (p. ej., de una bioimpedancia). */
  basalManual?: number | null;
  metodoGasto: "factor" | "desglosado";
  /** Método "factor": un único factor para todos los días. */
  factorActividad: number;
  /** Método "desglosado". */
  factorEstiloVida: number;
  pasosDiarios: number;
  sesiones: { entreno: SesionEntreno; entreno_intenso: SesionEntreno };
  usarDiaIntenso: boolean;
  /** Días por semana de cada tipo (el resto son de descanso). */
  diasEntreno: number;
  diasIntenso: number;
  ajuste: Ajuste;
  macros: RepartoMacros;
  sobrescrituras: Partial<Record<TipoDia, Sobrescritura>>;
}

export interface ObjetivoDia {
  tipo: TipoDia;
  gastoTotal: Calculo;
  kcalCalculadas: Calculo;
  /** Valores finales (con sobrescrituras aplicadas). */
  kcal: number;
  proteinaG: number;
  grasaG: number;
  carbohidratosG: number;
  /** Los macros calculados antes de sobrescribir, para mostrarlos al lado. */
  macrosCalculados: { proteinaG: number; grasaG: number; carbohidratosG: number; pasos: string[] };
  /** Qué campos se han sobrescrito a mano. */
  sobrescrito: { kcal: boolean; proteinaG: boolean; grasaG: boolean; carbohidratosG: boolean };
  /** kcal que suman los macros finales (4/4/9). */
  kcalDeMacros: number;
  fibra: Calculo;
  agua: Calculo;
  avisos: string[];
}

export interface ResultadoPlan {
  basal: Calculo;
  dias: ObjetivoDia[];
  /** Media de kcal de la semana según los días de cada tipo. */
  mediaSemanalKcal: number;
}

export function calcularPlan(cliente: DatosCliente, config: ConfigPlan): ResultadoPlan {
  const basalCalculado = calcularGastoBasal(config.formulaBasal, cliente);
  const basal: Calculo =
    config.basalManual != null
      ? {
          valor: config.basalManual,
          formula: "Valor introducido a mano",
          pasos: [`Calculado con la fórmula: ${fmt(basalCalculado.valor, 1)} kcal; usado: ${fmt(config.basalManual, 1)} kcal`],
        }
      : basalCalculado;

  const tipos: TipoDia[] = config.usarDiaIntenso
    ? ["entreno", "entreno_intenso", "descanso"]
    : ["entreno", "descanso"];

  const dias = tipos.map((tipo): ObjetivoDia => {
    const sesion = tipo === "descanso" ? null : config.sesiones[tipo];
    const gastoTotal =
      config.metodoGasto === "factor"
        ? gastoTotalPorFactor(basal.valor, config.factorActividad)
        : gastoTotalDesglosado({
            basal: basal.valor,
            pesoKg: cliente.pesoKg,
            factorEstiloVida: config.factorEstiloVida,
            pasosDiarios: config.pasosDiarios,
            sesion,
          });
    const kcalCalculadas = aplicarAjuste(gastoTotal.valor, config.ajuste);
    const s = config.sobrescrituras[tipo] ?? {};
    const kcal = s.kcal ?? kcalCalculadas.valor;
    const macros = calcularMacros(kcal, cliente.pesoKg, config.macros);
    const proteinaG = s.proteinaG ?? macros.proteinaG;
    const grasaG = s.grasaG ?? macros.grasaG;
    const carbohidratosG = s.carbohidratosG ?? macros.carbohidratosG;
    const kcalDeMacros = proteinaG * 4 + carbohidratosG * 4 + grasaG * 9;
    const avisos = [...macros.avisos];
    if (Math.abs(kcalDeMacros - kcal) / kcal > 0.02) {
      avisos.push(
        `Los macros suman ${fmt(kcalDeMacros)} kcal y el objetivo es ${fmt(kcal)} kcal: revisa las sobrescrituras.`,
      );
    }
    return {
      tipo,
      gastoTotal,
      kcalCalculadas,
      kcal,
      proteinaG,
      grasaG,
      carbohidratosG,
      macrosCalculados: macros,
      sobrescrito: {
        kcal: s.kcal != null,
        proteinaG: s.proteinaG != null,
        grasaG: s.grasaG != null,
        carbohidratosG: s.carbohidratosG != null,
      },
      kcalDeMacros,
      fibra: calcularFibra(kcal),
      agua: calcularAgua(cliente.pesoKg, sesion?.minutos ?? 0),
      avisos,
    };
  });

  const kcalDe = (t: TipoDia) => dias.find((d) => d.tipo === t)?.kcal ?? 0;
  const nIntenso = config.usarDiaIntenso ? config.diasIntenso : 0;
  const nEntreno = config.diasEntreno;
  const nDescanso = Math.max(7 - nEntreno - nIntenso, 0);
  const mediaSemanalKcal =
    (nEntreno * kcalDe("entreno") + nIntenso * kcalDe("entreno_intenso") + nDescanso * kcalDe("descanso")) / 7;

  return { basal, dias, mediaSemanalKcal };
}

/** Configuración inicial sensata para un cliente nuevo. */
export function configPorDefecto(objetivo: Objetivo): ConfigPlan {
  return {
    formulaBasal: "mifflin",
    basalManual: null,
    metodoGasto: "desglosado",
    factorActividad: 1.55,
    factorEstiloVida: 1.15,
    pasosDiarios: 8000,
    sesiones: { entreno: { met: 5, minutos: 60 }, entreno_intenso: { met: 6, minutos: 75 } },
    usarDiaIntenso: false,
    diasEntreno: 4,
    diasIntenso: 0,
    ajuste: { ...AJUSTE_POR_DEFECTO[objetivo] },
    macros: { ...MACROS_POR_DEFECTO[objetivo] },
    sobrescrituras: {},
  };
}

