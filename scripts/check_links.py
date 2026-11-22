#!/usr/bin/env python3
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse, urlencode, quote

REPO = "luqmanfadlli/NuvioMobile-Enhanced"
API = f"https://api.github.com/repos/{REPO}/releases?per_page=100"

MANIFESTS = {
    "ALL-IN-ONE": "https://raw.githubusercontent.com/NuvioPlugin/All-in-One-Nuvio/refs/heads/main/manifest.json",
    "CinemaBox": "https://raw.githubusercontent.com/HashimFaisal/CinemaBox2/main/manifest.json",
    "Cinemana": "https://raw.githubusercontent.com/HashimFaisal/Cinemana_NuvioPlugin/main/manifest.json",
    "Torrentio": "https://torrentio.strem.fun/manifest.json",
    "OpenSubtitles": "https://opensubtitles-v3.strem.io/manifest.json",
    "TheSubtitleDB": "https://api.thesubtitledb.org/integrations/stremio/manifest.json",
    "SubtitleVideo": "https://subtitlevideo.com/stremio/en,ar/manifest.json",
    "Rodrigo's Catalog": "https://digok.github.io/nuvio-catalog/manifest.json",
    "Cinemeta": "https://v3-cinemeta.strem.io/manifest.json",
    "Nuvio Catalog": "https://catalog.nuvio.tv/manifest.json",
    "The Movie Database Addon": "https://tmdb.elfhosted.com/manifest.json",
    "İzlemeli Catalog": "https://izlemeli.github.io/nuvio/en/manifest.json",
    "IMDb Popular": "https://imdb-popular-stremio.vercel.app/manifest.json",
    "My Lists": "https://mylistsaddon.com/manifest.json",
    "Ratings Aggregator": "https://rating-aggregator.elfhosted.com/manifest.json",
    "AIOMetadata": "https://aiometadata.elfhosted.com/stremio/c6520fa9-2205-4058-baf9-d9e8e45a4711/manifest.json",
    "TMDB Discover+": "https://tmdb-discover-plus.elfhosted.com/yMUI42Fodl/manifest.json",
    "Anime Kitsu": "https://anime-kitsu.strem.fun/manifest.json",
    "IMDb Ratings": "https://imdbratings.kgenovz.com/manifest.json",
    "BetterPosters for Nuvio": "https://nuvio-better-posters.nuvio-better-posters-addon.workers.dev/eyJ2ZXJzaW9uIjoxLCJ1cHN0cmVhbXMiOlsiaHR0cHM6Ly92My1jaW5lbWV0YS5zdHJlbS5pby9tYW5pZmVzdC5qc29uIl19/manifest.json",
}

APK_ASSETS = {
    "ARM64": "-arm64-v8a-release.apk",
    "ARMv7": "-armeabi-v7a-release.apk",
    "x86": "-x86-release.apk",
    "x86_64": "-x86_64-release.apk",
}

HEADERS = {
    "User-Agent": "Nuvio-Control-Center/3.0",
    "Accept": "application/vnd.github+json, application/json, */*",
    "Cache-Control": "no-cache, no-store, max-age=0",
    "Pragma": "no-cache",
}


def fetch(url, method="GET", retries=2, backoff_seconds=0.5, extra_headers=None):
    """Retry transient network/upstream failures with bounded exponential backoff."""
    request_headers = {**HEADERS, **(extra_headers or {})}
    token = os.environ.get("GITHUB_TOKEN")
    if token and urlparse(url).hostname == "api.github.com":
        request_headers["Authorization"] = f"Bearer {token}"
    request = Request(url, headers=request_headers, method=method)
    for attempt in range(retries + 1):
        try:
            response = urlopen(request, timeout=20)
            if response.status >= 500 and attempt < retries:
                response.close()
                time.sleep(min(backoff_seconds * (2 ** attempt), 3))
                continue
            return response
        except HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt >= retries:
                raise
            retry_after = exc.headers.get("Retry-After") if exc.headers else None
            try:
                delay = min(float(retry_after), 3) if retry_after else min(backoff_seconds * (2 ** attempt), 3)
            except (TypeError, ValueError):
                delay = min(backoff_seconds * (2 ** attempt), 3)
            exc.close()
            time.sleep(delay)
        except (URLError, TimeoutError):
            if attempt >= retries:
                raise
            time.sleep(min(backoff_seconds * (2 ** attempt), 3))
    raise RuntimeError("Fetch retry loop exhausted")



def check_manifest(name, url):
    try:
        # Bypass stale intermediary caches when checking live manifests.
        cache_busted_url = url + ("&" if "?" in url else "?") + "_health_check=" + str(time.time_ns())
        with fetch(cache_busted_url) as response:
            body = response.read(2 * 1024 * 1024 + 1)
            if len(body) > 2 * 1024 * 1024:
                raise ValueError("Manifest exceeds 2 MiB")

            payload = json.loads(body.decode("utf-8-sig"))
            if not isinstance(payload, dict):
                raise ValueError("JSON root is not an object")

            version = payload.get("version")
            if not isinstance(version, str) or not version.strip():
                raise ValueError("Manifest field 'version' must be a non-empty string")

            for field in ("id", "name", "description"):
                value = payload.get(field)
                if value is not None and not isinstance(value, str):
                    raise ValueError(f"Manifest field '{field}' must be a string")

            for field in ("resources", "types", "catalogs"):
                value = payload.get(field)
                if value is not None and not isinstance(value, list):
                    raise ValueError(f"Manifest field '{field}' must be an array")

            behavior_hints = payload.get("behaviorHints")
            if behavior_hints is not None and not isinstance(behavior_hints, dict):
                raise ValueError("Manifest field 'behaviorHints' must be an object")

            return {
                "name": name,
                "type": "manifest",
                "ok": True,
                "http_status": response.status,
                "version": version.strip(),
                "manifest_id": str(payload.get("id", "not specified")),
                "url": url,
            }
    except HTTPError as exc:
        # Preserve the upstream HTTP response so diagnostics can distinguish
        # missing manifests, access blocks, rate limits, and server outages.
        return {
            "name": name,
            "type": "manifest",
            "ok": False,
            "http_status": exc.code,
            "error": f"HTTP {exc.code}: {exc.reason}",
            "url": url,
        }
    except Exception as exc:
        return {
            "name": name,
            "type": "manifest",
            "ok": False,
            "error": str(exc),
            "url": url,
        }



# Active source probes use one well-known movie fixture. Only response counts and
# classifications are stored; candidate media URLs are deliberately discarded.
TEST_MOVIE_ID = "tt0133093"
TEST_MOVIE_TITLE = "The Matrix"
CINEMETA_BASE = "https://v3-cinemeta.strem.io"
CINEMABOX_API = "https://cinema.albox.co/api/v4/"
CINEMANA_API = "https://cinemana.shabakaty.cc/api/android/"
CINEMANA_HEALTH = CINEMANA_API + "healthCheck"
ALL_IN_ONE_MANIFEST = MANIFESTS["ALL-IN-ONE"]
ALL_IN_ONE_REPO = "https://raw.githubusercontent.com/NuvioPlugin/All-in-One-Nuvio/main/"

