Plan the content calendar for the WINDOW below. Return {"items":[PlanItem...]}.
PlanItem: day (YYYY-MM-DD), account, lane (must equal the account's lane), goal (reach|creator_rewards|campaign|affiliate), idea_id OR campaign_id, target_seconds (15-120), hook_type, cta_type (follow|link|comment), experiment, rationale.
Hard rules:
- brand lane = original content only, goal reach (or creator_rewards ONLY if STRATEGY says the account is eligible; then target_seconds >= 61). Never a campaign_id.
- clipping lane = campaign clips only; needs a campaign_id; goal campaign.
- Respect CAPACITY per account per day. Do not repeat the same hook_type on one account back-to-back. Mix CTA types per STRATEGY.cta.mix.
- Prefer the highest-scored ideas; skip ideas whose angle.risk mentions unverified rumours.
- One cheap experiment per week (e.g. same topic, two hook types) — describe it in "experiment".
- rationale: one sentence of evidence (score, trend, campaign EV). No hype.
