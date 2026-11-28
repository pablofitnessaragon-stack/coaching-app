# Coaching · herramienta para entrenador personal

App web (funciona en ordenador y móvil) para gestionar clientes de nutrición y
entrenamiento: fichas, calculadora nutricional transparente con ciclado
entreno/descanso, registro de peso con gráficas e historial de ajustes.

**Estado:** fase 1 terminada (ver [`CLAUDE.md`](CLAUDE.md) para el plan completo).

## Qué hay en la fase 1

- **Clientes:** lista con estado (en ritmo, progreso lento, días sin pesarse) y ficha completa
  (datos, objetivo, actividad, preferencias, alergias, notas).
- **Calculadora:** Mifflin-St Jeor, Harris-Benedict y Katch-McArdle; gasto total por factor o
  desglosado (vida diaria + pasos + entreno); déficit/superávit en % o kcal; macros en g/kg o %;
  objetivos distintos para día de entreno, descanso e intenso; fibra, agua y micronutrientes de
  referencia. Cada número enseña su fórmula y se puede sobrescribir a mano.
- **Progreso:** peso diario, media móvil de 7 días, medias semanales (lunes-domingo) y comparación
  con el ritmo objetivo.
- **Historial:** cada cambio de plan queda guardado con fecha y motivo.
- **RGPD:** consentimiento obligatorio, datos en la UE, descarga de todos los datos de un cliente
  y borrado completo.
- **Datos de ejemplo:** Ajustes → «Cargar clientes de ejemplo» (4 clientes ficticios).

## Arrancarlo en tu ordenador (desarrollo)

Necesitas [Node.js 22](https://nodejs.org) y [Docker](https://www.docker.com/) (para la base de datos local).

```bash
npm install
npx supabase start      # base de datos local (la primera vez tarda unos minutos)
npx supabase db reset   # crea las tablas y el usuario de prueba
cp .env.example .env.local   # y pon la URL y clave que muestra "supabase start"
npm run dev             # abre http://localhost:3000
```

Usuario de prueba local: `entrenador@ejemplo.com` / `demo1234`.

## Tests

```bash
npm test
```

Comprueban todas las fórmulas con ejemplos calculados a mano (las cuentas están en los comentarios de
`src/lib/nutrition/__tests__/formulas.test.ts`).

Las reglas de privacidad de la base de datos (qué ve cada cliente) tienen sus propios tests:

```bash
npx supabase test db
```

## Publicarlo en internet

Ver [`docs/PUESTA_EN_MARCHA.md`](docs/PUESTA_EN_MARCHA.md): Supabase (Frankfurt) + Vercel, paso a paso.

## Estructura

| Carpeta | Qué hay |
| --- | --- |
| `src/lib/nutrition/` | Todas las fórmulas (sin pantallas), con sus tests |
| `src/app/(app)/` | Las pantallas de la app |
| `src/components/` | Piezas de pantalla reutilizables (calculadora, gráfica, formularios) |
| `supabase/migrations/` | Tablas y reglas de seguridad de la base de datos |
