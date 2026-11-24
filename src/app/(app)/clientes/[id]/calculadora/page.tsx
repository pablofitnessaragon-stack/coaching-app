import { obtenerCliente, obtenerPesos, obtenerPlanes } from "@/lib/datos";
import { calcularEdad } from "@/lib/nutrition/edad";
import { mediasSemanales } from "@/lib/nutrition/peso";
import { configPorDefecto } from "@/lib/nutrition/plan";
import { fmtFecha, fmtNum } from "@/components/ui";
import Calculadora from "@/components/Calculadora";

export const metadata = { title: "Calculadora" };

export default async function PaginaCalculadora({ params }: PageProps<"/clientes/[id]/calculadora">) {
  const { id } = await params;
  const [c, pesos, planes] = await Promise.all([obtenerCliente(id), obtenerPesos([id]), obtenerPlanes([id], true)]);
  if (!c) return null;
  // Peso de referencia: media de la última semana con datos (más fiable que un día suelto)
  // (la última semana con al menos 3 pesos; si no hay ninguna, la última con datos)
  const semanas = mediasSemanales(pesos.map((p) => ({ fecha: p.fecha, pesoKg: p.peso_kg })));
  const ultima = semanas.findLast((s) => s.registros >= 3) ?? semanas.at(-1);
  const pesoReferencia = ultima ? Math.round(ultima.media * 10) / 10 : c.peso_inicial_kg;
  const origenPeso = ultima
    ? `media de la semana del ${fmtFecha(ultima.semana, { day: "numeric", month: "short" })} (${fmtNum(ultima.media, 2)} kg, ${ultima.registros} ${ultima.registros === 1 ? "registro" : "registros"})`
    : "peso inicial de la ficha";
  const plan = planes[0];
  return (
    <Calculadora
      clienteId={id}
      sexo={c.sexo}
      edad={calcularEdad(c.fecha_nacimiento)}
      alturaCm={c.altura_cm}
      pesoReferencia={pesoReferencia}
      origenPeso={origenPeso}
      grasaPct={c.grasa_inicial_pct}
      configInicial={plan?.config ?? configPorDefecto(c.objetivo)}
    />
  );
}
