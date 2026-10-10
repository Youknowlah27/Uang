"""Generate per-beat voiceover with edge-tts, stitch with controlled gaps, emit word-level timeline.

Output:
  public/voice.mp3            stitched, loudness-normalised voiceover
  src/data/timeline.json      beats + word timings (seconds) used by every style pack
"""
import asyncio, json, os, subprocess, sys
from pathlib import Path

CA = "/root/.ccr/ca-bundle.crt"
if os.path.exists(CA):  # sandbox egress proxy re-terminates TLS; trust its CA (never disable verification)
    import certifi
    certifi.where = lambda: CA
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
script = json.loads((ROOT / "src/data/script.json").read_text())
tmp = ROOT / ".voice_tmp"
tmp.mkdir(exist_ok=True)
proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
LEAD = 0.15  # silence before first word


def dur(p):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)])
    return float(out.decode().strip())


async def tts(text, path):
    c = edge_tts.Communicate(text, script["voice"], rate=script["rate"], boundary="WordBoundary", proxy=proxy)
    words = []
    with open(path, "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"t": ch["text"], "s": ch["offset"] / 1e7, "d": ch["duration"] / 1e7})
    return words


async def main():
    t = LEAD
    beats, concat = [], []
    # lead-in silence
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", str(LEAD), str(tmp / "lead.wav")], check=True)
    concat.append(tmp / "lead.wav")
    for i, b in enumerate(script["beats"]):
        mp3 = tmp / f"b{i}.mp3"
        words = await tts(b["text"], mp3)
        d = dur(mp3)
        for k, w in enumerate(words):  # end of word = start of next (or beat end)
            nxt = words[k + 1]["s"] if k + 1 < len(words) else d
            w["e"] = round(nxt, 3)
            w["s"] = round(w["s"], 3)
        wav = tmp / f"b{i}.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "24000", "-ac", "1", str(wav)], check=True)
        concat.append(wav)
        gap = tmp / f"g{i}.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", str(b["gapAfter"]), str(gap)], check=True)
        concat.append(gap)
        beats.append({
            "id": b["id"], "text": b["text"], "start": round(t, 3), "end": round(t + d, 3),
            "words": [{"t": w["t"], "s": round(t + w["s"], 3), "e": round(t + w["e"], 3)} for w in words],
        })
        t += d + b["gapAfter"]
    lst = tmp / "list.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in concat))
    raw = tmp / "raw.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(raw)], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", "loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", "44100", "-b:a", "192k", str(ROOT / "public/voice.mp3")], check=True)
    total = round(dur(ROOT / "public/voice.mp3"), 3)
    (ROOT / "src/data/timeline.json").write_text(json.dumps({"total": total, "beats": beats, "sources": script["sources"], "title": script["title"]}, indent=1))
    print("total", total, "s;", sum(len(b["words"]) for b in beats), "words")
    for b in beats:
        print(f'{b["id"]:7} {b["start"]:6.2f}-{b["end"]:6.2f}  {b["text"]}')

asyncio.run(main())
