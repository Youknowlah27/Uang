"""End-to-end wiring test with a mock LLM and stubbed rendering: plan → writer → director → producer → reviewer → awaiting_approval → approve → package."""
import asyncio, json, shutil
from pathlib import Path

import pytest
import yaml

from conftest import ROOT
from shorts_agency.agents.base import Ctx
from shorts_agency.config import load_config
from shorts_agency.llm.mock import MockLLM
from shorts_agency.produce import resolve
from shorts_agency.showrunner import Showrunner
from shorts_agency.state import Store

BUILT = ROOT / "build" / "nvidia_moat"


@pytest.fixture
def world(tmp_path, monkeypatch):
    if not (BUILT / "spec.json").exists():
        pytest.skip("no built sample")
    brief = json.loads((ROOT / "examples" / "nvidia_moat" / "brief.json").read_text())
    cfg = load_config()
    cfg["paths"]["workdir"] = str(tmp_path)
    cfg["publisher"]["method"] = "manual_draft"
    store = Store(tmp_path / "t.db")
    llm = MockLLM()
    writer_out = {"title": brief["title"], "hook_type": "contrarian", "beats": brief["beats"], "analysis_points": brief["analysis_points"], "claims": brief["claims"], "cta": brief["cta"], "post": brief["post"]}
    llm.register("writer", lambda s, p: writer_out)
    llm.register("director", lambda s, p: {"style": "mix", "mood": "tech_pulse", "scenes": brief["scenes"], "reactions": brief["mascot"]["reactions"]})
    llm.register("editorial", lambda s, p: {"hook_score": 8, "clarity_score": 8, "notes": ["tighten line 3"], "risks": []})
    accounts = yaml.safe_load((ROOT / "config" / "accounts.example.yaml").read_text())["accounts"]
    ctx = Ctx(cfg=cfg, store=store, llm=llm, accounts=accounts, root=ROOT)
    ctx.root = ROOT
    # stub the heavy bits: voice synthesis and rendering reuse the built sample
    spec0 = json.loads((BUILT / "spec.json").read_text())
    monkeypatch.setattr(resolve, "resolve", lambda b, out_dir: resolve.refresh(json.loads(json.dumps(spec0)), b))

    from shorts_agency.agents import producer as prod

    def fake_work(self, brief, style=None, **kw):
        out = Path(self.ctx.workdir) / brief["id"]
        out.mkdir(parents=True, exist_ok=True)
        spec = resolve.refresh(json.loads(json.dumps(spec0)), brief)
        spec["style"], spec["mood"] = brief["style"], brief["mood"]
        (out / "spec.json").write_text(json.dumps(spec))
        for f in ("audio.report.json", "lint.json"):
            shutil.copy(BUILT / f, out / f)
        shutil.copy(BUILT / "final.mp4", out / "final.mp4")
        return {"out_dir": str(out), "spec": str(out / "spec.json"), "video": str(out / "final.mp4")}

    monkeypatch.setattr(prod.ProducerAgent, "work", fake_work)
    store.put("idea", "idea1", {"id": "idea1", "title": "Nvidia moat", "score": 70, "evidence": [{"title": "t", "url": c["source"], "source": "x"} for c in brief["claims"]]}, "new")
    store.put("plan", "p1", {"day": "2026-10-11", "account": "brand", "lane": "brand", "goal": "reach", "idea_id": "idea1", "target_seconds": 31, "hook_type": "contrarian", "cta_type": "follow", "rationale": "t"}, "planned")
    return Showrunner(ctx), store, llm


def test_item_flows_to_approval_and_publisher_package(world):
    sr, store, llm = world
    asyncio.run(sr.produce_item("p1"))
    v = store.get("video", "p1")
    assert v["_status"] == "awaiting_approval", v.get("fixes")
    assert v["verdict"] == "PASS" and v["score"] >= 90
    assert Path(v["review_md"]).exists()
    # human approves → publisher exports a post package through an official channel (manual draft)
    out = asyncio.run(sr.approve("p1"))
    assert out["status"] == "ready_to_post"
    pkg = Path(out["package"])
    assert (pkg / "video.mp4").exists() and "Follow for part" in (pkg / "post.md").read_text() + json.dumps(json.loads((pkg / "post.json").read_text()))


def test_publisher_refuses_unapproved(world):
    sr, store, _ = world
    asyncio.run(sr.produce_item("p1"))
    assert "skipped" in asyncio.run(sr.publisher.run(video_id="p1"))


def test_revision_loop_feeds_findings_back_to_writer(world):
    sr, store, llm = world
    calls = {"n": 0}
    good = llm.handlers["writer"]

    def flaky(s, p):
        calls["n"] += 1
        out = dict(good(s, p))
        if calls["n"] == 1:   # first draft: coercive CTA → reviewer blocks → writer must be re-called with the finding
            out = {**out, "cta": {**out["cta"], "headline": "Follow or you will miss out", "sub": "like or else"}}
        else:
            assert "cta.value_based" in p or "tt.engagement_manipulation" in p, "feedback not passed to the writer"
        return out

    llm.register("writer", flaky)
    asyncio.run(sr.produce_item("p1"))
    assert calls["n"] >= 2
    assert store.get("video", "p1")["_status"] == "awaiting_approval"
