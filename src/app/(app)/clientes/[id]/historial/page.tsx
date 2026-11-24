import { obtenerPlanes } from "@/lib/datos";
import { NOMBRE_FORMULA_BASAL } from "@/lib/nutrition/gasto-basal";
import { NOMBRE_TIPO_DIA } from "@/lib/nutrition/tipos";
import { fmtFecha, fmtNum, Insignia } from "@/components/ui";

export const metadata = { title: "Historial" };

/** Historial de ajustes: cada versión del plan con fecha, motivo y cambios. */
export default async function Historial({ params }: PageProps<"/clientes/[id]/historial">) {
  const { id } = await params;
  const planes = await obtenerPlanes([id]);
  if (planes.length === 0) return <p className="tarjeta text-sm text-slate-500">Todavía no hay planes guardados.</p>;
  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
      {planes.map((p, i) => {
        const anterior = planes[i + 1];
        const diferencia = anterior ? p.media_semanal_kcal - anterior.media_semanal_kcal : null;
        return (
          <li key={p.id} className="relative">
            <span className={`absolute -left-[27px] top-5 h-3 w-3 rounded-full ring-4 ring-[#f6f7f9] ${p.activo ? "bg-marca-600" : "bg-slate-300"}`} />
            <div className="tarjeta space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{fmtFecha(p.created_at, { day: "numeric", month: "long", year: "numeric" })}</span>
                {p.activo && <Insignia clase="bg-marca-100 text-marca-700">Actual</Insignia>}
                {diferencia != null && Math.abs(diferencia) >= 1 && (
                  <Insignia clase={diferencia < 0 ? "bg-sky-100 text-sky-800" : "bg-orange-100 text-orange-800"}>
                    {diferencia > 0 ? "+" : "−"}{fmtNum(Math.abs(diferencia))} kcal/día de media
                  </Insignia>
                )}
              </div>
              {p.motivo && <p className="text-sm">{p.motivo}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {p.objetivos_dia.map((o) => (
                  <span key={o.tipo_dia}>
                    <span className="text-slate-500">{NOMBRE_TIPO_DIA[o.tipo_dia]}:</span>{" "}
                    <b>{fmtNum(o.kcal)} kcal</b> · P {fmtNum(o.proteina_g)} · C {fmtNum(o.carbohidratos_g)} · G {fmtNum(o.grasa_g)}
                  </span>
                ))}
              </div>
              <p className="ayuda">
                Peso de referencia {fmtNum(p.peso_referencia_kg, 1)} kg · {NOMBRE_FORMULA_BASAL[p.config.formulaBasal]} ·{" "}
                ajuste {p.config.ajuste.valor > 0 ? "+" : ""}{fmtNum(p.config.ajuste.valor)} {p.config.ajuste.modo === "porcentaje" ? "%" : "kcal"} · media {fmtNum(p.media_semanal_kcal)} kcal
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
