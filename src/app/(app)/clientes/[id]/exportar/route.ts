import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Descarga en JSON todos los datos de un cliente (derecho de acceso y portabilidad, RGPD). */
export async function GET(_: Request, ctx: RouteContext<"/clientes/[id]/exportar">) {
  const { id } = await ctx.params;
  const supabase = await crearClienteServidor();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const [notas, pesos, planes] = await Promise.all([
    supabase.from("notas_cliente").select("texto, created_at").eq("cliente_id", id).order("created_at"),
    supabase.from("registros_peso").select("fecha, peso_kg, nota").eq("cliente_id", id).order("fecha"),
    supabase.from("planes_nutricionales").select("created_at, motivo, activo, config, datos_cliente, media_semanal_kcal, objetivos_dia(*)").eq("cliente_id", id).order("created_at"),
  ]);
  const cuerpo = {
    exportado: new Date().toISOString(),
    cliente,
    notas: notas.data,
    registros_peso: pesos.data,
    planes_nutricionales: planes.data,
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
