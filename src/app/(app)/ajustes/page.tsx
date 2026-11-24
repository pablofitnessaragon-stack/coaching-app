import { exigirEntrenador } from "@/lib/auth";
import { borrarEjemplos, cargarEjemplos } from "./acciones";

export const metadata = { title: "Ajustes" };

export default async function Ajustes({ searchParams }: PageProps<"/ajustes">) {
  const u = await exigirEntrenador();
  const { ok } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="titulo">Ajustes</h1>

      <section className="tarjeta space-y-1 text-sm">
        <h2 className="subtitulo">Tu cuenta</h2>
        <p>{u.nombre} · {u.email}</p>
      </section>

      <section className="tarjeta space-y-3">
        <h2 className="subtitulo">Datos de ejemplo</h2>
        <p className="text-sm text-slate-600">
          Carga 4 clientes ficticios con varias semanas de pesos y planes para probar la app. Llevan la etiqueta
          «Ejemplo» y puedes borrarlos todos de una vez sin tocar a tus clientes reales.
        </p>
        {ok === "borrados" && <p className="text-sm text-marca-700">Clientes de ejemplo borrados.</p>}
        <div className="flex flex-wrap gap-2">
          <form action={cargarEjemplos}><button className="boton">Cargar clientes de ejemplo</button></form>
          <form action={borrarEjemplos}><button className="boton-sec">Borrar clientes de ejemplo</button></form>
        </div>
      </section>
    </div>
  );
}