SOURCE_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_text(url, extra_headers=None, max_bytes=2 * 1024 * 1024):
    with fetch(url, extra_headers=extra_headers) as response:
        body = response.read(max_bytes + 1)
        if len(body) > max_bytes:
            raise ValueError("Response exceeds configured size limit")
        return body.decode("utf-8-sig"), response.status


def fetch_json(url, extra_headers=None):
    body, status = fetch_text(url, extra_headers=extra_headers)
    try:
        payload = json.loads(body)
    except ValueError as exc:
        raise ValueError("Invalid JSON response: " + str(exc)) from exc
    if not isinstance(payload, (dict, list)):
        raise ValueError("JSON response root must be an object or array")
    return payload, status


def source_check(name, ok, **details):
    return {"name": name, "type": "stream", "ok": bool(ok), **details}


def normalized_source_title(value):
    value = str(value or "").lower()
    value = re.sub(r"[أإآ]", "ا", value)
    value = re.sub(r"ة", "ه", value)
    value = re.sub(r"ى", "ي", value)
    return " ".join(re.findall(r"[a-z0-9\u0600-\u06ff]+", value))


def source_title_score(left, right):
    a = set(normalized_source_title(left).split())
    b = set(normalized_source_title(right).split())
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return (2 * len(a & b)) / (len(a) + len(b))


def check_torrentio_stream():
    url = "https://torrentio.strem.fun/stream/movie/" + TEST_MOVIE_ID + ".json"
    try:
        payload, status = fetch_json(url)
        streams = payload.get("streams") if isinstance(payload, dict) else None
        if not isinstance(streams, list):
            raise ValueError("Torrentio response does not contain a streams array")
        count = sum(1 for item in streams if isinstance(item, dict))
        return source_check(
            "Torrentio", count > 0, http_status=status, test_title=TEST_MOVIE_TITLE,
            probe_status="streams_found" if count else "no_streams",
            stream_count=count,
            error=None if count else "Torrentio returned no stream candidates for the test movie.",
        )
    except HTTPError as exc:
        return source_check("Torrentio", False, http_status=exc.code, test_title=TEST_MOVIE_TITLE, error="HTTP " + str(exc.code) + ": " + str(exc.reason))
    except Exception as exc:
        return source_check("Torrentio", False, test_title=TEST_MOVIE_TITLE, error=str(exc))


def check_cinemabox_stream():
    headers = {**SOURCE_HEADERS, "Referer": "https://cinema.albox.co/", "Origin": "https://cinema.albox.co"}
    probe_stage = "metadata"
    try:
        meta_payload, _ = fetch_json(CINEMETA_BASE + "/meta/movie/" + TEST_MOVIE_ID + ".json", extra_headers=headers)
        meta = meta_payload.get("meta") if isinstance(meta_payload, dict) else None
        if not isinstance(meta, dict) or not meta.get("name"):
            raise ValueError("Cinemeta did not return movie metadata for the test fixture")

        search_url = CINEMABOX_API + "search?" + urlencode({
            "page_size": 25, "page_number": 1, "term": meta["name"]
        })
        probe_stage = "catalog_search"
        search_payload, search_status = fetch_json(search_url, extra_headers=headers)
        candidates = search_payload.get("results", []) if isinstance(search_payload, dict) else []
        candidates = [
            item for item in candidates
            if isinstance(item, dict)
            and str(item.get("type", "")).upper() in {"MOVIE", "FILM"}
        ]
        best = max(candidates, key=lambda item: source_title_score(meta["name"], item.get("title")), default=None)
        if not best or source_title_score(meta["name"], best.get("title")) < 0.70:
            return source_check(
                "CinemaBox", True, http_status=search_status, test_title=TEST_MOVIE_TITLE,
                probe_status="inconclusive", stream_count=0,
                error="CinemaBox API responded, but the test title was not found in its catalogue.",
            )

        item_id = best.get("id")
        if item_id is None:
            raise ValueError("CinemaBox search result has no item ID")
        probe_stage = "show_details"
        details, _ = fetch_json(CINEMABOX_API + "shows/shows/dynamic/" + quote(str(item_id), safe=""), extra_headers=headers)
        post = details.get("post_info") if isinstance(details, dict) else None
        episode_id = post.get("episode_id") if isinstance(post, dict) else None
        if episode_id is None:
            raise ValueError("CinemaBox matched the title but returned no playable episode ID")

        probe_stage = "player"
        player, player_status = fetch_json(CINEMABOX_API + "shows/episodes/player/" + quote(str(episode_id), safe=""), extra_headers=headers)
        videos = player.get("videos", []) if isinstance(player, dict) else []
        count = sum(
            1 for item in videos
            if isinstance(item, dict) and isinstance(item.get("url"), str)
            and item["url"].startswith(("https://", "http://"))
        ) if isinstance(videos, list) else 0
        return source_check(
            "CinemaBox", count > 0, http_status=player_status, test_title=TEST_MOVIE_TITLE,
            probe_status="streams_found" if count else "no_streams", stream_count=count,
            probe_stage=probe_stage,
            error=None if count else "CinemaBox found the test title but its player returned no usable stream URLs.",
        )
    except HTTPError as exc:
        return source_check("CinemaBox", False, http_status=exc.code, test_title=TEST_MOVIE_TITLE,
            probe_stage=probe_stage, error="HTTP " + str(exc.code) + ": " + str(exc.reason))
    except Exception as exc:
        return source_check("CinemaBox", False, test_title=TEST_MOVIE_TITLE,
            probe_stage=probe_stage, error=str(exc))


def payload_list(payload, keys=("data", "results", "videos", "items", "list")):
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    for key in keys:
        if isinstance(payload.get(key), list):
            return payload[key]
    nested = payload.get("data")
    if isinstance(nested, dict):
        for key in keys:
            if isinstance(nested.get(key), list):
                return nested[key]
    return []


def payload_object(payload):
    if not isinstance(payload, dict):
        return None
    nested = payload.get("data")
    return nested if isinstance(nested, dict) else payload


def source_video_id(item):
    if not isinstance(item, dict):
        return None
    for key in ("nb", "videoNb", "id"):
        value = item.get(key)
        if value is not None and str(value).strip():
            return str(value)
    return None


