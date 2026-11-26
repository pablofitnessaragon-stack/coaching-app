"use client";

/**
 * Formulario de alta que rellena el cliente. Las preguntas salen de
 * src/lib/formulario-alta.ts (no hace falta tocar este archivo para cambiarlas).
 */
import { useActionState, useState, type FormEvent } from "react";
import { SECCIONES, seAplica, type Pregunta } from "@/lib/formulario-alta";
import { TEXTO_CONSENTIMIENTO_CLIENTE } from "@/lib/consentimiento";
import { enviarAlta, type EstadoAlta } from "@/app/alta/[token]/acciones";

type Valores = Record<string, string | string[] | undefined>;

function leer(form: HTMLFormElement): Valores {
  const fd = new FormData(form);
  const v: Valores = {};
  for (const clave of new Set(fd.keys())) {
    const todos = fd.getAll(clave).map(String);
    v[clave] = todos.length > 1 ? todos : todos[0];
  }
  return v;
}

export default function FormAlta({ token, nombrePrevisto }: { token: string; nombrePrevisto: string | null }) {
  const [estado, enviar, enviando] = useActionState<EstadoAlta, FormData>(enviarAlta.bind(null, token), {});
  const inicial: Valores = estado.valores ?? (nombrePrevisto ? { nombre: nombrePrevisto } : {});
  // Respuestas en vivo: sirven para mostrar u ocultar preguntas (p. ej. «¿qué deporte?»)
  const [vivos, setVivos] = useState<Valores>(inicial);
  const [claveForm, setClaveForm] = useState(0);
  const [ultimoEstado, setUltimoEstado] = useState(estado);
  if (ultimoEstado !== estado) {
    // Tras enviar con errores, React vacía el formulario: lo volvemos a montar con lo enviado
    setUltimoEstado(estado);
    setVivos(inicial);
    setClaveForm((k) => k + 1);
  }

  if (estado.ok) {
    return (
      <div className="tarjeta space-y-2 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="subtitulo">¡Enviado! Muchas gracias</h2>
        <p className="text-slate-600">Ya tengo toda tu información. Te escribiré pronto con tu plan.</p>
      </div>
    );
  }

  const err = estado.errores ?? {};
  const numErrores = Object.keys(err).length;

  return (
    <form
      key={claveForm}
      action={enviar}
      onChange={(e: FormEvent<HTMLFormElement>) => setVivos(leer(e.currentTarget))}
      className="space-y-5"
      noValidate
    >
      <div className="tarjeta space-y-2 text-sm text-slate-600">
        <p>
          Este cuestionario me sirve para conocerte y preparar tu plan de alimentación y entrenamiento. Se tarda unos{" "}
          <b>10 minutos</b>.
        </p>
        <p>
          Lo marcado con <span className="font-semibold text-red-600">*</span> es necesario; el resto, cuanto más
          completes, mejor. Si no sabes algo, déjalo vacío.
        </p>
      </div>

      {SECCIONES.map((s, i) => (
        <section key={s.id} className="tarjeta space-y-4">
          <div>
            <h2 className="subtitulo">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-marca-100 text-xs font-bold text-marca-700">
                {i + 1}
              </span>
              {s.titulo}
            </h2>
            {s.intro && <p className="ayuda mt-1">{s.intro}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {s.preguntas
              .filter((p) => seAplica(p, vivos))
              .map((p) => (
                <div key={p.clave} className={p.ancho || p.tipo === "opcion" || p.tipo === "varias" || p.tipo === "escala" || p.tipo === "largo" ? "sm:col-span-2" : ""}>
                  <Campo p={p} valor={inicial[p.clave]} error={err[p.clave]} />
                </div>
              ))}
          </div>
        </section>
      ))}

      <section className="tarjeta space-y-2 border-marca-500/40 bg-marca-50/40">
        <h2 className="subtitulo">Privacidad</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consentimiento"
            defaultChecked={inicial.consentimiento === "on"}
            className="mt-1 h-5 w-5 shrink-0 accent-marca-600"
          />
          <span>
            {TEXTO_CONSENTIMIENTO_CLIENTE} <span className="font-semibold text-red-600">*</span>
          </span>
        </label>
        {err.consentimiento && <p className="text-xs text-red-600">{err.consentimiento}</p>}
        <p className="ayuda">
          Tus datos se guardan cifrados en servidores de la Unión Europea y solo los ve tu entrenador.
        </p>
      </section>

      {estado.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{estado.error}</p>}
      {numErrores > 0 && !estado.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Falta algo o hay un dato que revisar ({numErrores}). Está marcado en rojo más arriba.
        </p>
      )}

      <button className="boton w-full py-3 text-base" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar formulario"}
      </button>
    </form>
  );
}

