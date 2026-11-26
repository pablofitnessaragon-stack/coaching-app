import { describe, expect, it } from "vitest";
import {
  TODAS_LAS_PREGUNTAS,
  avisosSalud,
  fichaDesdeRespuestas,
  medidasDesdeRespuestas,
  textoRespuesta,
  validarRespuestas,
  type EntradaCruda,
} from "../formulario-alta";

/** Respuestas mínimas: solo lo obligatorio. */
const minimo: EntradaCruda = {
  nombre: "Lucía Pérez",
  email: "Lucia@Ejemplo.com",
  sexo: "mujer",
  fecha_nacimiento: "1990-05-12",
  altura_cm: "165",
  peso_inicial_kg: "68,4", // con coma, como se escribe en España
  objetivo: "perdida_grasa",
  estilo_vida: "sedentario",
  dias_entreno: "3",
  tipo_dieta: "omnivora",
  comidas_al_dia: "4",
};

describe("validarRespuestas", () => {
  it("acepta lo mínimo y limpia los datos", () => {
    const r = validarRespuestas(minimo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // "68,4" → 68.4 ; el email se guarda en minúsculas
    expect(r.respuestas.peso_inicial_kg).toBe(68.4);
    expect(r.respuestas.email).toBe("lucia@ejemplo.com");
    expect(r.respuestas.altura_cm).toBe(165);
    // Lo que se deja vacío no se guarda
    expect("grasa_inicial_pct" in r.respuestas).toBe(false);
  });

  it("marca los obligatorios que faltan", () => {
    const r = validarRespuestas({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const obligatorias = TODAS_LAS_PREGUNTAS.filter((p) => p.obligatoria).map((p) => p.clave);
    expect(Object.keys(r.errores).sort()).toEqual(obligatorias.sort());
  });

  it("rechaza números fuera de rango y opciones inventadas", () => {
    const r = validarRespuestas({ ...minimo, altura_cm: "90", dias_entreno: "2.5", sexo: "otro", calidad_sueno: "7" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores.altura_cm).toBe("Mínimo 100 cm");
    expect(r.errores.dias_entreno).toBe("Escribe un número entero");
    expect(r.errores.sexo).toBe("Opción no válida");
    expect(r.errores.calidad_sueno).toBe("Elige del 1 al 5");
  });

  it("solo guarda las preguntas condicionales si aplican", () => {
    // «¿Qué deporte?» solo si marcó deporte; embarazo solo si es mujer
    const sinDeporte = validarRespuestas({ ...minimo, tipo_entreno: ["fuerza"], deporte: "pádel", sexo: "hombre", embarazo: "no" });
    expect(sinDeporte.ok && "deporte" in sinDeporte.respuestas).toBe(false);
    expect(sinDeporte.ok && "embarazo" in sinDeporte.respuestas).toBe(false);
    const conDeporte = validarRespuestas({ ...minimo, tipo_entreno: ["fuerza", "deporte"], deporte: "pádel" });
    expect(conDeporte.ok && conDeporte.respuestas.deporte).toBe("pádel");
    expect(conDeporte.ok && conDeporte.respuestas.tipo_entreno).toEqual(["fuerza", "deporte"]);
  });

  it("rechaza fechas de nacimiento en el futuro", () => {
    const r = validarRespuestas({ ...minimo, fecha_nacimiento: "2999-01-01" });
    expect(!r.ok && r.errores.fecha_nacimiento).toBe("Revisa la fecha");
  });
});

describe("fichaDesdeRespuestas", () => {
  it("pasa a la ficha los campos que coinciden y junta los horarios", () => {
    const r = validarRespuestas({
      ...minimo,
      horario_trabajo: "8-15",
      hora_entreno: "18:00",
      horarios_comidas: "14:30 y 21:30",
      lesiones: "rodilla",
    });
    if (!r.ok) throw new Error("debería ser válido");
    const ficha = fichaDesdeRespuestas(r.respuestas);
    expect(ficha.nombre).toBe("Lucía Pérez");
    expect(ficha.peso_inicial_kg).toBe(68.4);
    expect(ficha.horarios).toBe("Trabajo: 8-15\nEntreno: 18:00\nComidas: 14:30 y 21:30");
    // Las lesiones no son un campo de la ficha: se quedan en el cuestionario
    expect("lesiones" in ficha).toBe(false);
  });
});

describe("textoRespuesta y avisos", () => {
  const p = (clave: string) => TODAS_LAS_PREGUNTAS.find((q) => q.clave === clave)!;
  it("muestra textos legibles", () => {
    expect(textoRespuesta(p("objetivo"), "recomposicion")).toBe("Perder grasa y ganar músculo a la vez");
    expect(textoRespuesta(p("peso_inicial_kg"), 68.4)).toBe("68,4 kg");
    // Con la fecha de nacimiento se muestra también la edad (calculada a día de hoy)
    expect(textoRespuesta(p("fecha_nacimiento"), "1990-05-12")).toMatch(/^12\/05\/1990 \(\d+ años\)$/);
    expect(textoRespuesta(p("tipo_entreno"), ["fuerza", "hiit"])).toBe("Fuerza / pesas, HIIT / clases intensas");
    expect(textoRespuesta(p("alergias"), undefined)).toBeNull();
  });
  it("avisa de embarazo y de relación difícil con la comida", () => {
    const avisos = avisosSalud({ embarazo: "embarazo", relacion_comida: "si" });
    expect(avisos).toHaveLength(2);
    expect(avisos[0]).toMatch(/Embarazada/);
  });
});

describe("medidasDesdeRespuestas", () => {
  it("las medidas son opcionales: sin ninguna devuelve null", () => {
    const r = validarRespuestas(minimo);
    expect(r.ok && medidasDesdeRespuestas(r.respuestas)).toBeNull();
  });
  it("pasa solo las que puso el cliente", () => {
    const r = validarRespuestas({ ...minimo, cintura_cm: "78,5", muslo_cm: "55" });
    expect(r.ok && medidasDesdeRespuestas(r.respuestas)).toEqual({ cintura_cm: 78.5, muslo_cm: 55 });
  });
});