def check_cinemana_stream():
    headers = {
        **SOURCE_HEADERS,
        "Referer": "https://cinemana.shabakaty.cc/",
        "Origin": "https://cinemana.shabakaty.cc",
    }
    try:
        try:
            _, health_status = fetch_text(CINEMANA_HEALTH, extra_headers=headers)
        except Exception as host_error:
            # Compare with a neutral control endpoint to separate a target-host
            # outage/block from a wider runner connectivity problem.
            try:
                fetch_text("https://api.github.com/zen", extra_headers=SOURCE_HEADERS)
                return source_check(
                    "Cinemana", True, test_title=TEST_MOVIE_TITLE,
                    probe_status="inconclusive",
                    reason_code="network_specific_provider",
                    verification_scope="Earthlink user network",
                    error="Cinemana could not be verified from the GitHub monitoring region. The user reports that Cinemana is tied to Earthlink; verify it from that network before assigning a health status. Runner error: " + str(host_error),
                )
            except Exception as control_error:
                return source_check(
                    "Cinemana", False, test_title=TEST_MOVIE_TITLE,
                    probe_status="network_unclear",
                    error="Cinemana and the independent control endpoint both failed: " + str(host_error) + "; " + str(control_error),
                )
        meta_payload, _ = fetch_json(CINEMETA_BASE + "/meta/movie/" + TEST_MOVIE_ID + ".json", extra_headers=headers)
        meta = meta_payload.get("meta") if isinstance(meta_payload, dict) else None
        if not isinstance(meta, dict) or not meta.get("name"):
            raise ValueError("Cinemeta did not return movie metadata for the test fixture")

        search_url = CINEMANA_API + "AdvancedSearch?" + urlencode({
            "level": 0, "page": 0, "type": "movies", "videoTitle": meta["name"]
        })
        search_payload, search_status = fetch_json(search_url, extra_headers=headers)
        candidates = payload_list(search_payload)
        imdb_match = None
        title_match = None
        for item in candidates:
            if not isinstance(item, dict):
                continue
            raw_imdb = str(item.get("imdbUrlRef") or item.get("imdb_url_ref") or "")
            found_id = re.search(r"tt\d+", raw_imdb, re.IGNORECASE)
            if found_id and found_id.group(0).lower() == TEST_MOVIE_ID.lower():
                imdb_match = item
                break
            titles = [item.get(key) for key in ("enTitle", "arTitle", "title", "name", "englishTitle", "arabicTitle")]
            if any(source_title_score(meta["name"], title) >= 0.90 for title in titles if title):
                title_match = item
        found = imdb_match or title_match
        if not found:
            return source_check(
                "Cinemana", True, http_status=search_status, test_title=TEST_MOVIE_TITLE,
                probe_status="inconclusive", stream_count=0,
                error="Cinemana API responded, but the test title was not found in its catalogue.",
                host_health_status=health_status,
            )

        found_id = source_video_id(found)
        if not found_id:
            raise ValueError("Cinemana search result has no video ID")
        details_payload, _ = fetch_json(CINEMANA_API + "allVideoInfo/id/" + quote(found_id, safe=""), extra_headers=headers)
        details = payload_object(details_payload)
        video_id = source_video_id(details) or found_id
        files_url = CINEMANA_API + "transcodedFiles/id/" + quote(video_id, safe="")
        try:
            files_payload, files_status = fetch_json(files_url, extra_headers=headers)
        except Exception:
            # Keep the compatibility fallback used by the add-on itself.
            files_payload, files_status = fetch_json(CINEMANA_API + "transcoddedFiles/id/" + quote(video_id, safe=""), extra_headers=headers)
        files = payload_list(files_payload)
        count = sum(
            1 for item in files
            if isinstance(item, dict)
            and isinstance(item.get("videoUrl") or item.get("url"), str)
            and str(item.get("videoUrl") or item.get("url")).startswith(("https://", "http://", "//"))
        )
        return source_check(
            "Cinemana", count > 0, http_status=files_status, test_title=TEST_MOVIE_TITLE,
            probe_status="streams_found" if count else "no_streams", stream_count=count,
            error=None if count else "Cinemana found the test title but returned no usable transcoded video URLs.",
            host_health_status=health_status,
        )
    except HTTPError as exc:
        return source_check("Cinemana", False, http_status=exc.code, test_title=TEST_MOVIE_TITLE, error="HTTP " + str(exc.code) + ": " + str(exc.reason))
    except Exception as exc:
        return source_check("Cinemana", False, test_title=TEST_MOVIE_TITLE, error=str(exc))


def check_allinone_provider_bundle():
    try:
        manifest, status = fetch_json(ALL_IN_ONE_MANIFEST)
        scrapers = manifest.get("scrapers") if isinstance(manifest, dict) else None
        if not isinstance(scrapers, list):
            raise ValueError("ALL-IN-ONE manifest has no scrapers array")
        enabled = [
            item for item in scrapers
            if isinstance(item, dict) and item.get("enabled") is True
            and isinstance(item.get("filename"), str)
            and item["filename"].startswith("providers/")
            and item["filename"].endswith(".js")
            and ".." not in item["filename"].split("/")
        ]
        if not enabled:
            raise ValueError("ALL-IN-ONE manifest has no enabled provider source files")

        samples = enabled[:3]
        available = []
        failures = []
        for item in samples:
            path = item["filename"]
            url = ALL_IN_ONE_REPO + path
            try:
                with fetch(url, method="HEAD") as response:
                    if response.status < 400:
                        available.append(path)
                    else:
                        failures.append(path)
            except HTTPError as exc:
                if exc.code in (405, 501):
                    try:
                        with fetch(url) as response:
                            response.read(1)
                            available.append(path)
                    except Exception:
                        failures.append(path)
                else:
                    failures.append(path)
            except Exception:
                failures.append(path)

        ok = len(available) == len(samples)
        return {
            "name": "ALL-IN-ONE provider bundle",
            "type": "provider_bundle",
            "ok": ok,
            "http_status": status,
            "enabled_provider_count": len(enabled),
            "sampled_provider_files": [item["filename"] for item in samples],
            "available_provider_files": available,
            "failed_provider_files": failures,
            "probe_status": "bundle_files_available" if ok else "provider_files_missing",
            "note": "Checks registry integrity and sample source-file availability; actual scraper execution requires the Nuvio app runtime.",
            "error": None if ok else "One or more sampled provider source files could not be fetched.",
        }
    except HTTPError as exc:
        return {
            "name": "ALL-IN-ONE provider bundle", "type": "provider_bundle",
            "ok": False, "http_status": exc.code, "error": "HTTP " + str(exc.code) + ": " + str(exc.reason),
        }
    except Exception as exc:
        return {
            "name": "ALL-IN-ONE provider bundle", "type": "provider_bundle",
            "ok": False, "error": str(exc),
        }


SOURCE_PROBES = (
    check_torrentio_stream,
    check_cinemabox_stream,
    check_cinemana_stream,
    check_allinone_provider_bundle,
)

def check_download(name, asset):
    url = asset["browser_download_url"]
    size = asset.get("size")

    try:
        with fetch(url, "HEAD") as response:
            return {
                "name": name,
                "type": "download",
                "ok": response.status < 400,
                "http_status": response.status,
                "size_bytes": size,
                "url": url,
            }
    except Exception as head_error:
        try:
            request = Request(
                url,
                headers={**HEADERS, "Range": "bytes=0-0"},
                method="GET",
            )
            with urlopen(request, timeout=20) as response:
                response.read(1)
                return {
                    "name": name,
                    "type": "download",
                    "ok": response.status < 400,
                    "http_status": response.status,
                    "size_bytes": size,
                    "url": url,
                }
        except Exception as exc:
            return {
                "name": name,
                "type": "download",
                "ok": False,
                "size_bytes": size,
                "error": f"HEAD: {head_error}; GET: {exc}",
                "url": url,
            }



