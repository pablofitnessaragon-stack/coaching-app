/**
 * Resumen rápido de un cliente para la lista y la ficha: semana del proceso,
 * peso actual (media de la última semana), cambio total y si va al ritmo.
 */
import { mediasSemanales, evaluarRitmo, RITMO_POR_DEFECTO, type EstadoRitmo, type RegistroPeso } from "./nutrition/peso";

export interface ResumenCliente {
  semanaProceso: number;
  ultimaMedia: number | null;
  cambioTotalKg: number | null;
  cambioUltimaSemanaPct: number | null;
  /** Cambio medio semanal (%) de las últimas semanas (hasta 3): es lo que decide el ritmo. */
  cambioMedioPct: number | null;
  semanasEvaluadas: number;
  ritmo: EstadoRitmo;
  ultimoRegistro: string | null;
  diasSinRegistro: number | null;
}

export function resumirCliente(
  c: { fecha_inicio: string; peso_inicial_kg: number; objetivo: string },
  pesos: RegistroPeso[],
  hoy: Date = new Date(),
): ResumenCliente {
  const inicio = new Date(c.fecha_inicio + "T00:00:00");
  const semanaProceso = Math.max(1, Math.floor((hoy.getTime() - inicio.getTime()) / (7 * 86400000)) + 1);
  const medias = mediasSemanales(pesos);
  const ultima = medias.at(-1) ?? null;
  const ultimoRegistro = pesos.length ? [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1)!.fecha : null;
  const diasSinRegistro = ultimoRegistro
    ? Math.floor((hoy.getTime() - new Date(ultimoRegistro + "T00:00:00").getTime()) / 86400000)
    : null;
  // Ritmo: cambio medio por semana en las últimas 3 semanas (una sola semana es muy ruidosa)
  let cambioMedioPct: number | null = null;
  let semanasEvaluadas = 0;
  if (medias.length >= 2) {
    const ref = medias[Math.max(medias.length - 4, 0)];
    semanasEvaluadas = (new Date(ultima!.semana).getTime() - new Date(ref.semana).getTime()) / (7 * 86400000);
    if (semanasEvaluadas > 0) {
      cambioMedioPct = (Math.pow(ultima!.media / ref.media, 1 / semanasEvaluadas) - 1) * 100;
    }
  }
  return {
    semanaProceso,
    cambioMedioPct,
    semanasEvaluadas,
    ultimaMedia: ultima?.media ?? null,
    cambioTotalKg: ultima ? ultima.media - c.peso_inicial_kg : null,
    cambioUltimaSemanaPct: ultima?.cambioPct ?? null,
    ritmo: evaluarRitmo(cambioMedioPct, RITMO_POR_DEFECTO[c.objetivo] ?? RITMO_POR_DEFECTO.mantenimiento),
    ultimoRegistro,
    diasSinRegistro,
  };
}
