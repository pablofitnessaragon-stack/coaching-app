import Link from "next/link";
import { exigirEntrenador } from "@/lib/auth";
import FormCliente from "@/components/FormCliente";
import { crearCliente } from "../acciones";

export const metadata = { title: "Nuevo cliente" };

export default async function NuevoCliente() {
  await exigirEntrenador();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/clientes" className="text-sm text-slate-500 hover:underline">← Clientes</Link>
      <h1 className="titulo">Nuevo cliente</h1>
      <FormCliente accion={crearCliente} textoBoton="Crear cliente" />
    </div>
  );
}
