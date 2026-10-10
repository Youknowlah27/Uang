"""Notion approval board (REST, free integration token). Property names are fixed by the database created for this project."""
from __future__ import annotations

import json
import os
import ssl
import urllib.request

API = "https://api.notion.com/v1"
VER = "2022-06-28"

STATUS = {"awaiting_approval": "Needs Review", "needs_revision": "Revise", "blocked": "Blocked", "approved": "Approved", "rejected": "Rejected",
          "ready_to_post": "Ready to post", "scheduled": "Scheduled", "published": "Published", "produced": "Draft", "needs_footage": "Needs footage"}
REV = {v: k for k, v in STATUS.items()}


def _rt(text: str) -> list[dict]:
    text = (text or "")[:1900]
    return [{"type": "text", "text": {"content": text}}] if text else []


class Notion:
    def __init__(self, token: str | None = None):
        self.token = token or os.environ.get("NOTION_TOKEN", "")
        if not self.token:
            raise RuntimeError("NOTION_TOKEN not set (create an internal integration at notion.so/my-integrations and share the database with it)")

    def _req(self, method: str, path: str, body: dict | None = None) -> dict:
        ca = "/root/.ccr/ca-bundle.crt"
        ctx = ssl.create_default_context(cafile=ca) if os.path.exists(ca) else None
        req = urllib.request.Request(f"{API}{path}", method=method, data=json.dumps(body).encode() if body is not None else None,
                                     headers={"Authorization": f"Bearer {self.token}", "Notion-Version": VER, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
            return json.loads(r.read())

    @staticmethod
    def props(v: dict, spec: dict | None = None) -> dict:
        spec = spec or {}
        post = spec.get("post", {})
        p = {
            "Title": {"title": _rt(v.get("title") or v.get("_id", ""))},
            "Status": {"select": {"name": STATUS.get(v["_status"], "Draft")}},
            "Video ID": {"rich_text": _rt(v["_id"])},
            "Account": {"select": {"name": v.get("account", "brand")}},
            "Lane": {"select": {"name": v.get("lane", "brand")}},
            "Goal": {"select": {"name": v.get("goal", "reach")}},
            "Verdict": {"select": {"name": v.get("verdict", "PASS")}} if v.get("verdict") else {"select": None},
            "Score": {"number": v.get("score")},
            "Hook": {"rich_text": _rt(spec["timeline"]["beats"][0]["text"] if spec.get("timeline", {}).get("beats") else "")},
            "Caption": {"rich_text": _rt(post.get("caption", ""))},
            "Hashtags": {"rich_text": _rt(" ".join(post.get("hashtags", [])))},
            "CTA": {"rich_text": _rt(f"{spec.get('cta', {}).get('type', '')}: {spec.get('cta', {}).get('headline', '')} — {spec.get('cta', {}).get('sub', '')}" if spec.get("cta") else "")},
            "Review notes": {"rich_text": _rt(v.get("review_summary", ""))},
        }
        if spec.get("timeline"):
            p["Duration (s)"] = {"number": round(spec["timeline"]["total"], 1)}
            p["Platforms"] = {"multi_select": [{"name": x} for x in spec.get("platforms", [])]}
            p["Style"] = {"select": {"name": spec.get("style", "mix")}}
        if v.get("video_url"):
            p["Video link"] = {"url": v["video_url"]}
        return p

    def upsert(self, db_id: str, v: dict, spec: dict | None = None, page_id: str | None = None) -> str:
        if page_id:
            self._req("PATCH", f"/pages/{page_id}", {"properties": self.props(v, spec)})
            return page_id
        r = self._req("POST", "/pages", {"parent": {"database_id": db_id}, "properties": self.props(v, spec)})
        return r["id"]

    def decisions(self, db_id: str) -> list[dict]:
        """Rows you changed to Approved / Revise / Rejected (and your free-text feedback)."""
        r = self._req("POST", f"/databases/{db_id}/query", {"filter": {"or": [{"property": "Status", "select": {"equals": s}} for s in ("Approved", "Revise", "Rejected")]}})
        out = []
        for pg in r.get("results", []):
            pr = pg["properties"]
            vid = "".join(t["plain_text"] for t in pr.get("Video ID", {}).get("rich_text", []))
            fb = "".join(t["plain_text"] for t in pr.get("Your feedback", {}).get("rich_text", []))
            when = pr.get("Publish at", {}).get("date") or {}
            out.append({"page_id": pg["id"], "video_id": vid, "status": REV.get((pr["Status"]["select"] or {}).get("name", ""), ""), "feedback": fb, "publish_at": when.get("start")})
        return out
