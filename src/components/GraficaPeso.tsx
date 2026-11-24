"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { mediaMovil7, type RegistroPeso, type RitmoObjetivo } from "@/lib/nutrition/peso";

interface Props {
  registros: RegistroPeso[];
  /** Rango de ritmo objetivo (% por semana) para dibujar la "banda" ideal. */
  ritmo?: RitmoObjetivo;
  alto?: number;
}

const diasEntre = (a: string, b: string) =>
  (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000;

/** Gráfica de peso diario + media móvil de 7 días + ritmo objetivo. */
export default function GraficaPeso({ registros, ritmo, alto = 300 }: Props) {
  if (registros.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">Aún no hay registros de peso.</p>;
  }
  const mm = mediaMovil7(registros);
  const inicio = mm[0];
  const datos = mm.map((m) => {
    const semanas = diasEntre(inicio.fecha, m.fecha) / 7;
    const peso = registros.find((r) => r.fecha === m.fecha)!.pesoKg;
    return {
      fecha: m.fecha,
      etiqueta: new Date(m.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      peso,
      media: Math.round(m.media * 100) / 100,
      ...(ritmo && {
        ritmoMin: Math.round(inicio.media * (1 + ritmo.minPct / 100) ** semanas * 100) / 100,
        ritmoMax: Math.round(inicio.media * (1 + ritmo.maxPct / 100) ** semanas * 100) / 100,
      }),
    };
  });
  const valores = datos.flatMap((d) => [d.peso, d.media, d.ritmoMin ?? d.peso, d.ritmoMax ?? d.peso]);
  const min = Math.floor(Math.min(...valores) - 0.5);
  const max = Math.ceil(Math.max(...valores) + 0.5);

  return (
    <div style={{ height: alto }} className="w-full">
      <ResponsiveContainer>
        <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[min, max]} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} unit=" kg" width={64} />
          <Tooltip
            formatter={(v, nombre) => [`${Number(v).toLocaleString("es-ES", { maximumFractionDigits: 2 })} kg`, nombre]}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {ritmo && (
            <>
              <Line isAnimationActive={false} dataKey="ritmoMin" name="Ritmo objetivo" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} legendType="plainline" />
              <Line isAnimationActive={false} dataKey="ritmoMax" name="Ritmo objetivo " stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} legendType="none" />
            </>
          )}
          <Line isAnimationActive={false} dataKey="peso" name="Peso diario" stroke="#94a3b8" strokeOpacity={0} dot={{ r: 3, fill: "#94a3b8", strokeWidth: 0 }} activeDot={{ r: 5 }} />
          <Line isAnimationActive={false} dataKey="media" name="Media 7 días" stroke="#059669" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
