/**
 * Clientes FICTICIOS de demostración (nombres y datos inventados) para ver la
 * app funcionando. Se generan con fechas relativas a hoy, así siempre parecen
 * actuales. Se marcan con es_ejemplo = true para poder borrarlos de golpe.
 */
import { calcularEdad } from "./nutrition/edad";
import { calcularPlan, configPorDefecto, type ConfigPlan } from "./nutrition/plan";
import type { Objetivo, Sexo } from "./nutrition/tipos";

interface Ejemplo {
  ficha: {
    nombre: string;
    email: string;
    sexo: Sexo;
    fecha_nacimiento: string;
    altura_cm: number;
    peso_inicial_kg: number;
    grasa_inicial_pct: number | null;
    objetivo: Objetivo;
    estilo_vida: "sedentario" | "de_pie" | "fisico";
    pasos_diarios: number;
    dias_entreno: number;
    tipo_entreno: string[];
    tipo_dieta: "omnivora" | "vegetariana" | "vegana" | "pescetariana";
    alergias: string | null;
    intolerancias: string | null;
    alimentos_no_gustan: string | null;
    comidas_al_dia: number;
    horarios: string | null;
  };
  semanas: number;
  /** Cambio de peso por semana (kg) en cada tramo: [semanas, kg/semana]. */
  tramos: [number, number][];
  diasSinPesar: number;
  ajustes: (cfg: ConfigPlan) => { semana: number; motivo: string; config: ConfigPlan }[];
  notas: string[];
}

const EJEMPLOS: Ejemplo[] = [
  {
    ficha: {
      nombre: "Laura Martín (ejemplo)", email: "laura@ejemplo.com", sexo: "mujer", fecha_nacimiento: "1992-04-18",
      altura_cm: 165, peso_inicial_kg: 72, grasa_inicial_pct: 30, objetivo: "perdida_grasa", estilo_vida: "sedentario",
      pasos_diarios: 7000, dias_entreno: 3, tipo_entreno: ["fuerza"], tipo_dieta: "omnivora", alergias: null,
      intolerancias: null, alimentos_no_gustan: "Brócoli, coliflor", comidas_al_dia: 4, horarios: "Oficina 9-17. Entrena a las 18:30.",
    },
    semanas: 10, tramos: [[10, -0.45]], diasSinPesar: 1,
    ajustes: (cfg) => [{ semana: 5, motivo: "Media estable 2 semanas: −100 kcal de carbohidratos", config: { ...cfg, ajuste: { modo: "porcentaje", valor: -24 } } }],
    notas: ["Prefiere cenar ligero. Le cuesta llegar a la proteína en el desayuno."],
  },
  {
    ficha: {
      nombre: "Javier Ruiz (ejemplo)", email: "javier@ejemplo.com", sexo: "hombre", fecha_nacimiento: "1998-09-02",
      altura_cm: 178, peso_inicial_kg: 70, grasa_inicial_pct: 14, objetivo: "ganancia_muscular", estilo_vida: "de_pie",
      pasos_diarios: 10000, dias_entreno: 5, tipo_entreno: ["fuerza"], tipo_dieta: "omnivora", alergias: "Frutos secos",
      intolerancias: null, alimentos_no_gustan: null, comidas_al_dia: 5, horarios: "Camarero, turnos de tarde.",
    },
    semanas: 8, tramos: [[8, 0.25]], diasSinPesar: 0, ajustes: () => [],
    notas: ["Alergia a frutos secos: revisar siempre snacks y cremas."],
  },
  {
    ficha: {
      nombre: "Marta Gómez (ejemplo)", email: "marta@ejemplo.com", sexo: "mujer", fecha_nacimiento: "1985-01-27",
      altura_cm: 160, peso_inicial_kg: 64, grasa_inicial_pct: null, objetivo: "recomposicion", estilo_vida: "sedentario",
      pasos_diarios: 9000, dias_entreno: 4, tipo_entreno: ["fuerza", "cardio"], tipo_dieta: "vegetariana", alergias: null,
      intolerancias: "Lactosa", alimentos_no_gustan: null, comidas_al_dia: 4, horarios: null,
    },
    semanas: 6, tramos: [[6, -0.08]], diasSinPesar: 2, ajustes: () => [],
    notas: [],
  },
  {
    ficha: {
      nombre: "Carlos Pérez (ejemplo)", email: "carlos@ejemplo.com", sexo: "hombre", fecha_nacimiento: "1981-06-11",
      altura_cm: 182, peso_inicial_kg: 98, grasa_inicial_pct: 27, objetivo: "perdida_grasa", estilo_vida: "sedentario",
      pasos_diarios: 6000, dias_entreno: 3, tipo_entreno: ["fuerza"], tipo_dieta: "omnivora", alergias: null,
      intolerancias: null, alimentos_no_gustan: "Pescado azul", comidas_al_dia: 3, horarios: "Viaja mucho por trabajo.",
    },
    // Baja bien 8 semanas y luego se estanca: debería salir "Progreso lento"
    semanas: 12, tramos: [[8, -0.8], [4, -0.05]], diasSinPesar: 9,
    ajustes: (cfg) => [{ semana: 6, motivo: "Subo pasos a 8000 y mantengo kcal", config: { ...cfg, pasosDiarios: 8000 } }],
    notas: ["Comidas fuera de casa 3-4 veces por semana.", "Estancado desde hace unas semanas: valorar ajuste."],
  },
];

