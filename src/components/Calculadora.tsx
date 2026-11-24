"use client";

/**
 * Calculadora nutricional transparente. Todo se recalcula al momento y cada
 * número enseña su fórmula ("Ver cálculo"). Cualquier objetivo final se puede
 * sobrescribir a mano: el valor calculado se sigue viendo al lado.
 */
import { useMemo, useState, useTransition } from "react";
import {
  calcularPlan,
  FACTORES_ACTIVIDAD,
  FACTOR_ESTILO_VIDA,
  MET_ENTRENO,
  NOMBRE_FORMULA_BASAL,
  NOMBRE_TIPO_DIA,
  referenciasPara,
  type Calculo,
  type ConfigPlan,
  type FormulaBasal,
  type ObjetivoDia,
  type Sexo,
  type Sobrescritura,
  type TipoDia,
} from "@/lib/nutrition";
import { guardarPlan } from "@/app/(app)/clientes/acciones";
import { fmtNum } from "./ui";

interface Props {
  clienteId: string;
  sexo: Sexo;
  edad: number;
  alturaCm: number;
  pesoReferencia: number;
  /** De dónde sale el peso de referencia, para explicarlo. */
  origenPeso: string;
  grasaPct: number | null;
  configInicial: ConfigPlan;
}

const num = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Campo numérico que acepta coma decimal y permite dejarlo vacío. */
function CampoNumero({
  valor,
  onCambio,
  paso = "any",
  placeholder,
  sufijo,
  className = "",
  id,
}: {
  valor: number | null | undefined;
  onCambio: (n: number | null) => void;
  paso?: string;
  placeholder?: string;
  sufijo?: string;
  className?: string;
  id?: string;
}) {
  const [texto, setTexto] = useState(valor == null ? "" : String(valor).replace(".", ","));
  const [ultimo, setUltimo] = useState(valor);
  // Si el valor cambia desde fuera (p. ej. al cambiar de modo), actualiza el texto
  if (valor !== ultimo) {
    setUltimo(valor);
    if (num(texto) !== valor) setTexto(valor == null ? "" : String(valor).replace(".", ","));
  }
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        className={`campo text-right ${sufijo && sufijo.length > 3 ? "pr-16" : "pr-10"}`}
        inputMode="decimal"
        step={paso}
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          setTexto(e.target.value);
          const n = num(e.target.value);
          setUltimo(n);
          onCambio(n);
        }}
      />
      {sufijo && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">{sufijo}</span>}
    </div>
  );
}

function VerCalculo({ calculo, titulo = "Ver cálculo" }: { calculo: Calculo | { formula?: string; pasos: string[] }; titulo?: string }) {
  return (
    <details className="group mt-1 text-xs text-slate-600">
      <summary className="cursor-pointer select-none font-medium text-marca-700 hover:underline">{titulo}</summary>
      <div className="mt-1 space-y-0.5 rounded-lg bg-slate-50 p-2 font-mono">
        {"formula" in calculo && calculo.formula && <div className="text-slate-500">{calculo.formula}</div>}
        {calculo.pasos.map((p, i) => <div key={i}>{p}</div>)}
      </div>
    </details>
  );
}

