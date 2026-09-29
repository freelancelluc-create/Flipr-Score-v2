import { useState } from "react";
import { track } from "@vercel/analytics";
import { Mail } from "lucide-react";
import { joinWaitlist } from "../lib/api.js";

export default function Waitlist({ source = "home" }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done | error

  async function submit(e) {
    e.preventDefault();
    setState("sending");
    const r = await joinWaitlist(email, source);
    if (r.ok) {
      setState("done");
      track("waitlist_join", { source });
    } else {
      setState("error");
    }
  }

  return (
    <section className="rounded-3xl bg-stone-900 p-6 text-white sm:p-8">
      <h2 className="text-xl font-bold sm:text-2xl">Muy pronto: te avisamos cuando bajar el precio</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-300">
        Estamos preparando el seguimiento de tus anuncios: te diremos cuándo bajar el precio y a cuánto
        para vender antes. Apúntate y serás de los primeros en probarlo.
      </p>
      {state === "done" ? (
        <p className="mt-5 font-semibold text-emerald-400">¡Apuntado! Te escribiremos pronto.</p>
      ) : (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`wl-${source}`} className="sr-only">Email</label>
          <div className="relative flex-1">
            <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id={`wl-${source}`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-xl border border-stone-700 bg-stone-800 py-3 pl-10 pr-4 text-base text-white outline-none placeholder:text-stone-500 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={state === "sending"}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-stone-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {state === "sending" ? "Enviando…" : "Avisarme"}
          </button>
        </form>
      )}
      {state === "error" && <p className="mt-2 text-sm text-red-400">No se ha podido guardar. Revisa el email.</p>}
    </section>
  );
}
