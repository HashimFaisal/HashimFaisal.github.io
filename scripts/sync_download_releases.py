#!/usr/bin/env python3
"""Synchronize every Nuvio download-card link with its source GitHub release.

Only links with a confident one-to-one asset match are changed. Missing or
ambiguous assets keep their existing URL and are reported for manual review.
"""
from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen


INDEX_PATH = Path("index.html")
UPDATES_PATH = Path("data/updates.json")
CARD_REGISTRY_PATH = Path("data/download-cards-seen.json")
API_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Nuvio-Control-Center-release-sync",
}


def github_release_source(url: str):
    parsed = urlparse(unescape(url))
    if parsed.hostname not in {"github.com", "www.github.com"}:
        return None
    parts = [unquote(part) for part in parsed.path.split("/") if part]
    if len(parts) < 6 or parts[2:4] != ["releases", "download"]:
        return None
    return f"{parts[0]}/{parts[1]}", parts[4], parts[5]


def select_latest_release(releases: list[dict]):
    """Select the newest published release, including beta/RC releases with assets."""
    published = [
        item for item in releases
        if isinstance(item, dict) and not item.get("draft")
        and item.get("tag_name") and isinstance(item.get("assets"), list) and item.get("assets")
        and item.get("published_at")
    ]
    if not published:
        raise ValueError("No published GitHub release with assets was found")
    return max(published, key=lambda item: item.get("published_at") or "")


def fetch_latest_release(repository: str):
    request = Request(
        f"https://api.github.com/repos/{repository}/releases?per_page=30",
        headers=API_HEADERS,
    )
    with urlopen(request, timeout=25) as response:
        releases = json.loads(response.read().decode("utf-8"))
    return select_latest_release(releases)


def asset_features(name: str):
    value = name.lower()
    features = set()
    extension = Path(value).suffix
    if extension:
        features.add("ext:" + extension)
    groups = {
        "arm64": ("arm64-v8a", "arm64", "aarch64"),
        "armv7": ("armeabi-v7a", "armv7", "arm32"),
        "x86_64": ("x86_64", "x64"),
        "x86": ("x32",),
        "universal": ("universal",),
        "lite": ("lite",),
        "highcache": ("highcache", "high-cache"),
        "ios": (".ipa", "ios"),
        "android": (".apk", "android"),
        "windows": (".exe", "windows"),
        "tizen": (".wgt", ".tpk", "tizen"),
        "webos": (".ipk", "webos"),
    }
    for feature, aliases in groups.items():
        if any(alias in value for alias in aliases):
            features.add(feature)
    # Do not classify x86_64 assets as 32-bit x86 assets.
    if re.search(r"(?<![a-z0-9])x86(?![_-]?64)(?![a-z0-9])", value):
        features.add("x86")
    return features


