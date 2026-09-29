import { useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { Info } from "lucide-react";
import EstimateForm from "./components/EstimateForm.jsx";
import ResultView from "./components/ResultView.jsx";
import Waitlist from "./components/Waitlist.jsx";
import { estimate } from "./lib/api.js";

const YEAR = new Date().getFullYear();

const STEPS = [
  ["Dinos qué vendes", "Escribe el modelo o sube una foto. Añade el estado y lo que incluye."],
  ["Recibe tu precio", "A cuánto publicar, el mínimo que aceptar y cuándo bajarlo si no se vende."],
  ["Copia y publica", "Te damos el anuncio escrito y consejos de fotos para vender antes."],
];

export default function App() {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const topRef = useRef(null);

  async function handleSubmit(input) {
    setStatus("loading");
    setError("");
    track("estimate_submit", { withPhoto: !!input.imageDataUrl, platform: input.platform });
    const r = await estimate(input);
    if (r.ok) {
      setResult(r);
      setStatus("done");
      track("estimate_success", { confidence: r.confidence });
    } else {
      setError(r.message || "No hemos podido calcular el precio.");
      setStatus("error");
      track("estimate_error", { reason: r.reason || "unknown" });
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reset() {
    setResult(null);
    setStatus("idle");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <a href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-stone-900">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          FLIPR
        </a>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Gratis · Beta</span>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <div ref={topRef} className="scroll-mt-4" />

        {status !== "done" && (
          <div className="pb-8 pt-6 text-center sm:pt-12">
            <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl">
              ¿A cuánto vendo esto?
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-stone-600">
              Precio justo, anuncio listo y estrategia de venta para Wallapop y Vinted. En 10 segundos.
            </p>
          </div>
        )}

        {status === "done" && result ? (
          <div className="pt-4">
            <ResultView result={result} onReset={reset} />
          </div>
        ) : (
          <>
            {status === "error" && (
              <div role="alert" className="mb-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <Info size={18} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <EstimateForm loading={status === "loading"} onSubmit={handleSubmit} />
          </>
        )}

        {status !== "done" && (
          <section className="mt-16">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-stone-500">Cómo funciona</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="rounded-2xl border border-stone-200 bg-white p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-bold text-stone-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="mt-12">
          <Waitlist source={status === "done" ? "result" : "home"} />
        </div>
      </main>

      <footer className="border-t border-stone-200 py-8 text-center text-xs leading-relaxed text-stone-500">
        <p>Los precios son estimaciones orientativas generadas con IA. Compara siempre con anuncios reales.</p>
        <p className="mt-1">© {YEAR} FLIPR</p>
      </footer>
    </div>
  );
}
