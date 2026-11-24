/**
 * Lectura de datos desde Supabase. Todas las consultas pasan por las reglas
 * RLS, así que cada usuario solo recibe lo que le corresponde.
 */
import { crearClienteServidor } from "./supabase/server";
import type { ConfigPlan } from "./nutrition/plan";
import type { Objetivo, Sexo, TipoDia } from "./nutrition/tipos";
import type { EstiloVida } from "./nutrition/gasto-total";

export interface Cliente {
  id: string;
  entrenador_id: string;
  usuario_id: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  sexo: Sexo;
  fecha_nacimiento: string;
  altura_cm: number;
  peso_inicial_kg: number;
  grasa_inicial_pct: number | null;
  objetivo: Objetivo;
  estilo_vida: EstiloVida;
  pasos_diarios: number | null;
  dias_entreno: number | null;
  tipo_entreno: string[];
  tipo_dieta: "omnivora" | "vegetariana" | "vegana" | "pescetariana";
  alimentos_no_gustan: string | null;
  alergias: string | null;
  intolerancias: string | null;
  comidas_al_dia: number | null;
  horarios: string | null;
  fecha_inicio: string;
  activo: boolean;
  es_ejemplo: boolean;
  consentimiento_salud: boolean;
  consentimiento_fecha: string | null;
  consentimiento_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface Peso {
  id: string;
  cliente_id: string;
  fecha: string;
  peso_kg: number;
  nota: string | null;
}

export interface ObjetivoDiaFila {
  tipo_dia: TipoDia;
  kcal: number;
  proteina_g: number;
  grasa_g: number;
  carbohidratos_g: number;
  fibra_g: number;
  agua_l: number;
}

export interface PlanFila {
  id: string;
  cliente_id: string;
  config: ConfigPlan;
  datos_cliente: { pesoKg: number; edad: number; grasaPct: number | null };
  peso_referencia_kg: number;
  media_semanal_kcal: number;
  motivo: string | null;
  activo: boolean;
  created_at: string;
  objetivos_dia: ObjetivoDiaFila[];
}

export interface Nota {
  id: string;
  texto: string;
  created_at: string;
}

/** Postgres devuelve los "numeric" como texto: los pasamos a número. */
function num<T>(fila: T, campos: (keyof T)[]): T {
  const copia = { ...fila };
  for (const c of campos) {
    const v = copia[c] as unknown;
    if (v != null) (copia[c] as unknown) = Number(v);
  }
  return copia;
}

const NUM_CLIENTE: (keyof Cliente)[] = ["altura_cm", "peso_inicial_kg", "grasa_inicial_pct"];
const NUM_OBJ: (keyof ObjetivoDiaFila)[] = ["kcal", "proteina_g", "grasa_g", "carbohidratos_g", "fibra_g", "agua_l"];

function normalizarPlan(p: PlanFila): PlanFila {
  const orden: TipoDia[] = ["entreno", "entreno_intenso", "descanso"];
  return {
    ...num(p, ["peso_referencia_kg", "media_semanal_kcal"]),
    objetivos_dia: (p.objetivos_dia ?? [])
      .map((o) => num(o, NUM_OBJ))
      .sort((a, b) => orden.indexOf(a.tipo_dia) - orden.indexOf(b.tipo_dia)),
  };
}

export async function listarClientes(): Promise<Cliente[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("clientes").select("*").order("nombre");
  if (error) throw error;
  return (data as Cliente[]).map((c) => num(c, NUM_CLIENTE));
}

export async function obtenerCliente(id: string): Promise<Cliente | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
  return data ? num(data as Cliente, NUM_CLIENTE) : null;
}

export async function obtenerPesos(clienteIds: string[]): Promise<Peso[]> {
  if (clienteIds.length === 0) return [];
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("registros_peso")
    .select("id, cliente_id, fecha, peso_kg, nota")
    .in("cliente_id", clienteIds)
    .order("fecha");
  if (error) throw error;
  return (data as Peso[]).map((p) => num(p, ["peso_kg"]));
}

export async function obtenerPlanes(clienteIds: string[], soloActivos = false): Promise<PlanFila[]> {
  if (clienteIds.length === 0) return [];
  const supabase = await crearClienteServidor();
  let q = supabase
    .from("planes_nutricionales")
    .select("*, objetivos_dia(*)")
    .in("cliente_id", clienteIds)
    .order("created_at", { ascending: false });
  if (soloActivos) q = q.eq("activo", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data as PlanFila[]).map(normalizarPlan);
}

export async function obtenerNotas(clienteId: string): Promise<Nota[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("notas_cliente")
    .select("id, texto, created_at")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  return (data as Nota[]) ?? [];
}
