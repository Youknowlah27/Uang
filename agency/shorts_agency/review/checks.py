"""One function per `check:` id in rules/platform_rules.yaml.  Each returns (passed, message, fix, evidence)."""
from __future__ import annotations

import re
from collections import Counter
from typing import Any, Callable

from ..produce.timeline import beat_of

Result = tuple[bool, str, str, dict]
CHECKS: dict[str, Callable[[dict], Result]] = {}


def check(name: str):
    def deco(fn):
        CHECKS[name] = fn
        return fn
    return deco


def _ok(msg="ok", **ev) -> Result:
    return True, msg, "", ev


def _bad(msg: str, fix: str = "", **ev) -> Result:
    return False, msg, fix, ev


def narration(spec: dict) -> str:
    return " ".join(b["text"] for b in spec["timeline"]["beats"])


WORD = re.compile(r"[a-z0-9']+")
STOP = set("the a an and or of to in on for with is are was were it its that this these those be as at by from you your we our they their i he she not no yes do does did have has had will would can could should may might just so than then there here what which who whom how why when where".split())


def keywords(text: str) -> set[str]:
    return {w for w in WORD.findall(text.lower()) if w not in STOP and len(w) > 2}


# ------------------------------------------------------------------ originality
def _fingerprint(spec: dict) -> dict:
    return {
        "templates": [s["template"] for s in spec["scenes"]],
        "styles": [s.get("style") or spec.get("style") for s in spec["scenes"]],
        "tokens": sorted(keywords(narration(spec))),
        "hook": " ".join(spec["timeline"]["beats"][0]["text"].lower().split()[:4]),
        "cta": f"{spec['cta'].get('type')}|{spec['cta'].get('headline', '').lower()}",
        "poses": [r.get("pose") for r in spec.get("mascot", {}).get("reactions", [])],
    }


def fingerprint(spec: dict) -> dict:
    return _fingerprint(spec)


def similarity(a: dict, b: dict) -> float:
    ta, tb = a["templates"], b["templates"]
    seq = sum(1 for x, y in zip(ta, tb) if x == y) / max(len(ta), len(tb), 1)
    sty = sum(1 for x, y in zip(a["styles"], b["styles"]) if x == y) / max(len(a["styles"]), len(b["styles"]), 1)
    A, B = set(a["tokens"]), set(b["tokens"])
    jac = len(A & B) / max(len(A | B), 1)
    hook = 1.0 if a["hook"] == b["hook"] else 0.0
    cta = 1.0 if a["cta"] == b["cta"] else 0.0
    return round(0.30 * seq + 0.15 * sty + 0.40 * jac + 0.10 * hook + 0.05 * cta, 3)


@check("originality.template_similarity")
def _template_similarity(c: dict) -> Result:
    hist = c.get("history", [])
    if not hist:
        return _ok("no previous videos to compare with (first upload)", compared=0)
    me = _fingerprint(c["spec"])
    scores = sorted(((similarity(me, h["fingerprint"]), h.get("id", "?")) for h in hist[-20:]), reverse=True)
    top, tid = scores[0]
    if top >= 0.75:
        return _bad(f"too similar to '{tid}' (similarity {top}); looks mass-produced", "Change topic angle, scene template order and hook; do not reuse the same structure.", top=top, vs=tid)
    if top >= 0.55:
        return False, f"fairly similar to '{tid}' ({top})", "Vary the scene order/style or the hook before approving.", {"top": top, "vs": tid, "_severity": "warn"}
    return _ok(f"distinct from last {len(hist[-20:])} videos (max similarity {top})", top=top)


@check("originality.analysis_present")
def _analysis_present(c: dict) -> Result:
    spec = c["spec"]
    pts = [p for p in spec.get("analysis_points", []) if len(p) >= 40]
    if spec.get("lane") == "clipping":
        adds = spec.get("additions", [])
        return _ok(f"clip adds {len(adds)} original element(s)") if len(adds) >= 1 else _bad("clip adds nothing of its own", "Add hook text, captions, reframing or short commentary.")
    if len(pts) < 2:
        return _bad(f"only {len(pts)} analysis point(s); needs original commentary/educational value", "Add >=2 analysis_points explaining WHY (not just what).", points=len(pts))
    if not re.search(r"\b(because|means|which|why|reason|so|therefore|switching|shows|explains|cost|moat)\b", " ".join(pts).lower()):
        return _bad("analysis points do not explain causes/implications", "Rewrite points to explain why it matters.")
    return _ok(f"{len(pts)} analysis points")


