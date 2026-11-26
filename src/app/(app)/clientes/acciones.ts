"use server";

/**
 * Acciones del servidor: todo lo que GUARDA o BORRA datos de clientes.
 * Las reglas RLS de la base de datos comprueban además que el usuario sea el
 * entrenador de ese cliente.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirEntrenador } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { calcularEdad } from "@/lib/nutrition/edad";
import { calcularPlan, configPorDefecto, type ConfigPlan } from "@/lib/nutrition/plan";
import { TEXTO_CONSENTIMIENTO_VERSION } from "@/lib/consentimiento";

export interface EstadoFormulario {
  error?: string;
  errores?: Record<string, string>;
  ok?: boolean;
  /** Lo que se envió, para no vaciar el formulario si hay errores. */
  valores?: Record<string, unknown>;
}

const vacioANull = (v: unknown) => (v === "" || v == null ? null : v);

const esquemaCliente = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre"),
  email: z.preprocess(vacioANull, z.string().email("Email no válido").nullable()),
  telefono: z.preprocess(vacioANull, z.string().nullable()),
  sexo: z.enum(["hombre", "mujer"], { message: "Elige el sexo" }),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
  altura_cm: z.coerce.number({ message: "Altura no válida" }).min(100, "Mínimo 100 cm").max(250, "Máximo 250 cm"),
  peso_inicial_kg: z.coerce.number({ message: "Peso no válido" }).min(30, "Mínimo 30 kg").max(300, "Máximo 300 kg"),
  grasa_inicial_pct: z.preprocess(vacioANull, z.coerce.number().min(3).max(60).nullable()),
  objetivo: z.enum(["perdida_grasa", "ganancia_muscular", "recomposicion", "mantenimiento", "rendimiento"]),
  estilo_vida: z.enum(["sedentario", "de_pie", "fisico"]),
  pasos_diarios: z.preprocess(vacioANull, z.coerce.number().int().min(0).max(50000).nullable()),
  dias_entreno: z.preprocess(vacioANull, z.coerce.number().int().min(0).max(7).nullable()),
  tipo_entreno: z.array(z.string()).default([]),
  tipo_dieta: z.enum(["omnivora", "vegetariana", "vegana", "pescetariana"]),
  alimentos_no_gustan: z.preprocess(vacioANull, z.string().nullable()),
  alergias: z.preprocess(vacioANull, z.string().nullable()),
  intolerancias: z.preprocess(vacioANull, z.string().nullable()),
  comidas_al_dia: z.preprocess(vacioANull, z.coerce.number().int().min(1).max(8).nullable()),
  horarios: z.preprocess(vacioANull, z.string().nullable()),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
});

function leerFormulario(fd: FormData) {
  const datos: Record<string, unknown> = Object.fromEntries(fd.entries());
  datos.tipo_entreno = fd.getAll("tipo_entreno").map(String);
  return datos;
}

function erroresDe(e: z.ZodError): Record<string, string> {
  const r: Record<string, string> = {};
  for (const i of e.issues) r[String(i.path[0])] ??= i.message;
  return r;
}

export async function crearCliente(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  await exigirEntrenador();
  const valores = leerFormulario(fd);
  if (fd.get("consentimiento") !== "on") {
    return { valores, errores: { consentimiento: "Sin el consentimiento del cliente no se pueden guardar datos de salud." } };
  }
  const r = esquemaCliente.safeParse(valores);
  if (!r.success) return { valores, errores: erroresDe(r.error) };
  const creado = await insertarClienteConPlan(r.data, {
    fecha: new Date().toISOString(),
    version: TEXTO_CONSENTIMIENTO_VERSION,
  });
  if ("error" in creado) return { valores, error: creado.error };
  revalidatePath("/clientes");
  redirect(`/clientes/${creado.id}`);
}

/**
 * Crea la ficha a partir de un formulario de alta recibido. El consentimiento
 * es el que dio el propio cliente al enviar el formulario.
 */
