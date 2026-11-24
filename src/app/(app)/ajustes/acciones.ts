"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirEntrenador } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { generarEjemplos } from "@/lib/ejemplos";
import { TEXTO_CONSENTIMIENTO_VERSION } from "@/lib/consentimiento";

const r1 = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export async function cargarEjemplos() {
  await exigirEntrenador();
  const supabase = await crearClienteServidor();
  await supabase.from("clientes").delete().eq("es_ejemplo", true);

  for (const e of generarEjemplos()) {
    const { data: c, error } = await supabase
      .from("clientes")
      .insert({
        ...e.ficha,
        es_ejemplo: true,
        consentimiento_salud: true,
        consentimiento_fecha: new Date().toISOString(),
        consentimiento_version: TEXTO_CONSENTIMIENTO_VERSION,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("registros_peso").insert(e.pesos.map((p) => ({ ...p, cliente_id: c.id })));
    if (e.notas.length) await supabase.from("notas_cliente").insert(e.notas.map((texto) => ({ texto, cliente_id: c.id })));
    // Primero las versiones antiguas (inactivas) y al final la activa
    for (const p of e.planes) {
      const { data: plan, error: ep } = await supabase
        .from("planes_nutricionales")
        .insert({
          cliente_id: c.id,
          config: p.config,
          datos_cliente: p.datos,
          peso_referencia_kg: p.datos.pesoKg,
          media_semanal_kcal: r1(p.resultado.mediaSemanalKcal),
          motivo: p.motivo,
          activo: p.activo,
          created_at: p.created_at,
        })
        .select("id")
        .single();
      if (ep) throw new Error(ep.message);
      await supabase.from("objetivos_dia").insert(
        p.resultado.dias.map((d) => ({
          plan_id: plan.id,
          tipo_dia: d.tipo,
          kcal: r1(d.kcal),
          proteina_g: r1(d.proteinaG),
          grasa_g: r1(d.grasaG),
          carbohidratos_g: r1(d.carbohidratosG),
          fibra_g: r1(d.fibra.valor),
          agua_l: r1(d.agua.valor, 2),
        })),
      );
    }
  }
  revalidatePath("/", "layout");
  redirect("/clientes");
}

export async function borrarEjemplos() {
  await exigirEntrenador();
  const supabase = await crearClienteServidor();
  await supabase.from("clientes").delete().eq("es_ejemplo", true);
  revalidatePath("/", "layout");
  redirect("/ajustes?ok=borrados");
}
