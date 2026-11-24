import type { ObjetivoDiaFila } from "@/lib/datos";
import { NOMBRE_TIPO_DIA } from "@/lib/nutrition/tipos";
import { fmtNum } from "./ui";

/** Tabla de objetivos por tipo de día (entreno / descanso / intenso). */
export default function TablaObjetivos({ objetivos }: { objetivos: ObjetivoDiaFila[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3 font-medium">Tipo de día</th>
            <th className="px-2 py-2 text-right font-medium">kcal</th>
            <th className="px-2 py-2 text-right font-medium">Proteína</th>
            <th className="px-2 py-2 text-right font-medium">Carbohidratos</th>
            <th className="px-2 py-2 text-right font-medium">Grasa</th>
            <th className="px-2 py-2 text-right font-medium">Fibra</th>
            <th className="py-2 pl-2 text-right font-medium">Agua</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {objetivos.map((o) => (
            <tr key={o.tipo_dia}>
              <td className="py-2 pr-3 font-medium">{NOMBRE_TIPO_DIA[o.tipo_dia]}</td>
              <td className="px-2 py-2 text-right font-bold">{fmtNum(o.kcal)}</td>
              <td className="px-2 py-2 text-right">{fmtNum(o.proteina_g)} g</td>
              <td className="px-2 py-2 text-right">{fmtNum(o.carbohidratos_g)} g</td>
              <td className="px-2 py-2 text-right">{fmtNum(o.grasa_g)} g</td>
              <td className="px-2 py-2 text-right">{fmtNum(o.fibra_g)} g</td>
              <td className="py-2 pl-2 text-right">{fmtNum(o.agua_l, 1)} L</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
