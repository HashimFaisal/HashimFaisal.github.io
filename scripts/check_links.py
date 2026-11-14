#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

MANIFESTS = {
    "CinemaBox": "https://raw.githubusercontent.com/hashimxc12/CinemaBox2/main/manifest.json",
    "Cinemana": "https://raw.githubusercontent.com/hashimxc12/Cinemana_NuvioPlugin/main/manifest.json",
    "OpenSubtitles": "https://opensubtitles-v3.strem.io/manifest.json",
    "Rodrigo's Catalog": "https://digok.github.io/nuvio-catalog/manifest.json",
}

APKS = {
    "ARM64": "https://github.com/NuvioMedia/NuvioMobile/releases/latest/download/androidApp-full-arm64-v8a-release.apk",
    "ARMv7": "https://github.com/NuvioMedia/NuvioMobile/releases/latest/download/androidApp-full-armeabi-v7a-release.apk",
    "x86": "https://github.com/NuvioMedia/NuvioMobile/releases/latest/download/androidApp-full-x86-release.apk",
    "x86_64": "https://github.com/NuvioMedia/NuvioMobile/releases/latest/download/androidApp-full-x86_64-release.apk",
}

HEADERS = {
    "User-Agent": "NuvioHub-LinkHealth/1.0",
    "Accept": "application/json,*/*"
}

def check_manifest(name, url):
    req = Request(url, headers=HEADERS)
    try:
        with urlopen(req, timeout=30) as response:
            body = response.read(2 * 1024 * 1024 + 1)
            status = response.status
            host = urlparse(response.geturl()).netloc

        if len(body) > 2 * 1024 * 1024:
            raise ValueError("Manifest exceeds 2 MiB")

        payload = json.loads(body.decode("utf-8-sig"))

        if not isinstance(payload, dict):
            raise ValueError("JSON root is not an object")

        return {
            "name": name,
            "type": "manifest",
            "ok": True,
            "http_status": status,
            "version": str(payload.get("version", "not specified")),
            "manifest_id": str(payload.get("id", "not specified")),
            "final_host": host,
            "url": url
        }

    except (HTTPError, URLError, TimeoutError, UnicodeDecodeError, ValueError) as exc:
        return {
            "name": name,
            "type": "manifest",
            "ok": False,
            "http_status": getattr(exc, "code", None),
            "error": str(exc),
            "url": url
        }

def check_apk(name, url):
    req = Request(url, headers=HEADERS, method="HEAD")
    try:
        with urlopen(req, timeout=30) as response:
            return {
                "name": name,
                "type": "apk",
                "ok": response.status < 400,
                "http_status": response.status,
                "final_host": urlparse(response.geturl()).netloc,
                "content_type": response.headers.get("Content-Type", "unknown"),
                "url": url
            }

    except (HTTPError, URLError, TimeoutError) as exc:
        return {
            "name": name,
            "type": "apk",
            "ok": False,
            "http_status": getattr(exc, "code", None),
            "error": str(exc),
            "url": url
        }

def main():
    results = [
        check_manifest(name, url)
        for name, url in MANIFESTS.items()
    ]

    results += [
        check_apk(name, url)
        for name, url in APKS.items()
    ]

    passed = sum(item["ok"] for item in results)

    report = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "ok": passed == len(results),
        "passed": passed,
        "total": len(results),
        "checks": results
    }

    os.makedirs("data", exist_ok=True)

    with open("data/status.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        f.write("\n")

    summary = os.environ.get("GITHUB_STEP_SUMMARY")

    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write("# Nuvio Hub — Link Health\n\n")
            f.write("**Result:** {}/{} checks passed\n\n".format(
                passed, len(results)
            ))
            f.write("| Resource | Type | Status | HTTP | Details |\n")
            f.write("|---|---|---|---:|---|\n")

            for item in results:
                state = "PASS" if item["ok"] else "FAIL"
                detail = (
                    item.get("version")
                    or item.get("final_host")
                    or item.get("error", "")
                )
                f.write("| {} | {} | {} | {} | {} |\n".format(
                    item["name"],
                    item["type"],
                    state,
                    item.get("http_status") or "—",
                    detail
                ))

    print(json.dumps(report, ensure_ascii=False, indent=2))

    return 0 if report["ok"] else 1

if __name__ == "__main__":
    sys.exit(main())
