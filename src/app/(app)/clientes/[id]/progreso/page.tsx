import { obtenerCliente, obtenerMedidas, obtenerPesos, type Medida } from "@/lib/datos";
import FormMedidas from "@/components/FormMedidas";
import { faltanParaGrasaMarina, grasaMarina } from "@/lib/nutrition/grasa";
import { evaluarRitmo, mediasSemanales, RITMO_POR_DEFECTO } from "@/lib/nutrition/peso";
import { NOMBRE_OBJETIVO } from "@/lib/nutrition/tipos";
import GraficaPeso from "@/components/GraficaPeso";
import FormPeso from "@/components/FormPeso";
import { EtiquetaRitmo, fmtFecha, fmtNum, hoyIso } from "@/components/ui";
import { borrarMedida, borrarPeso, registrarMedidas, registrarPeso } from "../../acciones";

export const metadata = { title: "Progreso" };

export default async function Progreso({ params }: PageProps<"/clientes/[id]/progreso">) {
  const { id } = await params;
  const [c, pesos, medidas] = await Promise.all([obtenerCliente(id), obtenerPesos([id]), obtenerMedidas(id)]);
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
      <section className="tarjeta space-y-4">
        <div>
          <h2 className="subtitulo">Medidas</h2>
          <p className="ayuda">Opcionales: apúntalas cuando las tengas (tú o el cliente). Basta con una.</p>
        </div>
        <ResumenGrasa medidas={medidas} sexo={c.sexo} alturaCm={c.altura_cm} />
        <FormMedidas accion={registrarMedidas.bind(null, id)} hoy={hoyIso()} />
        {medidas.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay medidas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 font-medium">Fecha</th>
                  {COLUMNAS_MEDIDA.map(([, t]) => <th key={t} className="py-2 text-right font-medium">{t}</th>)}
                  <th className="py-2 text-right font-medium" title="Medido con báscula, DEXA...">% grasa</th>
                  <th className="py-2 text-right font-medium" title="Estimado con la fórmula de la Marina">% estimado</th>
                  <th className="py-2 pl-3 font-medium">Nota</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...medidas].reverse().map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 whitespace-nowrap">{fmtFecha(m.fecha)}</td>
                    {COLUMNAS_MEDIDA.map(([clave]) => (
                      <td key={clave} className="py-2 text-right whitespace-nowrap">
                        {m[clave] == null ? "—" : <><b>{fmtNum(m[clave], 1)}</b> <CambioMedida actual={m[clave]} primera={primeraMedida(medidas, clave)} /></>}
                      </td>
                    ))}
                    <td className="py-2 text-right whitespace-nowrap">
                      {m.grasa_pct == null ? "—" : <><b>{fmtNum(m.grasa_pct, 1)} %</b> <span className="text-xs text-slate-500">{NOMBRE_METODO[m.grasa_metodo ?? "otro"]}</span></>}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {(() => {
                        const g = grasaMarina({ sexo: c.sexo, alturaCm: c.altura_cm, cuelloCm: m.cuello_cm, cinturaCm: m.cintura_cm, caderaCm: m.cadera_cm });
                        return g ? <b>{fmtNum(g.valor, 1)} %</b> : "—";
                      })()}
                    </td>
                    <td className="py-2 pl-3 text-slate-500">{m.nota}</td>
                    <td className="py-2 text-right">
                      <form action={borrarMedida.bind(null, id, m.id)}>
                        <button className="text-xs text-slate-400 hover:text-red-600">Borrar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ayuda mt-2">Entre paréntesis, el cambio desde la primera medida.</p>
          </div>
        )}
      </section>
    </div>
  );
}

const COLUMNAS_MEDIDA = [
  ["cuello_cm", "Cuello"],
  ["cintura_cm", "Cintura"],
  ["cadera_cm", "Cadera"],
  ["pecho_cm", "Pecho"],
  ["brazo_cm", "Brazo"],
  ["muslo_cm", "Muslo"],
] as const;

type ClaveCol = (typeof COLUMNAS_MEDIDA)[number][0];

/** Primer valor apuntado de una medida (para ver cuánto ha cambiado). */
function primeraMedida(medidas: Medida[], clave: ClaveCol): number | null {
  return medidas.find((m) => m[clave] != null)?.[clave] ?? null;
}

function CambioMedida({ actual, primera }: { actual: number; primera: number | null }) {
  if (primera == null || actual === primera) return null;
  const d = actual - primera;
  return <span className="text-xs text-slate-500">({d > 0 ? "+" : "−"}{fmtNum(Math.abs(d), 1)})</span>;
}

const NOMBRE_METODO: Record<string, string> = {
  bioimpedancia: "bioimp.",
  dexa: "DEXA",
  plicometro: "plicóm.",
  otro: "",
};

/** % de grasa más reciente: el medido (báscula/DEXA) y el estimado con la fórmula de la Marina. */
function ResumenGrasa({ medidas, sexo, alturaCm }: { medidas: Medida[]; sexo: "hombre" | "mujer"; alturaCm: number }) {
  const ultimaMedida = [...medidas].reverse().find((m) => m.grasa_pct != null);
  const conCinta = [...medidas].reverse().find((m) => grasaMarina({ sexo, alturaCm, cuelloCm: m.cuello_cm, cinturaCm: m.cintura_cm, caderaCm: m.cadera_cm }));
  const estimado = conCinta
    ? grasaMarina({ sexo, alturaCm, cuelloCm: conCinta.cuello_cm, cinturaCm: conCinta.cintura_cm, caderaCm: conCinta.cadera_cm })
    : null;
  const faltan = faltanParaGrasaMarina({ sexo, alturaCm });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">% grasa estimado (fórmula de la Marina)</div>
        {estimado && conCinta ? (
          <>
            <div className="text-xl font-bold">{fmtNum(estimado.valor, 1)} %</div>
            <div className="ayuda">Con las medidas del {fmtFecha(conCinta.fecha)}</div>
            <details className="mt-1 text-xs text-slate-600">
              <summary className="cursor-pointer">Ver el cálculo</summary>
              <p className="mt-1 font-mono">{estimado.formula}</p>
              <ul className="mt-1 space-y-0.5 font-mono">{estimado.pasos.map((p) => <li key={p}>{p}</li>)}</ul>
              <p className="mt-1">Es una estimación (±3-4 puntos).</p>
            </details>
          </>
        ) : (
          <p className="text-sm text-slate-500">Hace falta apuntar {faltan.join(", ")} el mismo día para calcularlo.</p>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">% grasa medido (báscula, DEXA...)</div>
        {ultimaMedida ? (
          <>
            <div className="text-xl font-bold">{fmtNum(ultimaMedida.grasa_pct!, 1)} %</div>
            <div className="ayuda">{fmtFecha(ultimaMedida.fecha)}{ultimaMedida.grasa_metodo && ultimaMedida.grasa_metodo !== "otro" ? ` · ${ultimaMedida.grasa_metodo === "dexa" ? "DEXA" : ultimaMedida.grasa_metodo === "plicometro" ? "plicómetro" : "bioimpedancia"}` : ""}</div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Sin datos. Si se mide en su gimnasio, apúntalo aquí.</p>
        )}
      </div>
    </div>
  );
}
