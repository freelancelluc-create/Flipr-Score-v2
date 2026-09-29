/**
 * Reduce y comprime una foto en el navegador antes de enviarla a la IA:
 * menos coste, envío más rápido y sin errores por tamaño.
 */

const MAX_DIM = 1024;
const QUALITY = 0.82;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se ha podido leer la imagen."));
    img.src = src;
  });
}

/** @param {File} file  @returns {Promise<string>} dataURL JPEG */
export async function compressImage(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, MAX_DIM / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}
