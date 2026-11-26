/**
 * Formulario de alta (cuestionario inicial) que rellena el CLIENTE desde un
 * enlace. Aquí se definen TODAS las preguntas en un solo sitio: la pantalla
 * del cliente, la validación y el resumen que ve el entrenador salen de esta
 * lista. Para añadir, quitar o cambiar una pregunta, basta con tocarla aquí.
 *
 * Las respuestas cuya clave coincide con un campo de la ficha (nombre, sexo,
 * altura...) rellenan la ficha del cliente automáticamente. El resto
 * (salud, hábitos, medidas...) se guardan y se muestran en la ficha como
 * "Cuestionario inicial".
 *
 * Sin dependencias de pantalla ni de base de datos: se puede probar con tests.
 */
import { calcularEdad } from "./nutrition/edad";
import { grasaMarina } from "./nutrition/grasa";
import type { Calculo } from "./nutrition/tipos";

export type TipoPregunta =
  | "texto"
  | "largo" // texto de varias líneas
  | "email"
  | "telefono"
  | "fecha"
  | "numero"
  | "opcion" // una sola respuesta
  | "varias" // varias respuestas
  | "escala"; // del 1 al 5

export interface Pregunta {
  clave: string;
  pregunta: string;
  tipo: TipoPregunta;
  obligatoria?: boolean;
  ayuda?: string;
  /** Para "opcion" y "varias": [valor, texto que ve el cliente] */
  opciones?: readonly (readonly [string, string])[];
  /** Para "numero" */
  min?: number;
  max?: number;
  paso?: number;
  unidad?: string;
  /** Para "escala": qué significa el 1 y el 5 */
  extremos?: readonly [string, string];
  /** Solo se pregunta si otra respuesta tiene cierto valor (o uno de varios) */
  soloSi?: { clave: string; valor: string | readonly string[] };
  /** Ocupa todo el ancho en pantallas grandes */
  ancho?: boolean;
}

export interface Seccion {
  id: string;
  titulo: string;
  intro?: string;
  preguntas: Pregunta[];
}

const SI_NO = [
  ["si", "Sí"],
  ["no", "No"],
] as const;

