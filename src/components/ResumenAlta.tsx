import { SECCIONES, CLAVES_SOLO_CUESTIONARIO, avisosSalud, grasaDesdeRespuestas, textoRespuesta, type Respuestas } from "@/lib/formulario-alta";
import { fmtNum } from "@/components/ui";

/**
 * Respuestas del formulario de alta, ordenadas por secciones. Con
 * `soloExtra` muestra solo lo que no está ya en la ficha (salud, hábitos...).
 */
export default function ResumenAlta({ respuestas, soloExtra = false }: { respuestas: Respuestas; soloExtra?: boolean }) {
  const avisos = avisosSalud(respuestas);
  const grasa = soloExtra ? null : grasaDesdeRespuestas(respuestas);
  return (
    <div className="space-y-4">
      {avisos.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {avisos.map((a) => (
            <li key={a}>⚠️ {a}</li>
          ))}
        </ul>
      )}
      {grasa && (
        <div className="rounded-xl border border-marca-500/40 bg-marca-50/50 p-3 text-sm">
          <b>% de grasa: {fmtNum(grasa.valor, 1)} %</b> <span className="text-slate-600">({grasa.origen})</span>
          {grasa.calculo && (
            <details className="mt-1 text-xs text-slate-600">
              <summary className="cursor-pointer">Ver el cálculo</summary>
              <p className="mt-1 font-mono">{grasa.calculo.formula}</p>
              <ul className="mt-1 space-y-0.5 font-mono">{grasa.calculo.pasos.map((p) => <li key={p}>{p}</li>)}</ul>
            </details>
          )}
        </div>
      )}
      {SECCIONES.map((s) => {
        const filas = s.preguntas
          .filter((p) => !soloExtra || CLAVES_SOLO_CUESTIONARIO.has(p.clave))
          .map((p) => ({ p, texto: textoRespuesta(p, respuestas[p.clave]) }))
          .filter((f) => f.texto != null);
        if (filas.length === 0) return null;
        return (
          <div key={s.id}>
            <h3 className="mb-1 text-sm font-semibold text-marca-700">{s.titulo}</h3>
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              {filas.map(({ p, texto }) => (
                <div key={p.clave} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                  <dt className="text-slate-500">{p.pregunta}</dt>
                  <dd className="whitespace-pre-line font-medium">{texto}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
