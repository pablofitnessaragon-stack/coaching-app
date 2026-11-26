"use server";

/**
 * Envío del formulario de alta. Lo usa el cliente SIN haber iniciado sesión:
 * la base de datos solo acepta las respuestas si el código del enlace es
 * válido, no ha caducado y no se había enviado antes.
 */
import { crearClienteServidor } from "@/lib/supabase/server";
import { TODAS_LAS_PREGUNTAS, validarRespuestas, type EntradaCruda } from "@/lib/formulario-alta";
import { TEXTO_CONSENTIMIENTO_CLIENTE_VERSION } from "@/lib/consentimiento";

export interface EstadoAlta {
  ok?: boolean;
  error?: string;
  errores?: Record<string, string>;
  valores?: EntradaCruda & { consentimiento?: string };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function enviarAlta(token: string, _: EstadoAlta, fd: FormData): Promise<EstadoAlta> {
  const valores: EstadoAlta["valores"] = {};
  for (const p of TODAS_LAS_PREGUNTAS) {
    valores[p.clave] = p.tipo === "varias" ? fd.getAll(p.clave).map(String) : String(fd.get(p.clave) ?? "");
  }
  valores.consentimiento = String(fd.get("consentimiento") ?? "");

  if (!UUID.test(token)) return { valores, error: "El enlace no es válido." };

  const r = validarRespuestas(valores);
  const errores = r.ok ? {} : { ...r.errores };
  if (valores.consentimiento !== "on") {
    errores.consentimiento = "Para poder asesorarte necesito tu consentimiento.";
  }
  if (!r.ok || Object.keys(errores).length > 0) return { valores, errores };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("enviar_formulario_alta", {
    p_token: token,
    p_respuestas: r.respuestas,
    p_version: TEXTO_CONSENTIMIENTO_CLIENTE_VERSION,
  });
  if (error) return { valores, error: "No se ha podido enviar. Inténtalo de nuevo en unos minutos." };
  if (!data) return { valores, error: "Este enlace ya se ha usado o ha caducado. Pide uno nuevo a tu entrenador." };
  return { ok: true };
}
