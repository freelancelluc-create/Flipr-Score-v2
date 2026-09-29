import { useRef, useState } from "react";
import { ArrowRight, ImagePlus, LoaderCircle, X } from "lucide-react";
import { CONDITIONS, PLATFORMS } from "../lib/pricing.js";
import { compressImage } from "../lib/image.js";

const EXAMPLES = ["iPhone 13 128GB", "PS5 con 2 mandos", "Nintendo Switch OLED", "Dyson V11"];

export default function EstimateForm({ loading, onSubmit }) {
  const [product, setProduct] = useState("");
  const [condition, setCondition] = useState("Muy buen estado");
  const [details, setDetails] = useState("");
  const [platform, setPlatform] = useState("Wallapop");
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const fileRef = useRef(null);

  const canSubmit = !loading && (product.trim().length >= 2 || image);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError("");
    try {
      setImage(await compressImage(file));
    } catch (err) {
      setImageError(err.message);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ product: product.trim(), condition, details: details.trim(), platform, imageDataUrl: image });
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
      <label htmlFor="product" className="text-sm font-semibold text-stone-700">
        ¿Qué quieres vender?
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="product"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="Marca y modelo, p. ej. iPhone 13 128GB"
          maxLength={120}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
        />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-stone-300 px-3 text-sm font-medium text-stone-600 transition hover:border-stone-400 hover:bg-stone-50"
          aria-label="Añadir foto"
        >
          <ImagePlus size={18} />
          <span className="hidden sm:inline">Foto</span>
        </button>
      </div>

      {!product && !image && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setProduct(ex)}
              className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-200"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {image && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-stone-50 p-2">
          <img src={image} alt="Foto del producto" className="h-14 w-14 rounded-lg object-cover" />
          <p className="flex-1 text-sm text-stone-600">Usaremos la foto para identificar el modelo y el estado.</p>
          <button
            type="button"
            onClick={() => setImage(null)}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-200"
            aria-label="Quitar foto"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-stone-700">Estado</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCondition(c)}
              aria-pressed={condition === c}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                condition === c
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-stone-300 text-stone-600 hover:border-stone-400"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="details" className="mt-6 block text-sm font-semibold text-stone-700">
        Detalles <span className="font-normal text-stone-400">(opcional, mejora el precio)</span>
      </label>
      <textarea
        id="details"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={2}
        maxLength={600}
        placeholder="Incluye caja y cargador, batería al 88%, un arañazo en la esquina…"
        className="mt-2 w-full resize-none rounded-xl border border-stone-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
      />

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-stone-100 p-1 text-sm font-medium" role="group" aria-label="Plataforma">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              aria-pressed={platform === p}
              className={`flex-1 rounded-lg px-4 py-1.5 transition sm:flex-none ${
                platform === p ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {loading ? (
            <>
              <LoaderCircle size={18} className="animate-spin" /> Calculando…
            </>
          ) : (
            <>
              Calcular precio <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
