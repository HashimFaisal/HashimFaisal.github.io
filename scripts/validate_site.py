#!/usr/bin/env python3
"""Static integrity checks for the Nuvio Control Center repository."""
from pathlib import Path
import json
import sys
import html5lib
import tinycss2
from html5lib.html5parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
CSS_FILES = (ROOT / "style.css", ROOT / "premium-ui.css")
JSON_FILES = (ROOT / "data/status.json", ROOT / "data/changelog.json", ROOT / "data/updates.json")
errors = []

def fail(message):
    errors.append(message)

# HTML5 parser strict mode reports malformed markup, not merely recoverable rendering.
try:
    HTMLParser(strict=True).parse(HTML.read_text(encoding="utf-8"))
except Exception as exc:
    fail(f"HTML parsing failed: {exc}")

# Duplicate IDs and broken local references.
from html.parser import HTMLParser as BaseHTMLParser
class SiteHTML(BaseHTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.local_refs = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        ident = values.get("id")
        if ident:
            if ident in self.ids:
                fail(f"Duplicate HTML id: {ident}")
            self.ids.add(ident)
        for attr in ("src", "href"):
            value = values.get(attr, "")
            if value and not value.startswith(("#", "http://", "https://", "mailto:", "data:")):
                self.local_refs.append(value.split("?", 1)[0].split("#", 1)[0])

parser = SiteHTML()
source = HTML.read_text(encoding="utf-8")
parser.feed(source)
for ref in parser.local_refs:
    if not ref:
        continue
    path = (ROOT / ref).resolve()
    if ROOT not in path.parents and path != ROOT:
        fail(f"Local reference escapes repository: {ref}")
    if not path.exists():
        fail(f"Broken local reference: {ref}")

# CSS syntax and retired palette tokens across the active visual system.
LEGACY_PALETTE = (
    "#f0e5cf", "#1b1a17", "#10100f", "#171613", "#d4af37", "#c9a44c",
    "#b58d38", "#1a1916", "#111110", "#c5bdae", "#d7d0c1", "#f1dfb9",
    "#f0dfb9", "#a99e89", "#fff0ca", "34,229,139", "190,235,255",
    "116, 218, 235", "208, 239, 255", "225, 245, 255", "175,229,255", "8, 11, 18", "4,10,17",
    "154, 170, 189", "87, 214, 161", "255, 140, 154",
    "#080b18", "#17113b", "#071c2b", "#a78bfa", "#6366f1", "#22d3ee",
    "#7c3aed", "#a5b4fc", "#0891b2", "#8b5cf6", "#c4b5fd", "#d8ddf5",
    "#94a3b8", "#ddd6fe", "#a5f3fc", "#11152d", "#17143b", "#64748b",
    "#14213b", "#b7f5ff", "#160d35", "#6d28d9", "#ede9fe", "#062b3a",
    "#0e7490", "#67e8f9", "#cffafe", "#5266a8",
)
for css_path in CSS_FILES:
    css_text = css_path.read_text(encoding="utf-8")
    rules = tinycss2.parse_stylesheet(css_text, skip_comments=True, skip_whitespace=True)
    parse_errors = [rule for rule in rules if rule.type == "error"]
    if parse_errors:
        fail(f"{css_path.name}: CSS parser errors: {parse_errors[:3]}")
    for legacy in LEGACY_PALETTE:
        if legacy.lower() in css_text.lower():
            fail(f"Legacy palette token remains in {css_path.name}: {legacy}")
    if css_path.name == "premium-ui.css":
        keyframe_names = __import__("re").findall(r"@keyframes\s+([\w-]+)", css_text)
        if len(keyframe_names) != len(set(keyframe_names)):
            duplicates = sorted(name for name in set(keyframe_names) if keyframe_names.count(name) > 1)
            fail(f"Duplicate CSS keyframe names in {css_path.name}: {duplicates}")

ACTIVE_ARTWORK = (
    "hero.svg", "all-in-one.svg", "cinemabox.svg", "cinemana.svg",
    "opensubtitles.svg", "nuvio-catalog.svg", "izlemeli-catalog.svg",
)
for artwork_name in ACTIVE_ARTWORK:
    artwork_path = ROOT / "assets" / artwork_name
    if not artwork_path.exists():
        fail(f"Missing active artwork: {artwork_name}")
    artwork_text = artwork_path.read_text(encoding="utf-8")
    for legacy in LEGACY_PALETTE:
        if legacy.lower() in artwork_text.lower():
            fail(f"Legacy palette token remains in {artwork_name}: {legacy}")

# JSON parses, shapes, duplicate live update IDs, and no removed source in live updates.
data = {}
for path in JSON_FILES:
    try:
        data[path.name] = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"JSON invalid ({path.relative_to(ROOT)}): {exc}")
if "status.json" in data:
    status = data["status.json"]
    if not isinstance(status, dict) or not isinstance(status.get("checks"), list):
        fail("Health report must be an object with a checks array.")
if "changelog.json" in data and not isinstance(data["changelog.json"], list):
    fail("Changelog must be a JSON array.")
if "updates.json" in data:
    updates = data["updates.json"]
    if not isinstance(updates, list):
        fail("Live updates must be a JSON array.")
    ids = [item.get("id") for item in updates if isinstance(item, dict)]
    if len(ids) != len(set(ids)):
        fail("Duplicate live-update IDs detected.")
    if any("Persian Subtitles" in json.dumps(item, ensure_ascii=False) for item in updates):
        fail("Removed Persian Subtitles source still appears in live updates.")

# Ensure key resource categories/filters remain present and consistent.
expected = {"nuvio", "catalog", "subtitles", "ratings"}
categories = []
for match in __import__("re").finditer(r'<article class="plugin-card[^"]*" data-category="([^"]+)"', source):
    categories.append(match.group(1))
filters = set(__import__("re").findall(r'data-filter="([^"]+)"', source))
if len(categories) != 20 or set(categories) != expected:
    fail(f"Unexpected resource list/categories: {len(categories)} cards, {set(categories)}")
if filters != expected | {"all"}:
    fail(f"Filter/category mismatch: {filters}")
if categories.count("ratings") != 6:
    fail(f"Expected 6 ratings/metadata cards, found {categories.count('ratings')}")

if errors:
    print("\n".join("ERROR: " + item for item in errors))
    sys.exit(1)
print("Site validation passed: HTML, local references, CSS, JSON, palette, and resource categories.")