@check("lane.separation")
def _lane_separation(c: dict) -> Result:
    spec, accounts = c["spec"], c.get("accounts", {})
    acct = accounts.get(spec.get("account"))
    lane = spec.get("lane")
    if acct and acct.get("lane") != lane:
        return _bad(f"account '{spec['account']}' is a {acct.get('lane')} account but the video is lane '{lane}'", "Publish this video from an account of the same lane.")
    if lane == "brand" and (spec.get("campaign_id") or spec.get("source_footage")):
        return _bad("brand-lane video carries campaign/third-party footage", "Move campaign clips to the clipping account.")
    if lane == "clipping" and not (spec.get("campaign_id") and spec.get("source_footage")):
        return _bad("clipping video must reference a campaign_id and its brand-provided source_footage", "Attach campaign_id and source_footage URL.")
    return _ok(f"lane '{lane}' consistent with account '{spec.get('account')}'")


# ------------------------------------------------------------------ disclosure / platform
@check("disclosure.ai_realistic")
def _ai_disclosure(c: dict) -> Result:
    spec = c["spec"]
    photoreal = [s["beat"] for s in spec["scenes"] if (s.get("props") or {}).get("photoreal") or (s.get("props") or {}).get("ai_media") == "photoreal"]
    if not photoreal:
        return _ok("no photorealistic AI people/scenes (stylised mascot + graphics + generic TTS)")
    if c["spec"].get("post", {}).get("ai_label"):
        return _ok("photoreal AI content is labelled")
    return _bad(f"photorealistic AI media in scenes {photoreal} without an AI label", "Enable the platform AI-generated label and add 'AI' to the caption.")


@check("crp.duration_min")
def _crp_duration(c: dict) -> Result:
    t = c["spec"]["timeline"]["total"]
    return _ok(f"{t:.1f}s >= 60s") if t >= 60 else _bad(f"{t:.1f}s is under the 60s Creator Rewards minimum", "Make a 61-90s version (add two analysis beats) for the rewards lane.", seconds=t)


@check("crp.no_text_only")
def _crp_not_text_only(c: dict) -> Result:
    tpl = Counter(s["template"] for s in c["spec"]["scenes"])
    textish = tpl["statement"] + tpl["hook_stamp"] + tpl["cta_end"]
    visual = sum(tpl.values()) - textish
    return _ok(f"{visual} visual/data scenes + voice-over") if visual >= 3 else _bad("mostly text-overlay scenes", "Add >=3 data/diagram/animation scenes.")


@check("crp.not_sponsored")
def _crp_not_sponsored(c: dict) -> Result:
    s = c["spec"]
    if s.get("campaign_id") or s.get("sponsored") or s.get("post", {}).get("affiliate_links"):
        return _bad("sponsored/campaign/affiliate content is not eligible for Creator Rewards", "Publish it in the clipping/affiliate lane instead.")
    return _ok("no sponsored content")


@check("audio.music_original")
def _music_original(c: dict) -> Result:
    src = c["spec"].get("music_source", "synth")
    return _ok("music is synthesised in-repo") if src in ("synth", "owned") else _bad(f"music source '{src}' is external", "Use the in-repo synth bed or document the licence.")


COERCIVE = [r"follow\s*(for|4)\s*follow", r"\bf4f\b", r"like (if|or)\b", r"(like|follow|share|subscribe)[^.!?]{0,30}\b(or else|unless|or i)", r"tag \d+ (friends|people)", r"tag a friend", r"\byou (have|need) to (follow|like|share)", r"\bgift\b", r"smash (the )?(like|follow)", r"\bbeg\b", r"must (follow|like|share)"]
VALUE_WORDS = re.compile(r"\b(part|next|follow|save|link|comment|get|free|guide|checklist|template|breakdown|why|how|can|which)\b", re.I)


@check("cta.value_based")
def _cta_value(c: dict) -> Result:
    s = c["spec"]
    texts = [s["cta"].get("headline", ""), s["cta"].get("sub", ""), s.get("post", {}).get("caption", ""), s.get("post", {}).get("first_comment", "")]
    for t in texts:
        for pat in COERCIVE:
            if re.search(pat, t, re.I):
                return _bad(f"coercive/engagement-bait CTA: '{t[:60]}'", "Give a concrete reason to follow/click (e.g. 'Follow for part 2: <topic>').")
    if s["cta"].get("type") == "follow" and not s["cta"].get("sub"):
        return _bad("follow CTA has no stated value", "Add cta.sub naming what the next post delivers.")
    return _ok("CTA gives a concrete reason")


