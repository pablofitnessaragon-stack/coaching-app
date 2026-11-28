"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "@/app/(app)/clientes/acciones";

/** Formulario para dar acceso al portal a un cliente con el email de su cuenta. */
export default function FormAccesoPortal({
  accion,
  emailSugerido,
  textoBoton,
}: {
  accion: (e: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  emailSugerido: string;
  textoBoton: string;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const valor = (estado.valores?.email_portal as string | undefined) ?? emailSugerido;
  return (
    <form action={enviar} className="flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1">
        <label className="etiqueta" htmlFor="email_portal">Email de su cuenta</label>
        <input className="campo" id="email_portal" name="email_portal" type="email" defaultValue={valor} key={valor} required />
      </div>
      <button className="boton" disabled={enviando}>{enviando ? "Guardando…" : textoBoton}</button>
      {estado.error && <p className="w-full text-sm text-red-600">{estado.error}</p>}
      {estado.ok && <p className="w-full text-sm text-marca-700">Hecho: ya puede entrar y ver su progreso.</p>}
    </form>
  );
}