export const SECCIONES: Seccion[] = [
  {
    id: "personales",
    titulo: "Sobre ti",
    preguntas: [
      { clave: "nombre", pregunta: "Nombre y apellidos", tipo: "texto", obligatoria: true, ancho: true },
      { clave: "email", pregunta: "Email", tipo: "email", obligatoria: true },
      { clave: "telefono", pregunta: "Teléfono (WhatsApp)", tipo: "telefono" },
      {
        clave: "sexo",
        pregunta: "Sexo",
        tipo: "opcion",
        obligatoria: true,
        opciones: [
          ["mujer", "Mujer"],
          ["hombre", "Hombre"],
        ],
        ayuda: "Lo necesito para las fórmulas de gasto energético.",
      },
      { clave: "fecha_nacimiento", pregunta: "Fecha de nacimiento", tipo: "fecha", obligatoria: true },
      { clave: "altura_cm", pregunta: "Altura", tipo: "numero", unidad: "cm", min: 100, max: 250, paso: 0.5, obligatoria: true },
      {
        clave: "peso_inicial_kg",
        pregunta: "Peso actual",
        tipo: "numero",
        unidad: "kg",
        min: 30,
        max: 300,
        paso: 0.1,
        obligatoria: true,
        ayuda: "Mejor en ayunas, después de ir al baño.",
      },
      { clave: "profesion", pregunta: "¿A qué te dedicas?", tipo: "texto" },
    ],
  },
  {
    id: "objetivo",
    titulo: "Tu objetivo",
    preguntas: [
      {
        clave: "objetivo",
        pregunta: "¿Qué quieres conseguir principalmente?",
        tipo: "opcion",
        obligatoria: true,
        ancho: true,
        opciones: [
          ["perdida_grasa", "Perder grasa"],
          ["ganancia_muscular", "Ganar músculo"],
          ["recomposicion", "Perder grasa y ganar músculo a la vez"],
          ["mantenimiento", "Mantenerme y mejorar hábitos"],
          ["rendimiento", "Rendir más en mi deporte"],
        ],
      },
      {
        clave: "objetivo_detalle",
        pregunta: "Cuéntame con tus palabras qué te gustaría lograr",
        tipo: "largo",
        ancho: true,
        ayuda: "Por ejemplo: «bajar 6 kg antes del verano», «correr una media maratón», «sentirme con más energía».",
      },
      { clave: "peso_objetivo_kg", pregunta: "Peso al que te gustaría llegar (si tienes uno)", tipo: "numero", unidad: "kg", min: 30, max: 300, paso: 0.5 },
      { clave: "fecha_objetivo", pregunta: "¿Tienes una fecha en mente?", tipo: "texto", ayuda: "Una boda, unas vacaciones, una competición..." },
      { clave: "motivacion", pregunta: "¿Por qué ahora? ¿Qué te ha hecho dar el paso?", tipo: "largo", ancho: true },
      {
        clave: "intentos_previos",
        pregunta: "¿Has seguido antes alguna dieta o plan? ¿Qué tal te fue?",
        tipo: "largo",
        ancho: true,
      },
    ],
  },
  {
    id: "medidas",
    titulo: "Medidas iniciales (opcional)",
    intro:
      "Si tienes una cinta métrica a mano, mide sin apretar y por la mañana. Con el cuello, la cintura y (en mujeres) la cadera calculo tu % de grasa. Si no puedes medirte, no pasa nada: déjalo vacío y lo hacemos más adelante.",
    preguntas: [
      { clave: "cuello_cm", pregunta: "Cuello", tipo: "numero", unidad: "cm", min: 20, max: 70, paso: 0.5, ayuda: "Justo por debajo de la nuez." },
      {
        clave: "cintura_cm",
        pregunta: "Cintura",
        tipo: "numero",
        unidad: "cm",
        min: 40,
        max: 200,
        paso: 0.5,
        ayuda: "Hombres: a la altura del ombligo. Mujeres: en la parte más estrecha.",
      },
      { clave: "cadera_cm", pregunta: "Cadera", tipo: "numero", unidad: "cm", min: 50, max: 200, paso: 0.5, ayuda: "En la parte más ancha del glúteo." },
      { clave: "pecho_cm", pregunta: "Pecho", tipo: "numero", unidad: "cm", min: 50, max: 200, paso: 0.5, ayuda: "A la altura de los pezones." },
      { clave: "brazo_cm", pregunta: "Brazo", tipo: "numero", unidad: "cm", min: 15, max: 70, paso: 0.5, ayuda: "Mitad del brazo, relajado." },
      { clave: "muslo_cm", pregunta: "Muslo", tipo: "numero", unidad: "cm", min: 25, max: 100, paso: 0.5, ayuda: "Mitad del muslo." },
      {
        clave: "bascula_grasa",
        pregunta: "¿Puedes medirte en una báscula de bioimpedancia o con DEXA (en tu gimnasio, farmacia...)?",
        tipo: "opcion",
        ancho: true,
        opciones: [
          ["bioimpedancia", "Sí, báscula de bioimpedancia"],
          ["dexa", "Sí, DEXA"],
          ["no", "No"],
        ],
      },
      {
        clave: "grasa_medida_pct",
        pregunta: "% de grasa que te da",
        tipo: "numero",
        unidad: "%",
        min: 3,
        max: 60,
        paso: 0.1,
        soloSi: { clave: "bascula_grasa", valor: ["bioimpedancia", "dexa"] },
        ayuda: "Pon el último resultado. Si aún no te has medido, déjalo vacío y me lo pasas cuando lo hagas.",
      },
    ],
  },
  {
    id: "dia_a_dia",
    titulo: "Tu día a día",
    preguntas: [
      {
        clave: "estilo_vida",
        pregunta: "¿Cómo es tu trabajo o tu día normal?",
        tipo: "opcion",
        obligatoria: true,
        ancho: true,
        opciones: [
          ["sedentario", "Paso casi todo el día sentado/a (oficina, coche, estudio)"],
          ["de_pie", "Paso mucho tiempo de pie o moviéndome (comercio, hostelería, profesor/a)"],
          ["fisico", "Trabajo físico duro (obra, almacén, campo)"],
        ],
      },
      {
        clave: "pasos_diarios",
        pregunta: "Pasos al día (aproximado)",
        tipo: "numero",
        min: 0,
        max: 50000,
        paso: 500,
        ayuda: "Míralo en el móvil o el reloj (media de la última semana). Si no lo sabes, déjalo vacío.",
      },
      { clave: "horario_trabajo", pregunta: "Horario de trabajo o estudio", tipo: "texto", ayuda: "Por ejemplo: 8:00-15:00, turnos de mañana/tarde..." },
      { clave: "horas_sueno", pregunta: "Horas que duermes de media", tipo: "numero", unidad: "h", min: 2, max: 14, paso: 0.5 },
      { clave: "calidad_sueno", pregunta: "¿Qué tal duermes?", tipo: "escala", extremos: ["Fatal", "Genial"] },
      { clave: "estres", pregunta: "Nivel de estrés habitual", tipo: "escala", extremos: ["Muy bajo", "Muy alto"] },
    ],
  },
  {
    id: "entreno",
    titulo: "Entrenamiento",
    preguntas: [
      {
        clave: "experiencia",
        pregunta: "¿Cuánto tiempo llevas entrenando?",
        tipo: "opcion",
        opciones: [
          ["nada", "No entreno ahora mismo"],
          ["menos_1", "Menos de 1 año"],
          ["1_3", "Entre 1 y 3 años"],
          ["mas_3", "Más de 3 años"],
        ],
      },
      { clave: "dias_entreno", pregunta: "¿Cuántos días a la semana puedes entrenar?", tipo: "numero", min: 0, max: 7, paso: 1, obligatoria: true },
      {
        clave: "tipo_entreno",
        pregunta: "¿Qué tipo de entrenamiento haces o te gustaría hacer?",
        tipo: "varias",
        ancho: true,
        opciones: [
          ["fuerza", "Fuerza / pesas"],
          ["cardio", "Cardio (correr, bici, nadar...)"],
          ["hiit", "HIIT / clases intensas"],
          ["deporte", "Un deporte"],
        ],
      },
      { clave: "deporte", pregunta: "¿Qué deporte?", tipo: "texto", soloSi: { clave: "tipo_entreno", valor: "deporte" } },
      { clave: "duracion_sesion_min", pregunta: "¿Cuánto dura cada sesión?", tipo: "numero", unidad: "min", min: 10, max: 300, paso: 5 },
      { clave: "hora_entreno", pregunta: "¿A qué hora sueles entrenar?", tipo: "texto", ayuda: "Mañana, mediodía, tarde, noche o la hora exacta." },
      {
        clave: "lugar_entreno",
        pregunta: "¿Dónde entrenas?",
        tipo: "varias",
        ancho: true,
        opciones: [
          ["gimnasio", "Gimnasio"],
          ["casa", "En casa"],
          ["aire_libre", "Al aire libre"],
          ["club", "Club o centro deportivo"],
        ],
      },
      { clave: "material_casa", pregunta: "Si entrenas en casa, ¿qué material tienes?", tipo: "texto", soloSi: { clave: "lugar_entreno", valor: "casa" }, ancho: true },
    ],
  },
  {
    id: "alimentacion",
    titulo: "Alimentación",
    preguntas: [
      {
        clave: "tipo_dieta",
        pregunta: "¿Cómo comes?",
        tipo: "opcion",
        obligatoria: true,
        opciones: [
          ["omnivora", "Como de todo"],
          ["pescetariana", "Pescetariana (pescado sí, carne no)"],
          ["vegetariana", "Vegetariana"],
          ["vegana", "Vegana"],
        ],
      },
      { clave: "comidas_al_dia", pregunta: "¿Cuántas comidas te viene bien hacer al día?", tipo: "numero", min: 1, max: 8, paso: 1, obligatoria: true },
      {
        clave: "horarios_comidas",
        pregunta: "¿A qué horas sueles comer?",
        tipo: "largo",
        ancho: true,
        ayuda: "Por ejemplo: desayuno 7:30, comida 14:30, merienda 18:00, cena 21:30.",
      },
      { clave: "alergias", pregunta: "Alergias alimentarias", tipo: "texto", ayuda: "Si no tienes, déjalo vacío." },
      { clave: "intolerancias", pregunta: "Intolerancias (lactosa, gluten...)", tipo: "texto" },
      { clave: "alimentos_no_gustan", pregunta: "Alimentos que NO te gustan o no quieres comer", tipo: "largo", ancho: true },
      { clave: "alimentos_favoritos", pregunta: "Alimentos que te encantan y no quieres dejar", tipo: "largo", ancho: true },
      {
        clave: "comer_fuera",
        pregunta: "¿Cuántas veces a la semana comes fuera de casa o pides comida?",
        tipo: "opcion",
        opciones: [
          ["0", "Casi nunca"],
          ["1_2", "1-2 veces"],
          ["3_5", "3-5 veces"],
          ["mas_5", "Más de 5 veces"],
        ],
      },
      {
        clave: "cocina",
        pregunta: "¿Quién cocina y cuánto tiempo tienes?",
        tipo: "texto",
        ancho: true,
        ayuda: "Por ejemplo: «cocino yo, poco tiempo entre semana; el domingo preparo táperes».",
      },
      { clave: "agua_litros", pregunta: "Agua que bebes al día", tipo: "numero", unidad: "litros", min: 0, max: 10, paso: 0.25 },
      {
        clave: "alcohol",
        pregunta: "¿Bebes alcohol?",
        tipo: "opcion",
        opciones: [
          ["no", "No"],
          ["ocasional", "De vez en cuando"],
          ["fin_semana", "Los fines de semana"],
          ["frecuente", "Varios días a la semana"],
        ],
      },
      { clave: "hambre", pregunta: "¿Cuánta hambre sueles tener durante el día?", tipo: "escala", extremos: ["Casi nada", "Muchísima"] },
      { clave: "picoteo", pregunta: "¿Cuándo te cuesta más controlarte o picas entre horas?", tipo: "texto", ancho: true },
      { clave: "suplementos", pregunta: "¿Tomas algún suplemento? (proteína, creatina, vitaminas...)", tipo: "texto", ancho: true },
    ],
  },
  {
    id: "salud",
    titulo: "Salud",
    intro: "Esta información es confidencial y solo la verá tu entrenador. Me sirve para adaptar el plan con seguridad.",
    preguntas: [
      {
        clave: "patologias",
        pregunta: "¿Tienes alguna enfermedad o problema de salud?",
        tipo: "largo",
        ancho: true,
        ayuda: "Diabetes, tensión alta, tiroides, colesterol, problemas digestivos, SOP... Si no, déjalo vacío.",
      },
      { clave: "medicacion", pregunta: "¿Tomas alguna medicación?", tipo: "texto", ancho: true },
      { clave: "lesiones", pregunta: "¿Tienes lesiones, dolores u operaciones que deba tener en cuenta?", tipo: "largo", ancho: true },
      { clave: "digestion", pregunta: "¿Qué tal tus digestiones?", tipo: "escala", extremos: ["Muy mal", "Perfectas"] },
      {
        clave: "embarazo",
        pregunta: "¿Estás embarazada o en periodo de lactancia?",
        tipo: "opcion",
        opciones: [
          ["no", "No"],
          ["embarazo", "Estoy embarazada"],
          ["lactancia", "Estoy en lactancia"],
        ],
        soloSi: { clave: "sexo", valor: "mujer" },
      },
      {
        clave: "relacion_comida",
        pregunta: "¿Has tenido alguna vez una relación difícil con la comida (atracones, trastornos de la conducta alimentaria)?",
        tipo: "opcion",
        ancho: true,
        opciones: [...SI_NO, ["prefiero_no", "Prefiero no decirlo"]],
        ayuda: "No pasa nada si es que sí: me ayuda a plantear el plan de la forma más sana para ti.",
      },
      { clave: "comentarios", pregunta: "¿Algo más que quieras contarme?", tipo: "largo", ancho: true },
    ],
  },
];

