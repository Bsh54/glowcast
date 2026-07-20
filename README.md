# GlowCast ✨

**One selfie. Your skin decoded, your colors found, four outfits tried on you — a complete plan for your big day.**

GlowCast is an AI event-preparation concierge built for the [YouCam API Skin AI & Apparel VTO Hackathon](https://youcam-api.devpost.com/) (topic 3: Skin AI + Apparel VTO combined). Describe your event in your own words, take one selfie, and leave with a skin diagnosis, your personal color palette, a skincare timeline, and four outfits rendered on your own body — all in one downloadable plan.

- **Live demo:** [https://glowcast.vercel.app ](https://glowcast-two.vercel.app/)*
- **Demo video:** *(YouTube link)*

---

## The problem

Before a big event — a wedding, an interview, a gala — three questions hit at once:

1. *Will my skin be at its best?* → people guess, panic-buy products, and exfoliate two days before.
2. *Which colors actually flatter me?* → professional color analysis costs $150–300 a session.
3. *How will I really look in the outfit?* → fit causes ~50% of apparel returns; online fashion returns run 20–40%.

Three industries, three guesses. GlowCast collapses them into one guided journey that ends with certainty.

## The journey (6 steps)

| Step | What happens | Powered by |
|---|---|---|
| 1. **Event** | Free-text description (an AI agent extracts dress code & mood), date (sets the prep window), validated city (real day-of weather forecast) | DeepSeek · Open-Meteo |
| 2. **Selfie** | Guided camera or upload, smart face auto-crop | Browser FaceDetector |
| 3. **Diagnosis** | 8 skin concerns scored 1–100 + overall score; tap a gauge to see the detected areas overlaid on your photo, with a dermatology-grounded tip; personal color season + 8-shade palette | **YouCam Skin Analysis** · **YouCam Facial Color Tones** |
| 4. **Projection** | Generative before/after of your own face targeting your 3 weakest scores (draggable comparison) | **YouCam AI Image Generator** (image-to-image) |
| 5. **Looks** | The AI stylist reads event + palette + weather, shops a 250-outfit catalog, and renders **four looks on your body in parallel** (Classic · Statement · Relaxed · Wildcard) | **YouCam Clothes Virtual Try-On** |
| 6. **Summary** | Everything in one page + downloadable PDF: the four looks, palette hex codes to show in-store, and a day-by-day skincare timeline | jsPDF |

## YouCam APIs used (4)

1. **AI Skin Analysis** — 8 concerns with `ui_score`/`raw_score` + mask overlays (re-encoded server-side because signed URLs expire in ~2h)
2. **AI Facial Color Tones** — exact skin/eye/lip/brow/hair hex colors, the raw material of the color season
3. **AI Clothes Virtual Try-On** — 4 parallel template-based renders per request (ref-image mode also validated)
4. **AI Image Generator** — image-to-image for the skin projection (a pivot: the Skin Simulation endpoint never completed in our tests)

All calls run **server-side** in Next.js route handlers following the S2S pattern: `POST /file/{feature}` → S3 upload → `POST /task/{feature}` → continuous polling until `success`/`error`.

## The AI orchestration layer

A DeepSeek agent glues the pipeline — every YouCam output feeds the next decision:

- facial colors → **color season + palette** → constrains the stylist's outfit choices
- skin scores → **projection prompt** (3 weakest concerns) → **skincare timeline**
- free-text event + weather → dress code, formality, and the four outfit directions

Every LLM output is strict JSON, validated server-side (length caps, banned-claims filter, hex validation) and grounded in a curated dermatology knowledge base (`src/lib/skincare-knowledge.ts`: AAD daily-care guidance, pre-event timelines, evidence-backed ingredient concentrations). Worst case is a bland sentence — never a weird one.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · jsPDF · IndexedDB state (in-memory first, quota-free, journey-aware invalidation) · Vercel

## Run it locally

```bash
git clone https://github.com/Bsh54/glowcast.git
cd glowcast
npm install
cp .env.example .env.local   # then fill in the two keys below
npm run dev                  # http://localhost:3000
```

`.env.local`:

```
YOUCAM_API_KEY=...    # console: https://yce.makeupar.com/api-console/en/api-keys/
DEEPSEEK_API_KEY=...  # https://platform.deepseek.com/
```

No database, no other services. Weather (Open-Meteo) needs no key.

**Production build:** `npm run build && npm start`

### Testing tips
- The skin analysis needs a **frontal, well-lit face filling most of the frame** (the app auto-crops, but a straight-on selfie works best).
- The try-on needs your **upper body visible** — the app asks for a dedicated fitting photo at step 5.
- A full journey consumes ~45 YouCam API units (analysis 35 · projection 1 · four try-ons 8).

## Project structure

```
src/
├── app/
│   ├── page.tsx              # 1 — Event (free text + date + city autocomplete)
│   ├── selfie/               # 2 — Guided capture + auto-crop
│   ├── diagnosis/            # 3 — Scores, masks, palette
│   ├── projection/           # 4 — Before/after + (plan generated here)
│   ├── look/                 # 5 — Four parallel try-ons
│   ├── summary/              # 6 — Recap + PDF download
│   └── api/
│       ├── analyze/          # Skin Analysis + Color Tones + season/insights
│       ├── projection/       # Image-to-image + skincare timeline
│       └── look/             # Stylist picks ×4 → parallel Clothes VTO
├── components/               # StepIndicator, ScoreGauge, PhotoPicker, PlanTimeline…
├── data/cloth-templates.json # 250-outfit catalog (id/title/category)
└── lib/                      # youcam.ts (S2S client) · deepseek.ts · guard.ts ·
                              # skincare-knowledge.ts · flow.ts (IndexedDB state) · pdf.ts
```

## Retail value

For a retailer, GlowCast is an embeddable "event concierge": virtual try-on lifts conversion 20–40% and cuts returns up to 40% (Zalando), the palette drives cross-category baskets (beauty + fashion), and "my best friend's wedding, Aug 1st, Paris" is purchase-intent data no e-commerce site captures today.

## Honest limits

- Skin scores are **cosmetic-grade readings, not medical diagnoses** — the app says so.
- The skin projection is a *direction with the right care*, never a promise.
- Try-on renders adapt garments to the body; small fabric/color deviations can occur.

## License

MIT
