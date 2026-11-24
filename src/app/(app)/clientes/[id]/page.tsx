import Link from "next/link";
import { obtenerCliente, obtenerNotas, obtenerPesos, obtenerPlanes } from "@/lib/datos";
import { resumirCliente } from "@/lib/resumen";
import { RITMO_POR_DEFECTO } from "@/lib/nutrition/peso";
import { Cambio, Dato, EtiquetaRitmo, fmtFecha, fmtNum } from "@/components/ui";
import GraficaPeso from "@/components/GraficaPeso";
import TablaObjetivos from "@/components/TablaObjetivos";
import { borrarNota, crearNota } from "../acciones";

export default async function ResumenCliente({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const [c, pesos, planes, notas] = await Promise.all([obtenerCliente(id), obtenerPesos([id]), obtenerPlanes([id], true), obtenerNotas(id)]);
  if (!c) return null;
  const registros = pesos.map((p) => ({ fecha: p.fecha, pesoKg: p.peso_kg }));
  const r = resumirCliente(c, registros);
  const plan = planes[0];

  const restricciones = [
    c.tipo_dieta !== "omnivora" && c.tipo_dieta,
    c.alergias && `Alergias: ${c.alergias}`,
    c.intolerancias && `Intolerancias: ${c.intolerancias}`,
    c.alimentos_no_gustan && `No le gusta: ${c.alimentos_no_gustan}`,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section className="tarjeta grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dato etiqueta="Semana" valor={r.semanaProceso} detalle={`desde ${fmtFecha(c.fecha_inicio)}`} />
          <Dato etiqueta="Media última semana" valor={`${fmtNum(r.ultimaMedia, 1)} kg`} detalle={`inicio ${fmtNum(c.peso_inicial_kg, 1)} kg`} />
          <Dato etiqueta="Cambio total" valor={<Cambio kg={r.cambioTotalKg} />} detalle={r.cambioMedioPct != null ? `${fmtNum(r.cambioMedioPct, 2)} %/semana (últimas ${fmtNum(r.semanasEvaluadas)} sem.)` : undefined} />
          <Dato etiqueta="Ritmo" valor={<EtiquetaRitmo ritmo={r.ritmo} />} detalle={r.ultimoRegistro ? `último peso ${fmtFecha(r.ultimoRegistro, { day: "numeric", month: "short" })}` : undefined} />
        </section>

        <section className="tarjeta space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="subtitulo">Evolución del peso</h2>
            <Link href={`/clientes/${id}/progreso`} className="text-sm font-medium text-marca-700 hover:underline">Apuntar peso →</Link>
          </div>
          <GraficaPeso registros={registros} ritmo={RITMO_POR_DEFECTO[c.objetivo]} alto={240} />
        </section>

        <section className="tarjeta space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="subtitulo">Objetivos actuales</h2>
            <Link href={`/clientes/${id}/calculadora`} className="text-sm font-medium text-marca-700 hover:underline">Ajustar →</Link>
          </div>
          {plan ? (
            <>
              <TablaObjetivos objetivos={plan.objetivos_dia} />
              <p className="ayuda">
                Media semanal: <b>{fmtNum(plan.media_semanal_kcal)} kcal/día</b> · desde {fmtFecha(plan.created_at)}
                {plan.motivo && ` · ${plan.motivo}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Sin plan todavía.</p>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <section className="tarjeta space-y-2 text-sm">
          <h2 className="subtitulo">Ficha rápida</h2>
          <p><span className="text-slate-500">Entreno:</span> {c.dias_entreno ?? "—"} días/semana {c.tipo_entreno.length > 0 && `(${c.tipo_entreno.join(", ")})`}</p>
          <p><span className="text-slate-500">Pasos:</span> {fmtNum(c.pasos_diarios)} al día</p>
          <p><span className="text-slate-500">Comidas:</span> {c.comidas_al_dia ?? "—"} al día</p>
          {restricciones.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-amber-50 p-2 text-amber-900">
              {restricciones.map((t) => <li key={t}>{t}</li>)}
            </ul>
          )}
          {(c.email || c.telefono) && (
            <p className="text-slate-500">{[c.email, c.telefono].filter(Boolean).join(" · ")}</p>
          )}
        </section>

        <section className="tarjeta space-y-3">
          <h2 className="subtitulo">Notas</h2>
          <form action={crearNota.bind(null, id)} className="space-y-2">
            <textarea name="texto" rows={2} className="campo" placeholder="Escribe una nota…" />
            <button className="boton-sec w-full">Añadir nota</button>
          </form>
          <ul className="space-y-2">
            {notas.map((n) => (
              <li key={n.id} className="group rounded-lg bg-slate-50 p-2 text-sm">
                <div className="whitespace-pre-wrap">{n.texto}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  {fmtFecha(n.created_at)}
                  <form action={borrarNota.bind(null, id, n.id)}>
                    <button className="hover:text-red-600">Borrar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