export const TODAS_LAS_PREGUNTAS: Pregunta[] = SECCIONES.flatMap((s) => s.preguntas);

/** Respuestas ya validadas: texto, número o lista de textos. */
export type Respuestas = Record<string, string | number | string[]>;

/** Lo que llega del formulario: cada campo como texto (o varios textos). */
export type EntradaCruda = Record<string, string | string[] | undefined>;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXTO = 2000;

/** ¿Hay que hacer esta pregunta, según las demás respuestas? */
export function seAplica(p: Pregunta, valores: Record<string, unknown>): boolean {
  if (!p.soloSi) return true;
  const v = valores[p.soloSi.clave];
  const buscados: readonly string[] = typeof p.soloSi.valor === "string" ? [p.soloSi.valor] : p.soloSi.valor;
  return Array.isArray(v) ? v.some((x) => buscados.includes(x)) : typeof v === "string" && buscados.includes(v);
}

/**
 * Comprueba las respuestas del cliente. Devuelve las respuestas limpias
 * (números como número, vacíos fuera) o los errores por campo.
 */
export function validarRespuestas(
  entrada: EntradaCruda,
): { ok: true; respuestas: Respuestas } | { ok: false; errores: Record<string, string> } {
  const respuestas: Respuestas = {};
  const errores: Record<string, string> = {};

  for (const p of TODAS_LAS_PREGUNTAS) {
    if (!seAplica(p, entrada)) continue;
    const bruto = entrada[p.clave];

    if (p.tipo === "varias") {
      const lista = (Array.isArray(bruto) ? bruto : bruto ? [bruto] : []).filter(Boolean);
      const validos = new Set(p.opciones!.map(([v]) => v));
      if (lista.some((v) => !validos.has(v))) errores[p.clave] = "Opción no válida";
      else if (lista.length > 0) respuestas[p.clave] = lista;
      else if (p.obligatoria) errores[p.clave] = "Elige al menos una opción";
      continue;
    }

    const texto = (Array.isArray(bruto) ? bruto[0] : bruto ?? "").trim();
    if (texto === "") {
      if (p.obligatoria) errores[p.clave] = "Este dato es necesario";
      continue;
    }

    switch (p.tipo) {
      case "numero": {
        const n = Number(texto.replace(",", "."));
        if (!Number.isFinite(n)) errores[p.clave] = "Escribe un número";
        else if (p.min != null && n < p.min) errores[p.clave] = `Mínimo ${p.min}${p.unidad ? " " + p.unidad : ""}`;
        else if (p.max != null && n > p.max) errores[p.clave] = `Máximo ${p.max}${p.unidad ? " " + p.unidad : ""}`;
        else if (p.paso === 1 && !Number.isInteger(n)) errores[p.clave] = "Escribe un número entero";
        else respuestas[p.clave] = n;
        break;
      }
      case "escala": {
        const n = Number(texto);
        if (![1, 2, 3, 4, 5].includes(n)) errores[p.clave] = "Elige del 1 al 5";
        else respuestas[p.clave] = n;
        break;
      }
      case "opcion":
        if (!p.opciones!.some(([v]) => v === texto)) errores[p.clave] = "Opción no válida";
        else respuestas[p.clave] = texto;
        break;
      case "fecha": {
        const d = new Date(texto + "T00:00:00");
        if (!FECHA.test(texto) || Number.isNaN(d.getTime())) errores[p.clave] = "Fecha no válida";
        else if (p.clave === "fecha_nacimiento" && (d > new Date() || d.getFullYear() < 1900)) errores[p.clave] = "Revisa la fecha";
        else respuestas[p.clave] = texto;
        break;
      }
      case "email":
        if (!EMAIL.test(texto)) errores[p.clave] = "Email no válido";
        else respuestas[p.clave] = texto.toLowerCase();
        break;
      default:
        if (texto.length > MAX_TEXTO) errores[p.clave] = `Máximo ${MAX_TEXTO} caracteres`;
        else respuestas[p.clave] = texto;
    }
  }

  return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true, respuestas };
}

