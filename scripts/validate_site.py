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
ALLOWED_RGB = {
    "88,216,232", "163,148,255", "66,200,121", "255,130,146",
    "162,177,200", "141,234,243", "255,255,255", "0,0,0",
    "7,11,22", "17,29,51",
}
ALLOWED_CSS_HEX = {
    "#070b16", "#0d1526", "#111d33", "#182744", "#f2f6ff", "#a2b1c8",
    "#a394ff", "#58d8e8", "#42c879", "#a9e8c1", "#ff8292", "#ffb0ba",
    "#8deaf3", "#071317", "#000", "#fff",
}
for css_path in CSS_FILES:
    css_text = css_path.read_text(encoding="utf-8")
    rules = tinycss2.parse_stylesheet(css_text, skip_comments=True, skip_whitespace=True)
    parse_errors = [rule for rule in rules if rule.type == "error"]
    if parse_errors:
        fail(f"{css_path.name}: CSS parser errors: {parse_errors[:3]}")
    for red, green, blue in __import__("re").findall(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", css_text, flags=__import__("re").I):
        rgb = f"{red},{green},{blue}"
        if rgb not in ALLOWED_RGB:
            fail(f"Unapproved RGB color in {css_path.name}: {rgb}")
    if __import__("re").search(r"hsla?\s*\(", css_text, flags=__import__("re").I):
        fail(f"Unsupported HSL color syntax in {css_path.name}")
    for color in __import__("re").findall(r"#[0-9a-fA-F]{8}(?![a-zA-Z0-9_-])|#[0-9a-fA-F]{6}(?![a-zA-Z0-9_-])|#[0-9a-fA-F]{4}(?![a-zA-Z0-9_-])|#[0-9a-fA-F]{3}(?![a-zA-Z0-9_-])", css_text):
        if color.lower() not in ALLOWED_CSS_HEX:
            fail(f"Unapproved CSS hex color in {css_path.name}: {color}")
    if css_path.name == "premium-ui.css":
        keyframe_names = __import__("re").findall(r"@keyframes\s+([\w-]+)", css_text)
        if len(keyframe_names) != len(set(keyframe_names)):
            duplicates = sorted(name for name in set(keyframe_names) if keyframe_names.count(name) > 1)
            fail(f"Duplicate CSS keyframe names in {css_path.name}: {duplicates}")

# Every repository SVG must be a reviewed, active Nuvio UI asset. Original
# third-party raster logos and the NASA video retain their source colors.
ACTIVE_ARTWORK = (
    "hero.svg", "all-in-one.svg", "cinemabox.svg", "cinemana.svg",
    "opensubtitles.svg", "cinemeta.svg", "nuvio-catalog.svg", "izlemeli-catalog.svg",
)
repository_svg = {path.name for path in (ROOT / "assets").glob("*.svg")}
if repository_svg != set(ACTIVE_ARTWORK):
    fail(f"Unreviewed or orphaned SVG assets: {sorted(repository_svg ^ set(ACTIVE_ARTWORK))}")
# Scan HTML and JavaScript sources too, so inline styles or script-injected
# color literals cannot bypass the stylesheet palette checks.
for source_path in (HTML, ROOT / "app.js", ROOT / "premium-ui.js"):
    source_text = source_path.read_text(encoding="utf-8")
    for color in __import__("re").findall(r"#[0-9a-fA-F]{8}(?![a-zA-Z0-9_-])|#[0-9a-fA-F]{6}(?![a-zA-Z0-9_-])|#[0-9a-fA-F]{4}(?![a-zA-Z0-9_-])|#[0-9a-fA-F]{3}(?![a-zA-Z0-9_-])", source_text):
        if color.lower() not in ALLOWED_CSS_HEX:
            fail(f"Unapproved UI source color in {source_path.name}: {color}")
    for red, green, blue in __import__("re").findall(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", source_text, flags=__import__("re").I):
        rgb = f"{red},{green},{blue}"
        if rgb not in ALLOWED_RGB:
            fail(f"Unapproved UI source RGB color in {source_path.name}: {rgb}")
    if __import__("re").search(r"hsla?\s*\(", source_text, flags=__import__("re").I):
        fail(f"Unsupported HSL color syntax in {source_path.name}")

for artwork_name in ACTIVE_ARTWORK:
    artwork_path = ROOT / "assets" / artwork_name
    if not artwork_path.exists():
        fail(f"Missing active artwork: {artwork_name}")
    artwork_text = artwork_path.read_text(encoding="utf-8")
    allowed_artwork_hex = {
        "#070b16", "#0d1526", "#111d33", "#a394ff", "#58d8e8",
        "#8deaf3", "#f2f6ff", "#a2b1c8",
    }
    for color in __import__("re").findall(r"#[0-9a-fA-F]{3,8}\b", artwork_text):
        if color.lower() not in allowed_artwork_hex:
            fail(f"Unapproved artwork color in {artwork_name}: {color}")

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
