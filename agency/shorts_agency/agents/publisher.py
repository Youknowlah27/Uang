"""Publisher — only acts on videos YOU approved. Default = export a ready-to-post package (video + captions + checklist) so TikTok/IG/YT are
published through their own apps/drafts (official channels, rule tt.automation). Optional Postiz API for scheduling."""
from __future__ import annotations

import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

from .base import Agent

CHECKLIST = {
    "tiktok": ["Post as DRAFT/inbox upload or public via an audited client (unaudited API → private only)", "Captions: paste caption + hashtags; pin first comment after posting", "AI label: NOT required (stylised animation + generic TTS); enable if any photoreal AI imagery is added", "Branded-content toggle only for sponsored/affiliate posts"],
    "instagram": ["Post as Reel; paste caption (hook in first 125 chars) + hashtags", "Add first comment", "Tag only if genuinely relevant (see tag_suggestions)"],
    "youtube": ["Upload as Short (<3 min, 9:16); set title/description from post.youtube", "Altered/synthetic disclosure: NO for stylised content; YES if realistic synthetic scenes", "Not made for kids"],
}


class PublisherAgent(Agent):
    name = "publisher"
    role = "Prepares or schedules approved posts through official channels only."

    def work(self, video_id: str) -> dict:
        v = self.ctx.store.get("video", video_id)
        if v["_status"] != "approved":
            return {"skipped": f"status is {v['_status']}, needs 'approved'"}
        out_dir = Path(v["out_dir"])
        spec = json.loads(Path(v["spec"]).read_text())
        post = spec["post"]
        method = self.ctx.cfg["publisher"]["method"]
        pkg = out_dir / "package"
        pkg.mkdir(exist_ok=True)
        shutil.copy(v["video"], pkg / "video.mp4")
        lines = [f"# {spec['title']}", f"Account: **{spec['account']}** · lane {spec['lane']} · goal {spec['goal']} · {spec['timeline']['total']:.0f}s", ""]
        for p in spec["platforms"]:
            lines += [f"## {p.title()}", "```", post.get("youtube", {}).get("title", "") if p == "youtube" else "", post.get("youtube", {}).get("description", "") if p == "youtube" else (post["caption"] + "\n\n" + " ".join(post["hashtags"])), "```", f"First comment: {post.get('first_comment', '')}", ""] + [f"- [ ] {c}" for c in CHECKLIST.get(p, [])] + [""]
        if post.get("tag_suggestions"):
            lines += ["## Tag suggestions (optional)"] + [f"- {t.get('handle')} ({t.get('platform')}): {t.get('why')}" for t in post["tag_suggestions"]]
        (pkg / "post.md").write_text("\n".join(lines))
        (pkg / "post.json").write_text(json.dumps(post, indent=1))
        status = "ready_to_post"
        if method == "postiz":
            from ..publish.postiz import PostizClient, build_payload

            key = os.environ.get(self.ctx.cfg["publisher"]["postiz"]["api_key_env"], "")
            if not key:
                return {"package": str(pkg), "note": "postiz api key missing; exported package only"}
            cl = PostizClient(self.ctx.cfg["publisher"]["postiz"]["base_url"], key)
            integ = {i.get("providerIdentifier", i.get("identifier")): i["id"] for i in cl.integrations()}
            up = cl.upload(pkg / "video.mp4")
            when = v.get("scheduled_for") or datetime.now(timezone.utc).isoformat()
            for p in spec["platforms"]:
                if p in integ:
                    cl.create_post(build_payload(integ[p], p, up, post, when, direct=False))
            status = "scheduled"
        self.ctx.store.set_status("video", video_id, status, package=str(pkg))
        return {"package": str(pkg), "status": status}
