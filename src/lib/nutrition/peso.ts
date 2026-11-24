/**
 * Cálculos sobre los registros de peso: media semanal, media móvil de 7 días
 * y ritmo de cambio frente al objetivo.
 *
 * La semana va de lunes a domingo. La media semanal es el dato que usa el
 * entrenador para decidir, porque el peso diario fluctúa mucho (agua, sal,
 * digestión...).
 */

export interface RegistroPeso {
  /** Fecha en formato AAAA-MM-DD. */
  fecha: string;
  pesoKg: number;
}

export interface MediaSemanal {
  /** Lunes de esa semana (AAAA-MM-DD). */
  semana: string;
  media: number;
  registros: number;
  /** Cambio frente a la semana anterior con datos, en kg y en % (null si es la primera). */
  cambioKg: number | null;
  cambioPct: number | null;
}

function aFecha(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function aIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana de una fecha (AAAA-MM-DD). */
export function lunesDe(iso: string): string {
  const d = aFecha(iso);
  const diaSemana = (d.getUTCDay() + 6) % 7; // lunes = 0 ... domingo = 6
  d.setUTCDate(d.getUTCDate() - diaSemana);
  return aIso(d);
}

export function sumarDias(iso: string, dias: number): string {
  const d = aFecha(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return aIso(d);
}

function ordenar(registros: RegistroPeso[]): RegistroPeso[] {
  return [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Medias por semana (lunes-domingo), de la más antigua a la más reciente. */
export function mediasSemanales(registros: RegistroPeso[]): MediaSemanal[] {
  const grupos = new Map<string, number[]>();
  for (const r of ordenar(registros)) {
    const semana = lunesDe(r.fecha);
    const lista = grupos.get(semana) ?? [];
    lista.push(r.pesoKg);
    grupos.set(semana, lista);
  }
  const resultado: MediaSemanal[] = [];
  let anterior: number | null = null;
  for (const [semana, pesos] of [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const media = pesos.reduce((s, p) => s + p, 0) / pesos.length;
    resultado.push({
      semana,
      media,
      registros: pesos.length,
      cambioKg: anterior == null ? null : media - anterior,
      cambioPct: anterior == null ? null : ((media - anterior) / anterior) * 100,
    });
    anterior = media;
  }
  return resultado;
}

/**
 * Media móvil: para cada registro, la media de los registros de los 7 días
 * naturales que terminan ese día (ese día y los 6 anteriores).
 */
export function mediaMovil7(registros: RegistroPeso[]): { fecha: string; media: number }[] {
  const ordenados = ordenar(registros);
  return ordenados.map((r) => {
    const desde = sumarDias(r.fecha, -6);
    const ventana = ordenados.filter((x) => x.fecha >= desde && x.fecha <= r.fecha);
    return { fecha: r.fecha, media: ventana.reduce((s, x) => s + x.pesoKg, 0) / ventana.length };
  });
}

export interface RitmoObjetivo {
  /** % de peso corporal por semana. Negativo = perder. Ej.: −0,5 a −1. */
  minPct: number;
  maxPct: number;
}

/** Ritmos orientativos por objetivo (% del peso por semana). */
export const RITMO_POR_DEFECTO: Record<string, RitmoObjetivo> = {
  perdida_grasa: { minPct: -1, maxPct: -0.5 },
  ganancia_muscular: { minPct: 0.25, maxPct: 0.5 },
  recomposicion: { minPct: -0.25, maxPct: 0.1 },
  mantenimiento: { minPct: -0.25, maxPct: 0.25 },
  rendimiento: { minPct: -0.25, maxPct: 0.25 },
};

export type EstadoRitmo = "en_ritmo" | "muy_lento" | "muy_rapido" | "sin_datos";

/**
 * Compara el cambio semanal (%) con el rango objetivo.
 * "muy_lento" = no avanza lo suficiente en la dirección del objetivo.
 */
export function evaluarRitmo(cambioPct: number | null, ritmo: RitmoObjetivo): EstadoRitmo {
  if (cambioPct == null) return "sin_datos";
  if (cambioPct >= ritmo.minPct && cambioPct <= ritmo.maxPct) return "en_ritmo";
  const direccion = ritmo.minPct + ritmo.maxPct; // < 0 perder, > 0 ganar, ≈ 0 mantener
  if (direccion < 0) return cambioPct > ritmo.maxPct ? "muy_lento" : "muy_rapido";
  if (direccion > 0) return cambioPct < ritmo.minPct ? "muy_lento" : "muy_rapido";
  return cambioPct < ritmo.minPct ? "muy_rapido" : "muy_lento";
}
