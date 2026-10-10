"""Thin Postiz Public API client (https://docs.postiz.com/public-api). NOT exercised in CI (needs an instance + API key);
payload builders are unit-tested. Auth header is the raw API key. Create-post endpoint is rate-limited (default 90/h)."""
from __future__ import annotations

import json
import mimetypes
import os
import ssl
import urllib.request
import uuid
from pathlib import Path


class PostizClient:
    def __init__(self, base_url: str, api_key: str):
        self.base, self.key = base_url.rstrip("/"), api_key

    def _ctx(self):
        ca = "/root/.ccr/ca-bundle.crt"
        return ssl.create_default_context(cafile=ca) if os.path.exists(ca) else None

    def _req(self, method: str, path: str, body: bytes | None = None, headers: dict | None = None):
        req = urllib.request.Request(f"{self.base}{path}", data=body, method=method, headers={"Authorization": self.key, **(headers or {})})
        with urllib.request.urlopen(req, timeout=120, context=self._ctx()) as r:
            return json.loads(r.read() or b"{}")

    def integrations(self) -> list[dict]:
        return self._req("GET", "/integrations")

    def upload(self, path: Path) -> dict:
        boundary = uuid.uuid4().hex
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{path.name}\"\r\nContent-Type: {mime}\r\n\r\n").encode() + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        return self._req("POST", "/upload", body, {"Content-Type": f"multipart/form-data; boundary={boundary}"})

    def create_post(self, payload: dict) -> dict:
        return self._req("POST", "/posts", json.dumps(payload).encode(), {"Content-Type": "application/json"})


def build_settings(platform: str, post: dict, direct: bool, ai_label: bool = False, branded: bool = False) -> dict:
    """Provider settings per Postiz docs. Enum values follow the platforms' own APIs — confirm with the Postiz payload wizard."""
    if platform == "tiktok":
        return {"__type": "tiktok", "privacy_level": "PUBLIC_TO_EVERYONE" if direct else "SELF_ONLY", "duet": False, "stitch": False, "comment": True, "autoAddMusic": False,
                "brand_content_toggle": branded, "brand_organic_toggle": False, "content_posting_method": "DIRECT_POST" if direct else "UPLOAD"}
    if platform == "youtube":
        yt = post.get("youtube", {})
        return {"__type": "youtube", "title": yt.get("title", "")[:100], "type": "public", "selfDeclaredMadeForKids": "no", "tags": [t.lstrip("#") for t in post.get("hashtags", [])]}
    if platform == "instagram":
        return {"__type": "instagram", "post_type": "post", "collaborators": []}
    raise ValueError(platform)


def build_payload(integration_id: str, platform: str, video: dict, post: dict, when_iso: str, direct: bool = False, **kw) -> dict:
    caption = post.get("caption", "") + "\n\n" + " ".join(post.get("hashtags", []))
    return {"type": "schedule", "date": when_iso, "shortLink": False, "tags": [],
            "posts": [{"integration": {"id": integration_id}, "value": [{"content": caption.strip(), "image": [video]}], "settings": build_settings(platform, post, direct, **kw)}]}
