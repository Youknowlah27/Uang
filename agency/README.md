# Shorts Agency — business + technology, English, zero-cost

An "agency" of cooperating agents that researches, plans, writes, produces, **reviews against the platforms' own rules**, and hands you one
thing to do: **approve in Notion**. Built 2026-10-10 for TikTok / Instagram Reels / YouTube Shorts, two accounts per platform
(`brand` = original content → monetisation/affiliate, `clipping` = paid campaign clips).

```
TrendAgent ─┐                                   ┌─ Notion "Approval Queue" ◄── YOU (Approved / Revise / Rejected)
ScoutAgent ─┼─► StrategistAgent ─► WriterAgent ─► DirectorAgent ─► ProducerAgent ─► ReviewerAgent ─┘          │
RulesWatcher┘     (7-day plan)      (script,        (scenes,         (voice, music,    (policy-as-code:        ▼
 (rules KB)                          claims, CTA,    mascot, mood)    SFX, VFX, lint,   33 rules, safe zone,   PublisherAgent (official channels)
                                     caption, tags)                   render)           originality, CTA…)            │
 AnalystAgent ◄──────────── metrics (CSV/API) ◄─────────────────────────────────────────────────────────────────────┘
   └─► knowledge/strategy.yaml  (what works / what fails / why / copy updates — only 'likely' effects change it)
```
`Showrunner` runs them concurrently (LLM agents ×2, one render at a time) and loops Reviewer → Writer/Director up to 2 times before it asks you.

## What you do each day (≈10 min)
1. Open the Notion database **"Shorts Agency — Approval Queue"** → rows with *Needs Review* (video, caption, hashtags, CTA, review notes, score).
2. Set **Approved** (optionally *Publish at*), or write edits in *Your feedback* and set **Revise**, or **Rejected**.
3. For approved rows the Publisher writes `build/<id>/package/` (video + per-platform caption/hashtags/first comment + checklist). Post via each app's draft/upload
   (official channel). TikTok API-posting needs an audited client (unaudited = private only); Postiz Cloud or in-app drafts avoid that.

## Setup on your PC (all free)
```
pip install -r requirements.txt && (cd studio && npm ci)
cp config/agency.example.yaml config/agency.yaml ; cp config/accounts.example.yaml config/accounts.yaml   # fill in handles
export NOTION_TOKEN=...      # free internal integration; share the Approval Queue database with it
python -m shorts_agency trends        # live: HN + BBC + TechCrunch + Google Trends
python -m shorts_agency plan --days 7
python -m shorts_agency produce <plan_id>
python -m shorts_agency daemon        # everything, concurrently
```
LLM = your Claude subscription through headless `claude -p` (lean flags, ~1.2k tokens overhead per call). Alternatives in `llm/`: `file_queue`, `gemini`, `ollama`, `mock`.
Docker: `docker compose up -d` (Dockerfile provided).

## Rules knowledge base (`rules/`)
`platform_rules.yaml` — 33 rules, each with source URL, snapshot of the official page (`snapshots/`), `verified_at`, confidence (official 23 · secondary 5 · internal 5) and the code check that enforces it.
`safe_zones.yaml` — critical box x 65–880, y 288–1248 (bottom ~35% free, right rail clear, top clear). `RulesWatcher` re-renders `sources.yaml` weekly and diffs.
Findings that shaped the strategy: TikTok Creator Rewards needs **≥60 s original** videos, personal account, 10k followers, 100k views/30 d (Indonesia not confirmed on an official page);
campaign/third-party clips are *not* original on TikTok/YouTube → separate clipping account; YouTube demonetises **templated mass-produced** content → the reviewer blocks clones
(`originality.template_similarity`) and requires original analysis; TikTok bans engagement-bait CTAs and automation to bypass systems → value-based CTAs, official publishing only.

## Verified vs not verified (honest)
Verified here: 24 tests (+ real `claude -p` editorial review) (rules↔code, reviewer verdicts, safe-zone analyser, analytics stats, orchestration with mock LLM, Postiz payloads), live trend fetch, live `claude -p` JSON,
real TTS, 4 rendered videos, loudness −14 LUFS / −1 dBTP, safe-zone lint on rendered DOM.
**Not** verified: Docker image build, Notion REST sync (DB created via Notion MCP; REST needs your token), Postiz calls, Gemini/Ollama providers, marketplace scraping
(login-walled → paste briefs into `inbox/campaigns/`), the clipping lane's actual clip-making (semi-manual: campaign card + reviewer; OpenShorts/other clipper creates the clip),
real analytics (needs ≥20 posts; effects are only "likely" at n≥5 per group). Music/SFX are synthesised and checked by metrics/spectrogram, **not by ear** — judge them yourself.

## Splitting work with Gemini (Google AI Plus) — what is possible, what is not (verified 2026-10-10)
| Route | Works? | Use it for |
|---|---|---|
| Gemini **API key (free, aistudio.google.com)** | Yes, programmatic. NOT part of the Plus subscription; free-tier limits/models differ per source → verify | `llm.routes`: trend angles, campaign parsing, analyst draft, caption variants (auto-fallback to Claude on any error) |
| Gemini **app / Plus quotas** | Manual hand-off only (no official API; UI automation is against platform rules we encoded) | `python -m shorts_agency handoff research --plan <id>` → paste into Deep Research → save result → `ingest <file> <idea_id>`; Nano Banana (mascot/thumbnails), Flow/Veo (rare stylised B-roll) |
| Gemini **CLI with Google login** | Reportedly ended for individuals on 2026-06-18 → do not rely on it | — |
| Google Drive | Connector available in Claude Code sessions | Save Gemini outputs to a Drive folder; Claude reads them there |
Claude keeps: script, direction, editorial review, strategy, orchestration, code.
