/**
 * Texto de consentimiento que el cliente acepta para el tratamiento de sus
 * datos de salud (RGPD, art. 9). Si cambias el texto, sube la versión: cada
 * cliente guarda la versión que aceptó y la fecha.
 *
 * Es un borrador orientativo: que lo revise un profesional antes de usarlo.
 */
export const TEXTO_CONSENTIMIENTO_VERSION = "v1-2026-11";

export const TEXTO_CONSENTIMIENTO =
  "El cliente ha dado su consentimiento expreso para que su entrenador trate sus datos de salud " +
  "(peso, medidas, alimentación, actividad y, en su caso, fotos de progreso) con la única finalidad " +
  "de prestarle el servicio de asesoramiento. Puede pedir en cualquier momento una copia de sus datos " +
  "o su eliminación.";

/**
 * Texto que acepta el PROPIO cliente al enviar el formulario de alta (en
 * primera persona). Misma regla: si cambias el texto, sube la versión.
 */
export const TEXTO_CONSENTIMIENTO_CLIENTE_VERSION = "v1-2026-11-cliente";

export const TEXTO_CONSENTIMIENTO_CLIENTE =
  "Doy mi consentimiento expreso para que mi entrenador trate los datos de salud que facilito en este " +
  "formulario y durante el asesoramiento (peso, medidas, alimentación, actividad, salud y, en su caso, " +
  "fotos de progreso) con la única finalidad de prestarme el servicio. Sé que puedo pedir en cualquier " +
  "momento una copia de mis datos, corregirlos o que se eliminen, y retirar este consentimiento.";
