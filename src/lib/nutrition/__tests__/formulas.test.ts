/**
 * Tests de las fórmulas. Todos los valores esperados están calculados a mano
 * (la cuenta aparece en el comentario de cada test) para comprobar que el
 * código hace exactamente lo que dice la fórmula.
 */
import { describe, expect, it } from "vitest";
import {
  aplicarAjuste,
  calcularAgua,
  calcularEdad,
  calcularFibra,
  calcularMacros,
  calcularPlan,
  configPorDefecto,
  evaluarRitmo,
  gastoTotalDesglosado,
  gastoTotalPorFactor,
  harrisBenedict,
  katchMcArdle,
  lunesDe,
  mediaMovil7,
  mediasSemanales,
  mifflinStJeor,
  referenciasPara,
  type ConfigPlan,
} from "..";

const hombre = { sexo: "hombre" as const, pesoKg: 80, alturaCm: 180, edad: 30 };
const mujer = { sexo: "mujer" as const, pesoKg: 60, alturaCm: 165, edad: 25 };

describe("edad", () => {
  it("cuenta solo los años cumplidos", () => {
    expect(calcularEdad("1996-11-25", new Date(2026, 10, 24))).toBe(29); // un día antes del cumpleaños
    expect(calcularEdad("1996-11-25", new Date(2026, 10, 25))).toBe(30); // el día del cumpleaños
  });
});

describe("gasto basal", () => {
  it("Mifflin-St Jeor, hombre", () => {
    // 10×80 + 6,25×180 − 5×30 + 5 = 800 + 1125 − 150 + 5 = 1780
    expect(mifflinStJeor(hombre).valor).toBeCloseTo(1780, 6);
  });
  it("Mifflin-St Jeor, mujer", () => {
    // 10×60 + 6,25×165 − 5×25 − 161 = 600 + 1031,25 − 125 − 161 = 1345,25
    expect(mifflinStJeor(mujer).valor).toBeCloseTo(1345.25, 6);
  });
  it("Harris-Benedict revisada, hombre", () => {
    // 88,362 + 13,397×80 + 4,799×180 − 5,677×30 = 88,362 + 1071,76 + 863,82 − 170,31 = 1853,632
    expect(harrisBenedict(hombre).valor).toBeCloseTo(1853.632, 6);
  });
  it("Harris-Benedict revisada, mujer", () => {
    // 447,593 + 9,247×60 + 3,098×165 − 4,330×25 = 447,593 + 554,82 + 511,17 − 108,25 = 1405,333
    expect(harrisBenedict(mujer).valor).toBeCloseTo(1405.333, 6);
  });
  it("Katch-McArdle con 15 % de grasa", () => {
    // masa magra = 80 × 0,85 = 68 kg; 370 + 21,6 × 68 = 1838,8
    expect(katchMcArdle({ ...hombre, grasaPct: 15 }).valor).toBeCloseTo(1838.8, 6);
  });
  it("Katch-McArdle sin % de grasa da error claro", () => {
    expect(() => katchMcArdle(hombre)).toThrow(/% de grasa/);
  });
  it("muestra los pasos con los números", () => {
    expect(mifflinStJeor(hombre).pasos.at(-1)).toContain("1780");
  });
});

describe("gasto total", () => {
  it("por factor de actividad", () => {
    // 1780 × 1,55 = 2759
    expect(gastoTotalPorFactor(1780, 1.55).valor).toBeCloseTo(2759, 6);
  });
  it("desglosado, día de entreno de fuerza de 60 min", () => {
    // vida diaria 1780 × 1,15 = 2047; pasos 10000 × 0,0005 × 80 = 400;
    // entreno (5 − 1) × 80 × 1 h = 320; total 2767
    const r = gastoTotalDesglosado({ basal: 1780, pesoKg: 80, factorEstiloVida: 1.15, pasosDiarios: 10000, sesion: { met: 5, minutos: 60 } });
    expect(r.valor).toBeCloseTo(2767, 6);
  });
  it("desglosado, día de descanso", () => {
    // 2047 + 400 + 0 = 2447
    const r = gastoTotalDesglosado({ basal: 1780, pesoKg: 80, factorEstiloVida: 1.15, pasosDiarios: 10000, sesion: null });
    expect(r.valor).toBeCloseTo(2447, 6);
  });
});