@check("cta.present")
def _cta_present(c: dict) -> Result:
    s = c["spec"]
    if not s.get("cta"):
        return _bad("no CTA defined", "Add cta {type, headline, sub}.")
    last = s["scenes"][-1]
    if last["template"] != "cta_end":
        return _bad("last scene is not the CTA end card", "End the video with a cta_end scene.")
    post = s.get("post", {})
    cap = post.get("caption", "").lower()
    t = s["cta"]["type"]
    need = {"follow": ["follow"], "link": ["link in bio", "bio"], "comment": ["comment"]}[t]
    if not any(k in cap for k in need):
        return _bad(f"post caption does not repeat the '{t}' CTA", f"Mention '{need[0]}' in the caption.")
    if t == "link" and not post.get("link_in_bio"):
        return _bad("link CTA without a link_in_bio target", "Set post.link_in_bio (URL) and update the bio link.")
    if t == "comment" and not s["cta"].get("keyword"):
        return _bad("comment CTA without keyword", "Set cta.keyword.")
    return _ok(f"'{t}' CTA on screen, spoken and in caption")


@check("publisher.official_only")
def _publisher_official(c: dict) -> Result:
    pub = c.get("publisher", {})
    method = pub.get("method", "manual_draft")
    if method in ("browser_automation", "unofficial_api", "bot") or pub.get("automate_engagement"):
        return _bad(f"publisher method '{method}' is not an official channel", "Use Postiz Cloud / official API / in-app draft; never automate engagement.")
    return _ok(f"publisher '{method}' is an official/partner channel; no engagement automation")


LIMITS = {"tiktok": {"caption": 2200}, "instagram": {"caption": 2200}, "youtube": {"title": 100, "description": 5000}}


@check("metadata.limits")
def _limits(c: dict) -> Result:
    s = c["spec"]
    post = s.get("post", {})
    probs = []
    tags = post.get("hashtags", [])
    cap = post.get("caption", "")
    full = cap + " " + " ".join(tags)
    for p in s.get("platforms", []):
        lim = LIMITS.get(p, {})
        if "caption" in lim and len(full) > lim["caption"]:
            probs.append(f"{p}: caption+hashtags {len(full)} > {lim['caption']}")
        if p == "youtube":
            yt = post.get("youtube", {})
            if len(yt.get("title", "")) > lim["title"]:
                probs.append("youtube title too long")
            if len(yt.get("description", "")) > lim["description"]:
                probs.append("youtube description too long")
            if not yt.get("title"):
                probs.append("youtube title missing")
    if len(tags) > 8:
        probs.append(f"{len(tags)} hashtags (recommended 3-5)")
    if len(tags) < 2:
        probs.append("fewer than 2 hashtags")
    if len(set(t.lower() for t in tags)) != len(tags):
        probs.append("duplicate hashtags")
    if any(not t.startswith("#") or " " in t for t in tags):
        probs.append("malformed hashtag")
    return _ok(f"caption {len(full)} chars, {len(tags)} hashtags") if not probs else _bad("; ".join(probs), "Trim caption / fix hashtags (3-5 relevant).")


GENERIC_TAGS = {"#fyp", "#foryou", "#foryoupage", "#viral", "#trending", "#explore", "#reels", "#xyzbca"}


@check("caption.relevance_and_length")
def _caption_relevance(c: dict) -> Result:
    s = c["spec"]
    post = s.get("post", {})
    cap = post.get("caption", "")
    kc, kn = keywords(cap), keywords(narration(s))
    if not kn:  # clip lane: no script; relevance is checked against the campaign brief instead
        return _ok("clip caption (no script to compare)")
    overlap = len(kc & kn) / max(len(kc), 1)
    generic = [t for t in post.get("hashtags", []) if t.lower() in GENERIC_TAGS]
    probs = []
    if len(cap) > 600:
        probs.append(f"caption is long ({len(cap)} chars)")
    if overlap < 0.3:
        probs.append(f"caption only {overlap:.0%} related to the video")
    if len(generic) > 1:
        probs.append(f"generic hashtag stuffing {generic}")
    return _ok(f"caption {overlap:.0%} on-topic") if not probs else _bad("; ".join(probs), "Keep the caption short, on-topic and use niche hashtags.", overlap=round(overlap, 2))


