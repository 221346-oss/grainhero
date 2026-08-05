# Real AI Silo Fly-Through Video (no Remotion, no overlay text)

Replace the Remotion-composited hero loop with a genuine AI-generated video built from the plates already generated, animated by a video model.

## What changes

- The video is generated with the AI video model (image-to-video), not assembled in Remotion.
- Zero text overlays. No pins, no HUD, no kinetic statements. The footage carries the story alone — that also removes the duplicated text problem.
- The landing hero keeps the same component; only the asset pointer changes.

## Flight flow (5 clips, ~24s total)

Each existing plate is the first frame of a clip, and the model animates the camera from it. Extra plates are generated if a transition needs a matching frame.

1. Approach (5s) — low fast drone push over the wheat field toward the silo cluster, climbing. Start frame: `01-approach.jpg`.
2. Hatch entry (5s) — pitch over the roof and drop through the top hatch, light collapsing to the interior. Start frame: `02-hatch.jpg`.
3. Interior descent (5s) — descend the silo shaft past the grain column, dust in the light beam, sensor hardware on the wall passing camera. Start frame: `03-interior.jpg`, with a new hardware-wall plate generated if the existing one does not read clearly in motion.
4. Hardware sweep (5s) — slow glide across probes, controller box and aeration floor. Start frames: `04-sensor.jpg` / `06-controller.jpg`, whichever animates better; a fresh plate generated if needed.
5. Exit and loop close (5s) — rise back up through the hatch into open sky, re-framing the field so the last frame matches the first. Start frame: `07-exit.jpg`, plus a generated closing frame matched to `01-approach.jpg`.

Clips are rendered at 1080p, 16:9, then joined with ffmpeg into one continuous MP4 with short cross-dissolves at the seams and a final blend back to frame 0 so it loops cleanly.

## Quality pass

Each clip is inspected after generation. Any clip with warping silos, melting hardware or a bad camera move is regenerated with a tightened prompt or a fresh starting frame before the stitch.

## Technical notes

- Generation via `videogen--generate_video` with `starting_frame` per clip, `resolution: 1080p`, `duration: 5`, aspect from the plate.
- Any new plates are generated at premium quality into `remotion/public/v2/`.
- Stitching, dissolves and loop seam handled by ffmpeg in the sandbox; output to `/mnt/documents/` first for review.
- Final MP4 uploaded with `lovable-assets`; `src/assets/silo-flight-v2.mp4.asset.json` is replaced with the new pointer, so `AgriHero` picks it up with no code change.
- Remotion project stays on disk untouched but is no longer the source of the hero video.
- Hero copy in `AgriHero.tsx` stays as the only text on the section.
