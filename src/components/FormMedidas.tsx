"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "@/app/(app)/clientes/acciones";

const CAMPOS = [
  ["cuello_cm", "Cuello"],
  ["cintura_cm", "Cintura"],
  ["cadera_cm", "Cadera"],
  ["pecho_cm", "Pecho"],
  ["brazo_cm", "Brazo"],
  ["muslo_cm", "Muslo"],
] as const;

/** Apuntar medidas: todas opcionales, basta con rellenar una. */
export default function FormMedidas({
  accion,
  hoy,
}: {
  accion: (e: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  hoy: string;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  return (
    <form action={enviar} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="col-span-2 sm:col-span-1">
          <label className="etiqueta" htmlFor="m-fecha">Fecha</label>
          <input className="campo" id="m-fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} required />
        </div>
        {CAMPOS.map(([nombre, texto]) => (
          <div key={nombre}>
            <label className="etiqueta" htmlFor={`m-${nombre}`}>{texto} (cm)</label>
            <input className="campo" id={`m-${nombre}`} name={nombre} inputMode="decimal" />
          </div>
        ))}
        <div>
          <label className="etiqueta" htmlFor="m-grasa_pct">% grasa medido</label>
          <input className="campo" id="m-grasa_pct" name="grasa_pct" inputMode="decimal" placeholder="si lo hay" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="m-grasa_metodo">Medido con</label>
          <select className="campo" id="m-grasa_metodo" name="grasa_metodo" defaultValue="bioimpedancia">
            <option value="bioimpedancia">Bioimpedancia</option>
            <option value="dexa">DEXA</option>
            <option value="plicometro">Plicómetro</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-4 lg:col-span-6">
          <label className="etiqueta" htmlFor="m-nota">Nota</label>
          <input className="campo" id="m-nota" name="nota" placeholder="opcional" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="boton" disabled={enviando}>{enviando ? "Guardando…" : "Guardar medidas"}</button>
        <span className="ayuda">Rellena solo lo que tengas. Con cuello, cintura y (en mujeres) cadera calculo el % de grasa.</span>
      </div>
      {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
      {estado.ok && <p className="text-sm text-ok-700">Medidas guardadas. Si ya había ese día, se han sustituido.</p>}
    </form>
  );
}
