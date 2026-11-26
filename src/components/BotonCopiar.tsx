"use client";

import { useState } from "react";

/** Botón que copia un texto (el enlace del formulario) al portapapeles. */
export default function BotonCopiar({ texto, etiqueta = "Copiar enlace" }: { texto: string; etiqueta?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="boton-sec"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          window.prompt("Copia el enlace:", texto);
        }
      }}
    >
      {copiado ? "¡Copiado!" : etiqueta}
    </button>
  );
}
