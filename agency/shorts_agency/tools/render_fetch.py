"""Fetch the *rendered* text of JS-only pages (TikTok / Instagram help centres etc.) with headless Chromium.

Plain HTTP fetchers get an empty shell for these pages; a real browser run returns the policy text.
Used by the RulesWatcher agent to snapshot official rules and diff them week over week.
"""
from __future__ import annotations

import glob
import html
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def find_browser() -> str:
    env = os.environ.get("CHROMIUM_BIN")
    if env and Path(env).exists():
        return env
    cands = (
        glob.glob("/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell")
        + glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome")
        + ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]
    )
    for c in cands:
        if Path(c).exists():
            return c
    raise FileNotFoundError("No Chromium found. Set CHROMIUM_BIN (e.g. the Playwright chromium path).")


def html_to_text(doc: str) -> str:
    doc = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", " ", doc, flags=re.S | re.I)
    doc = re.sub(r"<(br|/p|/div|/li|/h[1-6]|/tr)[^>]*>", "\n", doc, flags=re.I)
    text = html.unescape(re.sub(r"<[^>]+>", " ", doc))
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text.strip()


def fetch_text(url: str, budget_ms: int = 15000, timeout: int = 90) -> str:
    cmd = [
        find_browser(), "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
        f"--virtual-time-budget={budget_ms}", "--dump-dom", url,
    ]
    out = subprocess.run(cmd, capture_output=True, timeout=timeout, text=True, errors="replace")
    return html_to_text(out.stdout)


def snapshot(url: str, dest_dir: Path, slug: str, **kw) -> Path:
    text = fetch_text(url, **kw)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    p = dest_dir / f"{slug}.txt"
    p.write_text(f"SOURCE: {url}\nFETCHED: {stamp}\nCHARS: {len(text)}\n\n{text}\n", encoding="utf-8")
    return p


if __name__ == "__main__":
    print(fetch_text(sys.argv[1])[: int(sys.argv[2]) if len(sys.argv) > 2 else 4000])
