# CLAUDE.md · Contexto del proyecto

@AGENTS.md

## Quién y para qué

App para un entrenador personal en España (clientes online). El entrenador **no es programador**:
explicar en español sencillo y avisar antes de cualquier paso irreversible. Toda la interfaz,
comentarios del código y documentación están en **español**. Unidades: kg, cm, g, kcal.

## Decisiones tomadas (no reabrir sin motivo)

- **Stack:** Next.js 16 (App Router, TypeScript, Tailwind 4) + Supabase (Postgres, Auth, Storage)
  en Frankfurt + Vercel. Gráficas con Recharts. Tests con Vitest.
- **Next 16:** el middleware se llama `src/proxy.ts`; `params`/`searchParams` son Promesas;
  `cacheComponents` desactivado (todo es dinámico y privado).
- **Seguridad:** toda tabla tiene RLS. El entrenador ve solo sus clientes (`es_mi_cliente`); el
  cliente (portal) solo lo suyo (`soy_cliente`), y SOLO si el entrenador le ha dado acceso
  (`clientes.acceso_portal`, botón en Ficha → `dar_acceso_portal(cliente, email)` / `quitar_acceso_portal`).
  El primer usuario creado es el entrenador; el registro público está desactivado. Las cuentas de
  cliente se crean en Supabase (Authentication → Add user). Tests de privacidad en
  `supabase/tests/` (`npx supabase test db`).
- **Portal de clientes:** diseñado en la base de datos desde la fase 1 (`clientes.usuario_id`,
  políticas de lectura y de apuntar peso). Pantallas: versión sencilla al final de la fase 3,
  completa en la fase 4.
- **Calculadora:** las fórmulas viven en `src/lib/nutrition/` sin dependencias de pantalla; cada
  una devuelve `{ valor, formula, pasos }` para ser transparente. Todo se puede sobrescribir a mano.
  Gasto desglosado = basal × estilo de vida + pasos × 0,0005 × peso + (MET − 1) × peso × horas.
  En modo g/kg, proteína y grasa fijas; los carbohidratos ciclan.
- **Planes:** cada cambio crea una versión nueva en `planes_nutricionales` (con motivo); la tabla
  hace de historial de ajustes. Solo una versión activa por cliente.
- **Peso de referencia** para calcular: media de la última semana con ≥3 registros.
- **Ritmo:** cambio medio semanal de las últimas 3 semanas frente al rango por objetivo
  (`RITMO_POR_DEFECTO` en `peso.ts`).
- **RGPD:** consentimiento obligatorio y versionado (`src/lib/consentimiento.ts`), exportación JSON
  y borrado en cascada desde la ficha.
- **Reparto de funciones:** la calculadora y el creador de dietas son SOLO del entrenador. El
  cliente (portal) solo ve el resultado: progreso, objetivos semanales, macros, dieta y
  suplementación que le asigna el entrenador, y hace su seguimiento (peso, check-in, diario de comidas).
- **Formulario de alta:** el entrenador crea un enlace único (`/alta/<código>`, un solo uso, caduca a
  los 30 días) y el cliente lo rellena sin cuenta. Las preguntas viven en `src/lib/formulario-alta.ts`
  (pantalla, validación y resumen salen de ahí). Las respuestas van a `formularios_alta`; el cliente
  anónimo solo puede usar `ver_formulario_alta` y `enviar_formulario_alta`. El entrenador revisa y
  crea la ficha con un clic; lo que no cabe en la ficha se muestra como "Cuestionario inicial".
- **Medidas:** tabla `medidas` (por fecha, todas opcionales, basta una; incluye cuello y % de grasa medido
  con báscula/DEXA). El % de grasa se ESTIMA con la fórmula de la Marina (`nutrition/grasa.ts`, cuello +
  cintura + cadera en mujeres + altura) al mostrarlo, no se guarda. En el alta, la báscula manda sobre la estimación. Las apunta el entrenador en Progreso
  o el cliente (portal, políticas ya puestas); las del formulario de alta pasan aquí al crear la ficha.
- **Datos de ejemplo:** 4 clientes ficticios (`src/lib/ejemplos.ts`), marcados `es_ejemplo`.

## Fases

1. ✅ Fichas + calculadora + peso con gráfica + historial (esta).
2. Base de alimentos (BEDCA, USDA, Open Food Facts) + medidas caseras por alimento (puñado,
   pulgar, palma, puño, cucharada, unidad → gramos aproximados) + recetas + creador de dietas + PDF.
3. Vista semanal con ciclado + medidas + check-ins + suplementación por cliente + dashboard +
   portal sencillo (semana, objetivos, dieta, suplementos, apuntar peso).
4. Portal completo (check-in, fotos privadas, **diario de comidas** en gramos o medidas caseras con
   macros calculados frente al objetivo del día), alertas, sugerencias de ajuste, rutinas.

## Cómo trabajar aquí

- `npm test` tras tocar fórmulas; cada test lleva la cuenta hecha a mano en un comentario.
- Base de datos local: `npx supabase start` + `npx supabase db reset` (usuario
  `entrenador@ejemplo.com` / `demo1234`). Cambios de esquema = nueva migración en `supabase/migrations/`.
