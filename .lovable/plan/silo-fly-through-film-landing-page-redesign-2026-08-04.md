# Silo Fly-Through Film + Landing Page Redesign

Two deliverables: a new 24-second looping hero film (drone-style cave-exploration flight into a silo), and a full redesign of the landing page in the GrainHero theme with pricing removed.

## Part 1 — The 24s silo fly-through loop

A single continuous shot, no cuts, built to loop seamlessly (last frame matches first).

Flight path:
1. **0-4s — Approach.** Low sun over a wheat field, camera races toward a silo cluster at speed, climbing.
2. **4-6s — Entry.** Camera pitches over the roof and drops through the top hatch. Light collapses to the interior beam of the hatch opening.
3. **6-18s — Interior sweep.** Camera descends past the grain column and passes the real hardware, each named on-screen as it flies by:
   - Headspace: SHT45 ambient temp/humidity node, BME680 gas + pressure node, AJ-SR04M ultrasonic level sensor pinging the grain surface
   - Wall column: DS18B20 waterproof temperature probes at top / middle / bottom of the grain mass
   - Grain mass: SCD41 CO2 sensor reading ppm rising in a hot spot
   - Floor: perforated aeration floor — air passing up through the holes while grain stays put
   - Exterior wall: industrial aeration fan spinning, SG90 servo vent opening
   - Control box: ESP32-S3 controller, OLED live readout, RGB status LED going green -> amber, buzzer
4. **18-22s — Exit.** Camera whips up through the vent and back out into open sky.
5. **22-24s — Loop close.** Wide field re-frame that matches frame 0 exactly.

Labels are names + live-looking readings only (e.g. `DS18B20 · 24.3°C`, `SCD41 · 1,240 ppm`, `SHT45 · 68% RH`). No prices, no part counts. Two short problem/solution lines carry the meaning: spoilage starts invisibly inside the grain -> GrainHero sees it before it spreads.

Production: hybrid. AI-generated photoreal plates for the approach, hatch entry, interior descent and exit; Remotion composites the sensor pins, labels, readouts, LED/fan motion and the loop seam on top. Rendered at 1920x1080, 30fps, 720 frames, muted, to `src/assets/` as a CDN asset so the hero can use it.

## Part 2 — Landing page redesign

Full redesign: every section gets a new layout. Process:
1. Capture the current page.
2. Lock the brand theme — the existing GrainHero palette (deep bark `#252d26`, leaf `#2FAC0C`, lime `#8FE04B`, bone `#EDE9D4`) and current type scale become hard constraints.
3. Generate three rendered design directions that vary only in composition, density, hierarchy and motion register.
4. You pick one; I build it exactly — same alignment, section count and density as the chosen prototype.

Content changes regardless of direction:
- **Pricing block removed** from the landing page entirely. Plans stay reachable via Get Started and `/checkout`.
- **Pricing link removed from the nav.** Nav becomes Home / Features / Hardware / About / Contact + Get Started.
- **Resequenced and merged** into a shorter, denser page: hero film -> problem -> how it works -> hardware + stats folded into one section -> brand film -> partners -> FAQ + contact CTA tightened together.
- Consistent tokens across all sections instead of the current mix of hardcoded hex values.

## Technical notes

- Remotion project under `remotion/`, scenes in `remotion/src/scenes/`, all motion frame-based via `useCurrentFrame()` + `interpolate()`/`spring()`.
- AI plates generated to `remotion/public/plates/`, referenced with `staticFile()`.
- Final MP4 uploaded via `lovable-assets`; `src/assets/hero-loop.mp4.asset.json` is replaced with the new pointer so `AgriHero` picks it up with no code change.
- Landing colors move to semantic tokens in `src/styles.css` (`@theme`) rather than inline hex.
- `PricingShowcase` and its `pricing-data` import are deleted from `src/routes/index.tsx`; `/checkout` and marketplace pricing are untouched.
- No changes to auth, dashboards, or any backend logic.
