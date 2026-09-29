import { useState } from "react";
import { track } from "@vercel/analytics";
import { Camera, Check, Clock, Copy, ExternalLink, RotateCcw, ThumbsDown, ThumbsUp, TrendingDown } from "lucide-react";
import { sendFeedback } from "../lib/api.js";

const euros = (n) => `${new Intl.NumberFormat("es-ES").format(n)} €`;

const CONFIDENCE_STYLE = {
  alta: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  media: "bg-amber-50 text-amber-700 ring-amber-600/20",
  baja: "bg-red-50 text-red-700 ring-red-600/20",
};

function Card({ title, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 ${className}`}>
      {title && <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h3>}
      {children}
    </section>
  );
}

function CopyButton({ text, label = "Copiar", event }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (event) track(event);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
    >
      {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
      {copied ? "Copiado" : label}
    </button>
  );
}

function Feedback({ id }) {
  const [vote, setVote] = useState(null);
  function send(v) {
    setVote(v);
    track("feedback", { vote: v });
    if (id) sendFeedback(id, v);
  }
  if (vote) {
    return <p className="text-sm font-medium text-stone-600">¡Gracias! Con tu respuesta afinamos los precios.</p>;
  }
  const btn = "flex items-center gap-1.5 rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50";
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-stone-700">¿Te parece acertado este precio?</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => send("ok")}><ThumbsUp size={15} /> Sí</button>
        <button type="button" className={btn} onClick={() => send("high")}><ThumbsDown size={15} /> Muy alto</button>
        <button type="button" className={btn} onClick={() => send("low")}><ThumbsDown size={15} /> Muy bajo</button>
      </div>
    </div>
  );
}

export default function ResultView({ result, onReset }) {
  const { plan, listing } = result;
  const fullListing = `${listing.title}\n\n${listing.description}`;

  return (
    <div className="animate-rise space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">{result.condition} · {result.platform}</p>
            <h2 className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">{result.product}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${CONFIDENCE_STYLE[result.confidence]}`}>
            Confianza {result.confidence}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-600 p-5 text-white">
            <p className="text-sm font-medium text-emerald-100">Publícalo a</p>
            <p className="tabular mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">{euros(plan.listAt)}</p>
            <p className="mt-2 text-sm text-emerald-100">Deja margen para el regateo.</p>
          </div>
          <div className="rounded-2xl bg-stone-100 p-5">
            <p className="text-sm font-medium text-stone-500">No aceptes menos de</p>
            <p className="tabular mt-1 text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl">{euros(plan.floor)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
              <Clock size={14} /> Se vende en {result.timeToSell || "pocos días"}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 divide-x divide-stone-200 rounded-2xl border border-stone-200 text-center">
          {[
            ["Venta rápida", plan.quick],
            ["Precio justo", plan.fair],
            ["Máximo", plan.max],
          ].map(([label, value]) => (
            <div key={label} className="px-2 py-3">
              <dt className="text-xs font-medium text-stone-500">{label}</dt>
              <dd className="tabular mt-0.5 text-lg font-bold text-stone-900">{euros(value)}</dd>
            </div>
          ))}
        </dl>

        {result.confidenceReason && (
          <p className="mt-4 text-sm leading-relaxed text-stone-600">{result.confidenceReason}</p>
        )}
      </Card>

      {plan.schedule.length > 1 && (
        <Card title="Si no se vende">
          <ol className="space-y-3">
            {plan.schedule.map((s) => (
              <li key={s.day} className="flex items-center gap-4">
                <span className="w-16 shrink-0 text-sm font-semibold text-stone-500">
                  {s.day === 0 ? "Hoy" : `Día ${s.day}`}
                </span>
                <span className="flex-1 text-sm text-stone-700">{s.label}</span>
                <span className="tabular flex items-center gap-1 font-bold text-stone-900">
                  {s.day > 0 && <TrendingDown size={15} className="text-stone-400" />}
                  {euros(s.price)}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card title="Tu anuncio, listo para copiar">
        <p className="font-semibold text-stone-900">{listing.title}</p>
        {listing.description && (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-700">{listing.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton text={fullListing} label="Copiar anuncio" event="copy_listing" />
          <CopyButton text={listing.title} label="Solo el título" event="copy_title" />
        </div>
      </Card>

      {(result.reasons.length > 0 || result.photoTips.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {result.reasons.length > 0 && (
            <Card title="Por qué este precio">
              <ul className="space-y-2 text-sm leading-relaxed text-stone-700">
                {result.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </Card>
          )}
          {result.photoTips.length > 0 && (
            <Card title="Fotos que venden">
              <ul className="space-y-2 text-sm leading-relaxed text-stone-700">
                {result.photoTips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <Camera size={15} className="mt-0.5 shrink-0 text-stone-400" /> {t}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <Card title="Compruébalo con anuncios reales">
        <p className="mb-3 text-sm text-stone-600">
          El precio es una estimación. Echa un vistazo a lo que hay publicado ahora mismo:
        </p>
        <div className="flex flex-wrap gap-2">
          {result.comparables.map((c) => (
            <a
              key={c.platform}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("comparable_click", { platform: c.platform })}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              {c.platform} <ExternalLink size={14} />
            </a>
          ))}
        </div>
      </Card>

      <Card>
        <Feedback id={result.id} />
      </Card>

      <button
        type="button"
        onClick={onReset}
        className="mx-auto flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100"
      >
        <RotateCcw size={15} /> Calcular otro producto
      </button>
    </div>
  );
}