def normalized_asset_name(name: str, old_tag: str):
    value = unquote(name).lower()
    for token in (old_tag, old_tag.lstrip("vV")):
        if token:
            value = re.sub(re.escape(token.lower()), " ", value)
    value = re.sub(r"v?\d+(?:\.\d+)+", " ", value)
    value = re.sub(r"\b(?:alpha|beta|rc|pre|preview|dev)(?:[.-]?\d+(?:\.\d+)*)?\b", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    ignored = {"release", "download", "build", "app", "nuvio"}
    return {part for part in value.split() if part and part not in ignored}


def select_asset(current_name: str, old_tag: str, assets: list[dict]):
    current_features = asset_features(current_name)
    current_tokens = normalized_asset_name(current_name, old_tag)
    ranked = []
    for asset in assets:
        name = asset.get("name")
        url = asset.get("browser_download_url")
        if not name or not url:
            continue
        features = asset_features(name)
        current_extensions = {feature for feature in current_features if feature.startswith("ext:")}
        candidate_extensions = {feature for feature in features if feature.startswith("ext:")}
        if not current_extensions or current_extensions != candidate_extensions:
            continue
        required = current_features.intersection({
            "arm64", "armv7", "x86_64", "x86", "universal",
            "lite", "highcache", "ios", "android", "windows", "tizen", "webos",
        })
        if not required.issubset(features):
            continue
        tokens = normalized_asset_name(name, old_tag)
        union = current_tokens | tokens
        similarity = len(current_tokens & tokens) / len(union) if union else 0.0
        if current_tokens == tokens:
            similarity = 1.0
        ranked.append((similarity, asset))
    ranked.sort(key=lambda item: item[0], reverse=True)
    if not ranked or ranked[0][0] < 0.62:
        return None
    if len(ranked) > 1 and ranked[0][0] - ranked[1][0] < 0.08:
        return None
    return ranked[0][1]


def normalize_card_id(title: str):
    """Return a stable card identity, excluding a displayed version number."""
    value = unescape(title).strip().lower()
    value = re.sub(r"\bv?\d+(?:\.\d+)+(?:-[a-z0-9.-]+)?\b", " ", value)
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "unknown-card"


def sync_download_cards(document: str, release_loader=fetch_latest_release):
    card_pattern = re.compile(
        r'(<article class="[^"]*\bdownloads-device-card\b[^"]*">)'
        r'([\s\S]*?)(</article>)'
    )
    link_pattern = re.compile(
        r'(<a class="[^"]*\bdownloads-device-link\b[^"]*" href=")'
        r'([^"]+)(">)'
    )
    releases = {}
    updated_links = 0
    skipped_links = []
    updated_cards = []
    release_events = {}
    card_events = {}

    def update_card(match):
        nonlocal updated_links
        opening, body, closing = match.groups()
        title_match = re.search(r"<h3>([\s\S]*?)</h3>", body)
        title = unescape(re.sub(r"<[^>]+>", "", title_match.group(1))).strip() if title_match else "Unknown card"
        card_updates = []
        card_id = normalize_card_id(title)
        for link_match in link_pattern.finditer(body):
            source = github_release_source(link_match.group(2))
            if source:
                repository, current_tag, _ = source
                card_events.setdefault(card_id, {
                    "card_id": card_id,
                    "card": title,
                    "repository": repository,
                    "tag": current_tag,
                    "url": "https://github.com/" + repository + "/releases/tag/" + current_tag,
                })
                break

        def update_link(link_match):
            nonlocal updated_links
            prefix, old_url, suffix = link_match.groups()
            source = github_release_source(old_url)
            if not source:
                return link_match.group(0)
            repository, old_tag, current_name = source
            try:
                if repository not in releases:
                    releases[repository] = release_loader(repository)
                release = releases[repository]
                latest_tag = str(release.get("tag_name") or "").strip()
                if latest_tag and latest_tag != old_tag:
                    release_events.setdefault((card_id, repository, latest_tag), {"card_id": card_id, "repository": repository, "tag": latest_tag, "card": title, "url": release.get("html_url") or ("https://github.com/" + repository + "/releases/tag/" + latest_tag), "published_at": release.get("published_at")})
                asset = select_asset(current_name, old_tag, release.get("assets", []))
            except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
                skipped_links.append(f"{title}: {current_name} ({exc})")
                return link_match.group(0)
            if not asset:
                skipped_links.append(f"{title}: no unambiguous match for {current_name}")
                return link_match.group(0)
            new_url = asset["browser_download_url"]
            if new_url != unescape(old_url):
                updated_links += 1
                card_updates.append((old_tag, release.get("tag_name")))
            return prefix + new_url + suffix

        body = link_pattern.sub(update_link, body)
        if title.startswith("Nuvio Enhanced ") and card_updates:
            latest_tag = card_updates[0][1]
            body = re.sub(
                r"(<h3>)Nuvio Enhanced\s+[^<]+(</h3>)",
                lambda m: m.group(1) + "Nuvio Enhanced " + latest_tag + m.group(2),
                body,
                count=1,
            )
        if card_updates:
            updated_cards.append(title)
        return opening + body + closing

    result = card_pattern.sub(update_card, document)
    return result, {
        "updated_links": updated_links,
        "updated_cards": updated_cards,
        "skipped_links": skipped_links,
        "repositories_checked": sorted(releases),
        "release_events": list(release_events.values()),
        "card_events": list(card_events.values()),
    }



def update_live_release_news(events, updates_path=UPDATES_PATH, now=None,
                            card_events=(), registry_path=None):
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    try:
        existing = json.loads(updates_path.read_text(encoding="utf-8"))
        if not isinstance(existing, list):
            existing = []
    except (OSError, ValueError):
        existing = []
    active, known_ids = [], set()
    for item in existing:
        if not isinstance(item, dict):
            continue
        item_id = item.get("id")
        try:
            expiry = datetime.fromisoformat(str(item.get("expiresAt", "")).replace("Z", "+00:00"))
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            continue
        if item_id and expiry > now and item_id not in known_ids:
            active.append(item)
            known_ids.add(item_id)

    if registry_path is None:
        registry_path = Path(updates_path).parent / "download-cards-seen.json"
    try:
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        if not isinstance(registry, dict):
            registry = {}
    except (OSError, ValueError):
        registry = {}
    seen_card_ids = set(registry.get("seen_card_ids", []))
    seen_release_ids = set(registry.get("seen_release_ids", []))

    added = 0
    for event in events:
        repository, tag = event.get("repository"), event.get("tag")
        card, url = event.get("card") or repository, event.get("url")
        if not repository or not tag or not isinstance(url, str) or not url.startswith("https://"):
            continue
        card_id = event.get("card_id")
        update_id = ("app:download-release:" + card_id + ":" if card_id else
                     "app:download-release:") + repository + ":" + tag
        legacy_id = "app:download-release:" + repository + ":" + tag
        if update_id in seen_release_ids or update_id in known_ids or legacy_id in known_ids:
            seen_release_ids.add(update_id)
            continue
        active.append({
            "id": update_id,
            "type": "app",
            "title": {
                "ar": "تحديث جديد لتطبيق " + str(card) + ": " + str(tag),
                "en": "New " + str(card) + " app release: " + str(tag),
            },
            "description": {
                "ar": "صدر إصدار جديد من " + str(card) + " برقم " + str(tag) + ". اضغط للتفاصيل.",
                "en": "A new " + str(card) + " release (" + str(tag) + ") is available. Open the release notes for details.",
            },
            "url": url,
            "publishedAt": now.isoformat().replace("+00:00", "Z"),
            "expiresAt": (now + timedelta(hours=24)).isoformat().replace("+00:00", "Z"),
        })
        known_ids.add(update_id)
        seen_release_ids.add(update_id)
        added += 1

    # Persist card identities independently from the 24-hour ticker items.
    for event in card_events:
        card_id = event.get("card_id")
        card, url = event.get("card"), event.get("url")
        if (not card_id or card_id in seen_card_ids or not card
                or not isinstance(url, str) or not url.startswith("https://")):
            continue
        update_id = "app:download-card-added:" + card_id
        if update_id not in known_ids:
            active.append({
                "id": update_id,
                "type": "app",
                "title": {
                    "ar": "إضافة نسخة جديدة إلى مركز التنزيلات: " + str(card),
                    "en": "New download option added: " + str(card),
                },
                "description": {
                    "ar": "أُضيفت " + str(card) + " إلى مركز التنزيلات. اضغط لعرض ملفات التنزيل وتفاصيل الإصدار.",
                    "en": str(card) + " has been added to the download center. Open the release page for downloads and release details.",
                },
                "url": url,
                "publishedAt": now.isoformat().replace("+00:00", "Z"),
                "expiresAt": (now + timedelta(hours=24)).isoformat().replace("+00:00", "Z"),
            })
            known_ids.add(update_id)
            added += 1
        seen_card_ids.add(card_id)

    active.sort(key=lambda item: item.get("publishedAt", ""), reverse=True)
    updates_path.parent.mkdir(parents=True, exist_ok=True)
    updates_path.write_text(json.dumps(active[:50], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    registry_path.write_text(json.dumps({
        "seen_card_ids": sorted(seen_card_ids),
        "seen_release_ids": sorted(seen_release_ids),
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return added


def main():
    if not INDEX_PATH.is_file():
        raise SystemExit("index.html was not found")
    original = INDEX_PATH.read_text(encoding="utf-8")
    updated, report = sync_download_cards(original)
    if updated != original:
        INDEX_PATH.write_text(updated, encoding="utf-8")
    print(f"Release sync checked {len(report['repositories_checked'])} repositories.")
    news_added = update_live_release_news(report["release_events"], card_events=report["card_events"], registry_path=CARD_REGISTRY_PATH)
    print("Updated {} download links across {} cards.".format(report["updated_links"], len(report["updated_cards"])))
    print("Published {} new app release update(s) to the live ticker.".format(news_added))
    for item in report["skipped_links"]:
        print(f"REVIEW REQUIRED: {item}")
    if report["skipped_links"]:
        print(f"Release sync completed with {len(report['skipped_links'])} link(s) left unchanged for safety.")


if __name__ == "__main__":
    main()
