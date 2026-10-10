"""Small HTTP helpers (stdlib only). Honour the sandbox/egress proxy and its CA bundle when present."""
from __future__ import annotations

import json
import os
import ssl
import urllib.request
import xml.etree.ElementTree as ET

UA = "Mozilla/5.0 (compatible; shorts-agency/0.1; +research)"


def _ctx():
    ca = "/root/.ccr/ca-bundle.crt"
    return ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()


def get(url: str, timeout: int = 25) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout, context=_ctx()) as r:
        return r.read()


def get_json(url: str, timeout: int = 25):
    return json.loads(get(url, timeout))


def get_rss(url: str, timeout: int = 25) -> list[dict]:
    root = ET.fromstring(get(url, timeout))
    items = []
    for it in root.iter("item"):
        d = {c.tag.split("}")[-1]: (c.text or "").strip() for c in it}
        items.append(d)
    return items