describe("ajuste por objetivo", () => {
  it("déficit del 20 %", () => {
    // 2767 × 0,8 = 2213,6
    expect(aplicarAjuste(2767, { modo: "porcentaje", valor: -20 }).valor).toBeCloseTo(2213.6, 6);
  });
  it("déficit de 300 kcal", () => {
    expect(aplicarAjuste(2767, { modo: "kcal", valor: -300 }).valor).toBeCloseTo(2467, 6);
  });
  it("superávit del 10 %", () => {
    // 2500 × 1,1 = 2750
    expect(aplicarAjuste(2500, { modo: "porcentaje", valor: 10 }).valor).toBeCloseTo(2750, 6);
  });
});

describe("macros", () => {
  it("en g/kg con carbohidratos como resto", () => {
    // P = 2,0 × 80 = 160 g (640 kcal); G = 0,9 × 80 = 72 g (648 kcal)
    // C = (2213,6 − 640 − 648) / 4 = 231,4 g
    const m = calcularMacros(2213.6, 80, { modo: "g_kg", proteina: 2, grasa: 0.9 });
    expect(m.proteinaG).toBeCloseTo(160, 6);
    expect(m.grasaG).toBeCloseTo(72, 6);
    expect(m.carbohidratosG).toBeCloseTo(231.4, 6);
    expect(m.avisos).toHaveLength(0);
  });
  it("en porcentaje 30/25/45 sobre 2000 kcal", () => {
    // P = 600/4 = 150 g; G = 500/9 = 55,56 g; C = 900/4 = 225 g
    const m = calcularMacros(2000, 80, { modo: "porcentaje", proteina: 30, grasa: 25, carbohidratos: 45 });
    expect(m.proteinaG).toBeCloseTo(150, 6);
    expect(m.grasaG).toBeCloseTo(55.556, 2);
    expect(m.carbohidratosG).toBeCloseTo(225, 6);
  });
  it("avisa si proteína y grasa superan las kcal", () => {
    // P 3 × 80 = 240 g (960) + G 1,5 × 80 = 120 g (1080) = 2040 > 1500
    const m = calcularMacros(1500, 80, { modo: "g_kg", proteina: 3, grasa: 1.5 });
    expect(m.carbohidratosG).toBe(0);
    expect(m.avisos[0]).toMatch(/superan/);
  });
  it("avisa si los porcentajes no suman 100", () => {
    const m = calcularMacros(2000, 80, { modo: "porcentaje", proteina: 30, grasa: 30, carbohidratos: 30 });
    expect(m.avisos[0]).toMatch(/90/);
  });
});

describe("fibra y agua", () => {
  it("fibra: 14 g por 1000 kcal", () => {
    expect(calcularFibra(2000).valor).toBeCloseTo(28, 6);
  });
  it("agua: 35 ml/kg + 500 ml por hora de entreno", () => {
    // 35 × 80 = 2800 ml + 500 ml = 3,3 L
    expect(calcularAgua(80, 60).valor).toBeCloseTo(3.3, 6);
    expect(calcularAgua(80, 0).valor).toBeCloseTo(2.8, 6);
  });
});

describe("micronutrientes", () => {
  it("hierro distinto para hombre y mujer; calcio 1000 mg antes de los 25", () => {
    const h = referenciasPara("hombre", 30);
    const m = referenciasPara("mujer", 22);
    expect(h.find((r) => r.clave === "hierro")?.valor).toBe(11);
    expect(m.find((r) => r.clave === "hierro")?.valor).toBe(16);
    expect(m.find((r) => r.clave === "calcio")?.valor).toBe(1000);
    expect(h.find((r) => r.clave === "calcio")?.valor).toBe(950);
  });
});

