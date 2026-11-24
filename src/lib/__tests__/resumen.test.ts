import { describe, expect, it } from "vitest";
import { resumirCliente } from "../resumen";

describe("resumen del cliente", () => {
  // 4 semanas con un peso por lunes: 100 → 99 → 98 → 97 (−1 kg/semana)
  const pesos = [
    { fecha: "2026-11-02", pesoKg: 100 },
    { fecha: "2026-11-09", pesoKg: 99 },
    { fecha: "2026-11-16", pesoKg: 98 },
    { fecha: "2026-11-23", pesoKg: 97 },
  ];
  const c = { fecha_inicio: "2026-11-02", peso_inicial_kg: 100, objetivo: "perdida_grasa" };
  const hoy = new Date("2026-11-25T12:00:00");

  it("semana del proceso, cambio total y días sin pesarse", () => {
    const r = resumirCliente(c, pesos, hoy);
    expect(r.semanaProceso).toBe(4); // 23 días desde el inicio → semana 4
    expect(r.cambioTotalKg).toBeCloseTo(-3, 6);
    expect(r.diasSinRegistro).toBe(2);
  });

  it("ritmo con el cambio medio de las últimas 3 semanas", () => {
    // (97 / 100)^(1/3) − 1 = −1,0101 % por semana: algo más rápido que el −1 % máximo
    const r = resumirCliente(c, pesos, hoy);
    expect(r.semanasEvaluadas).toBe(3);
    expect(r.cambioMedioPct).toBeCloseTo(-1.0101, 3);
    expect(r.ritmo).toBe("muy_rapido");
  });

  it("estancado = progreso lento", () => {
    const planos = pesos.map((p, i) => ({ ...p, pesoKg: i === 0 ? 100 : 99.9 }));
    expect(resumirCliente(c, planos, hoy).ritmo).toBe("muy_lento");
  });
});