RELEASE_CACHE_PATH = "data/release-cache.json"
REQUIRED_RELEASE_ASSETS = tuple(APK_ASSETS.values()) + ("-enhanced-release.ipa",)
RELEASE_CACHE_MAX_AGE_SECONDS = 72 * 60 * 60


def release_cache_age_seconds(cached_at, now=None):
    if not isinstance(cached_at, str) or not cached_at.strip():
        return None
    try:
        cached_dt = datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
        if cached_dt.tzinfo is None:
            cached_dt = cached_dt.replace(tzinfo=timezone.utc)
        current_dt = now or datetime.now(timezone.utc)
        if current_dt.tzinfo is None:
            current_dt = current_dt.replace(tzinfo=timezone.utc)
        return max(0, int((current_dt - cached_dt).total_seconds()))
    except (TypeError, ValueError, OverflowError):
        return None


def release_cache_is_stale(cached_at, now=None):
    age = release_cache_age_seconds(cached_at, now=now)
    return age is None or age > RELEASE_CACHE_MAX_AGE_SECONDS


def normalize_http_status(value):
    """Return a valid HTTP status integer, accepting digit-only strings safely."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        status = value
    elif isinstance(value, str) and value.strip().isdigit():
        try:
            status = int(value.strip())
        except (TypeError, ValueError, OverflowError):
            return None
    else:
        return None
    return status if 100 <= status <= 599 else None


def diagnose_check(item):
    """Attach a stable failure code and actionable hint to an unsuccessful health check."""
    if item.get("probe_status") == "inconclusive":
        return {
            "failure_code": "test_title_not_indexed",
            "failure_category": "content_coverage",
            "severity": "info",
            "recommended_action": "The provider endpoint responded, but the test title was not indexed; this result is inconclusive about other titles.",
        }
    if item.get("probe_status") == "no_streams":
        return {
            "failure_code": "no_streams_found",
            "failure_category": "stream_retrieval",
            "severity": "warning",
            "recommended_action": "The provider responded but returned no playable candidates for the known test title; verify its catalogue, region restrictions, and player API.",
        }
    if item.get("probe_status") == "upstream_unreachable_internet_ok":
        return {
            "failure_code": "upstream_host_unreachable",
            "failure_category": "upstream",
            "severity": "warning",
            "recommended_action": "The control endpoint is reachable but this provider host is not; the host may be down or inaccessible from the monitoring region. Confirm from the user's network before calling it a local ISP block.",
        }
    if item.get("probe_status") == "network_unclear":
        return {
            "failure_code": "network_connectivity_unclear",
            "failure_category": "network",
            "severity": "warning",
            "recommended_action": "Both the provider and independent control endpoint failed from the monitoring runner; retry before attributing the issue to the provider.",
        }
    if item.get("type") == "provider_bundle" and not item.get("ok"):
        return {
            "failure_code": "provider_source_file_missing",
            "failure_category": "provider_bundle",
            "severity": "warning",
            "recommended_action": "Check the ALL-IN-ONE repository manifest and sampled provider source-file paths.",
        }
    if item.get("ok"):
        return {
            "failure_code": "healthy",
            "failure_category": "healthy",
            "severity": "info",
            "recommended_action": "No action required.",
        }

    status = normalize_http_status(item.get("http_status"))
    error = str(item.get("error") or "").lower()
    check_type = item.get("type", "unknown")
    name = item.get("name", "Unknown")

    if status in (425, 429) or "rate limit" in error or "too many requests" in error:
        code, category, action = (
            "rate_limited", "rate_limit",
            "Wait for the API rate limit to reset; avoid repeated retries."
        )
    elif status in (408, 504) or any(term in error for term in ("timed out", "timeout")):
        code, category, action = (
            "timeout", "network",
            "Retry after a short delay; check network reachability if persistent."
        )
    elif status in (401, 403) or "unauthorized" in error or "forbidden" in error:
        code, category, action = (
            "access_denied", "access",
            "Verify access permissions or token configuration."
        )
    elif status == 404 or "not found" in error:
        code, category, action = (
            "not_found", "missing_resource",
            "Confirm the resource URL, release tag, or asset name."
        )
    elif status is not None and status >= 500:
        code, category, action = (
            "upstream_server_error", "upstream",
            "Retry later and check the upstream service status."
        )
    elif any(term in error for term in ("timed out", "timeout")):
        code, category, action = (
            "timeout", "network",
            "Retry after a short delay; check network reachability if persistent."
        )
    elif any(term in error for term in ("dns", "name or service", "name resolution", "getaddrinfo")):
        code, category, action = (
            "dns_failure", "network",
            "Check DNS resolution and network connectivity."
        )
    elif any(term in error for term in (
        "connection refused", "connection reset", "network is unreachable",
        "no route to host", "remote end closed connection",
        "failed to establish a new connection",
    )):
        code, category, action = (
            "connection_failed", "network",
            "Check whether the upstream host is reachable and accepting HTTPS connections."
        )
    elif any(term in error for term in ("ssl", "tls", "certificate")):
        code, category, action = (
            "tls_failure", "network",
            "Check HTTPS/TLS connectivity and certificate validity."
        )
    elif any(term in error for term in ("json", "decode", "manifest field", "must be")):
        code, category, action = (
            "invalid_response", "data_validation",
            "Inspect the returned payload for malformed JSON or an unexpected schema."
        )
    elif check_type == "release":
        code, category, action = (
            "release_lookup_failed", "release",
            "Check the releases API and confirm a published beta release exists."
        )
    elif check_type == "download":
        code, category, action = (
            "download_check_failed", "download",
            "Verify the release asset exists and its download URL responds."
        )
    else:
        code, category, action = (
            "check_failed", "unknown",
            "Inspect the check error and retry once the cause is corrected."
        )

    return {
        "failure_code": code,
        "failure_category": category,
        "severity": "warning",
        "recommended_action": action,
    }


def build_diagnostic_summary(results):
    failures = [item for item in results if not item.get("ok")]
    if not failures:
        return "All checks are healthy."
    counts = {}
    for item in failures:
        category = item.get("failure_category", "unknown")
        counts[category] = counts.get(category, 0) + 1
    categories = ", ".join(
        f"{count} {category}" for category, count in sorted(counts.items())
    )
    return f"{len(failures)} failure(s): categories {categories}."


def build_change_summary(events):
    """Summarize only evidence-backed changes detected against the previous report."""
    counts = {}
    for event in events:
        event_type = event.get("type", "unknown")
        counts[event_type] = counts.get(event_type, 0) + 1
    return {
        "count": len(events),
        "by_type": dict(sorted(counts.items())),
        "events": events,
    }


def normalize_resource_key(value):
    """Create a stable comparison key without changing the displayed resource name."""
    if not isinstance(value, str):
        return ""
    return " ".join(value.split()).casefold()


def build_risk_forecast(results, previous_report=None, history=None):
    """Score current evidence and compare it with the prior report to show risk trends."""
    previous_report = previous_report if isinstance(previous_report, dict) else {}
    history = history if isinstance(history, list) else []
    previous_checks_data = previous_report.get("checks")
    previous_checks_data = previous_checks_data if isinstance(previous_checks_data, list) else []
    previous_checks = {
        normalize_resource_key(item.get("name")): item for item in previous_checks_data
        if isinstance(item, dict) and normalize_resource_key(item.get("name"))
    }
    previous_forecast = previous_report.get("risk_forecast")
    previous_risks_data = previous_forecast.get("risks") if isinstance(previous_forecast, dict) else []
    previous_risks_data = previous_risks_data if isinstance(previous_risks_data, list) else []
    previous_risks = {
        normalize_resource_key(item.get("resource")): item for item in previous_risks_data
        if isinstance(item, dict) and normalize_resource_key(item.get("resource"))
    }
    results = results if isinstance(results, list) else []
    failure_items = [item for item in results if isinstance(item, dict) and not item.get("ok")]
    ignored_result_count = sum(1 for item in results if not isinstance(item, dict))
    risks = []
    # Duplicate failed checks for one resource should not inflate risk totals.
    seen_failed_resources = set()
    duplicate_failure_count = 0
    for item in failure_items:
        raw_name = item.get("name")
        name = raw_name.strip() if isinstance(raw_name, str) and raw_name.strip() else "Unknown"
        resource_key = normalize_resource_key(name)
        if resource_key in seen_failed_resources:
            duplicate_failure_count += 1
            continue
        seen_failed_resources.add(resource_key)
        diagnostic = diagnose_check(item)
        prior = previous_checks.get(resource_key, {})
        repeated = not prior.get("ok") and bool(prior)
        matching_events = []
        seen_event_signatures = set()
        for event in history[-100:]:
            if not (
                isinstance(event, dict) and normalize_resource_key(event.get("source")) == resource_key
                and event.get("type") == "status" and event.get("new_status") == "unavailable"
            ):
                continue
            signature = json.dumps(event, sort_keys=True, separators=(",", ":"), default=str)
            if signature in seen_event_signatures:
                continue
            seen_event_signatures.add(signature)
            matching_events.append(event)
        components = {
            "current_failure": 45 if diagnostic.get("severity") == "warning" else 35,
            "consecutive_failure": 25 if repeated else 0,
            "outage_history": min(20, 5 * len(matching_events)),
        }
        score = min(100, sum(components.values()))
        level = "high" if score >= 70 else "medium" if score >= 40 else "low"
        signals = ["current_check_failed"] + (["consecutive_failure"] if repeated else []) + (["recurring_outage_history"] if matching_events else [])
        confidence = "high" if len(signals) >= 3 else "medium" if len(signals) == 2 else "low"
        risks.append({
            "resource": name,
            "score": score,
            "level": level,
            "score_breakdown": components,
            "signals": signals,
            "confidence": confidence,
            "confidence_basis": "Number of distinct evidence signals; not predictive accuracy.",
            "confidence_details": (
                f"{confidence.capitalize()} confidence from {len(signals)} distinct signal(s): "
                + ", ".join(signals) + "."
            ),
            "evidence_count": len(matching_events),
            "recommended_action": diagnostic.get("recommended_action", "Review current check evidence."),
        })
    cache_stale = bool(previous_report.get("release_cache_stale"))
    if cache_stale:
        risks.append({
            "resource": "Release cache",
            "score": 55,
            "level": "medium",
            "signals": ["previous_report_cache_stale"],
            "score_breakdown": {"previous_report_cache_stale": 55},
            "confidence": "low",
            "confidence_basis": "One evidence signal; not predictive accuracy.",
            "confidence_details": "Low confidence from one signal: previous_report_cache_stale.",
            "evidence_count": 0,
            "recommended_action": "Verify release API connectivity and cache freshness.",
        })

    trend_counts = {"new": 0, "worsening": 0, "improving": 0, "stable": 0, "baseline": 0}
    def valid_prior_score(value):
        return isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 100
    comparable = {
        normalize_resource_key(risk["resource"]): previous_risks[normalize_resource_key(risk["resource"])]["score"]
        for risk in risks
        if normalize_resource_key(risk["resource"]) in previous_risks
        and valid_prior_score(previous_risks[normalize_resource_key(risk["resource"])].get("score"))
    }
    matched_previous_total = sum(comparable.values())
    comparable_current_total = sum(risk["score"] for risk in risks if normalize_resource_key(risk["resource"]) in comparable)
    for risk in risks:
        prior_risk = previous_risks.get(normalize_resource_key(risk["resource"]))
        raw_prior_score = prior_risk.get("score") if isinstance(prior_risk, dict) else None
        if prior_risk is None:
            trend, prior_score, delta = "new", None, None
            basis = "No matching risk in the previous forecast; baseline for trend comparison."
        elif not valid_prior_score(raw_prior_score):
            trend, prior_score, delta = "baseline", None, None
            basis = "Previous score missing or invalid; trend is withheld until comparable evidence exists."
        else:
            prior_score = raw_prior_score
            delta = risk["score"] - prior_score
            trend = "worsening" if delta > 0 else "improving" if delta < 0 else "stable"
            basis = "Score compared with the immediately previous saved risk forecast."
        risk["previous_score"] = prior_score
        risk["score_delta"] = delta
        risk["trend"] = trend
        risk["trend_basis"] = basis
        trend_counts[trend] += 1

    current_names = {normalize_resource_key(risk["resource"]) for risk in risks}
    resolved = sorted(
        previous_risks[key].get("resource", key)
        for key in previous_risks if key not in current_names
    )
    high = sum(1 for risk in risks if risk["level"] == "high")
    medium = sum(1 for risk in risks if risk["level"] == "medium")
    overall = "high" if high else "medium" if medium else "low"
    has_comparable_risks = bool(comparable)
    trend_status = "baseline" if not has_comparable_risks else (
        "worsening" if comparable_current_total > matched_previous_total else
        "improving" if comparable_current_total < matched_previous_total else "stable"
    )
    return {
        "status": "attention" if risks else "healthy",
        "integrity": {
            "input_result_count": len(results),
            "evaluated_failure_count": len(failure_items) - duplicate_failure_count,
            "ignored_malformed_result_count": ignored_result_count,
            "duplicate_failure_count": duplicate_failure_count,
            "history_window_size": min(100, len(history)),
            "history_evidence_deduplicated": True,
        },
        "overall_level": overall,
        "risk_count": len(risks),
        "high_risk_count": high,
        "medium_risk_count": medium,
        "risks": risks,
        "trend_summary": {
            "status": trend_status,
            "previous_total_score": matched_previous_total if has_comparable_risks else None,
            "current_total_score": comparable_current_total if has_comparable_risks else None,
            "total_score_delta": comparable_current_total - matched_previous_total if has_comparable_risks else None,
            "new_count": trend_counts["new"],
            "worsening_count": trend_counts["worsening"],
            "improving_count": trend_counts["improving"],
            "stable_count": trend_counts["stable"],
            "baseline_count": trend_counts["baseline"],
            "resolved_resources": resolved,
            "basis": "Comparison of risks with valid numeric prior scores only; resolved and incomparable risks are excluded from trend totals. Not a statistical prediction.",
        },
        "note": "Evidence-based risk indicators, not certainty or a statistical prediction.",
    }

def build_proactive_alerts(report):
    """Produce concise early-warning items from measured health data only."""
    alerts = []
    for item in report.get("diagnostics", []):
        category = item.get("failure_category", "unknown")
        severity = "high" if category in {"access", "data_validation", "release", "download", "missing_resource"} else "medium"
        alerts.append({
            "severity": severity,
            "code": item.get("failure_code", "check_failed"),
            "resource": item.get("name", "Unknown"),
            "message": item.get("error") or item.get("recommended_action", "Check reported issue."),
            "recommended_action": item.get("recommended_action", "Inspect the check and retry after addressing its cause."),
        })
    if report.get("release_cache_stale"):
        alerts.append({
            "severity": "medium",
            "code": "release_cache_stale",
            "resource": "Release cache",
            "message": "Cached release data is older than the freshness threshold or has an invalid timestamp.",
            "recommended_action": "Confirm the release API is reachable; stale fallback links remain available while checking.",
        })
    if not alerts:
        return {"status": "healthy", "alert_count": 0, "alerts": [], "summary": "No proactive warnings; all measured checks are healthy."}
    high_count = sum(1 for alert in alerts if alert["severity"] == "high")
    status = "critical" if high_count else "attention"
    return {
        "status": status,
        "alert_count": len(alerts),
        "alerts": alerts,
        "summary": f"{len(alerts)} warning(s) detected; {high_count} high-priority.",
    }


def load_release_cache():
    try:
        with open(RELEASE_CACHE_PATH, "r", encoding="utf-8") as cache_file:
            cache = json.load(cache_file)
        release = cache.get("release") if isinstance(cache, dict) else None
        assets = release.get("assets") if isinstance(release, dict) else None
        if not isinstance(release, dict) or not isinstance(assets, list):
            return None
        names = [item.get("name", "") for item in assets if isinstance(item, dict)]
        urls = [item.get("browser_download_url", "") for item in assets if isinstance(item, dict)]
        if not release.get("tag_name") or not all(
            any(name.endswith(suffix) for name in names) for suffix in REQUIRED_RELEASE_ASSETS
        ):
            return None
        if not all(url.startswith("https://") for url in urls if url):
            return None
        for suffix in REQUIRED_RELEASE_ASSETS:
            asset = next((item for item in assets if isinstance(item, dict) and item.get("name", "").endswith(suffix)), None)
            if not asset or not isinstance(asset.get("browser_download_url"), str) or not asset["browser_download_url"].startswith("https://"):
                return None
        return cache
    except (OSError, ValueError, TypeError):
        return None


def save_release_cache(release, stable_release):
    if not isinstance(release, dict) or not isinstance(release.get("assets"), list):
        return False
    cache = {"cached_at": datetime.now(timezone.utc).isoformat(), "release": release, "stable_release": stable_release}
    # Only replace a good snapshot with a release containing every expected download.
    try:
        for suffix in REQUIRED_RELEASE_ASSETS:
            asset = next((item for item in release["assets"] if isinstance(item, dict) and item.get("name", "").endswith(suffix)), None)
            if not asset or not isinstance(asset.get("browser_download_url"), str) or not asset["browser_download_url"].startswith("https://"):
                return False
        os.makedirs("data", exist_ok=True)
        temp_path = RELEASE_CACHE_PATH + ".tmp"
        with open(temp_path, "w", encoding="utf-8") as file:
            json.dump(cache, file, ensure_ascii=False, indent=2)
            file.write("\n")
        os.replace(temp_path, RELEASE_CACHE_PATH)
        return True
    except (OSError, TypeError, ValueError):
        return False

def main():
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(
            lambda entry: check_manifest(*entry),
            MANIFESTS.items(),
        ))
        source_results = list(executor.map(lambda probe: probe(), SOURCE_PROBES))
    results.extend(source_results)

    release = None
    stable_release = None
    release_error = None

    try:
        with fetch(API) as response:
            releases = json.loads(response.read().decode("utf-8"))

        if not isinstance(releases, list):
            raise ValueError("GitHub releases response is not a list")

        def is_prerelease(item):
            tag = (item.get("tag_name") or "").strip().lower()
            tag_marker = bool(re.search(
                r"(?:^|[._-])(alpha|beta|rc|pre|preview|dev)(?:[._-].*|\d.*)?$",
                tag,
            ))
            return bool(item.get("prerelease")) or tag_marker

        published_releases = [
            item for item in releases
            if isinstance(item, dict) and not item.get("draft")
        ]

        beta_releases = [
            item for item in published_releases
            if is_prerelease(item)
        ]

        stable_releases = [
            item for item in published_releases
            if not is_prerelease(item)
        ]

        if stable_releases:
            stable_release = max(
                stable_releases,
                key=lambda item: item.get("published_at") or "",
            )

        if not beta_releases:
            raise ValueError("No published prerelease was found")

        release = max(
            beta_releases,
            key=lambda item: item.get("published_at") or "",
        )

    except Exception as exc:
        release_error = str(exc)

    release_fetch_succeeded = release is not None
    release_fallback_used = False
    release_cache_timestamp = None
    release_cache_age = None
    release_cache_stale = False
    if release is None:
        cached = load_release_cache()
        if cached:
            release = cached.get("release")
            stable_release = cached.get("stable_release")
            release_cache_timestamp = cached.get("cached_at")
            release_cache_age = release_cache_age_seconds(release_cache_timestamp)
            release_cache_stale = release_cache_is_stale(release_cache_timestamp)
            release_fallback_used = bool(release)

    # Add an explicit beta-release health check so a failed release lookup
    # cannot leave the overall report looking fully healthy.
    results.append({
        "name": "Nuvio beta release",
        "type": "release",
        "ok": release_fetch_succeeded,
        "tag": (release or {}).get("tag_name"),
        "error": release_error,
    })

    stable_release_data = None

    if stable_release:
        stable_tag = stable_release.get("tag_name", "unknown")
        stable_release_data = {
            "tag": stable_tag,
            "app_version": stable_tag,
            "name": stable_release.get("name") or stable_tag,
            "published_at": stable_release.get("published_at"),
            "html_url": stable_release.get("html_url"),
        }

    release_data = None

    if release:
        tag = release.get("tag_name", "unknown")
        assets = {
            item.get("name"): item
            for item in release.get("assets", [])
        }

        release_data = {
            "tag": tag,
            "app_version": tag[:-5] if tag.endswith("-beta") else tag,
            "name": release.get("name") or tag,
            "published_at": release.get("published_at"),
            "html_url": release.get("html_url"),
            "assets": [],
        }

        expected = {
            label: next(
                (name for name in assets if name and name.endswith(suffix)),
                None,
            )
            for label, suffix in APK_ASSETS.items()
        }

        ipa_names = sorted(
            name for name in assets
            if name and name.startswith("nuvio-")
            and name.endswith("-enhanced-release.ipa")
        )

        expected["iOS IPA"] = ipa_names[0] if ipa_names else None

        download_targets = [
            (label, assets[filename])
            for label, filename in expected.items()
            if filename and filename in assets
        ]
        with ThreadPoolExecutor(max_workers=4) as executor:
            download_checks = dict(zip(
                (label for label, _ in download_targets),
                executor.map(
                    lambda target: check_download(*target),
                    download_targets,
                ),
            ))

        for label, filename in expected.items():
            asset = assets.get(filename) if filename else None

            if asset:
                entry = {
                    "label": label,
                    "name": filename,
                    "size_bytes": asset.get("size"),
                    "uploaded_at": asset.get("created_at"),
                    "download_url": asset.get("browser_download_url"),
                    "ok": True,
                }
                download_check = download_checks[label]
                entry["ok"] = download_check["ok"]
                if not download_check["ok"]:
                    entry["error"] = download_check.get(
                        "error", "Download URL check failed"
                    )
                else:
                    entry.pop("error", None)

                results.append(download_check)
            else:
                entry = {
                    "label": label,
                    "name": filename or "IPA asset not found",
                    "ok": False,
                    "error": "Asset not found in selected Beta release",
                }
                results.append({
                    "name": label,
                    "type": "download",
                    "ok": False,
                    "error": "Asset not found in selected Beta release",
                })

            release_data["assets"].append(entry)

    else:
        for label in list(APK_ASSETS) + ["iOS IPA"]:
            results.append({
                "name": label,
                "type": "download",
                "ok": False,
                "error": release_error or "Release unavailable",
            })

    if release_fetch_succeeded and release_data and len(release_data.get("assets", [])) == 5 and all(asset.get("ok") for asset in release_data["assets"]):
        save_release_cache(release, stable_release)

    for item in results:
        item.update(diagnose_check(item))
    diagnostic_summary = build_diagnostic_summary(results)

    passed = sum(1 for item in results if item["ok"])

    report = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "ok": passed == len(results),
        "passed": passed,
        "total": len(results),
        "manifest_coverage": {
            "configured": len(MANIFESTS),
            "healthy": sum(1 for item in results if item.get("type") == "manifest" and item.get("ok")),
            "failed": sum(1 for item in results if item.get("type") == "manifest" and not item.get("ok")),
        },
        "source_retrieval": {
            "tested": sum(1 for item in results if item.get("type") == "stream"),
            "streams_found": sum(1 for item in results if item.get("type") == "stream" and item.get("probe_status") == "streams_found"),
            "inconclusive": sum(1 for item in results if item.get("type") == "stream" and item.get("probe_status") == "inconclusive"),
            "failed": sum(1 for item in results if item.get("type") == "stream" and not item.get("ok")),
            "stream_checks": [item for item in results if item.get("type") == "stream"],
            "provider_bundle": next((item for item in results if item.get("type") == "provider_bundle"), None),
            "note": "Stream URLs are counted but never stored. ALL-IN-ONE provider files are integrity-checked; scraper execution requires the Nuvio app runtime.",
        },
        "release": release_data,
        "stable_release": stable_release_data,
        "release_error": release_error,
        "release_fallback_used": release_fallback_used,
        "release_cache_timestamp": release_cache_timestamp,
        "release_cache_age_seconds": release_cache_age,
        "release_cache_stale": release_cache_stale,
        "diagnostic_summary": diagnostic_summary,
        "failure_categories": sorted(set(
            item["failure_category"] for item in results if not item["ok"]
        )),
        "diagnostics": [item for item in results if not item["ok"]],
        "checks": results,
    }


    history_path = "data/changelog.json"
    previous_report = {}
    history = []

    try:
        with open("data/status.json", "r", encoding="utf-8") as previous_file:
            previous_report = json.load(previous_file)
    except (OSError, ValueError):
        previous_report = {}

    try:
        with open(history_path, "r", encoding="utf-8") as history_file:
            loaded = json.load(history_file)
            if isinstance(loaded, list):
                history = loaded
    except (OSError, ValueError):
        history = []

    old_manifests = {
        item.get("name"): item
        for item in previous_report.get("checks", [])
        if item.get("type") == "manifest"
    }

    now = datetime.now(timezone.utc).isoformat()
    events = []

    for item in results:
        if item.get("type") != "manifest":
            continue

        name = item.get("name", "Unknown")
        previous = old_manifests.get(name)

        if previous is None:
            # Report newly discovered sources only when the manifest is validated.
            if item.get("ok"):
                events.append({
                    "date": now,
                    "type": "added",
                    "title": f"إضافة مصدر جديد: {name}",
                    "detail": "تم إدراج Manifest والتحقق من استجابته وصحة بنيته.",
                    "source": name,
                    "source_url": item.get("url"),
                    "new_version": item.get("version")
                })
            continue

        if bool(previous.get("ok")) != bool(item.get("ok")):
            old_status = "available" if previous.get("ok") else "unavailable"
            new_status = "available" if item.get("ok") else "unavailable"
            old_label = "متاح" if previous.get("ok") else "متعطل"
            new_label = "متاح" if item.get("ok") else "متعطل"
            events.append({
                "date": now,
                "type": "status",
                "title": f"تغيرت حالة {name}",
                "detail": f"الحالة السابقة: {old_label}. الحالة الجديدة: {new_label}.",
                "source": name,
                "source_url": item.get("url"),
                "old_status": old_status,
                "new_status": new_status,
            })

        old_version = previous.get("version")
        new_version = item.get("version")
        # Do not record version changes from failed/incomplete checks.
        if previous.get("ok") and item.get("ok") and old_version and new_version and old_version != new_version:
            events.append({
                "date": now,
                "type": "version",
                "title": f"تحديث إصدار {name}",
                "detail": f"من {old_version} إلى {new_version}.",
                "source": name,
                "source_url": item.get("url"),
                "old_version": old_version,
                "new_version": new_version
            })

    old_tag = (previous_report.get("release") or {}).get("tag")
    new_tag = (release_data or {}).get("tag")
    if new_tag and old_tag and new_tag != old_tag:
        events.append({
            "date": now,
            "type": "release",
            "channel": "beta",
            "title": f"صدور تحديث Nuvio: {new_tag}",
            "detail": f"الإصدار السابق كان {old_tag}.",
            "source": "Nuvio App",
            "source_url": (release_data or {}).get("html_url"),
            "old_version": old_tag,
            "new_version": new_tag
        })

    old_stable_tag = (previous_report.get("stable_release") or {}).get("tag")
    new_stable_tag = (stable_release_data or {}).get("tag")
    if new_stable_tag and old_stable_tag and new_stable_tag != old_stable_tag:
        events.append({
            "date": now,
            "type": "release",
            "channel": "stable",
            "title": f"صدور إصدار مستقر من Nuvio: {new_stable_tag}",
            "detail": f"الإصدار المستقر السابق كان {old_stable_tag}.",
            "source": "Nuvio App",
            "source_url": (stable_release_data or {}).get("html_url"),
            "old_version": old_stable_tag,
            "new_version": new_stable_tag
        })

    if not history and not events:
        events.append({
            "date": now,
            "type": "system",
            "title": "بدء سجل التغييرات",
            "detail": "تم تفعيل سجل التغييرات الآلي في لوحة التحكم."
        })

    # Load the live feed and retain only unexpired entries.
    updates_path = "data/updates.json"
    updates = []

    try:
        with open(updates_path, "r", encoding="utf-8") as updates_file:
            loaded_updates = json.load(updates_file)
            if isinstance(loaded_updates, list):
                updates = loaded_updates
    except (OSError, ValueError):
        updates = []

    now_dt = datetime.now(timezone.utc)
    active_updates = []
    active_update_ids = set()

    for update in updates:
        if not isinstance(update, dict):
            continue
        update_id = update.get("id")
        if not isinstance(update_id, str) or not update_id.strip() or update_id in active_update_ids:
            continue
        raw_expiry = update.get("expiresAt")
        if not isinstance(raw_expiry, str) or not raw_expiry.strip():
            continue

        try:
            expiry = datetime.fromisoformat(
                raw_expiry.replace("Z", "+00:00")
            )
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if expiry > now_dt:
                active_updates.append(update)
                active_update_ids.add(update_id)
        except (TypeError, ValueError):
            continue

    updates = active_updates

    # Convert real source changes into bilingual live news.
    known_ids = {item.get("id") for item in updates if isinstance(item, dict)}

    for event in history + events:
        if not isinstance(event, dict):
            continue
        event_type = event.get("type")
        source = event.get("source")
        version = event.get("new_version")
        source_url = event.get("source_url")

        if event_type == "release":
            if not version or str(version).lower() == "not specified":
                continue
            channel = event.get("channel", "beta")
            category = "app"

            if channel == "stable":
                title_ar = f"إصدار مستقر جديد من Nuvio: {version}"
                title_en = f"New Nuvio stable release: {version}"
                desc_ar = f"أصبح الإصدار المستقر من Nuvio {version} متاحاً."
                desc_en = f"Nuvio stable version {version} is now available."
            else:
                title_ar = f"نسخة تجريبية جديدة من Nuvio: {version}"
                title_en = f"New Nuvio beta release: {version}"
                desc_ar = f"أصبحت النسخة التجريبية من Nuvio {version} متاحة للتجربة."
                desc_en = f"Nuvio beta version {version} is now available for testing."

            update_id = f"app:release:{channel}:{version}"

        elif event_type == "status":
            if (
                not source
                or not isinstance(source_url, str)
                or not source_url.startswith("https://")
                or event.get("new_status") not in {"available", "unavailable"}
            ):
                continue

            category = "addon"
            if event.get("new_status") == "available":
                title_ar = f"عاد المصدر للعمل: {source}"
                title_en = f"Source is back online: {source}"
                desc_ar = f"عاد {source} للاستجابة بنجاح بعد أن كان متعطلاً."
                desc_en = f"{source} is responding successfully again after an outage."
            else:
                title_ar = f"تعطل المصدر: {source}"
                title_en = f"Source is unavailable: {source}"
                desc_ar = f"فشل فحص {source} بعد أن كان متاحاً."
                desc_en = f"{source} failed its health check after being available."

            update_id = (
                f"addon:{source}:status:"
                f"{event.get('old_status')}-to-{event.get('new_status')}:"
                f"{event.get('date', now)}"
            )

        elif event_type in {"added", "version"}:
            if not source or not isinstance(source_url, str) or not source_url.startswith("https://"):
                continue

            category = "addon"

            if event_type == "added":
                # Do not announce the initial baseline as a new discovery.
                if not previous_report.get("checks"):
                    continue
                has_version = bool(version) and str(version).lower() != "not specified"
                version_label_ar = str(version) if has_version else "غير محدد"
                version_label_en = str(version) if has_version else "not specified"
                title_ar = f"مصدر جديد: {source}"
                title_en = f"New source: {source}"
                desc_ar = f"تمت إضافة {source} إلى مصادر Nuvio. الإصدار: {version_label_ar}."
                desc_en = f"{source} has been added to Nuvio sources. Version: {version_label_en}."
                update_id = f"{category}:{source}:added:{version if has_version else 'not-specified'}"
            else:
                old_version = event.get("old_version")
                if (
                    not old_version or str(old_version).lower() == "not specified"
                    or not version or str(version).lower() == "not specified"
                ):
                    continue
                title_ar = f"تحديث {source} إلى الإصدار {version}"
                title_en = f"{source} updated to version {version}"
                desc_ar = f"تم تحديث الإصدار من {old_version} إلى {version}."
                desc_en = f"Updated from version {old_version} to {version}."
                update_id = f"{category}:{source}:version:{version}"
        else:
            continue

        if not isinstance(source_url, str) or not source_url.startswith("https://"):
            continue
        if update_id in known_ids:
            continue

        try:
            published = datetime.fromisoformat(
                event.get("date", now).replace("Z", "+00:00")
            )
            if published.tzinfo is None:
                published = published.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            published = now_dt

        expires = published + timedelta(hours=24)
        if expires <= now_dt:
            continue
        updates.append({
            "id": update_id,
            "type": category,
            "title": {"ar": title_ar, "en": title_en},
            "description": {"ar": desc_ar, "en": desc_en},
            "url": source_url,
            "publishedAt": published.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "expiresAt": expires.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        })
        known_ids.add(update_id)

    updates.sort(key=lambda item: item.get("publishedAt", ""), reverse=True)
    updates = updates[:50]

    os.makedirs("data", exist_ok=True)
    with open(updates_path, "w", encoding="utf-8") as updates_file:
        json.dump(updates, updates_file, ensure_ascii=False, indent=2)
        updates_file.write("\n")

    # Deduplicate repeated transitions by their stable event identity.
    def event_key(event):
        return (
            event.get("type"),
            event.get("channel"),
            event.get("source"),
            event.get("old_version"),
            event.get("new_version"),
            event.get("old_status"),
            event.get("new_status"),
            event.get("title"),
        )

    seen_events = {event_key(item) for item in history if isinstance(item, dict)}
    unique_events = []
    for event in events:
        key = event_key(event)
        if key in seen_events:
            continue
        seen_events.add(key)
        unique_events.append(event)

    history.extend(unique_events)
    history = history[-100:]
    report["change_summary"] = build_change_summary(unique_events)
    report["change_count"] = len(unique_events)
    report["proactive_monitoring"] = build_proactive_alerts(report)
    report["risk_forecast"] = build_risk_forecast(results, previous_report, history)

    os.makedirs("data", exist_ok=True)

    with open("data/status.json", "w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)
        file.write("\n")

    with open(history_path, "w", encoding="utf-8") as history_file:
        json.dump(history, history_file, ensure_ascii=False, indent=2)
        history_file.write("\n")

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as file:
            file.write("# Nuvio Control Center — Health Report\n\n")
            file.write(f"**Result:** {passed}/{len(results)} checks passed\n\n")

            if release_data:
                file.write(
                    f"**Latest release:** [{release_data['tag']}]"
                    f"({release_data['html_url']})\n\n"
                )

            file.write("| Resource | Type | Status | HTTP |\n")
            file.write("|---|---|---|---:|\n")
            for item in results:
                state = "PASS" if item["ok"] else "FAIL"
                file.write(
                    f"| {item['name']} | {item['type']} | {state} | "
                    f"{item.get('http_status', '—')} |\n"
                )

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
