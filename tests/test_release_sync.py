import unittest
import tempfile
from pathlib import Path

from scripts.check_links import discover_version_downloads

from scripts.sync_download_releases import (
    github_release_source,
    select_asset,
    sync_download_cards,
)


class ReleaseSyncTests(unittest.TestCase):
    def test_inventory_includes_links_from_every_download_card(self):
        html = (
            '<article class="downloads-device-card"><h3>Phone</h3>'
            '<a class="downloads-device-link" href="https://github.com/a/b/releases/download/v1/phone.apk">APK</a>'
            '</article>'
            '<article class="downloads-device-card"><h3>TV</h3>'
            '<a class="downloads-device-link" href="https://github.com/c/d/releases/download/v2/tv.apk">APK</a>'
            '<a class="downloads-device-link" href="https://github.com/c/d/releases/download/v2/tv-arm64.apk">ARM64</a>'
            '</article>'
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "index.html"
            path.write_text(html, encoding="utf-8")
            entries, error = discover_version_downloads(path)
        self.assertIsNone(error)
        self.assertEqual(len(entries), 3)
        self.assertEqual({entry["card"] for entry in entries}, {"Phone", "TV"})

    def test_github_release_source_extracts_repository_tag_and_filename(self):
        self.assertEqual(
            github_release_source(
                "https://github.com/example/project/releases/download/v2.0.0/app-v2.0.0-arm64.apk"
            ),
            ("example/project", "v2.0.0", "app-v2.0.0-arm64.apk"),
        )

    def test_asset_matching_keeps_architecture_and_variant(self):
        assets = [
            {
                "name": "Nuvio-2.1.0-android-lite-arm64.apk",
                "browser_download_url": "https://github.com/example/project/releases/download/v2.1.0/Nuvio-2.1.0-android-lite-arm64.apk",
            },
            {
                "name": "Nuvio-2.1.0-android-lite-armv7.apk",
                "browser_download_url": "https://github.com/example/project/releases/download/v2.1.0/Nuvio-2.1.0-android-lite-armv7.apk",
            },
        ]
        selected = select_asset("Nuvio-2.0.8-android-lite-arm64.apk", "v2.0.8", assets)
        self.assertEqual(selected["name"], assets[0]["name"])

    def test_sync_updates_all_matching_links_without_changing_card_layout(self):
        document = (
            '<article class="downloads-device-card plugin-card">'
            '<h3>Example App</h3>'
            '<small class="downloads-device-status">Checking</small>'
            '<div class="downloads-device-actions">'
            '<a class="downloads-device-link" href="https://github.com/example/project/releases/download/v1.0.0/app-v1.0.0-arm64.apk">ARM64</a>'
            '</div></article>'
        )
        release = {
            "tag_name": "v1.1.0",
            "assets": [{
                "name": "app-v1.1.0-arm64.apk",
                "browser_download_url": "https://github.com/example/project/releases/download/v1.1.0/app-v1.1.0-arm64.apk",
            }],
        }
        updated, report = sync_download_cards(document, lambda repository: release)
        self.assertIn(release["assets"][0]["browser_download_url"], updated)
        self.assertIn('<h3>Example App</h3>', updated)
        self.assertIn('class="downloads-device-status"', updated)
        self.assertEqual(report["updated_links"], 1)
        self.assertEqual(report["repositories_checked"], ["example/project"])

    def test_ambiguous_or_missing_asset_is_left_unchanged(self):
        original = (
            '<article class="downloads-device-card plugin-card">'
            '<h3>Example App</h3>'
            '<a class="downloads-device-link" href="https://github.com/example/project/releases/download/v1.0.0/app-v1.0.0-arm64.apk">ARM64</a>'
            '</article>'
        )
        updated, report = sync_download_cards(original, lambda repository: {
            "tag_name": "v1.1.0",
            "assets": [{
                "name": "different-file-arm64.apk",
                "browser_download_url": "https://github.com/example/project/releases/download/v1.1.0/different-file-arm64.apk",
            }],
        })
        self.assertEqual(updated, original)
        self.assertEqual(report["updated_links"], 0)
        self.assertEqual(len(report["skipped_links"]), 1)


if __name__ == "__main__":
    unittest.main()
