import { obtenerCliente } from "@/lib/datos";
import FormCliente from "@/components/FormCliente";
import { fmtFecha } from "@/components/ui";
import { actualizarCliente, borrarCliente } from "../../acciones";

export const metadata = { title: "Ficha" };

export default async function Ficha({ params, searchParams }: PageProps<"/clientes/[id]/ficha">) {
  const { id } = await params;
  const { borrado } = await searchParams;
  const c = await obtenerCliente(id);
  if (!c) return null;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <FormCliente accion={actualizarCliente.bind(null, id)} cliente={c} textoBoton="Guardar cambios" />

      <section className="tarjeta space-y-4">
        <h2 className="subtitulo">Privacidad y datos (RGPD)</h2>
        <p className="text-sm text-slate-600">
          {c.consentimiento_salud
            ? `Consentimiento para datos de salud dado el ${fmtFecha(c.consentimiento_fecha!)} (texto ${c.consentimiento_version}).`
            : "Sin consentimiento registrado."}
        </p>
        <div>
          <a href={`/clientes/${id}/exportar`} className="boton-sec">Descargar todos sus datos</a>
          <p className="ayuda mt-1">Un archivo con su ficha, notas, pesos y planes (derecho de acceso y portabilidad).</p>
        </div>
        <form action={borrarCliente.bind(null, id)} className="space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-3">
          <div className="text-sm font-semibold text-red-800">Borrar cliente y todos sus datos</div>
          <p className="text-xs text-red-800">
            No se puede deshacer. Descarga antes sus datos si los necesitas. Para confirmar, escribe su nombre exacto: <b>{c.nombre}</b>
          </p>
          {borrado === "no" && <p className="text-xs font-semibold text-red-700">El nombre no coincide: no se ha borrado nada.</p>}
          <div className="flex flex-wrap gap-2">
            <input name="confirmacion" className="campo max-w-xs" placeholder={c.nombre} autoComplete="off" />
            <button className="boton-peligro">Borrar definitivamente</button>
          </div>
        </form>
      </section>
    </div>
  );
}
