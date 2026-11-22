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
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen


INDEX_PATH = Path("index.html")
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


def fetch_latest_release(repository: str):
    request = Request(
        f"https://api.github.com/repos/{repository}/releases?per_page=30",
        headers=API_HEADERS,
    )
    with urlopen(request, timeout=25) as response:
        releases = json.loads(response.read().decode("utf-8"))
    published = [
        item for item in releases
        if isinstance(item, dict) and not item.get("draft")
        and item.get("tag_name") and isinstance(item.get("assets"), list) and item.get("assets")
    ]
    if not published:
        raise ValueError("No published GitHub release with assets was found")

    def is_prerelease(item):
        tag = str(item.get("tag_name") or "").lower()
        marker = re.search(r"(alpha|beta|rc|pre|preview|dev)", tag)
        return bool(item.get("prerelease")) or bool(marker)

    stable = [item for item in published if not is_prerelease(item)]
    candidates = stable or published
    return max(candidates, key=lambda item: item.get("published_at") or "")


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
        "x86": ("x86", "x32"),
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
    return features


def normalized_asset_name(name: str, old_tag: str):
    value = unquote(name).lower()
    for token in (old_tag, old_tag.lstrip("vV")):
        if token:
            value = re.sub(re.escape(token.lower()), " ", value)
    value = re.sub(r"v?\d+(?:\.\d+)+", " ", value)
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

    def update_card(match):
        nonlocal updated_links
        opening, body, closing = match.groups()
        title_match = re.search(r"<h3>([\s\S]*?)</h3>", body)
        title = unescape(re.sub(r"<[^>]+>", "", title_match.group(1))).strip() if title_match else "Unknown card"
        card_updates = []

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
    }


def main():
    if not INDEX_PATH.is_file():
        raise SystemExit("index.html was not found")
    original = INDEX_PATH.read_text(encoding="utf-8")
    updated, report = sync_download_cards(original)
    if updated != original:
        INDEX_PATH.write_text(updated, encoding="utf-8")
    print(f"Release sync checked {len(report['repositories_checked'])} repositories.")
    print(f"Updated {report['updated_links']} download links across {len(report['updated_cards'])} cards.")
    for item in report["skipped_links"]:
        print(f"REVIEW REQUIRED: {item}")
    if report["skipped_links"]:
        print(f"Release sync completed with {len(report['skipped_links'])} link(s) left unchanged for safety.")


if __name__ == "__main__":
    main()
