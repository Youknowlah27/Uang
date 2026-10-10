Extract this clipping/UGC campaign into JSON for the schema below. Copy values exactly from the text; if a value is not stated use null, 0 or [].
Schema keys: id (short slug), marketplace (whop|vyro|clipping_net|direct|other), brand, url, content_type (clipping|ugc), rate_per_1k (number per 1,000 views), currency, budget, min_payout, max_payout, flat_bonus,
platforms (subset of tiktok|instagram|youtube|x), required_hashtags, required_mentions, required_phrases, forbidden_terms, min_seconds, max_seconds, watermark_required (bool),
disclosure_required (e.g. ["#ad"]), source_footage_urls, requirements_text (the brand's own written rules, verbatim), deadline, notes.