/** Texto legible de una respuesta (para el resumen del entrenador). */
export function textoRespuesta(p: Pregunta, valor: Respuestas[string] | undefined): string | null {
  if (valor == null || valor === "") return null;
  if (p.tipo === "varias" && Array.isArray(valor)) {
    return valor.map((v) => p.opciones?.find(([o]) => o === v)?.[1] ?? v).join(", ");
  }
  if (p.tipo === "opcion") return p.opciones?.find(([o]) => o === valor)?.[1] ?? String(valor);
  if (p.tipo === "escala") return `${valor} de 5${p.extremos ? ` (1 = ${p.extremos[0]}, 5 = ${p.extremos[1]})` : ""}`;
  if (p.tipo === "numero") return `${String(valor).replace(".", ",")}${p.unidad ? " " + p.unidad : ""}`;
  if (p.tipo === "fecha") {
    const [a, m, d] = String(valor).split("-");
    const fecha = `${d}/${m}/${a}`;
    // La edad se calcula sola a partir de la fecha de nacimiento
    return p.clave === "fecha_nacimiento" ? `${fecha} (${calcularEdad(String(valor))} años)` : fecha;
  }
  return String(valor);
}

/** Campos de la ficha del cliente que se rellenan directamente. */
const CAMPOS_FICHA = [
  "nombre",
  "email",
  "telefono",
  "sexo",
  "fecha_nacimiento",
  "altura_cm",
  "peso_inicial_kg",
  "objetivo",
  "estilo_vida",
  "pasos_diarios",
  "dias_entreno",
  "tipo_entreno",
  "tipo_dieta",
  "alimentos_no_gustan",
  "alergias",
  "intolerancias",
  "comidas_al_dia",
] as const;

