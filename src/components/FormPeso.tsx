"use client";

import { useActionState, useEffect, useRef } from "react";
import type { EstadoFormulario } from "@/app/(app)/clientes/acciones";

export default function FormPeso({
  accion,
  hoy,
}: {
  accion: (e: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  hoy: string;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.querySelector<HTMLInputElement>("#peso_kg")!.select();
  }, [estado]);
  return (
    <form ref={ref} action={enviar} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="etiqueta" htmlFor="fecha">Fecha</label>
        <input className="campo" id="fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} required />
      </div>
      <div className="w-28">
        <label className="etiqueta" htmlFor="peso_kg">Peso (kg)</label>
        <input className="campo" id="peso_kg" name="peso_kg" inputMode="decimal" placeholder="75,4" required />
      </div>
      <div className="min-w-40 flex-1">
        <label className="etiqueta" htmlFor="nota">Nota (opcional)</label>
        <input className="campo" id="nota" name="nota" placeholder="p. ej. después de cena libre" />
      </div>
      <button className="boton" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
      {estado.error && <p className="w-full text-sm text-red-600">{estado.error}</p>}
      {estado.ok && <p className="w-full text-sm text-ok-700">Peso guardado. Si ya había uno ese día, se ha sustituido.</p>}
    </form>
  );
}
