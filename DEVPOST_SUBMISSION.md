# GlowCast — Devpost submission content (copy-paste ready)

---

## Project name
GlowCast

## Elevator pitch (tagline)
One selfie. Your skin decoded, your colors found, four outfits tried on you — a complete plan for your big day, powered by YouCam AI.

---

## Project Story (paste into "About the project")

## Inspiration

Big events don't stress people in the abstract — they stress them in front of a mirror. A wedding in two weeks, an interview on Friday, a gala tonight. Three questions always hit at once: *Will my skin be at its best? Which colors actually flatter me? How will I really look in the outfit?* Today those are three separate industries — skincare, color analysis, fashion — and three separate guesses. Fit and sizing alone cause about 50% of apparel returns, and online fashion return rates run 20–40%. We wanted to collapse that whole anxiety into one guided journey that ends with certainty instead of guesses.

## What it does

GlowCast prepares you for a specific event, end to end, from a single selfie:

1. **Describe your event in your own words** — no forms, no quizzes. An AI agent reads the dress code and mood from your sentence. The date sets your preparation window; the city pulls the real weather forecast for the day (Open-Meteo, 16-day window).
2. **One guided selfie** — auto-cropped around your face, analyzed in-session, never stored.
3. **Skin diagnosis** — YouCam Skin Analysis scores 8 concerns (hydration, radiance, texture, redness, clarity, oil balance, pores, dark circles) plus an overall score. Tap any gauge to see the detected areas overlaid on your own photo, with a one-line tip grounded in published dermatology guidance (ingredient + concentration, e.g. "niacinamide 5%").
4. **Your personal color palette** — YouCam Facial Color Tones extracts your exact skin, eye, lip, brow and hair colors; the agent derives your color season and 8 flattering shades (plus 3 to avoid).
5. **Your skin's potential** — a generative before/after of your own face targeting your three weakest scores, with a draggable comparison line. Honest wording: a direction, not a promise.
6. **Four looks, on you** — the AI stylist reads your event + palette + weather, shops a 250-outfit catalog, and YouCam Clothes Virtual Try-On renders four directions on your own body in parallel: a classic, a statement, a relaxed take, and a wildcard. One tap regenerates four new directions ("more formal", "softer colors"…).
7. **One plan to leave with** — a summary page and a downloadable PDF: your four looks, your palette with hex codes to show in-store, and a day-by-day (or phase-based) skincare timeline that respects dermatologist pre-event rules (no new actives near the event, soothing mask the night before).

## How we built it

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS 4 + Framer Motion, deployed on Vercel. A 6-step guided flow with a single design system (soft pink + lavender, Liquid Glass surfaces, Playfair Display + Inter).
- **YouCam APIs (4):** AI Skin Analysis (8 concerns + mask overlays), AI Facial Color Tones, AI Clothes Virtual Try-On (4 parallel renders per request), and AI Image Generator (image-to-image for the skin projection). All calls run server-side through Next.js route handlers — upload → task → continuous polling, exactly as the S2S API requires.
- **AI orchestration:** an LLM agent (DeepSeek) glues the pipeline together: it parses the free-text event, derives the color season from the extracted facial colors, designs the four outfit directions, and writes the skincare timeline. Every output is constrained to strict JSON, validated server-side (length caps, banned-claims filter, hex validation), and grounded in a curated dermatology knowledge base (AAD daily-care guidance, pre-event timelines, evidence-backed ingredient concentrations).
- **State:** in-memory first, mirrored to IndexedDB — no storage quotas, survives reloads, and every redone step invalidates everything downstream so no stale result can ever appear.
- **Weather:** Open-Meteo geocoding (validated city autocomplete) + daily forecast, fed to the stylist so the outfit works on the day.

## Challenges we ran into

- **The Skin Simulation endpoint never completed** in our tests (tasks stayed `running` for 15+ minutes). We pivoted: the skin projection is now built with the AI Image Generator in image-to-image mode, prompted from the user's three weakest scores — cheaper, faster, and it preserves identity.
- **Framing constraints pull in opposite directions:** Skin Analysis wants a large frontal face; Clothes VTO wants the upper body. We solved it with client-side smart face auto-crop for the analysis selfie, and a dedicated guided "fitting photo" step for the try-on.
- **Signed result URLs expire in ~2 hours,** and file IDs are single-use per feature — we re-encode every result server-side and re-upload per task.
- **Payload limits:** re-encoded mask overlays blew past the serverless request limit when sent back with scores (the classic "Unexpected token R" — a plain-text 413). We now send numeric scores only and parse every response defensively.
- **Keeping the LLM honest:** free-text advice can drift. We locked outputs to typed JSON, filtered medical/branded claims, and grounded the coach in a dermatology reference so the worst case is a bland sentence — never a weird one.

## Accomplishments that we're proud of

- A complete, polished product — not a wrapper: four YouCam APIs chained so each feeds the next (facial colors → palette → outfit choice → try-on; skin scores → projection prompt → skincare plan).
- Four photorealistic try-ons of the user rendered in parallel in about a minute.
- Advice that names ingredients and concentrations, backed by published guidance, with hard safety rules.
- A journey a first-time user understands with zero instructions.

## What we learned

- Real API integration is a product discipline: rate limits, single-use file IDs, expiring URLs, framing rules and endpoint quirks shaped the UX as much as design did.
- Grounding an LLM beats prompting it politely: a curated knowledge base + output validation transformed advice quality overnight.
- The event context is magic: the same skin scores and colors become 10× more actionable when tied to a date, a place, and a forecast.

