"""Shared text helpers (kept free of heavy imports)."""
import re

WORD = re.compile(r"[a-z0-9']+")
STOP = set("the a an and or of to in on for with is are was were it its that this these those be as at by from you your we our they their i he she not no yes do does did have has had will would can could should may might just so than then there here what which who whom how why when where new says say after about into over more most up out off all one two three how".split())


def keywords(text: str) -> set[str]:
    return {w for w in WORD.findall(text.lower()) if w not in STOP and len(w) > 2}
