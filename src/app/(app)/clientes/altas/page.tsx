import Link from "next/link";
import { exigirEntrenador } from "@/lib/auth";
import { listarFormulariosAlta, type FormularioAlta } from "@/lib/datos";
import { urlBase } from "@/lib/url";
import { Insignia, fmtFecha } from "@/components/ui";
import BotonCopiar from "@/components/BotonCopiar";
import { crearEnlaceAlta } from "../acciones";

export const metadata = { title: "Formularios de alta" };

const ESTADO: Record<FormularioAlta["estado"], { texto: string; clase: string }> = {
  pendiente: { texto: "Esperando respuesta", clase: "bg-slate-100 text-slate-600" },
  recibido: { texto: "Recibido: revisar", clase: "bg-amber-100 text-amber-800" },
  convertido: { texto: "Ficha creada", clase: "bg-marca-100 text-marca-700" },
};

export default async function PaginaAltas({ searchParams }: PageProps<"/clientes/altas">) {
  await exigirEntrenador();
  const { nuevo } = await searchParams;
  const [formularios, base] = await Promise.all([listarFormulariosAlta(), urlBase()]);
  const enlace = (f: FormularioAlta) => `${base}/alta/${f.token}`;
  const recien = formularios.find((f) => f.id === nuevo);
  const ahora = new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/clientes" className="text-sm text-slate-500 hover:underline">← Clientes</Link>
      <div>
        <h1 className="titulo">Formularios de alta</h1>
        <p className="mt-1 text-sm text-slate-600">
          Crea un enlace y mándaselo al cliente (por WhatsApp o email). Él rellena el cuestionario desde el móvil, sin
          crearse ninguna cuenta. Cuando lo envíe, te aparecerá aquí para revisarlo y crear su ficha con un clic.
        </p>
      </div>

      {recien && (
        <div className="tarjeta space-y-3 border-marca-500 bg-marca-50/50">
          <h2 className="subtitulo">✅ Enlace creado{recien.nombre_previsto ? ` para ${recien.nombre_previsto}` : ""}</h2>
          <p className="break-all rounded-lg bg-white p-2 font-mono text-sm">{enlace(recien)}</p>
          <div className="flex flex-wrap gap-2">
            <BotonCopiar texto={enlace(recien)} />
            <a
              className="boton"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(
                `¡Hola${recien.nombre_previsto ? " " + recien.nombre_previsto.split(" ")[0] : ""}! Para preparar tu plan necesito que rellenes este formulario (unos 10 minutos): ${enlace(recien)}`,
              )}`}
            >
              Enviar por WhatsApp
            </a>
            <a href={enlace(recien)} target="_blank" className="boton-sec">Ver cómo lo ve el cliente</a>
          </div>
          <p className="ayuda">El enlace sirve una sola vez y caduca en 30 días.</p>
        </div>
      )}

      <form action={crearEnlaceAlta} className="tarjeta space-y-3">
        <h2 className="subtitulo">Nuevo enlace</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input name="nombre_previsto" className="campo" placeholder="Nombre del cliente (opcional, para reconocerlo)" />
          <button className="boton shrink-0">Crear enlace</button>
        </div>
      </form>

      <section className="space-y-2">
        <h2 className="subtitulo">Enviados</h2>
        {formularios.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no has creado ningún enlace.</p>
        ) : (
          <ul className="space-y-2">
            {formularios.map((f) => {
              const nombre = (f.respuestas?.nombre as string | undefined) ?? f.nombre_previsto ?? "Sin nombre";
              const caducado = f.estado === "pendiente" && new Date(f.caduca_at) < ahora;
              const e = caducado ? { texto: "Caducado", clase: "bg-red-50 text-red-700" } : ESTADO[f.estado];
              return (
                <li key={f.id} className="tarjeta flex flex-wrap items-center gap-3 !py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{nombre}</div>
                    <div className="text-xs text-slate-500">
                      {f.enviado_at ? `Enviado el ${fmtFecha(f.enviado_at)}` : `Creado el ${fmtFecha(f.created_at)}`}
                    </div>
                  </div>
                  <Insignia clase={e.clase}>{e.texto}</Insignia>
                  {f.estado === "pendiente" && !caducado && <BotonCopiar texto={enlace(f)} />}
                  {f.estado === "convertido" && f.cliente_id ? (
                    <Link href={`/clientes/${f.cliente_id}`} className="boton-sec">Ver ficha</Link>
                  ) : (
                    <Link href={`/clientes/altas/${f.id}`} className={f.estado === "recibido" ? "boton" : "boton-sec"}>
                      {f.estado === "recibido" ? "Revisar" : "Abrir"}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
