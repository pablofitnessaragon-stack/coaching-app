import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirEntrenador } from "@/lib/auth";
import { obtenerCliente } from "@/lib/datos";
import { calcularEdad } from "@/lib/nutrition/edad";
import { NOMBRE_OBJETIVO } from "@/lib/nutrition/tipos";
import { Insignia } from "@/components/ui";
import Pestanas from "@/components/Pestanas";

export default async function LayoutCliente({ children, params }: LayoutProps<"/clientes/[id]">) {
  await exigirEntrenador();
  const { id } = await params;
  const c = await obtenerCliente(id);
  if (!c) notFound();
  const base = `/clientes/${id}`;
  return (
    <div className="space-y-4">
      <Link href="/clientes" className="text-sm text-slate-500 hover:underline">← Clientes</Link>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-marca-100 text-lg font-bold text-marca-700">
          {c.nombre.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="titulo">{c.nombre}</h1>
          <p className="text-sm text-slate-500">
            {NOMBRE_OBJETIVO[c.objetivo]} · {c.sexo === "mujer" ? "Mujer" : "Hombre"}, {calcularEdad(c.fecha_nacimiento)} años · {c.altura_cm} cm
          </p>
        </div>
        {c.es_ejemplo && <Insignia>Ejemplo</Insignia>}
      </div>
      <Pestanas
        base={base}
        pestanas={[
          { ruta: "", texto: "Resumen" },
          { ruta: "/progreso", texto: "Progreso" },
          { ruta: "/calculadora", texto: "Calculadora" },
          { ruta: "/historial", texto: "Historial" },
          { ruta: "/ficha", texto: "Ficha" },
        ]}
      />
      <div>{children}</div>
    </div>
  );
}
