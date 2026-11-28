import Link from "next/link";
import { usuarioActual } from "@/lib/auth";
import { cerrarSesion } from "../login/acciones";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const u = await usuarioActual();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="franja-marca" />
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center degradado-marca rounded-lg font-extrabold text-white shadow-sm">C</span>
            <span className="hidden sm:inline">Coaching</span>
          </Link>
          {u.rol === "entrenador" && (
            <nav className="flex gap-1 text-sm font-medium">
              <Link href="/clientes" className="rounded-lg px-3 py-1.5 hover:bg-slate-100">Clientes</Link>
              <Link href="/ajustes" className="rounded-lg px-3 py-1.5 hover:bg-slate-100">Ajustes</Link>
            </nav>
          )}
          <form action={cerrarSesion} className="ml-auto">
            <button className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Salir</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-8">{children}</main>
    </div>
  );
}
