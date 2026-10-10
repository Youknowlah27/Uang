import json, sys
from pathlib import Path

import pytest

from conftest import ROOT, fake_timeline, good_spec
from shorts_agency import analytics, schemas, templates
from shorts_agency.agents import strategist as strat
from shorts_agency.agents.scout import score_campaign
from shorts_agency.agents.rules_watcher import diff_summary, normalise
from shorts_agency.llm.base import LLMError, extract_json
from shorts_agency.llm.mock import MockLLM
from shorts_agency.models import Campaign
from shorts_agency.produce import cuegen
from shorts_agency.produce.timeline import cue_time, word_index
from shorts_agency.publish.postiz import build_payload
from shorts_agency.review import engine, safezone
from shorts_agency.review.rules import load_rules
import yaml


# ---------------------------------------------------------------- timeline / cues
def test_word_refs():
    tl = fake_timeline()
    assert word_index(tl, "hook", "chips") == 5
    assert word_index(tl, "hook", "that's") == 6          # case + punctuation tolerant
    assert word_index(tl, "money", "90%") == 1
    assert word_index(tl, "cta", "fol*") == 0             # prefix match
    assert word_index(tl, "hook", 99) == 7                # numeric refs clamp
    with pytest.raises(ValueError):
        word_index(tl, "hook", "banana")


def test_cue_time_offset():
    tl = fake_timeline()
    assert cue_time(tl, {"beat": "hook", "word": "wrong", "offset": -0.05}) == pytest.approx(3.05)
    assert cue_time(tl, {"at": 2.0}) == 2.0


def test_cuegen_all_refs_resolve_on_real_timeline():
    brief, tl = good_spec()
    if tl is None:
        pytest.skip("no resolved spec yet")
    cues = cuegen.generate(brief, tl)
    assert any(c.get("sfx") == "stamp" for c in cues) and any(c.get("vfx") == "confetti" for c in cues)
    for c in cues:
        assert cue_time(tl, c) >= 0


# ---------------------------------------------------------------- templates
def test_template_validation():
    brief, _ = good_spec()
    assert templates.validate_scenes(brief["beats"], brief["scenes"]) == []
    bad = [dict(s) for s in brief["scenes"]]
    bad[0] = {**bad[0], "template": "cards"}
    assert any("first scene must be hook_stamp" in p for p in templates.validate_scenes(brief["beats"], bad))
    fb = templates.auto_storyboard({"beats": brief["beats"]})
    assert templates.validate_scenes(brief["beats"], fb["scenes"]) == []


# ---------------------------------------------------------------- rules KB + reviewer
def test_kb_integrity():
    rules = load_rules()
    from shorts_agency.review.checks import CHECKS
    for r in rules:
        assert r.check == "manual" or r.check in CHECKS, f"{r.id} -> missing check {r.check}"
        assert r.severity in ("block", "warn", "info")
        assert r.source, r.id
    assert sum(r.confidence == "official" for r in rules) >= 20


def _full_spec():
    brief, tl = good_spec()
    if tl is None:
        pytest.skip("no resolved spec yet")
    spec = json.loads((ROOT / "build" / "nvidia_moat" / "spec.json").read_text())
    from shorts_agency.produce import resolve
    return resolve.refresh(spec, brief)


def _ctx(spec):
    return {"accounts": yaml.safe_load((ROOT / "config" / "accounts.example.yaml").read_text())["accounts"], "publisher": {"method": "manual_draft"},
            "audio_report": {"integrated_lufs": -14.0, "true_peak_dbtp": -1.0, "voice_vs_music_gap_db": 18, "pass": True},
            "safezone": safezone.SafeZoneReport(ok=True, checked_frames=10), "history": []}


def test_reviewer_passes_good_video():
    spec = _full_spec()
    rv = engine.review(spec, _ctx(spec))
    assert rv.verdict == "PASS", engine.render_markdown(rv)


def test_reviewer_blocks_bad_cta_missing_claims_and_crp_length():
    spec = _full_spec()
    spec = json.loads(json.dumps(spec))
    spec["cta"] = {"type": "follow", "headline": "Follow or you miss out", "sub": "like or else"}
    spec["claims"] = []
    spec["goal"] = "creator_rewards"
    rv = engine.review(spec, _ctx(spec))
    failed = {f.check for f in rv.failed("block")}
    assert rv.verdict == "BLOCK"
    assert {"cta.value_based", "claims.sourced", "crp.duration_min"} <= failed