function Seccion({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta space-y-3">
      <h2 className="subtitulo flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-marca-100 text-xs font-bold text-marca-700">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default function Calculadora(p: Props) {
  const [config, setConfig] = useState<ConfigPlan>(p.configInicial);
  const [pesoKg, setPesoKg] = useState<number | null>(p.pesoReferencia);
  const [grasaPct, setGrasaPct] = useState<number | null>(p.grasaPct);
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, iniciar] = useTransition();

  const cambiar = (parcial: Partial<ConfigPlan>) => {
    setConfig((c) => ({ ...c, ...parcial }));
    setMensaje(null);
  };
  const sobrescribir = (tipo: TipoDia, campo: keyof Sobrescritura, valor: number | null) =>
    cambiar({
      sobrescrituras: { ...config.sobrescrituras, [tipo]: { ...config.sobrescrituras[tipo], [campo]: valor } },
    });

  const sinGrasa = grasaPct == null;
  const formulaEfectiva: FormulaBasal = config.formulaBasal === "katch_mcardle" && sinGrasa ? "mifflin" : config.formulaBasal;
  const datos = { sexo: p.sexo, pesoKg: pesoKg ?? p.pesoReferencia, alturaCm: p.alturaCm, edad: p.edad, grasaPct };
  const resultado = useMemo(
    () => calcularPlan(datos, { ...config, formulaBasal: formulaEfectiva }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, pesoKg, grasaPct, formulaEfectiva],
  );
  const micros = referenciasPara(p.sexo, p.edad);

  const guardar = () => {
    iniciar(async () => {
      const r = await guardarPlan(p.clienteId, { ...config, formulaBasal: formulaEfectiva }, motivo, datos);
      if (r.ok) {
        setMotivo("");
        setMensaje({ tipo: "ok", texto: "Plan guardado. La versión anterior queda en el historial." });
      } else setMensaje({ tipo: "error", texto: r.error ?? "Error al guardar" });
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* ------- Columna izquierda: parámetros ------- */}
      <div className="space-y-4 lg:col-span-3">
        <Seccion n={1} titulo="Datos del cliente">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="etiqueta" htmlFor="peso">Peso (kg)</label>
              <CampoNumero id="peso" valor={pesoKg} onCambio={setPesoKg} sufijo="kg" />
            </div>
            <div>
              <label className="etiqueta" htmlFor="grasa">% grasa</label>
              <CampoNumero id="grasa" valor={grasaPct} onCambio={setGrasaPct} sufijo="%" placeholder="—" />
            </div>
            <div>
              <div className="etiqueta">Edad</div>
              <div className="py-2 text-sm">{p.edad} años</div>
            </div>
            <div>
              <div className="etiqueta">Altura</div>
              <div className="py-2 text-sm">{p.alturaCm} cm</div>
            </div>
          </div>
          <p className="ayuda">Peso de referencia: {p.origenPeso}. Puedes cambiarlo para este cálculo.</p>
        </Seccion>

        <Seccion n={2} titulo="Gasto basal">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(NOMBRE_FORMULA_BASAL) as FormulaBasal[]).map((f) => {
              const deshabilitada = f === "katch_mcardle" && sinGrasa;
              return (
                <button
                  key={f}
                  type="button"
                  disabled={deshabilitada}
                  title={deshabilitada ? "Necesita el % de grasa" : undefined}
                  onClick={() => cambiar({ formulaBasal: f })}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${formulaEfectiva === f ? "border-marca-600 bg-marca-50 text-marca-700" : "border-slate-300 hover:bg-slate-50"}`}
                >
                  {NOMBRE_FORMULA_BASAL[f]}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <div className="text-3xl font-bold">{fmtNum(resultado.basal.valor)} <span className="text-base font-medium text-slate-500">kcal</span></div>
              <VerCalculo calculo={resultado.basal} />
            </div>
            <div className="ml-auto w-44">
              <label className="etiqueta text-xs">Usar otro valor (a mano)</label>
              <CampoNumero valor={config.basalManual} onCambio={(n) => cambiar({ basalManual: n })} sufijo="kcal" placeholder="—" />
            </div>
          </div>
        </Seccion>

        <Seccion n={3} titulo="Gasto total por tipo de día">
          <div className="flex gap-2 text-sm">
            {(["desglosado", "factor"] as const).map((m) => (
              <button key={m} type="button" onClick={() => cambiar({ metodoGasto: m })}
                className={`rounded-lg border px-3 py-1.5 font-medium ${config.metodoGasto === m ? "border-marca-600 bg-marca-50 text-marca-700" : "border-slate-300 hover:bg-slate-50"}`}>
                {m === "desglosado" ? "Desglosado (recomendado)" : "Factor de actividad"}
              </button>
            ))}
          </div>

          {config.metodoGasto === "factor" ? (
            <div className="space-y-2">
              <p className="ayuda">Un único factor para todos los días: no hay diferencia entre entreno y descanso salvo que la escribas a mano.</p>
              <div className="flex flex-wrap items-end gap-3">
                <select className="campo max-w-xs" value={FACTORES_ACTIVIDAD.some((f) => f.valor === config.factorActividad) ? config.factorActividad : ""}
                  onChange={(e) => e.target.value && cambiar({ factorActividad: Number(e.target.value) })}>
                  <option value="">Personalizado</option>
                  {FACTORES_ACTIVIDAD.map((f) => <option key={f.valor} value={f.valor}>{fmtNum(f.valor, 3)} · {f.nombre}</option>)}
                </select>
                <CampoNumero className="w-28" valor={config.factorActividad} onCambio={(n) => n != null && cambiar({ factorActividad: n })} sufijo="×" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="etiqueta">Vida diaria (trabajo)</label>
                  <div className="flex gap-2">
                    <select className="campo" value={Object.values(FACTOR_ESTILO_VIDA).find((f) => f.valor === config.factorEstiloVida)?.valor ?? ""}
                      onChange={(e) => e.target.value && cambiar({ factorEstiloVida: Number(e.target.value) })}>
                      <option value="">Personalizado</option>
                      {Object.values(FACTOR_ESTILO_VIDA).map((f) => <option key={f.valor} value={f.valor}>{f.nombre}</option>)}
                    </select>
                    <CampoNumero className="w-24 shrink-0" valor={config.factorEstiloVida} onCambio={(n) => n != null && cambiar({ factorEstiloVida: n })} sufijo="×" />
                  </div>
                </div>
                <div>
                  <label className="etiqueta">Pasos al día</label>
                  <CampoNumero valor={config.pasosDiarios} onCambio={(n) => cambiar({ pasosDiarios: n ?? 0 })} sufijo="pasos" />
                </div>
              </div>

              {(["entreno", "entreno_intenso"] as const).map((tipo) => {
                if (tipo === "entreno_intenso" && !config.usarDiaIntenso) return null;
                const s = config.sesiones[tipo];
                return (
                  <div key={tipo} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 text-sm font-semibold">Sesión del {NOMBRE_TIPO_DIA[tipo].toLowerCase()}</div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="etiqueta text-xs">Tipo</label>
                        <select className="campo" value={Object.values(MET_ENTRENO).find((m) => m.valor === s.met)?.valor ?? ""}
                          onChange={(e) => e.target.value && cambiar({ sesiones: { ...config.sesiones, [tipo]: { ...s, met: Number(e.target.value) } } })}>
                          <option value="">Personalizado</option>
                          {Object.values(MET_ENTRENO).map((m) => <option key={m.nombre} value={m.valor}>{m.nombre} ({fmtNum(m.valor)} MET)</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="etiqueta text-xs">Intensidad (MET)</label>
                        <CampoNumero valor={s.met} onCambio={(n) => n != null && cambiar({ sesiones: { ...config.sesiones, [tipo]: { ...s, met: n } } })} sufijo="MET" />
                      </div>
                      <div>
                        <label className="etiqueta text-xs">Duración</label>
                        <CampoNumero valor={s.minutos} onCambio={(n) => cambiar({ sesiones: { ...config.sesiones, [tipo]: { ...s, minutos: n ?? 0 } } })} sufijo="min" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              Días de entreno/semana
              <CampoNumero className="w-20" valor={config.diasEntreno} onCambio={(n) => cambiar({ diasEntreno: Math.min(Math.max(n ?? 0, 0), 7) })} />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-marca-600" checked={config.usarDiaIntenso} onChange={(e) => cambiar({ usarDiaIntenso: e.target.checked, diasIntenso: e.target.checked ? Math.max(config.diasIntenso, 1) : 0 })} />
              Usar día de entreno intenso
            </label>
            {config.usarDiaIntenso && (
              <label className="flex items-center gap-2">
                Días intensos/semana
                <CampoNumero className="w-20" valor={config.diasIntenso} onCambio={(n) => cambiar({ diasIntenso: Math.min(Math.max(n ?? 0, 0), 7) })} />
              </label>
            )}
          </div>
        </Seccion>

        <Seccion n={4} titulo="Ajuste por objetivo">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-2 text-sm">
              {(["porcentaje", "kcal"] as const).map((m) => (
                <button key={m} type="button" onClick={() => cambiar({ ajuste: { modo: m, valor: m === config.ajuste.modo ? config.ajuste.valor : m === "kcal" ? -300 : -20 } })}
                  className={`rounded-lg border px-3 py-1.5 font-medium ${config.ajuste.modo === m ? "border-marca-600 bg-marca-50 text-marca-700" : "border-slate-300 hover:bg-slate-50"}`}>
                  En {m === "porcentaje" ? "%" : "kcal"}
                </button>
              ))}
            </div>
            <CampoNumero className="w-32" valor={config.ajuste.valor} onCambio={(n) => cambiar({ ajuste: { ...config.ajuste, valor: n ?? 0 } })} sufijo={config.ajuste.modo === "porcentaje" ? "%" : "kcal"} />
          </div>
          <p className="ayuda">Negativo = déficit (perder), positivo = superávit (ganar). Se aplica a cada tipo de día.</p>
        </Seccion>

        <Seccion n={5} titulo="Reparto de macros">
          <div className="flex gap-2 text-sm">
            {(["g_kg", "porcentaje"] as const).map((m) => (
              <button key={m} type="button"
                onClick={() => cambiar({ macros: m === config.macros.modo ? config.macros : m === "g_kg" ? { modo: "g_kg", proteina: 2, grasa: 0.9 } : { modo: "porcentaje", proteina: 30, grasa: 25, carbohidratos: 45 } })}
                className={`rounded-lg border px-3 py-1.5 font-medium ${config.macros.modo === m ? "border-marca-600 bg-marca-50 text-marca-700" : "border-slate-300 hover:bg-slate-50"}`}>
                {m === "g_kg" ? "g por kg de peso" : "% de las kcal"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="etiqueta text-xs">Proteína</label>
              <CampoNumero valor={config.macros.proteina} onCambio={(n) => cambiar({ macros: { ...config.macros, proteina: n ?? 0 } })} sufijo={config.macros.modo === "g_kg" ? "g/kg" : "%"} />
            </div>
            <div>
              <label className="etiqueta text-xs">Grasa</label>
              <CampoNumero valor={config.macros.grasa} onCambio={(n) => cambiar({ macros: { ...config.macros, grasa: n ?? 0 } })} sufijo={config.macros.modo === "g_kg" ? "g/kg" : "%"} />
            </div>
            <div>
              <label className="etiqueta text-xs">Carbohidratos</label>
              {config.macros.modo === "g_kg" ? (
                <div className="py-2 text-sm text-slate-500">El resto</div>
              ) : (
                <CampoNumero valor={config.macros.carbohidratos} onCambio={(n) => cambiar({ macros: { ...config.macros, carbohidratos: n ?? 0 } })} sufijo="%" />
              )}
            </div>
          </div>
          {config.macros.modo === "g_kg" && (
            <p className="ayuda">Proteína y grasa fijas por kg; los carbohidratos suben o bajan según el tipo de día (ciclado).</p>
          )}
        </Seccion>
      </div>

      {/* ------- Columna derecha: resultados ------- */}
      <div className="space-y-4 lg:col-span-2">
        <div className="space-y-4 lg:sticky lg:top-20">
          {resultado.dias.map((d) => (
            <TarjetaDia key={d.tipo} dia={d} pesoKg={datos.pesoKg} sobrescribir={sobrescribir} />
          ))}

          <section className="tarjeta space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Media de la semana</div>
            <div className="text-2xl font-bold">{fmtNum(resultado.mediaSemanalKcal)} kcal/día</div>
            <p className="ayuda">
              {config.diasEntreno} días de entreno{config.usarDiaIntenso ? `, ${config.diasIntenso} intensos` : ""} y{" "}
              {Math.max(7 - config.diasEntreno - (config.usarDiaIntenso ? config.diasIntenso : 0), 0)} de descanso.
            </p>
          </section>

          <section className="tarjeta space-y-3">
            <h2 className="subtitulo">Guardar como plan actual</h2>
            <input className="campo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo, p. ej. «Media estancada 2 semanas: −150 kcal de carbohidratos»" />
            <button type="button" className="boton w-full" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar plan"}</button>
            {mensaje && <p className={`text-sm ${mensaje.tipo === "ok" ? "text-marca-700" : "text-red-600"}`}>{mensaje.texto}</p>}
          </section>

          <details className="tarjeta">
            <summary className="subtitulo cursor-pointer">Micronutrientes de referencia</summary>
            <p className="ayuda mt-2">Ingestas de referencia de la EFSA para adultos. En la fase 2 se compararán con la dieta.</p>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {micros.map((m) => (
                  <tr key={m.clave}>
                    <td className="py-1.5">{m.nombre}{m.nota && <div className="ayuda">{m.nota}</div>}</td>
                    <td className="py-1.5 text-right font-semibold">{fmtNum(m.valor, m.valor % 1 ? 1 : 0)} {m.unidad}</td>
                    <td className="py-1.5 pl-2 text-right text-xs text-slate-500">{m.tipo === "Máximo" ? "máx." : m.tipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </div>
    </div>
  );
}

function TarjetaDia({ dia: d, pesoKg, sobrescribir }: { dia: ObjetivoDia; pesoKg: number; sobrescribir: (t: TipoDia, c: keyof Sobrescritura, v: number | null) => void }) {
  const kcalMacros = { p: d.proteinaG * 4, c: d.carbohidratosG * 4, g: d.grasaG * 9 };
  const total = kcalMacros.p + kcalMacros.c + kcalMacros.g || 1;
  const color = d.tipo === "descanso" ? "bg-sky-500" : d.tipo === "entreno_intenso" ? "bg-orange-500" : "bg-marca-600";
  const filas: { campo: keyof Sobrescritura; nombre: string; calculado: number; final: number; sobrescrito: boolean }[] = [
    { campo: "proteinaG", nombre: "Proteína", calculado: d.macrosCalculados.proteinaG, final: d.proteinaG, sobrescrito: d.sobrescrito.proteinaG },
    { campo: "carbohidratosG", nombre: "Carbohidratos", calculado: d.macrosCalculados.carbohidratosG, final: d.carbohidratosG, sobrescrito: d.sobrescrito.carbohidratosG },
    { campo: "grasaG", nombre: "Grasa", calculado: d.macrosCalculados.grasaG, final: d.grasaG, sobrescrito: d.sobrescrito.grasaG },
  ];
  return (
    <section className="tarjeta space-y-3">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <h3 className="font-semibold">{NOMBRE_TIPO_DIA[d.tipo]}</h3>
        <span className="ml-auto text-xs text-slate-500">gasto {fmtNum(d.gastoTotal.valor)} kcal</span>
      </div>
      <VerCalculo calculo={d.gastoTotal} titulo="Ver cálculo del gasto" />

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <div className="text-3xl font-bold">{fmtNum(d.kcal)} <span className="text-base font-medium text-slate-500">kcal</span></div>
          {d.sobrescrito.kcal && <div className="text-xs text-amber-700">Calculado: {fmtNum(d.kcalCalculadas.valor)} kcal</div>}
          <VerCalculo calculo={d.kcalCalculadas} titulo="Ver ajuste" />
        </div>
        <div className="w-32">
          <label className="etiqueta text-xs">A mano</label>
          <CampoNumero valor={d.sobrescrito.kcal ? d.kcal : null} onCambio={(n) => sobrescribir(d.tipo, "kcal", n)} placeholder={fmtNum(d.kcalCalculadas.valor)} sufijo="kcal" />
        </div>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" title="Reparto de kcal por macro">
        <div className="bg-rose-400" style={{ width: `${(kcalMacros.p / total) * 100}%` }} />
        <div className="bg-amber-400" style={{ width: `${(kcalMacros.c / total) * 100}%` }} />
        <div className="bg-sky-400" style={{ width: `${(kcalMacros.g / total) * 100}%` }} />
      </div>

      <table className="w-full text-sm">
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.campo}>
              <td className="py-1">
                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${["bg-rose-400", "bg-amber-400", "bg-sky-400"][i]}`} />
                {f.nombre}
              </td>
              <td className="py-1 text-right">
                <b>{fmtNum(f.final)} g</b>
                <div className="text-xs text-slate-500">{fmtNum(f.final / pesoKg, 2)} g/kg</div>
              </td>
              <td className="w-28 py-1 pl-2">
                <CampoNumero valor={f.sobrescrito ? f.final : null} onCambio={(n) => sobrescribir(d.tipo, f.campo, n)} placeholder={fmtNum(f.calculado)} sufijo="g" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <VerCalculo calculo={{ pasos: d.macrosCalculados.pasos }} titulo="Ver cálculo de macros" />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-xs text-slate-500">Fibra</div>
          <b>{fmtNum(d.fibra.valor)} g</b>
          <VerCalculo calculo={d.fibra} titulo="Cálculo" />
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-xs text-slate-500">Agua</div>
          <b>{fmtNum(d.agua.valor, 1)} L</b>
          <VerCalculo calculo={d.agua} titulo="Cálculo" />
        </div>
      </div>

      {d.avisos.map((a) => (
        <p key={a} className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{a}</p>
      ))}
    </section>
  );
}
