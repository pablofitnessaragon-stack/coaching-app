import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/auth";
import { listarClientes, obtenerPesos, obtenerPlanes } from "@/lib/datos";
import { RITMO_POR_DEFECTO } from "@/lib/nutrition/peso";
import { NOMBRE_OBJETIVO } from "@/lib/nutrition/tipos";
import GraficaPeso from "@/components/GraficaPeso";
import TablaObjetivos from "@/components/TablaObjetivos";

export const metadata = { title: "Mi espacio" };

/**
 * Portal del cliente (versión mínima; la completa llega en las fases 3 y 4).
 *
 * Privacidad: la base de datos solo devuelve la ficha del propio cliente y
 * solo si el entrenador le ha dado acceso (regla soy_cliente). Si no, la
 * consulta devuelve una lista vacía y mostramos el aviso.
 */
export default async function Portal() {
  const u = await usuarioActual();
  if (u.rol === "entrenador") redirect("/clientes");

  const [ficha] = await listarClientes();
  if (!ficha) {
    return (
      <div className="tarjeta mx-auto max-w-lg space-y-2 text-center">
        <h1 className="titulo">Hola{u.nombre ? `, ${u.nombre}` : ""}</h1>
        <p className="text-slate-600">
          Tu entrenador todavía no te ha dado acceso. En cuanto lo haga, aquí verás tu progreso y tus objetivos.
        </p>
      </div>
    );
  }

  const [pesos, planes] = await Promise.all([obtenerPesos([ficha.id]), obtenerPlanes([ficha.id], true)]);
  const registros = pesos.map((p) => ({ fecha: p.fecha, pesoKg: p.peso_kg }));
  const plan = planes[0];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="titulo">Hola, {ficha.nombre}</h1>
        <p className="text-sm text-slate-500">Objetivo: {NOMBRE_OBJETIVO[ficha.objetivo]}</p>
      </div>
      <section className="tarjeta space-y-2">
        <h2 className="subtitulo">Tu peso</h2>
        <GraficaPeso registros={registros} ritmo={RITMO_POR_DEFECTO[ficha.objetivo]} />
      </section>
      {plan && (
        <section className="tarjeta space-y-2">
          <h2 className="subtitulo">Tus objetivos diarios</h2>
          <TablaObjetivos objetivos={plan.objetivos_dia} />
        </section>
      )}
    </div>
  );
}
