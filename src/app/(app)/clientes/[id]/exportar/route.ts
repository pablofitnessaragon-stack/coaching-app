import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { usuarioActual } from "@/lib/auth";

/** Descarga en JSON todos los datos de un cliente (derecho de acceso y portabilidad, RGPD). */
export async function GET(_: Request, ctx: RouteContext<"/clientes/[id]/exportar">) {
  const { id } = await ctx.params;
  // Solo el entrenador descarga fichas (las reglas de la base de datos ya
  // impiden ver clientes ajenos; esto es una comprobación extra).
  const u = await usuarioActual();
  if (u.rol !== "entrenador") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const supabase = await crearClienteServidor();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const [notas, pesos, planes, alta, medidas] = await Promise.all([
    supabase.from("notas_cliente").select("texto, created_at").eq("cliente_id", id).order("created_at"),
    supabase.from("registros_peso").select("fecha, peso_kg, nota").eq("cliente_id", id).order("fecha"),
    supabase.from("planes_nutricionales").select("created_at, motivo, activo, config, datos_cliente, media_semanal_kcal, objetivos_dia(*)").eq("cliente_id", id).order("created_at"),
    supabase.from("formularios_alta").select("enviado_at, respuestas, consentimiento_fecha, consentimiento_version").eq("cliente_id", id).maybeSingle(),
    supabase.from("medidas").select("fecha, cuello_cm, cintura_cm, cadera_cm, pecho_cm, brazo_cm, muslo_cm, grasa_pct, grasa_metodo, nota").eq("cliente_id", id).order("fecha"),
  ]);
  const cuerpo = {
    exportado: new Date().toISOString(),
    cliente,
    notas: notas.data,
    registros_peso: pesos.data,
    planes_nutricionales: planes.data,
    medidas: medidas.data,
    formulario_alta: alta.data,
  };
  const nombre = String(cliente.nombre).normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();
  return new NextResponse(JSON.stringify(cuerpo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="datos-${nombre}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