## What's next for GlowCast

- **Shop mode:** try on any real product photo (ref-based VTO is already validated) — the bridge to retailer catalogs, where try-on is proven to lift conversion 20–40% and cut returns up to 40% (Zalando).
- Hair color/style suggestions matched to the palette (endpoints already tested).
- Post-event follow-through: track skin scores over time against the plan.
- B2B widget: GlowCast as an embeddable "event concierge" for beauty & fashion e-commerce.

---

## Built with (tags — up to 25)
nextjs, react, typescript, tailwindcss, framer-motion, vercel, youcam-api, perfect-corp, skin-analysis, virtual-try-on, facial-color-tones, ai-image-generator, deepseek, llm-agent, open-meteo, indexeddb, jspdf, node.js

## "Try it out" links
- Live demo: https://glowcast-<your-vercel-url>.vercel.app  ← (mets ton URL Vercel réelle)
- Code: https://github.com/Bsh54/glowcast

## Video demo link
- (YouTube — après tournage, voir VIDEO_SCRIPT.md)

---

## Image gallery — 15 screenshots to take (3:2 ratio, PNG)
1. Landing page with the welcome popup
2. Landing — event described + city autocomplete open
3. Selfie capture with the face guide
4. Diagnosis — loading state (skeletons + rotating messages)
5. Diagnosis — full results (score 85, 8 gauges, palette)
6. Diagnosis — a gauge tapped, mask overlay visible with its insight
7. Color palette close-up with hex codes
8. Projection — before/after mid-drag
9. Look — fitting photo card
10. Look — 4 skeletons loading
11. Look — the four looks rendered
12. Look — after a "More formal" regeneration
13. Summary — full page
14. The downloaded PDF (page 1)
15. The downloaded PDF (looks + timeline)

---

# Additional info (for judges — copy-paste answers)

## What date did you start this project? (MM-DD-YY)
07-17-26

## App Status
New

## Text description (features, functionality, and consumer or retail value)

GlowCast turns event anxiety into a concrete plan. The user describes their event in free text (an AI agent extracts dress code and mood), picks the date and a validated city (real weather forecast for the day), and takes one guided selfie. YouCam Skin Analysis scores 8 concerns with tappable on-face detection overlays; YouCam Facial Color Tones feeds an AI-derived color season and personal 8-shade palette. A generative before/after (YouCam AI Image Generator, image-to-image) shows the skin's potential, paired with a day-by-day skincare timeline grounded in published dermatology guidance. Then the AI stylist selects four outfits from a 250-template catalog — matched to event, palette and weather — and YouCam Clothes VTO renders all four on the user's own body in parallel. Everything lands in a summary and a downloadable PDF: the four looks, the palette hex codes to show in-store, and the plan.

Consumer value: three purchase-critical guesses (skin readiness, flattering colors, outfit fit) replaced by evidence the user can see on themselves before spending anything. Retail value: an embeddable "event concierge" — virtual try-on is proven to lift conversion 20–40% and cut returns up to 40% (fit causes ~50% of apparel returns), while the event description ("wedding, Aug 1st, Paris") is purchase-intent data no e-commerce site captures today.

## Code repository URL
https://github.com/Bsh54/glowcast

## Was there a moment during the hackathon where the API surprised you — in a good or frustrating way?

Both, honestly. The best surprise was Clothes VTO in reference mode: we generated a garment as a product shot with the AI Image Generator, fed it as ref_file_id, and it dressed our test subject convincingly — outfit, drape and shadows — while preserving identity, pose and background. Chaining try-ons (applying a generated hat *on top of a previous VTO render*) also worked, which we didn't expect. The frustrating one: the Skin Simulation endpoint accepted our tasks but never completed them (still `running` after 15 minutes of continuous polling, units consumed). We rebuilt the skin projection on the AI Image Generator instead — it turned out cheaper (1 unit vs 4–6) and faster.

## Are there industries or use cases you think Perfect Corp.'s API could serve that nobody is talking about yet?

- **Aesthetic-medicine consultation & consent:** scored, longitudinal skin data plus before/after simulation is a natural fit for treatment expectation-setting and follow-up adherence — a regulated-adjacent space where the cosmetic-grade framing is actually an advantage.
- **Event & wedding services:** planners, photographers and venues could bundle a "camera-ready" prep journey (our thesis) — nobody treats the event date as the organizing principle of beauty + fashion decisions.
- **Second-hand fashion marketplaces:** ref-based VTO on user-listed garment photos could de-risk peer-to-peer purchases where returns are usually impossible.
- **Workforce imaging:** interview-prep platforms and professional-headshot services could combine skin scoring, color analysis and try-on for job seekers.

## Where did you hit a wall technically? How did you work around it?

Three walls. (1) The framing paradox: Skin Analysis requires a large frontal face (≥60% width) while Clothes VTO requires the upper body — one photo can't reliably serve both. We added client-side smart face auto-crop for the analysis selfie and a separate guided "fitting photo" step for try-on. (2) Infrastructure friction: file IDs are single-use per feature, result URLs expire in ~2h, and our re-encoded mask overlays later blew past the serverless 4.5MB request limit (a plain-text 413 crashing JSON parsing). We now re-upload per task, re-encode all results server-side, send only numeric scores upstream, and parse every response defensively. (3) LLM drift in advice: we locked outputs to strict JSON, added a banned-claims filter, and grounded the coach in a curated dermatology reference (AAD guidance, ingredient concentrations, pre-event timelines) — advice went from generic to specific overnight.