/**
 * Convierte las respuestas en los valores iniciales de la ficha. Los horarios
 * de la ficha se componen con los de trabajo, entreno y comidas.
 */
export function fichaDesdeRespuestas(r: Respuestas): Record<string, string | number | string[]> {
  const ficha: Record<string, string | number | string[]> = {};
  for (const campo of CAMPOS_FICHA) {
    if (r[campo] != null) ficha[campo] = r[campo];
  }
  const horarios = [
    r.horario_trabajo && `Trabajo: ${r.horario_trabajo}`,
    r.hora_entreno && `Entreno: ${r.hora_entreno}`,
    r.horarios_comidas && `Comidas: ${r.horarios_comidas}`,
  ].filter(Boolean);
  if (horarios.length) ficha.horarios = horarios.join("\n");
  const grasa = grasaDesdeRespuestas(r);
  if (grasa) ficha.grasa_inicial_pct = Math.round(grasa.valor * 10) / 10;
  return ficha;
}

const NOMBRE_METODO: Record<string, string> = { bioimpedancia: "báscula de bioimpedancia", dexa: "DEXA" };

/**
 * % de grasa a partir de las respuestas: si se ha medido con báscula o DEXA
 * se usa ese dato; si no, se estima con la fórmula de la Marina (cuello,
 * cintura, cadera y altura). Null si no hay datos suficientes.
 */
