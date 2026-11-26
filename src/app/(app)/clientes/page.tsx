import Link from "next/link";
import { exigirEntrenador } from "@/lib/auth";
import { listarClientes, listarFormulariosAlta, obtenerPesos, obtenerPlanes } from "@/lib/datos";
import { resumirCliente } from "@/lib/resumen";
import { NOMBRE_OBJETIVO } from "@/lib/nutrition/tipos";
import { Cambio, EtiquetaRitmo, Insignia, fmtNum } from "@/components/ui";

export const metadata = { title: "Clientes" };

export default async function PaginaClientes() {
  await exigirEntrenador();
  const clientes = await listarClientes();
  const ids = clientes.map((c) => c.id);
  const [pesos, planes, altas] = await Promise.all([obtenerPesos(ids), obtenerPlanes(ids, true), listarFormulariosAlta()]);
  const altasRecibidas = altas.filter((a) => a.estado === "recibido").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="titulo">Clientes</h1>
        <span className="text-sm text-slate-500">{clientes.length} en total</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/clientes/altas" className="boton-sec">Formulario de alta</Link>
          <Link href="/clientes/nuevo" className="boton">+ Nuevo cliente</Link>
        </div>
      </div>

      {altasRecibidas > 0 && (
        <Link href="/clientes/altas" className="block rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900 hover:bg-amber-100">
          📋 Tienes {altasRecibidas === 1 ? "1 formulario de alta nuevo" : `${altasRecibidas} formularios de alta nuevos`} para revisar →
        </Link>
      )}

      {clientes.length === 0 ? (
        <div className="tarjeta space-y-3 text-center">
          <p className="text-slate-600">Todavía no tienes clientes.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/clientes/nuevo" className="boton">Crear el primero</Link>
            <Link href="/ajustes" className="boton-sec">Cargar clientes de ejemplo</Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => {
            const misPesos = pesos.filter((p) => p.cliente_id === c.id).map((p) => ({ fecha: p.fecha, pesoKg: p.peso_kg }));
            const r = resumirCliente(c, misPesos);
            const plan = planes.find((p) => p.cliente_id === c.id);
            return (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="tarjeta block space-y-3 transition hover:border-marca-500 hover:shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca-100 font-bold text-marca-700">
                      {c.nombre.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{c.nombre}</div>
                      <div className="text-sm text-slate-500">
                        {NOMBRE_OBJETIVO[c.objetivo]} · semana {r.semanaProceso}
                      </div>
                    </div>
                    {c.es_ejemplo && <Insignia>Ejemplo</Insignia>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Media semana</div>
                      <div className="font-semibold">{fmtNum(r.ultimaMedia, 1)} kg</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Cambio total</div>
                      <div className="font-semibold"><Cambio kg={r.cambioTotalKg} /></div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Media kcal</div>
                      <div className="font-semibold">{fmtNum(plan?.media_semanal_kcal)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <EtiquetaRitmo ritmo={r.ritmo} />
                    {r.diasSinRegistro != null && r.diasSinRegistro > 7 && (
                      <Insignia clase="bg-red-50 text-red-700">{r.diasSinRegistro} días sin pesarse</Insignia>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
