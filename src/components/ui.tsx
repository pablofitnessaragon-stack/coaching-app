import type { ReactNode } from "react";
import type { EstadoRitmo } from "@/lib/nutrition/peso";

export const fmtNum = (n: number | null | undefined, dec = 0) =>
  n == null || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const fmtFecha = (iso: string, opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("es-ES", opciones);

export const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function Dato({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</div>
      <div className="truncate text-lg font-bold sm:text-xl">{valor}</div>
      {detalle && <div className="text-xs text-slate-500">{detalle}</div>}
    </div>
  );
}

const ESTILO_RITMO: Record<EstadoRitmo, { texto: string; clase: string }> = {
  en_ritmo: { texto: "En ritmo", clase: "bg-ok-100 text-ok-700" },
  muy_lento: { texto: "Progreso lento", clase: "bg-amber-100 text-amber-800" },
  muy_rapido: { texto: "Demasiado rápido", clase: "bg-orange-100 text-orange-800" },
  sin_datos: { texto: "Sin datos aún", clase: "bg-slate-100 text-slate-600" },
};

export function EtiquetaRitmo({ ritmo }: { ritmo: EstadoRitmo }) {
  const e = ESTILO_RITMO[ritmo];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${e.clase}`}>{e.texto}</span>;
}

export function Insignia({ children, clase = "bg-slate-100 text-slate-700" }: { children: ReactNode; clase?: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${clase}`}>{children}</span>;
}

export function Cambio({ kg }: { kg: number | null }) {
  if (kg == null) return <>—</>;
  const signo = kg > 0 ? "+" : kg < 0 ? "−" : "";
  return <>{signo}{fmtNum(Math.abs(kg), 1)} kg</>;
}