export function grasaDesdeRespuestas(r: Respuestas): { valor: number; origen: string; calculo?: Calculo } | null {
  if (typeof r.grasa_medida_pct === "number") {
    return { valor: r.grasa_medida_pct, origen: `medido con ${NOMBRE_METODO[String(r.bascula_grasa)] ?? "báscula"}` };
  }
  if (r.sexo !== "hombre" && r.sexo !== "mujer") return null;
  const n = (c: string) => (typeof r[c] === "number" ? (r[c] as number) : null);
  const calculo = grasaMarina({
    sexo: r.sexo,
    alturaCm: n("altura_cm") ?? 0,
    cuelloCm: n("cuello_cm"),
    cinturaCm: n("cintura_cm"),
    caderaCm: n("cadera_cm"),
  });
  return calculo ? { valor: calculo.valor, origen: "estimado con la fórmula de la Marina", calculo } : null;
}

/** Medidas del formulario que pasan al registro de medidas (tabla `medidas`). */
export const CLAVES_MEDIDAS = ["cuello_cm", "cintura_cm", "cadera_cm", "pecho_cm", "brazo_cm", "muslo_cm"] as const;
export type ClaveMedida = (typeof CLAVES_MEDIDAS)[number];

export interface MedidasAlta extends Partial<Record<ClaveMedida, number>> {
  grasa_pct?: number;
  grasa_metodo?: string;
}

/** Medidas que puso el cliente en el formulario, o null si no puso ninguna. */
export function medidasDesdeRespuestas(r: Respuestas): MedidasAlta | null {
  const m: MedidasAlta = {};
  for (const c of CLAVES_MEDIDAS) if (typeof r[c] === "number") m[c] = r[c] as number;
  if (typeof r.grasa_medida_pct === "number") {
    m.grasa_pct = r.grasa_medida_pct;
    m.grasa_metodo = String(r.bascula_grasa);
  }
  return Object.keys(m).length > 0 ? m : null;
}

/** Preguntas que NO van a la ficha: se muestran aparte como cuestionario. */
export const CLAVES_SOLO_CUESTIONARIO = new Set(
  TODAS_LAS_PREGUNTAS.map((p) => p.clave).filter(
    (c) =>
      !(CAMPOS_FICHA as readonly string[]).includes(c) &&
      !(CLAVES_MEDIDAS as readonly string[]).includes(c) &&
      c !== "bascula_grasa" &&
      c !== "grasa_medida_pct",
  ),
);

/** Avisos para el entrenador a partir de las respuestas de salud. */
export function avisosSalud(r: Respuestas): string[] {
  const avisos: string[] = [];
  if (r.embarazo === "embarazo") avisos.push("Embarazada: no plantear déficit calórico; coordinar con su médico.");
  if (r.embarazo === "lactancia") avisos.push("En lactancia: déficit muy suave como mucho.");
  if (r.relacion_comida === "si") avisos.push("Ha tenido una relación difícil con la comida: evitar enfoques muy restrictivos.");
  if (r.patologias) avisos.push("Indica problemas de salud: revísalos antes de calcular el plan.");
  if (r.medicacion) avisos.push("Toma medicación.");
  if (r.alergias) avisos.push(`Alergias: ${r.alergias}`);
  return avisos;
}
