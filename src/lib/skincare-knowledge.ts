/** Evidence-based skincare knowledge injected into the AI coach's context.
 *  Compiled from published dermatology guidance: AAD (American Academy of
 *  Dermatology) daily-care recommendations, dermatologist pre-event/wedding
 *  timelines (SkinCare Physicians, Schweiger Derm, URMC), and ingredient
 *  evidence (JAAD Delphi consensus 2025; JEADV 2019 azelaic acid trial).
 *  The AI must ground every recommendation in this context. */

export const SKINCARE_KNOWLEDGE = `
=== DAILY BASICS (AAD guidance) ===
- Cleanse max twice daily (morning + night) + after heavy sweating; lukewarm
  water, fingertips only, gentle non-abrasive cleanser. Never scrub.
- Moisturizer daily; be gentle around the eye area.
- Broad-spectrum SPF 30+ every morning, year-round, even cloudy days;
  reapply ~every 2h when outdoors.
- Introduce at most ONE new product every 2 weeks (reaction tracing).

=== ACTIVE INGREDIENTS (evidence-backed, OTC levels) ===
- Niacinamide 5%: oil regulation, redness, barrier support. >10% adds
  irritation risk without extra benefit.
- Vitamin C (AM, under SPF): antioxidant/brightening; needs >8% to be
  biologically significant. Pairs with SPF for radiance.
- Azelaic acid 10% (OTC): redness, post-blemish marks, gradual tone evening.
- Hyaluronic acid + glycerin + ceramides: dehydration; apply on damp skin,
  seal with moisturizer.
- Retinol (PM only): texture/pores/lines — needs 4-6 weeks minimum to show
  benefit; ALWAYS stop 3-7 days before an event.
- Salicylic acid (BHA) 2%: oily skin, clogged pores — max 2-3x/week.
- Clay mask 1-2x/week for oiliness; hydrating/soothing mask for the night
  before an event.

=== PRE-EVENT TIMELINE RULES (dermatologist consensus) ===
- 6+ weeks out: safe to introduce actives (retinol, acids) — real window for
  texture/acne/pigment change. Results take 2-3 months to fully show.
- 4-6 weeks out: last chance to ADD a vitamin-A product.
- 2 weeks out: last NEW product of any kind. Switch to consolidation.
- 3-7 days out: STOP retinoids, AHAs/BHAs, peels, aggressive exfoliation.
- 48h out: nothing unfamiliar; gentle only.
- Night before: gentle cleanse + soothing hydrating mask + moisturizer.
  Sleep 7-8h; limit alcohol and very salty food (morning puffiness).
- Morning of: cool-water rinse (depuffs), light moisturizer, SPF if daytime.
  Cold compress 5 min under eyes if puffy/dark.

=== CONCERN-SPECIFIC PROTOCOLS (map to the user's weakest scores) ===
- moisture (dehydration): hyaluronic acid serum AM+PM on damp skin, ceramide
  moisturizer, ~2L water/day, avoid hot water on face.
- radiance (dullness): vitamin C serum AM; gentle exfoliation 1-2x/week ONLY
  if >7 days from event; hydration is the fastest radiance win.
- texture: retinol PM if 4+ weeks out, otherwise gentle chemical exfoliant
  1-2x/week until the 7-day cutoff, then hydration only.
- redness: niacinamide 5% or azelaic acid 10%; lukewarm water only; skip all
  exfoliation; mineral SPF tends to sting less.
- acne: salicylic acid 2% cleanser or spot treatment; do NOT squeeze before
  an event; expect purging 4-6 weeks after starting new actives (so don't
  start actives close to the event).
- oiliness: niacinamide 5% AM, clay mask 1-2x/week, blotting papers midday,
  lightweight non-comedogenic moisturizer (skipping moisturizer worsens oil).
- pore: salicylic acid + niacinamide combo; sunscreen (sun damage enlarges
  pores); no pore strips near the event.
- dark_circle_v2: cold compress 5 min AM, caffeine or vitamin-C eye product,
  sleep 7-8h, extra pillow to reduce fluid pooling; concealer is legitimate
  for day-of.

=== HARD DON'TS ===
- Never recommend prescription-only items (tretinoin, hydroquinone 4%+,
  oral medication) or in-office procedures (peels, lasers, injections).
- Never promise outcomes; frame as "helps", "supports", "can improve".
- No brand names — describe by ingredient + concentration instead.
`;
