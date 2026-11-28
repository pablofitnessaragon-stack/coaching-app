import type { ReactNode } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import FormAlta from "@/components/FormAlta";

export const metadata = { title: "Formulario de alta" };

interface InfoEnlace {
  estado: string;
  nombre_previsto: string | null;
  entrenador: string | null;
  caducado: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Página pública (sin cuenta) donde el cliente rellena su cuestionario inicial. */
export default async function PaginaAlta({ params }: PageProps<"/alta/[token]">) {
  const { token } = await params;
  let info: InfoEnlace | null = null;
  if (UUID.test(token)) {
    const supabase = await crearClienteServidor();
    const { data } = await supabase.rpc("ver_formulario_alta", { p_token: token });
    info = (data as InfoEnlace[] | null)?.[0] ?? null;
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center degradado-marca rounded-xl text-lg font-extrabold text-white shadow-sm">
          {(info?.entrenador ?? "C").slice(0, 1).toUpperCase()}
        </span>
        <div>
          <div className="text-sm text-slate-500">{info?.entrenador ? `Asesoramiento con ${info.entrenador}` : "Coaching"}</div>
          <h1 className="titulo">Formulario de alta</h1>
        </div>
      </div>

      {!info ? (
        <Aviso titulo="Enlace no válido">Revisa que lo hayas copiado entero o pide uno nuevo a tu entrenador.</Aviso>
      ) : info.estado !== "pendiente" ? (
        <Aviso titulo="¡Formulario recibido!">Ya tengo tus respuestas. Te escribiré pronto con tu plan. ¡Gracias!</Aviso>
      ) : info.caducado ? (
        <Aviso titulo="Enlace caducado">Este enlace ya no es válido. Pide uno nuevo a tu entrenador.</Aviso>
      ) : (
        <FormAlta token={token} nombrePrevisto={info.nombre_previsto} />
      )}
    </main>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="tarjeta space-y-2 text-center">
      <h2 className="subtitulo">{titulo}</h2>
      <p className="text-slate-600">{children}</p>
    </div>
  );
}
