# studio (Remotion)
`spec.json` → video. 3 style packs (apple / data / paper) × 8 generic templates, mascot **Chip**, VFX layer, safe-stage (auto-fits the safe box).
- `node scripts/lint.mjs spec.json out.json --style=mix`  DOM rectangles → Python safe-zone analyser
- `node scripts/render_spec.mjs spec.json out.mp4 --style=mix`  silent video (audio is muxed by `shorts_agency.produce.pipeline`)
- `node scripts/stills.mjs spec.json out/frames/x 1.0 3.4 --style=paper`  QA stills