def test_reviewer_blocks_template_clone():
    spec = _full_spec()
    from shorts_agency.review.checks import fingerprint
    ctx = _ctx(spec)
    ctx["history"] = [{"id": "yesterday", "fingerprint": fingerprint(spec)}]
    rv = engine.review(spec, ctx)
    assert any(f.check == "originality.template_similarity" and not f.passed for f in rv.findings)


def test_lane_separation():
    spec = _full_spec()
    spec = json.loads(json.dumps(spec))
    spec["campaign_id"], spec["source_footage"] = "c1", "https://x"
    rv = engine.review(spec, _ctx(spec))
    assert "lane.separation" in {f.check for f in rv.failed("block")}


def test_campaign_requirements():
    spec = _full_spec()
    camp = Campaign(id="c1", brand="ACME", required_hashtags=["#acme"], required_mentions=["@acme"], forbidden_terms=["nvidia"], platforms=["tiktok"])
    ctx = _ctx(spec)
    ctx["campaign"] = camp
    rv = engine.review(spec, ctx)
    f = next(x for x in rv.findings if x.check == "campaign.requirements")
    assert not f.passed and "#acme" in f.message and "forbidden term" in f.message and "platform instagram" in f.message


# ---------------------------------------------------------------- safe zone
def test_safezone_analyser():
    lint = {"fps": 30, "frames": [
        {"f": 0, "items": [{"k": "text", "t": "ok", "x0": 100, "y0": 400, "x1": 500, "y1": 480, "o": 1}, {"k": "text", "t": "offscreen", "x0": 0, "y0": -999999, "x1": 10, "y1": -999990, "o": 1}]},
        {"f": 3, "items": [{"k": "text", "t": "too far right", "x0": 700, "y0": 500, "x1": 960, "y1": 560, "o": 1}, {"k": "obj", "t": "mascot", "x0": 65, "y0": 1100, "x1": 190, "y1": 1260, "o": 1}]},
        {"f": 6, "items": [{"k": "text", "t": "too far right", "x0": 700, "y0": 500, "x1": 960, "y1": 560, "o": 1}, {"k": "text", "t": "fading", "x0": 5, "y0": 500, "x1": 60, "y1": 560, "o": 0.3}]},
    ], "errors": []}
    r = safezone.analyse(lint)
    keys = {(v.sample, v.side) for v in r.violations}
    assert ("too far right", "right") in keys and ("mascot", "bottom") not in keys   # mascot only 1 sample → below min_samples
    assert not any(v.sample == "fading" or v.sample == "offscreen" for v in r.violations)


def test_safe_zone_constants_in_sync():
    z = safezone.load_zones()["critical_box"]
    ts = (ROOT / "studio" / "src" / "lib" / "safe.ts").read_text()
    for k, v in (("left", z["left"]), ("right", z["right"]), ("top", z["top"]), ("bottom", z["bottom"])):
        assert f"{k}: {v}" in ts, f"safe.ts out of sync on {k}"


# ---------------------------------------------------------------- strategy / scout / analytics
def test_strategist_enforces_lane_and_capacity():
    acc = yaml.safe_load((ROOT / "config" / "accounts.example.yaml").read_text())["accounts"]
    cap = {"brand": {"per_day": 1}, "clipping": {"per_day": 1}}
    days = ["2026-10-11"]
    items = [
        schemas.PlanItem(day="2026-10-11", account="brand", lane="clipping", goal="campaign", campaign_id="c", target_seconds=40, hook_type="numbered", cta_type="follow", rationale="x"),
        schemas.PlanItem(day="2026-10-11", account="brand", lane="brand", goal="creator_rewards", idea_id="i1", target_seconds=40, hook_type="numbered", cta_type="follow", rationale="x"),
        schemas.PlanItem(day="2026-10-11", account="brand", lane="brand", goal="reach", idea_id="i2", target_seconds=40, hook_type="curiosity_gap", cta_type="follow", rationale="x"),
    ]
    ok, probs = strat.enforce(items, acc, cap, {}, days)
    assert len(ok) == 1 and ok[0].target_seconds >= 61           # wrong-lane dropped, capacity enforced, CRP forced to >=61s
    assert any("lane" in p for p in probs) and any("capacity" in p for p in probs)


def test_scout_scoring_flags_risks():
    c = Campaign(id="c", brand="B", rate_per_1k=3.0, min_payout=6.0, platforms=["tiktok"], content_type="clipping", budget=200)
    s = score_campaign(c, assumed_views=1000, our_platforms=["tiktok", "instagram"])
    assert s["required_views"] == 2000 and any("min payout" in f for f in s["flags"]) and any("no source-footage" in f for f in s["flags"])
    good = Campaign(id="g", brand="G", rate_per_1k=2.0, min_payout=0, source_footage_urls=["https://x"], requirements_text="tag @g", budget=5000)
    assert score_campaign(good, 5000, ["tiktok"])["score"] > s["score"]


