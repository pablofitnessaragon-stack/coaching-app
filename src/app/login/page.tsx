import { iniciarSesion } from "./acciones";

export const metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
      {/* Foto de fondo desenfocada y oscurecida. Para cambiarla, sustituye
          public/fondos/login.jpg (si no existe, se ve solo el brillo de color). */}
      <div aria-hidden className="fondo-login" />
      <form action={iniciarSesion} className="tarjeta relative w-full max-w-sm space-y-4 backdrop-blur-sm">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center degradado-marca rounded-xl text-xl font-extrabold text-white shadow-sm">C</div>
          <h1 className="titulo">Entrar</h1>
          <p className="ayuda">Acceso privado para entrenador y clientes</p>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">Email o contraseña incorrectos.</p>
        )}
        <div>
          <label className="etiqueta" htmlFor="email">Email</label>
          <input className="campo" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña</label>
          <input className="campo" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="boton w-full" type="submit">Entrar</button>
      </form>
    </main>
  );
}