/** Ruido determinista (siempre igual) para que el peso diario parezca real. */
function ruido(semilla: number): number {
  const x = Math.sin(semilla * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.9; // ±0,45 kg
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export interface EjemploGenerado {
  ficha: Ejemplo["ficha"] & { fecha_inicio: string };
  pesos: { fecha: string; peso_kg: number }[];
  planes: { created_at: string; motivo: string; config: ConfigPlan; activo: boolean; datos: ReturnType<typeof datosDe>; resultado: ReturnType<typeof calcularPlan> }[];
  notas: string[];
}

function datosDe(f: Ejemplo["ficha"], pesoKg: number, en: Date) {
  return { sexo: f.sexo, pesoKg, alturaCm: f.altura_cm, edad: calcularEdad(f.fecha_nacimiento, en), grasaPct: f.grasa_inicial_pct };
}

export function generarEjemplos(hoy: Date = new Date()): EjemploGenerado[] {
  return EJEMPLOS.map((e, idx) => {
    const inicio = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - e.semanas * 7));
    const pesos: { fecha: string; peso_kg: number }[] = [];
    let tendencia = e.ficha.peso_inicial_kg;
    let dia = 0;
    for (const [semanas, kgSemana] of e.tramos) {
      for (let i = 0; i < semanas * 7; i++, dia++) {
        tendencia += kgSemana / 7;
        const fecha = new Date(inicio.getTime() + dia * 86400000);
        const diasHastaHoy = e.semanas * 7 - dia;
        // Se pesa ~5 de cada 7 días, y no en los últimos "diasSinPesar"
        if (dia > 0 && (ruido(dia * 7 + idx) > 0.25 || diasHastaHoy <= e.diasSinPesar)) continue;
        const peso = dia === 0 ? e.ficha.peso_inicial_kg : tendencia + ruido(dia + idx * 100);
        pesos.push({ fecha: iso(fecha), peso_kg: Math.round(peso * 10) / 10 });
      }
    }

    const base = configPorDefecto(e.ficha.objetivo);
    base.pasosDiarios = e.ficha.pasos_diarios;
    base.diasEntreno = e.ficha.dias_entreno;
    base.factorEstiloVida = { sedentario: 1.15, de_pie: 1.25, fisico: 1.4 }[e.ficha.estilo_vida];
    const versiones = [{ semana: 0, motivo: "Plan inicial", config: base }, ...e.ajustes(base)];
    const planes = versiones.map((v, i) => {
      const fecha = new Date(inicio.getTime() + v.semana * 7 * 86400000);
      const pesoRef = pesos.filter((p) => p.fecha <= iso(fecha)).at(-1)?.peso_kg ?? e.ficha.peso_inicial_kg;
      const datos = datosDe(e.ficha, pesoRef, fecha);
      return {
        created_at: new Date(fecha.getTime() + 10 * 3600000).toISOString(),
        motivo: v.motivo,
        config: v.config,
        activo: i === versiones.length - 1,
        datos,
        resultado: calcularPlan(datos, v.config),
      };
    });

    return { ficha: { ...e.ficha, fecha_inicio: iso(inicio) }, pesos, planes, notas: e.notas };
  });
}