def test_analytics_detects_planted_effect_and_labels_noise():
    import numpy as np
    rng = np.random.default_rng(3)
    rows = []
    for i in range(30):
        hook = ["curiosity_gap", "numbered", "contrarian"][i % 3]
        b = {"curiosity_gap": 1.8, "numbered": 1.0, "contrarian": 0.9}[hook]
        v = int(rng.lognormal(7.5, 0.4) * b)
        rows.append({"video_id": f"v{i}", "platform": "tiktok", "views": v, "likes": int(v * .05 * b ** .3), "comments": int(v * .004), "shares": int(v * .006), "saves": int(v * .01), "follows": int(v * .002),
                     "completion_rate": float(np.clip(rng.normal(.45 * b ** .4, .06), .1, .95)), "attrs": {"style": "mix", "duration_bucket": "25-45", "cta_type": ["follow", "comment"][i % 2], "hook_type": hook, "mood": "m", "uses_chart": True, "first_style": "paper"}})
    res = analytics.analyse(rows)
    by = {(e["attr"], e["value"]): e for e in res["effects"]}
    assert by[("hook_type", "curiosity_gap")]["verdict"] == "likely"
    assert by[("cta_type", "follow")]["verdict"] == "noise"
    st = yaml.safe_load((ROOT / "knowledge" / "strategy.yaml").read_text())
    changes = analytics.apply_to_strategy(st, res, "2026-10-10")
    assert any("avoid hook 'contrarian'" in c for c in changes) and st["evidence"]   # curiosity_gap is already preferred → no duplicate edit


def test_analytics_small_sample_warning():
    rows = [{"views": 100 * (i + 1), "likes": 5, "comments": 1, "shares": 1, "saves": 1, "follows": 1, "completion_rate": .4, "platform": "tiktok", "attrs": {"hook_type": "a"}, "video_id": str(i)} for i in range(4)]
    assert "only 4 posts" in analytics.analyse(rows)["caveats"][0]


def test_csv_loader_maps_aliases(tmp_path):
    p = tmp_path / "m.csv"
    p.write_text("Video title,Video views,Likes,Comments,Shares,Average watch time,Watched full video\nNvidia moat,1200,60,5,9,14.2,41%\n")
    r = analytics.load_csv(p, "tiktok")[0]
    assert r["views"] == 1200 and r["completion_rate"] == pytest.approx(0.41) and r["avg_watch_s"] == 14.2


# ---------------------------------------------------------------- llm layer / misc
def test_llm_json_retries_with_validation_error():
    llm = MockLLM()
    calls = {"n": 0}

    def h(system, prompt):
        calls["n"] += 1
        return '```json\n{"hook_score": 99, "clarity_score": 7, "notes": []}\n```' if calls["n"] == 1 else {"hook_score": 8, "clarity_score": 7, "notes": ["ok"]}

    llm.register("editorial", h)
    out = llm.json("editorial", "sys", "prompt", schemas.EditorialOut)
    assert out.hook_score == 8 and calls["n"] == 2


def test_extract_json_tolerant():
    assert extract_json('Sure! {"a": [1, 2]} hope that helps') == {"a": [1, 2]}
    with pytest.raises(LLMError):
        extract_json("no json here")


def test_postiz_payload_shapes():
    p = build_payload("int1", "tiktok", {"id": "u", "path": "https://x/v.mp4"}, {"caption": "c", "hashtags": ["#a"]}, "2026-10-12T10:00:00Z")
    s = p["posts"][0]["settings"]
    assert s["__type"] == "tiktok" and s["privacy_level"] == "SELF_ONLY" and s["content_posting_method"] == "UPLOAD"   # drafts by default (unaudited)
    y = build_payload("int2", "youtube", {"id": "u", "path": "p"}, {"caption": "c", "hashtags": ["#a"], "youtube": {"title": "T" * 150}}, "2026-10-12T10:00:00Z")
    assert len(y["posts"][0]["settings"]["title"]) == 100


def test_rules_watcher_diff():
    old, new = normalise("A\nFETCHED: 1\nB\nC"), normalise("A\nFETCHED: 2\nB\nD")
    d = diff_summary(old, new)
    assert "-C" in d and "+D" in d and not any("FETCHED" in x for x in d)