export async function crearClienteDesdeAlta(altaId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  await exigirEntrenador();
  const valores = leerFormulario(fd);
  const r = esquemaCliente.safeParse(valores);
  if (!r.success) return { valores, errores: erroresDe(r.error) };
  const supabase = await crearClienteServidor();
  const { data: alta } = await supabase
    .from("formularios_alta")
    .select("estado, consentimiento_fecha, consentimiento_version")
    .eq("id", altaId)
    .maybeSingle();
  if (!alta || alta.estado !== "recibido" || !alta.consentimiento_fecha) {
    return { valores, error: "Este formulario ya se ha usado o no tiene consentimiento." };
  }
  const creado = await insertarClienteConPlan(r.data, {
    fecha: alta.consentimiento_fecha,
    version: alta.consentimiento_version ?? "",
  });
  if ("error" in creado) return { valores, error: creado.error };
  await supabase.from("formularios_alta").update({ estado: "convertido", cliente_id: creado.id }).eq("id", altaId);
  revalidatePath("/clientes");
  redirect(`/clientes/${creado.id}`);
}

/** Guarda la ficha, el primer peso y un primer plan con valores por defecto. */
async function insertarClienteConPlan(
  datos: z.infer<typeof esquemaCliente>,
  consentimiento: { fecha: string; version: string },
): Promise<{ id: string } | { error: string }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      ...datos,
      consentimiento_salud: true,
      consentimiento_fecha: consentimiento.fecha,
      consentimiento_version: consentimiento.version,
    })
    .select("id")
    .single();
  if (error) return { error: "No se pudo guardar: " + error.message };

  // Primer registro de peso y primer plan con valores por defecto
  await supabase.from("registros_peso").insert({
    cliente_id: data.id,
    fecha: datos.fecha_inicio,
    peso_kg: datos.peso_inicial_kg,
    nota: "Peso inicial",
  });
  const config = configPorDefecto(datos.objetivo);
  if (datos.pasos_diarios != null) config.pasosDiarios = datos.pasos_diarios;
  if (datos.dias_entreno != null) config.diasEntreno = datos.dias_entreno;
  config.factorEstiloVida = { sedentario: 1.15, de_pie: 1.25, fisico: 1.4 }[datos.estilo_vida];
  if (datos.tipo_entreno.includes("cardio") && !datos.tipo_entreno.includes("fuerza")) {
    config.sesiones.entreno.met = 7;
  }
  await guardarPlanInterno(data.id, config, "Plan inicial (valores por defecto)", {
    sexo: datos.sexo,
    pesoKg: datos.peso_inicial_kg,
    alturaCm: datos.altura_cm,
    edad: calcularEdad(datos.fecha_nacimiento),
    grasaPct: datos.grasa_inicial_pct,
  });
  return { id: data.id };
}

export async function actualizarCliente(id: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  await exigirEntrenador();
  const valores = leerFormulario(fd);
  const r = esquemaCliente.safeParse(valores);
  if (!r.success) return { valores, errores: erroresDe(r.error) };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("clientes").update(r.data).eq("id", id);
  if (error) return { valores, error: "No se pudo guardar: " + error.message };
  revalidatePath(`/clientes/${id}`, "layout");
  return { ok: true, valores };
}

/** Borra el cliente y TODOS sus datos (derecho de supresión, RGPD). Irreversible. */
export async function borrarCliente(id: string, fd: FormData) {
  await exigirEntrenador();
  const supabase = await crearClienteServidor();
  const { data: c } = await supabase.from("clientes").select("nombre").eq("id", id).single();
  if (!c || String(fd.get("confirmacion") ?? "").trim() !== c.nombre) {
    redirect(`/clientes/${id}/ficha?borrado=no`);
  }
  await supabase.from("clientes").delete().eq("id", id);
  revalidatePath("/clientes");
  redirect("/clientes");
}

/* ---------- Peso ---------- */

const esquemaPeso = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  peso_kg: z.coerce.number().min(30).max(300),
  nota: z.preprocess(vacioANull, z.string().nullable()),
});

