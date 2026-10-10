"""Produce the four sample videos (apple / data / paper / mix) from the example brief."""
import json, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from shorts_agency.produce import pipeline

brief = json.load(open("examples/nvidia_moat/brief.json"))
for style in sys.argv[1:] or ["mix", "apple", "data", "paper"]:
    t = time.time()
    out = Path("build/nvidia_moat") if style == "mix" else Path(f"build/nvidia_moat_{style}")
    if out != Path("build/nvidia_moat"):
        out.mkdir(parents=True, exist_ok=True)
        for f in ("voice.wav", "spec.json"):
            (out / f).write_bytes(Path("build/nvidia_moat", f).read_bytes())
    art = pipeline.produce(brief, out, style=style)
    print(style, "done in", round(time.time() - t), "s →", art.get("video"), "| audio pass:", art["audio_report"]["pass"])
