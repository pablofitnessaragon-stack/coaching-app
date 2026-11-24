"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Pestanas({ base, pestanas }: { base: string; pestanas: { ruta: string; texto: string }[] }) {
  const ruta = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 text-sm font-medium sm:mx-0 sm:px-0">
      {pestanas.map((p) => {
        const href = base + p.ruta;
        const activa = p.ruta === "" ? ruta === base : ruta.startsWith(href);
        return (
          <Link
            key={p.ruta}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 ${activa ? "border-marca-600 text-marca-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {p.texto}
          </Link>
        );
      })}
    </nav>
  );
}