export async function registrarPeso(clienteId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const r = esquemaPeso.safeParse({
    fecha: fd.get("fecha"),
    peso_kg: String(fd.get("peso_kg") ?? "").replace(",", "."),
    nota: fd.get("nota"),
  });
  if (!r.success) return { error: "Revisa la fecha y el peso (entre 30 y 300 kg)." };
  const supabase = await crearClienteServidor();
  // Si ya hay un peso ese día, se sustituye
  const { error } = await supabase
    .from("registros_peso")
    .upsert({ cliente_id: clienteId, ...r.data }, { onConflict: "cliente_id,fecha" });
  if (error) return { error: "No se pudo guardar: " + error.message };
  revalidatePath(`/clientes/${clienteId}`, "layout");
  return { ok: true };
}

export async function borrarPeso(clienteId: string, pesoId: string) {
  await exigirEntrenador();
  const supabase = await crearClienteServidor();
  await supabase.from("registros_peso").delete().eq("id", pesoId).eq("cliente_id", clienteId);
  revalidatePath(`/clientes/${clienteId}`, "layout");
}

/* ---------- Formularios de alta ---------- */

/** Crea un enlace nuevo para que un cliente rellene su formulario de alta. */
export async function crearEnlaceAlta(fd: FormData) {
  await exigirEntrenador();
  const nombre = String(fd.get("nombre_previsto") ?? "").trim().slice(0, 120) || null;
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("formularios_alta").insert({ nombre_previsto: nombre }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/clientes/altas");
  redirect(`/clientes/altas?nuevo=${data.id}`);
}

/** Borra un enlace o unas respuestas que no se van a usar. */
export async function borrarFormularioAlta(id: string) {
  await exigirEntrenador();
  const supabase = await crearClienteServidor();
  await supabase.from("formularios_alta").delete().eq("id", id).neq("estado", "convertido");
  revalidatePath("/clientes/altas");
  redirect("/clientes/altas");
}

/* ---------- Notas ---------- */

export async function crearNota(clienteId: string, fd: FormData) {
  await exigirEntrenador();
  const texto = String(fd.get("texto") ?? "").trim();
  if (!texto) return;
  const supabase = await crearClienteServidor();
  await supabase.from("notas_cliente").insert({ cliente_id: clienteId, texto });
  revalidatePath(`/clientes/${clienteId}`);
}

export async function borrarNota(clienteId: string, notaId: string) {
  await exigirEntrenador();
  const supabase = await crearClienteServidor();
  await supabase.from("notas_cliente").delete().eq("id", notaId);
  revalidatePath(`/clientes/${clienteId}`);
}

/* ---------- Plan nutricional ---------- */

interface DatosCalculo {
  sexo: "hombre" | "mujer";
  pesoKg: number;
  alturaCm: number;
  edad: number;
  grasaPct: number | null;
}

/** Guarda una versión nueva del plan (la anterior queda en el historial). */
async function guardarPlanInterno(clienteId: string, config: ConfigPlan, motivo: string, datos: DatosCalculo) {
  const resultado = calcularPlan(datos, config);
  const supabase = await crearClienteServidor();
  const redondear = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
  const { error } = await supabase.rpc("guardar_plan", {
    p_cliente: clienteId,
    p_config: config,
    p_datos: datos,
    p_peso: datos.pesoKg,
    p_media: redondear(resultado.mediaSemanalKcal),
    p_motivo: motivo,
    p_objetivos: resultado.dias.map((d) => ({
      tipo_dia: d.tipo,
      kcal: redondear(d.kcal),
      proteina_g: redondear(d.proteinaG),
      grasa_g: redondear(d.grasaG),
      carbohidratos_g: redondear(d.carbohidratosG),
      fibra_g: redondear(d.fibra.valor),
      agua_l: redondear(d.agua.valor, 2),
    })),
  });
  if (error) throw new Error(error.message);
}

export async function guardarPlan(
  clienteId: string,
  config: ConfigPlan,
  motivo: string,
  datos: DatosCalculo,
): Promise<EstadoFormulario> {
  await exigirEntrenador();
  if (!motivo.trim()) return { error: "Escribe el motivo del cambio (quedará en el historial)." };
  try {
    await guardarPlanInterno(clienteId, config, motivo.trim(), datos);
  } catch (e) {
    return { error: "No se pudo guardar: " + (e as Error).message };
  }
  revalidatePath(`/clientes/${clienteId}`, "layout");
  revalidatePath("/clientes");
  return { ok: true };
}