function Campo({ p, valor, error }: { p: Pregunta; valor: string | string[] | undefined; error?: string }) {
  const id = `c-${p.clave}`;
  const unico = Array.isArray(valor) ? valor[0] : valor;
  const lista = Array.isArray(valor) ? valor : valor ? [valor] : [];
  const titulo = (
    <>
      {p.pregunta}
      {p.unidad && p.tipo === "numero" ? ` (${p.unidad})` : ""}
      {p.obligatoria && <span className="ml-0.5 text-red-600">*</span>}
    </>
  );
  const pie = (
    <>
      {p.ayuda && <p className="ayuda mt-1">{p.ayuda}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </>
  );
  const pastilla =
    "flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm has-[:checked]:border-marca-500 has-[:checked]:bg-marca-50";

  if (p.tipo === "opcion" || p.tipo === "varias") {
    return (
      <fieldset>
        <legend className="etiqueta">{titulo}</legend>
        <div className="flex flex-wrap gap-2">
          {p.opciones!.map(([v, t]) => (
            <label key={v} className={pastilla}>
              <input
                type={p.tipo === "opcion" ? "radio" : "checkbox"}
                name={p.clave}
                value={v}
                defaultChecked={lista.includes(v)}
                className="accent-marca-600"
              />
              {t}
            </label>
          ))}
        </div>
        {pie}
      </fieldset>
    );
  }

  if (p.tipo === "escala") {
    return (
      <fieldset>
        <legend className="etiqueta">{titulo}</legend>
        <div className="flex items-center gap-2">
          {p.extremos && <span className="hidden text-xs text-slate-500 sm:inline">{p.extremos[0]}</span>}
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white font-semibold has-[:checked]:border-marca-500 has-[:checked]:bg-marca-600 has-[:checked]:text-white"
            >
              <input type="radio" name={p.clave} value={n} defaultChecked={unico === String(n)} className="sr-only" />
              {n}
            </label>
          ))}
          {p.extremos && <span className="hidden text-xs text-slate-500 sm:inline">{p.extremos[1]}</span>}
        </div>
        {p.extremos && (
          <p className="ayuda mt-1 sm:hidden">
            1 = {p.extremos[0]} · 5 = {p.extremos[1]}
          </p>
        )}
        {pie}
      </fieldset>
    );
  }

  const comun = { id, name: p.clave, defaultValue: unico ?? "", className: "campo", "aria-invalid": !!error };
  return (
    <div>
      <label className="etiqueta" htmlFor={id}>{titulo}</label>
      {p.tipo === "largo" ? (
        <textarea {...comun} rows={3} />
      ) : (
        <input
          {...comun}
          type={{ email: "email", telefono: "tel", fecha: "date", numero: "text", texto: "text" }[p.tipo as string] ?? "text"}
          inputMode={p.tipo === "numero" ? (p.paso === 1 || p.paso === 500 || p.paso === 5 ? "numeric" : "decimal") : undefined}
          autoComplete={{ nombre: "name", email: "email", telefono: "tel", fecha_nacimiento: "bday" }[p.clave]}
        />
      )}
      {pie}
    </div>
  );
}
