/** Edad en años cumplidos a una fecha dada (por defecto, hoy). */
export function calcularEdad(fechaNacimiento: string | Date, enFecha: Date = new Date()): number {
  const nac = typeof fechaNacimiento === "string" ? new Date(fechaNacimiento + "T00:00:00") : fechaNacimiento;
  let edad = enFecha.getFullYear() - nac.getFullYear();
  const aunNoCumple =
    enFecha.getMonth() < nac.getMonth() ||
    (enFecha.getMonth() === nac.getMonth() && enFecha.getDate() < nac.getDate());
  if (aunNoCumple) edad--;
  return edad;
}
