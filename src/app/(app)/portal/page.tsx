import { usuarioActual } from "@/lib/auth";

export const metadata = { title: "Mi espacio" };

/** Portal del cliente: se construye al final de la fase 3. */
export default async function Portal() {
  const u = await usuarioActual();
  return (
    <div className="tarjeta mx-auto max-w-lg space-y-2 text-center">
      <h1 className="titulo">Hola{u.nombre ? `, ${u.nombre}` : ""}</h1>
      <p className="text-slate-600">
        Muy pronto podrás ver aquí tu semana, tus objetivos y tu progreso.
      </p>
    </div>
  );
}
