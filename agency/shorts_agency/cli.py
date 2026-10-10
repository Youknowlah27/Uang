"""python -m shorts_agency <command>   (see README)"""
from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

from .agents.base import Ctx
from .config import load_accounts, load_config
from .llm import get_llm
from .state import Store


def make_ctx(args) -> Ctx:
    cfg = load_config()
    if getattr(args, "llm", None):
        cfg["llm"]["provider"] = args.llm
    llm = get_llm(cfg["llm"]) if cfg["llm"]["provider"] != "none" else None
    return Ctx(cfg=cfg, store=Store(Path(cfg["paths"]["workdir"]) / "agency.db"), llm=llm, accounts=load_accounts())


def main(argv=None):
    ap = argparse.ArgumentParser(prog="shorts_agency")
    ap.add_argument("--llm", help="override llm provider (claude_cli|mock|file_queue|gemini|ollama)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("trends", help="fetch + rank trending business/tech topics")
    sub.add_parser("scout", help="parse campaign briefs in inbox/campaigns and rank them")
    p = sub.add_parser("plan", help="7-day content plan"); p.add_argument("--days", type=int, default=7)
    p = sub.add_parser("produce", help="plan item -> reviewed video"); p.add_argument("plan_id")
    p = sub.add_parser("review", help="re-run the content manager on a produced video"); p.add_argument("video_id")
    p = sub.add_parser("approve", help="approve a video and prepare/schedule its post"); p.add_argument("video_id"); p.add_argument("--at")
    p = sub.add_parser("analyze", help="ingest metrics CSVs"); p.add_argument("--tiktok"); p.add_argument("--instagram"); p.add_argument("--youtube")
    sub.add_parser("rules-watch", help="re-snapshot official rules and diff")
    sub.add_parser("daemon", help="run all agents concurrently")
    args = ap.parse_args(argv)
    ctx = make_ctx(args)
    from .showrunner import Showrunner
    sr = Showrunner(ctx)
    run = asyncio.run
    if args.cmd == "trends": print(json.dumps(run(sr.trend.run()), indent=1))
    elif args.cmd == "scout": print(json.dumps(run(sr.scout.run()), indent=1))
    elif args.cmd == "plan": print(json.dumps(run(sr.strategist.run(days=args.days)), indent=1))
    elif args.cmd == "produce": print(run(sr.produce_item(args.plan_id)))
    elif args.cmd == "review": print(json.dumps(run(sr.reviewer.run(video_id=args.video_id)), indent=1))
    elif args.cmd == "approve": print(json.dumps(run(sr.approve(args.video_id, args.at)), indent=1))
    elif args.cmd == "analyze": print(json.dumps(run(sr.analyst.run(csv_paths={k: v for k, v in (("tiktok", args.tiktok), ("instagram", args.instagram), ("youtube", args.youtube)) if v})), indent=1))
    elif args.cmd == "rules-watch": print(json.dumps(run(sr.rules.run()), indent=1))
    elif args.cmd == "daemon": run(sr.daemon())


if __name__ == "__main__":
    main()
