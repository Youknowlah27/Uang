import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def fake_timeline():
    def w(t, s):
        return {"t": t, "s": s, "e": s + 0.3}
    beats = [
        {"id": "hook", "text": "Everyone thinks Nvidia wins on chips. That's wrong.", "start": 0.15, "end": 3.7, "words": [w("Everyone", 0.15), w("thinks", 0.6), w("Nvidia", 1.0), w("wins", 1.4), w("on", 1.7), w("chips", 1.9), w("That's", 2.7), w("wrong", 3.1)]},
        {"id": "money", "text": "Yet 90% of revenue.", "start": 4.0, "end": 6.0, "words": [w("Yet", 4.0), w("90%", 4.4), w("of", 5.0), w("revenue", 5.3)]},
        {"id": "cta", "text": "Follow for part two.", "start": 6.5, "end": 8.5, "words": [w("Follow", 6.5), w("for", 7.0), w("part", 7.3), w("two", 7.8)]},
    ]
    return {"total": 9.0, "beats": beats}


def good_spec():
    brief = json.loads((ROOT / "examples" / "nvidia_moat" / "brief.json").read_text())
    tl = json.loads((ROOT / "build" / "nvidia_moat" / "spec.json").read_text())["timeline"] if (ROOT / "build" / "nvidia_moat" / "spec.json").exists() else None
    return brief, tl
