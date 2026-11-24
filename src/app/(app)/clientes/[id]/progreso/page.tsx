import { obtenerCliente, obtenerPesos } from "@/lib/datos";
import { evaluarRitmo, mediasSemanales, RITMO_POR_DEFECTO } from "@/lib/nutrition/peso";
import { NOMBRE_OBJETIVO } from "@/lib/nutrition/tipos";
import GraficaPeso from "@/components/GraficaPeso";
import FormPeso from "@/components/FormPeso";
import { EtiquetaRitmo, fmtFecha, fmtNum, hoyIso } from "@/components/ui";
import { borrarPeso, registrarPeso } from "../../acciones";

export const metadata = { title: "Progreso" };

export default async function Progreso({ params }: PageProps<"/clientes/[id]/progreso">) {
  const { id } = await params;
  const [c, pesos] = await Promise.all([obtenerCliente(id), obtenerPesos([id])]);
  if (!c) return null;
  const registros = pesos.map((p) => ({ fecha: p.fecha, pesoKg: p.peso_kg }));
  const ritmo = RITMO_POR_DEFECTO[c.objetivo];
  const semanas = mediasSemanales(registros).reverse();

  return (
    <div className="space-y-4">
      <section className="tarjeta">
        <h2 className="subtitulo mb-3">Apuntar peso</h2>
        <FormPeso accion={registrarPeso.bind(null, id)} hoy={hoyIso()} />
      </section>

      <section className="tarjeta space-y-2">
        <h2 className="subtitulo">Peso diario y media de 7 días</h2>
        <p className="ayuda">
          Las líneas discontinuas marcan el ritmo objetivo para {NOMBRE_OBJETIVO[c.objetivo].toLowerCase()}:
          entre {fmtNum(ritmo.minPct, 2)} % y {fmtNum(ritmo.maxPct, 2)} % del peso por semana.
        </p>
        <GraficaPeso registros={registros} ritmo={ritmo} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="tarjeta space-y-2">
          <h2 className="subtitulo">Medias semanales (lunes a domingo)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 font-medium">Semana del</th>
                  <th className="py-2 text-right font-medium">Media</th>
                  <th className="py-2 text-right font-medium">Cambio</th>
                  <th className="py-2 text-right font-medium">Días</th>
                  <th className="py-2 text-right font-medium">Ritmo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {semanas.map((s) => (
                  <tr key={s.semana}>
                    <td className="py-2">{fmtFecha(s.semana, { day: "numeric", month: "short" })}</td>
                    <td className="py-2 text-right font-semibold">{fmtNum(s.media, 2)} kg</td>
                    <td className="py-2 text-right">
                      {s.cambioKg == null ? "—" : `${s.cambioKg > 0 ? "+" : ""}${fmtNum(s.cambioKg, 2)} kg (${fmtNum(s.cambioPct, 2)} %)`}
                    </td>
                    <td className="py-2 text-right text-slate-500">{s.registros}</td>
                    <td className="py-2 text-right"><EtiquetaRitmo ritmo={evaluarRitmo(s.cambioPct, ritmo)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="tarjeta space-y-2">
          <h2 className="subtitulo">Todos los registros</h2>
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto text-sm">
            {[...pesos].reverse().map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="w-28 text-slate-500">{fmtFecha(p.fecha, { weekday: "short", day: "numeric", month: "short" })}</span>
                <span className="font-semibold">{fmtNum(p.peso_kg, 1)} kg</span>
                <span className="flex-1 truncate text-slate-500">{p.nota}</span>
                <form action={borrarPeso.bind(null, id, p.id)}>
                  <button className="text-xs text-slate-400 hover:text-red-600">Borrar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
