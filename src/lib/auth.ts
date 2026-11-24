import { redirect } from "next/navigation";
import { crearClienteServidor } from "./supabase/server";

export interface UsuarioActual {
  id: string;
  email: string | null;
  rol: "entrenador" | "cliente";
  nombre: string | null;
}

/** Devuelve el usuario conectado con su rol, o manda al login. */
export async function usuarioActual(): Promise<UsuarioActual> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre").eq("id", data.user.id).single();
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    rol: (perfil?.rol as UsuarioActual["rol"]) ?? "cliente",
    nombre: perfil?.nombre ?? null,
  };
}

/** Para páginas solo de entrenador. */
export async function exigirEntrenador(): Promise<UsuarioActual> {
  const u = await usuarioActual();
  if (u.rol !== "entrenador") redirect("/portal");
  return u;
}
