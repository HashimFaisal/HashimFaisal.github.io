#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime, timezone
from urllib.request import Request, urlopen

REPO = "NuvioMedia/NuvioMobile"
API = f"https://api.github.com/repos/{REPO}/releases/latest"

MANIFESTS = {
    "ALL-IN-ONE": "https://raw.githubusercontent.com/NuvioPlugin/All-in-One-Nuvio/refs/heads/main/manifest.json",
    "CinemaBox": "https://raw.githubusercontent.com/hashimxc12/CinemaBox2/main/manifest.json",
    "Cinemana": "https://raw.githubusercontent.com/hashimxc12/Cinemana_NuvioPlugin/main/manifest.json",
    "OpenSubtitles": "https://opensubtitles-v3.strem.io/manifest.json",
    "Rodrigo's Catalog": "https://digok.github.io/nuvio-catalog/manifest.json",
}

APK_ASSETS = {
    "ARM64": "androidApp-full-arm64-v8a-release.apk",
    "ARMv7": "androidApp-full-armeabi-v7a-release.apk",
    "x86": "androidApp-full-x86-release.apk",
    "x86_64": "androidApp-full-x86_64-release.apk",
}

HEADERS = {
    "User-Agent": "Nuvio-Control-Center/3.0",
    "Accept": "application/vnd.github+json, application/json, */*",
}


def fetch(url, method="GET"):
    request = Request(url, headers=HEADERS, method=method)
    return urlopen(request, timeout=30)


def check_manifest(name, url):
    try:
        with fetch(url) as response:
            body = response.read(2 * 1024 * 1024 + 1)
            if len(body) > 2 * 1024 * 1024:
                raise ValueError("Manifest exceeds 2 MiB")

            payload = json.loads(body.decode("utf-8-sig"))
            if not isinstance(payload, dict):
                raise ValueError("JSON root is not an object")

            return {
                "name": name,
                "type": "manifest",
                "ok": True,
                "http_status": response.status,
                "version": str(payload.get("version", "not specified")),
                "manifest_id": str(payload.get("id", "not specified")),
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
            with urlopen(request, timeout=30) as response:
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


def main():
    results = [
        check_manifest(name, url)
        for name, url in MANIFESTS.items()
    ]

    release = None
    release_error = None

    try:
        with fetch(API) as response:
            release = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        release_error = str(exc)

    release_data = None

    if release:
        tag = release.get("tag_name", "unknown")
        assets = {
            item.get("name"): item
            for item in release.get("assets", [])
        }

        release_data = {
            "tag": tag,
            "name": release.get("name") or tag,
            "published_at": release.get("published_at"),
            "html_url": release.get("html_url"),
            "assets": [],
        }

        expected = dict(APK_ASSETS)

        ipa_names = sorted(
            name for name in assets
            if name and name.startswith("nuvio-")
            and name.endswith("-full-release.ipa")
        )

        if ipa_names:
            expected["iOS IPA"] = ipa_names[0]
        else:
            expected["iOS IPA"] = None

        for label, filename in expected.items():
            asset = assets.get(filename) if filename else None

            if asset:
                entry = {
                    "label": label,
                    "name": filename,
                    "size_bytes": asset.get("size"),
                    "download_url": asset.get("browser_download_url"),
                    "ok": True,
                }
                results.append(check_download(label, asset))
            else:
                entry = {
                    "label": label,
                    "name": filename or "IPA asset not found",
                    "ok": False,
                    "error": "Asset not found in latest release",
                }
                results.append({
                    "name": label,
                    "type": "download",
                    "ok": False,
                    "error": "Asset not found in latest release",
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

    passed = sum(1 for item in results if item["ok"])

    report = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "ok": passed == len(results),
        "passed": passed,
        "total": len(results),
        "release": release_data,
        "release_error": release_error,
        "checks": results,
    }

    os.makedirs("data", exist_ok=True)
    with open("data/status.json", "w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)
        file.write("\n")

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
