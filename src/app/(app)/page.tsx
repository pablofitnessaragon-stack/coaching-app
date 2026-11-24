import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/auth";

export default async function Inicio() {
  const u = await usuarioActual();
  redirect(u.rol === "entrenador" ? "/clientes" : "/portal");
}