describe("peso", () => {
  const registros = [
    { fecha: "2026-11-16", pesoKg: 80 }, // lunes
    { fecha: "2026-11-18", pesoKg: 79.6 },
    { fecha: "2026-11-22", pesoKg: 79.8 }, // domingo
    { fecha: "2026-11-23", pesoKg: 79.4 }, // lunes siguiente
    { fecha: "2026-11-25", pesoKg: 79.2 },
  ];
  it("lunes de la semana", () => {
    expect(lunesDe("2026-11-24")).toBe("2026-11-23"); // martes
    expect(lunesDe("2026-11-29")).toBe("2026-11-23"); // domingo
    expect(lunesDe("2026-11-23")).toBe("2026-11-23"); // lunes
  });
  it("media semanal y cambio", () => {
    // semana 1: (80 + 79,6 + 79,8) / 3 = 79,8; semana 2: (79,4 + 79,2) / 2 = 79,3
    // cambio: −0,5 kg = −0,5 / 79,8 = −0,6266 %
    const s = mediasSemanales(registros);
    expect(s).toHaveLength(2);
    expect(s[0].media).toBeCloseTo(79.8, 6);
    expect(s[0].cambioKg).toBeNull();
    expect(s[1].media).toBeCloseTo(79.3, 6);
    expect(s[1].cambioKg).toBeCloseTo(-0.5, 6);
    expect(s[1].cambioPct).toBeCloseTo(-0.6266, 3);
  });
  it("media móvil de 7 días naturales", () => {
    // el 23/11 la ventana es 17-23/11: 79,6 + 79,8 + 79,4 = 238,8 / 3 = 79,6
    const mm = mediaMovil7(registros);
    expect(mm.find((x) => x.fecha === "2026-11-23")?.media).toBeCloseTo(79.6, 6);
    // el 16/11 solo está ese día
    expect(mm[0].media).toBe(80);
  });
  it("ritmo frente al objetivo", () => {
    const perder = { minPct: -1, maxPct: -0.5 };
    const ganar = { minPct: 0.25, maxPct: 0.5 };
    expect(evaluarRitmo(-0.63, perder)).toBe("en_ritmo");
    expect(evaluarRitmo(-0.2, perder)).toBe("muy_lento");
    expect(evaluarRitmo(-1.5, perder)).toBe("muy_rapido");
    expect(evaluarRitmo(0.1, ganar)).toBe("muy_lento");
    expect(evaluarRitmo(0.8, ganar)).toBe("muy_rapido");
    expect(evaluarRitmo(null, ganar)).toBe("sin_datos");
  });
});

describe("plan completo con ciclado", () => {
  const config: ConfigPlan = {
    ...configPorDefecto("perdida_grasa"),
    pasosDiarios: 10000,
    sesiones: { entreno: { met: 5, minutos: 60 }, entreno_intenso: { met: 6, minutos: 75 } },
    diasEntreno: 4,
    ajuste: { modo: "porcentaje", valor: -20 },
    macros: { modo: "g_kg", proteina: 2, grasa: 0.9 },
  };

  it("día de entreno y de descanso salen distintos", () => {
    const r = calcularPlan(hombre, config);
    const entreno = r.dias.find((d) => d.tipo === "entreno")!;
    const descanso = r.dias.find((d) => d.tipo === "descanso")!;
    expect(r.basal.valor).toBeCloseTo(1780, 6);
    // entreno: 2767 × 0,8 = 2213,6; descanso: 2447 × 0,8 = 1957,6
    expect(entreno.kcal).toBeCloseTo(2213.6, 6);
    expect(descanso.kcal).toBeCloseTo(1957.6, 6);
    // proteína y grasa iguales; los carbohidratos absorben la diferencia
    expect(descanso.proteinaG).toBeCloseTo(160, 6);
    expect(descanso.carbohidratosG).toBeCloseTo((1957.6 - 1288) / 4, 6); // 167,4
    // media semanal con 4 días de entreno y 3 de descanso:
    // (4 × 2213,6 + 3 × 1957,6) / 7 = 14727,2 / 7 = 2103,886
    expect(r.mediaSemanalKcal).toBeCloseTo(2103.886, 2);
  });

  it("las sobrescrituras a mano mandan sobre lo calculado", () => {
    const r = calcularPlan(hombre, { ...config, sobrescrituras: { descanso: { kcal: 2000 } } });
    const descanso = r.dias.find((d) => d.tipo === "descanso")!;
    expect(descanso.kcal).toBe(2000);
    expect(descanso.sobrescrito.kcal).toBe(true);
    expect(descanso.kcalCalculadas.valor).toBeCloseTo(1957.6, 6);
    // C = (2000 − 640 − 648) / 4 = 178
    expect(descanso.carbohidratosG).toBeCloseTo(178, 6);
  });

  it("avisa si los macros sobrescritos no cuadran con las kcal", () => {
    const r = calcularPlan(hombre, { ...config, sobrescrituras: { entreno: { carbohidratosG: 400 } } });
    expect(r.dias[0].avisos.some((a) => a.includes("suman"))).toBe(true);
  });

  it("gasto basal escrito a mano", () => {
    const r = calcularPlan(hombre, { ...config, basalManual: 1900 });
    expect(r.basal.valor).toBe(1900);
  });

  it("con día intenso hay tres tipos de día", () => {
    const r = calcularPlan(hombre, { ...config, usarDiaIntenso: true, diasEntreno: 3, diasIntenso: 1 });
    expect(r.dias.map((d) => d.tipo)).toEqual(["entreno", "entreno_intenso", "descanso"]);
    // intenso: 2047 + 400 + (6 − 1) × 80 × 1,25 = 2947; × 0,8 = 2357,6
    expect(r.dias[1].kcal).toBeCloseTo(2357.6, 6);
  });
});
