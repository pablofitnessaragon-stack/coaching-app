import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirEntrenador } from "@/lib/auth";
import { obtenerFormularioAlta } from "@/lib/datos";
import { fichaDesdeRespuestas } from "@/lib/formulario-alta";
import { urlBase } from "@/lib/url";
import { fmtFecha } from "@/components/ui";
import FormCliente from "@/components/FormCliente";
import ResumenAlta from "@/components/ResumenAlta";
import BotonCopiar from "@/components/BotonCopiar";
import { borrarFormularioAlta, crearClienteDesdeAlta } from "../../acciones";

export const metadata = { title: "Revisar formulario de alta" };

export default async function RevisarAlta({ params }: PageProps<"/clientes/altas/[id]">) {
  await exigirEntrenador();
  const { id } = await params;
  const f = await obtenerFormularioAlta(id);
  if (!f) notFound();
  if (f.estado === "convertido" && f.cliente_id) redirect(`/clientes/${f.cliente_id}/ficha`);

  const borrar = (
    <form action={borrarFormularioAlta.bind(null, id)}>
      <button className="text-sm text-red-600 hover:underline">
        {f.estado === "recibido" ? "Descartar estas respuestas (se borran)" : "Borrar este enlace"}
      </button>
    </form>
  );

  if (f.estado === "pendiente") {
    const enlace = `${await urlBase()}/alta/${f.token}`;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/clientes/altas" className="text-sm text-slate-500 hover:underline">← Formularios de alta</Link>
        <h1 className="titulo">{f.nombre_previsto ?? "Formulario de alta"}</h1>
        <div className="tarjeta space-y-3">
          <p className="text-sm text-slate-600">
            El cliente todavía no lo ha enviado. Caduca el {fmtFecha(f.caduca_at)}.
          </p>
          <p className="break-all rounded-lg bg-slate-50 p-2 font-mono text-sm">{enlace}</p>
          <div className="flex flex-wrap gap-2">
            <BotonCopiar texto={enlace} />
            <a href={enlace} target="_blank" className="boton-sec">Ver cómo lo ve el cliente</a>
          </div>
        </div>
        {borrar}
      </div>
    );
  }

  const r = f.respuestas ?? {};
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/clientes/altas" className="text-sm text-slate-500 hover:underline">← Formularios de alta</Link>
      <div>
        <h1 className="titulo">{String(r.nombre ?? f.nombre_previsto ?? "Formulario de alta")}</h1>
        <p className="text-sm text-slate-500">Enviado el {f.enviado_at ? fmtFecha(f.enviado_at) : "—"}</p>
      </div>

      <section className="tarjeta space-y-3">
        <h2 className="subtitulo">Lo que ha contestado</h2>
        <ResumenAlta respuestas={r} />
      </section>

      <div className="space-y-1">
        <h2 className="subtitulo">Crear su ficha</h2>
        <p className="text-sm text-slate-600">
          He rellenado la ficha con sus respuestas. Revísala, corrige lo que quieras y pulsa «Crear cliente». El resto de
          respuestas (salud, hábitos, medidas...) quedarán guardadas en su ficha.
        </p>
      </div>
      <FormCliente
        accion={crearClienteDesdeAlta.bind(null, id)}
        textoBoton="Crear cliente"
        valoresIniciales={fichaDesdeRespuestas(r)}
        consentimientoDado={`El cliente dio su consentimiento al enviar el formulario${f.consentimiento_fecha ? ` el ${fmtFecha(f.consentimiento_fecha)}` : ""} (texto ${f.consentimiento_version}).`}
      />
      {borrar}
    </div>
  );
}
