"use client";

import { useActionState } from "react";
import type { Cliente } from "@/lib/datos";
import type { EstadoFormulario } from "@/app/(app)/clientes/acciones";
import { NOMBRE_OBJETIVO } from "@/lib/nutrition/tipos";
import { FACTOR_ESTILO_VIDA } from "@/lib/nutrition/gasto-total";
import { TEXTO_CONSENTIMIENTO } from "@/lib/consentimiento";

interface Props {
  accion: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  cliente?: Cliente;
  textoBoton: string;
}

const TIPOS_ENTRENO = [
  ["fuerza", "Fuerza"],
  ["cardio", "Cardio"],
  ["hiit", "HIIT"],
  ["deporte", "Deporte"],
] as const;

export default function FormCliente({ accion, cliente: c, textoBoton }: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const err = (campo: string) =>
    estado.errores?.[campo] ? <p className="mt-1 text-xs text-red-600">{estado.errores[campo]}</p> : null;
  const hoy = new Date().toISOString().slice(0, 10);
  // Tras enviar, React vacía el formulario: rellenamos con lo enviado (o con la ficha)
  const enviado = estado.valores;
  const v = (campo: keyof Cliente, porDefecto = ""): string => {
    if (enviado && campo in enviado) return String(enviado[campo] ?? "");
    const x = c?.[campo];
    return x == null ? porDefecto : String(x);
  };
  const tipos: string[] = enviado ? ((enviado.tipo_entreno as string[]) ?? []) : (c?.tipo_entreno ?? []);

  return (
    // key: tras cada envío se vuelven a montar los campos con los valores enviados
    // (React vacía el formulario y los <select> no recuperan su valor solos)
    <form key={JSON.stringify(enviado ?? {})} action={enviar} className="space-y-5">
      <section className="tarjeta space-y-4">
        <h2 className="subtitulo">Datos básicos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="nombre">Nombre y apellidos *</label>
            <input className="campo" id="nombre" name="nombre" defaultValue={v("nombre")} required />
            {err("nombre")}
          </div>
          <div>
            <label className="etiqueta" htmlFor="email">Email</label>
            <input className="campo" id="email" name="email" type="email" defaultValue={v("email")} />
            {err("email")}
          </div>
          <div>
            <label className="etiqueta" htmlFor="telefono">Teléfono</label>
            <input className="campo" id="telefono" name="telefono" type="tel" defaultValue={v("telefono")} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="sexo">Sexo *</label>
            <select className="campo" id="sexo" name="sexo" defaultValue={v("sexo")} required>
              <option value="" disabled>Elegir…</option>
              <option value="mujer">Mujer</option>
              <option value="hombre">Hombre</option>
            </select>
            {err("sexo")}
          </div>
          <div>
            <label className="etiqueta" htmlFor="fecha_nacimiento">Fecha de nacimiento *</label>
            <input className="campo" id="fecha_nacimiento" name="fecha_nacimiento" type="date" defaultValue={v("fecha_nacimiento")} required />
            {err("fecha_nacimiento")}
          </div>
          <div>
            <label className="etiqueta" htmlFor="altura_cm">Altura (cm) *</label>
            <input className="campo" id="altura_cm" name="altura_cm" type="number" step="0.5" inputMode="decimal" defaultValue={v("altura_cm")} required />
            {err("altura_cm")}
          </div>
          <div>
            <label className="etiqueta" htmlFor="peso_inicial_kg">Peso inicial (kg) *</label>
            <input className="campo" id="peso_inicial_kg" name="peso_inicial_kg" type="number" step="0.1" inputMode="decimal" defaultValue={v("peso_inicial_kg")} required />
            {err("peso_inicial_kg")}
          </div>
          <div>
            <label className="etiqueta" htmlFor="grasa_inicial_pct">% de grasa (si lo hay)</label>
            <input className="campo" id="grasa_inicial_pct" name="grasa_inicial_pct" type="number" step="0.1" inputMode="decimal" defaultValue={v("grasa_inicial_pct")} />
            {err("grasa_inicial_pct")}
          </div>
          <div>
            <label className="etiqueta" htmlFor="fecha_inicio">Fecha de inicio *</label>
            <input className="campo" id="fecha_inicio" name="fecha_inicio" type="date" defaultValue={v("fecha_inicio", hoy)} required />
          </div>
        </div>
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="subtitulo">Objetivo y actividad</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="objetivo">Objetivo *</label>
            <select className="campo" id="objetivo" name="objetivo" defaultValue={v("objetivo", "perdida_grasa")}>
              {Object.entries(NOMBRE_OBJETIVO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="estilo_vida">Trabajo / día a día</label>
            <select className="campo" id="estilo_vida" name="estilo_vida" defaultValue={v("estilo_vida", "sedentario")}>
              {Object.entries(FACTOR_ESTILO_VIDA).map(([v, f]) => <option key={v} value={v}>{f.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="pasos_diarios">Pasos diarios (media)</label>
            <input className="campo" id="pasos_diarios" name="pasos_diarios" type="number" step="500" inputMode="numeric" defaultValue={v("pasos_diarios")} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="dias_entreno">Días de entreno por semana</label>
            <input className="campo" id="dias_entreno" name="dias_entreno" type="number" min="0" max="7" inputMode="numeric" defaultValue={v("dias_entreno")} />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="etiqueta">Tipo de entreno</legend>
            <div className="flex flex-wrap gap-2">
              {TIPOS_ENTRENO.map(([valor, t]) => (
                <label key={valor} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-marca-500 has-[:checked]:bg-marca-50">
                  <input type="checkbox" name="tipo_entreno" value={valor} defaultChecked={tipos.includes(valor)} className="accent-marca-600" />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="subtitulo">Preferencias y restricciones</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="tipo_dieta">Tipo de dieta</label>
            <select className="campo" id="tipo_dieta" name="tipo_dieta" defaultValue={v("tipo_dieta", "omnivora")}>
              <option value="omnivora">Omnívora</option>
              <option value="pescetariana">Pescetariana</option>
              <option value="vegetariana">Vegetariana</option>
              <option value="vegana">Vegana</option>
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="comidas_al_dia">Comidas al día</label>
            <input className="campo" id="comidas_al_dia" name="comidas_al_dia" type="number" min="1" max="8" inputMode="numeric" defaultValue={v("comidas_al_dia")} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="alergias">Alergias</label>
            <input className="campo" id="alergias" name="alergias" defaultValue={v("alergias")} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="intolerancias">Intolerancias</label>
            <input className="campo" id="intolerancias" name="intolerancias" defaultValue={v("intolerancias")} />
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="alimentos_no_gustan">Alimentos que no le gustan</label>
            <input className="campo" id="alimentos_no_gustan" name="alimentos_no_gustan" defaultValue={v("alimentos_no_gustan")} />
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="horarios">Horarios (trabajo, entreno, comidas)</label>
            <textarea className="campo" id="horarios" name="horarios" rows={2} defaultValue={v("horarios")} />
          </div>
        </div>
      </section>

      {!c && (
        <section className="tarjeta space-y-2 border-marca-500/40 bg-marca-50/40">
          <h2 className="subtitulo">Consentimiento (RGPD)</h2>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consentimiento" defaultChecked={enviado?.consentimiento === "on"} className="mt-1 h-4 w-4 accent-marca-600" />
            <span>{TEXTO_CONSENTIMIENTO}</span>
          </label>
          {err("consentimiento")}
        </section>
      )}

      {estado.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{estado.error}</p>}
      {estado.errores && !estado.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Revisa los campos marcados en rojo.</p>
      )}
      {estado.ok && <p className="rounded-lg bg-marca-50 p-3 text-sm text-marca-700">Cambios guardados.</p>}

      <div className="flex justify-end">
        <button className="boton" disabled={enviando}>{enviando ? "Guardando…" : textoBoton}</button>
      </div>
    </form>
  );
}
