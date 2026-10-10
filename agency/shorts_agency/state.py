"""SQLite document store shared by all agents (single file, no server). Kinds: idea, campaign, plan, video, post, metric, insight, event."""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Iterable


class Store:
    def __init__(self, path: str | Path = "build/agency.db"):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path = str(path)
        self._lock = threading.RLock()
        self.db = sqlite3.connect(self.path, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS docs(kind TEXT, id TEXT, status TEXT, updated REAL, json TEXT, PRIMARY KEY(kind,id))")
        self.db.execute("CREATE INDEX IF NOT EXISTS ix_kind_status ON docs(kind,status)")
        self.db.commit()

    def put(self, kind: str, id: str, doc: dict, status: str = "new") -> None:
        with self._lock:
            self.db.execute("INSERT OR REPLACE INTO docs VALUES (?,?,?,?,?)", (kind, id, status, time.time(), json.dumps(doc, default=str)))
            self.db.commit()

    def get(self, kind: str, id: str) -> dict | None:
        with self._lock:
            r = self.db.execute("SELECT json,status FROM docs WHERE kind=? AND id=?", (kind, id)).fetchone()
        if not r:
            return None
        d = json.loads(r[0])
        d["_status"] = r[1]
        return d

    def set_status(self, kind: str, id: str, status: str, **patch: Any) -> None:
        d = self.get(kind, id) or {}
        d.pop("_status", None)
        d.update(patch)
        self.put(kind, id, d, status)

    def list(self, kind: str, status: str | Iterable[str] | None = None, limit: int = 500) -> list[dict]:
        q, args = "SELECT id,status,json FROM docs WHERE kind=?", [kind]
        if status is not None:
            ss = [status] if isinstance(status, str) else list(status)
            q += f" AND status IN ({','.join('?' * len(ss))})"
            args += ss
        q += " ORDER BY updated DESC LIMIT ?"
        args.append(limit)
        with self._lock:
            rows = self.db.execute(q, args).fetchall()
        out = []
        for id_, st, js in rows:
            d = json.loads(js)
            d["_id"], d["_status"] = id_, st
            out.append(d)
        return out

    def log(self, agent: str, level: str, msg: str, **extra: Any) -> None:
        self.put("event", f"{time.time():.6f}-{agent}", {"agent": agent, "level": level, "msg": msg, **extra}, level)

    def count(self, kind: str, status: str | None = None) -> int:
        q, a = "SELECT COUNT(*) FROM docs WHERE kind=?", [kind]
        if status:
            q += " AND status=?"
            a.append(status)
        return self.db.execute(q, a).fetchone()[0]