@check("claims.sourced")
def _claims_sourced(c: dict) -> Result:
    s = c["spec"]
    claims = s.get("claims", [])
    need = {sc["beat"] for sc in s["scenes"] if sc["template"] in ("share", "count_grid", "milestone")}
    have = {cl.get("scene") for cl in claims if str(cl.get("source", "")).startswith("http")}
    missing = sorted(need - have)
    nums = set(re.findall(r"\d[\d.,]*\s?(?:%|million|billion|m|b)?", narration(s).lower()))
    covered = " ".join(cl["text"].lower() for cl in claims)
    uncovered = [n.strip() for n in nums if re.sub(r"[^\d]", "", n) and re.sub(r"[^\d]", "", n)[:3] not in re.sub(r"[^\d]", "", covered)]
    if missing:
        return _bad(f"scenes with numbers lack a sourced claim: {missing}", "Add claims[{text, source(url), scene}] for each data scene.", missing=missing)
    if uncovered:
        return False, f"numbers in narration not matched by a claim: {uncovered}", "Add the missing claims.", {"uncovered": uncovered, "_severity": "warn"}
    return _ok(f"{len(claims)} sourced claims cover all data scenes")


@check("hook.first_second")
def _hook(c: dict) -> Result:
    s = c["spec"]
    b0 = s["timeline"]["beats"][0]
    first = [w["t"].lower() for w in b0["words"][:3]]
    if b0["start"] > 0.5:
        return _bad(f"first word starts at {b0['start']:.2f}s", "Start speech within 0.5s.")
    if any(g in first for g in ("hey", "hi", "hello", "guys", "welcome", "so")):
        return _bad(f"greeting opener {first}", "Open with the claim/question, not a greeting.")
    if s["scenes"][0]["template"] != "hook_stamp":
        return False, "first scene is not a hook template", "Start with hook_stamp.", {"_severity": "warn"}
    return _ok(f"speech starts at {b0['start']:.2f}s, no greeting")


@check("captions.on")
def _captions_on(c: dict) -> Result:
    return _bad("burned-in captions disabled", "Enable captions.") if c["spec"].get("captions_off") else _ok("burned-in word-by-word captions")


@check("audio.mix")
def _audio_mix(c: dict) -> Result:
    r = c.get("audio_report")
    if not r:
        return False, "no audio report", "Run the mixer.", {"_severity": "warn"}
    msg = f"{r['integrated_lufs']} LUFS, TP {r['true_peak_dbtp']} dBTP, music {r['voice_vs_music_gap_db']} dB under voice"
    return _ok(msg) if r.get("pass") else _bad(msg, "Adjust ducking/levels.")


@check("safezone.lint")
def _safezone(c: dict) -> Result:
    r = c.get("safezone")
    if r is None:
        return False, "safe-zone lint not run", "Run studio lint.", {"_severity": "warn"}
    if r.unresolved_refs:
        return _bad(f"unresolved word references: {r.unresolved_refs}", "Fix word refs in scene props.")
    if r.ok:
        return _ok(r.summary())
    return _bad(f"{len(r.violations)} violation(s): " + "; ".join(v.line() for v in r.violations[:3]), "Re-layout the offending elements inside the safe box.")


@check("campaign.requirements")
def _campaign(c: dict) -> Result:
    camp = c.get("campaign")
    if not camp:
        return _ok("no campaign attached")
    s, post = c["spec"], c["spec"].get("post", {})
    cap = post.get("caption", "").lower()
    tags = {t.lower() for t in post.get("hashtags", [])}
    probs = []
    for t in camp.required_hashtags:
        if t.lower() not in tags:
            probs.append(f"missing required hashtag {t}")
    for m in camp.required_mentions:
        if m.lower() not in cap and m.lower() not in {x.lower() for x in post.get("mentions", [])}:
            probs.append(f"missing required mention {m}")
    for ph in camp.required_phrases:
        if ph.lower() not in cap:
            probs.append(f"missing required phrase '{ph}'")
    for d in camp.disclosure_required:
        if d.lower() not in cap and d.lower() not in tags:
            probs.append(f"missing disclosure {d}")
    txt = (narration(s) + " " + cap).lower()
    for f in camp.forbidden_terms:
        if f.lower() in txt:
            probs.append(f"forbidden term '{f}'")
    t = s["timeline"]["total"]
    if camp.min_seconds and t < camp.min_seconds:
        probs.append(f"{t:.0f}s shorter than min {camp.min_seconds:.0f}s")
    if camp.max_seconds and t > camp.max_seconds:
        probs.append(f"{t:.0f}s longer than max {camp.max_seconds:.0f}s")
    for p in s.get("platforms", []):
        if camp.platforms and p not in camp.platforms:
            probs.append(f"platform {p} not accepted by campaign")
    if camp.watermark_required and not s.get("watermark"):
        probs.append("watermark required")
    return _ok(f"meets all stated campaign requirements ({camp.id})") if not probs else _bad("; ".join(probs), "Fix the items; the brand rejects submissions that miss written requirements.")
