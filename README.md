# FLIPR SCORE 2 — ¿A cuánto vendo esto?

MVP para **validar** el giro de FLIPR: de "¿lo compro para revender?" (pocos flippers) a
"¿a cuánto vendo lo que tengo?" (cualquier persona que vende en Wallapop o Vinted).

El usuario escribe el producto (o sube una foto) y recibe:

- **A cuánto publicar** y **el mínimo que aceptar**
- Precio de venta rápida / justo / máximo
- **Qué hacer si no se vende**: cuándo bajar el precio y a cuánto
- **Anuncio escrito** listo para copiar y consejos de fotos
- Enlaces para comparar con anuncios reales (Wallapop, Vinted, eBay vendidos)

Gratis, sin cuenta y sin créditos: en esta fase lo que importa es saber si la gente lo usa.

## Qué cambia respecto a la v1

| v1 | v2 |
|---|---|
| Sin datos, el valor de mercado era `precio × 1,32`, así que casi todo salía "CÓMPRALO" | Si no hay precio fiable, **no se inventa**: se piden más detalles |
| "Confianza" aleatoria | Confianza razonada por la IA y rebajada si el rango es muy amplio |
| Créditos en el navegador (se podían editar) | Sin créditos en el MVP |
| Proxy que aceptaba cualquier URL | Sin scraping |
| Catálogo manual de ~30 productos | Cada estimación se guarda en KV: **base de datos de precios propia** |

## Cómo medir si funciona

`GET /api/stats` con `Authorization: Bearer <ADMIN_TOKEN>` devuelve:

- `estimates`: estimaciones hechas
- `feedback`: votos "acertado / muy alto / muy bajo" y el % de acierto
- `waitlist`: emails apuntados a la lista de espera
- `recent`: últimas 30 estimaciones (qué productos se buscan)

En Vercel Analytics también se registran estos eventos: `estimate_submit`, `estimate_success`,
`copy_listing`, `comparable_click`, `feedback` y `waitlist_join`.

Una señal razonable para seguir adelante: gente que copia el anuncio (lo va a usar de verdad),
un % de acierto alto y emails en la lista de espera.

## Desarrollo

```bash
npm install
npm run dev:mock   # sin clave de IA: respuestas de ejemplo
npm run dev        # con IA real (necesita .env.local)
npm test
npm run lint
```

`npm run dev` sirve también las funciones de `/api`, así que no hace falta la CLI de Vercel.
Copia `.env.example` a `.env.local` y rellena las variables.

## Estructura

```
api/            estimate · feedback · waitlist · stats  (Vercel Functions)
lib/            ai (OpenRouter/OpenAI) · kv (Upstash + rate limit) · http
src/lib/        pricing (plan de precios, puro) · estimate (prompt + saneado, puro)
src/components/ EstimateForm · ResultView · Waitlist
tests/          lógica de precios y saneado de la respuesta de la IA
```

## Despliegue

Nuevo proyecto en Vercel con **Root Directory = `Flipr SCORE 2`** y las variables de
`.env.example`. Conviene hacerlo en un subdominio (p. ej. `vender.fliprscore.com`) para
no tocar la web actual mientras se valida.

## Siguientes pasos (solo si la validación va bien)

1. Usar las estimaciones guardadas y el feedback para corregir los precios de la IA.
2. Seguimiento de anuncios: recordatorio para bajar el precio el día 7 y el día 14 (lista de espera).
3. Landings SEO "¿a cuánto vendo mi iPhone 13?" reutilizando las de la v1.
