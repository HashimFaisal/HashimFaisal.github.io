import unittest
from datetime import datetime, timezone
import tempfile
from pathlib import Path

from scripts.check_links import discover_version_downloads

from scripts.sync_download_releases import (
    github_release_source,
    normalize_card_id,
    select_asset,
    sync_download_cards,
    update_live_release_news,
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
        self.assertEqual(len(report["release_events"]), 1)
        self.assertEqual(report["release_events"][0]["tag"], "v1.1.0")
        self.assertEqual(report["release_events"][0]["card_id"], "example-app")
        self.assertEqual(report["card_events"][0]["card_id"], "example-app")

    def test_new_download_app_release_is_published_once_to_live_ticker(self):
        with tempfile.TemporaryDirectory() as directory:
            updates_path = Path(directory) / "updates.json"
            now = datetime(2026, 11, 22, 12, 0, tzinfo=timezone.utc)
            event = {"card_id": "example-app", "repository": "example/project", "tag": "v2.0.0", "card": "Example App", "url": "https://github.com/example/project/releases/tag/v2.0.0"}
            registry_path = Path(directory) / "download-cards-seen.json"\n            added = update_live_release_news([event], updates_path, now, registry_path=registry_path)
            self.assertEqual(added, 1)
            data = __import__("json").loads(updates_path.read_text(encoding="utf-8"))
            self.assertEqual(len(data), 1)
            self.assertEqual(data[0]["id"], "app:download-release:example-app:example/project:v2.0.0")
            self.assertEqual(data[0]["title"]["ar"], "تحديث جديد لتطبيق Example App: v2.0.0")
            self.assertEqual(data[0]["url"], event["url"])
            added_again = update_live_release_news([event], updates_path, now)
            self.assertEqual(added_again, 0)
            data_again = __import__("json").loads(updates_path.read_text(encoding="utf-8"))
            self.assertEqual(len(data_again), 1)

    def test_new_download_cards_are_announced_once_and_registry_outlives_news(self):
        with tempfile.TemporaryDirectory() as directory:
            updates_path = Path(directory) / "updates.json"
            registry_path = Path(directory) / "download-cards-seen.json"
            now = datetime(2026, 11, 22, 12, 0, tzinfo=timezone.utc)
            cards = [
                {"card_id": "nuvio-tv", "card": "Nuvio TV", "url": "https://github.com/NuvioMedia/NuvioTV/releases/tag/1.1.1"},
                {"card_id": "nuvio-native-legacy-tizen", "card": "Nuvio Native Legacy · Tizen", "url": "https://github.com/iqui27/nuvio-native-legacy/releases/tag/v2.0.8"},
                {"card_id": "nuvio-native-legacy-webos", "card": "Nuvio Native Legacy · webOS", "url": "https://github.com/iqui27/nuvio-native-legacy/releases/tag/v2.0.8"},
            ]
            added = update_live_release_news([], updates_path, now, cards, registry_path)
            self.assertEqual(added, 3)
            data = __import__("json").loads(updates_path.read_text(encoding="utf-8"))
            self.assertEqual({item["id"] for item in data}, {
                "app:download-card-added:nuvio-tv",
                "app:download-card-added:nuvio-native-legacy-tizen",
                "app:download-card-added:nuvio-native-legacy-webos",
            })
            self.assertEqual(data[0]["title"]["ar"], "إضافة نسخة جديدة إلى مركز التنزيلات: Nuvio TV")
            later = now.replace(day=24)
            added_again = update_live_release_news([], updates_path, later, cards, registry_path)
            self.assertEqual(added_again, 0)
            self.assertEqual(__import__("json").loads(updates_path.read_text(encoding="utf-8")), [])

    def test_release_news_are_unique_per_card_even_when_cards_share_repository(self):
        with tempfile.TemporaryDirectory() as directory:
            updates_path = Path(directory) / "updates.json"
            events = [
                {"card_id": "legacy-tizen", "repository": "example/project", "tag": "v3", "card": "Legacy Tizen", "url": "https://github.com/example/project/releases/tag/v3"},
                {"card_id": "legacy-webos", "repository": "example/project", "tag": "v3", "card": "Legacy webOS", "url": "https://github.com/example/project/releases/tag/v3"},
            ]
            added = update_live_release_news(events, updates_path, datetime(2026, 11, 22, 12, 0, tzinfo=timezone.utc))
            self.assertEqual(added, 2)
            data = __import__("json").loads(updates_path.read_text(encoding="utf-8"))
            self.assertEqual(len(data), 2)
            self.assertNotEqual(data[0]["id"], data[1]["id"])

    def test_card_identity_ignores_version_suffix(self):
        self.assertEqual(normalize_card_id("Nuvio Enhanced 1.0.0"), "nuvio-enhanced")
        self.assertEqual(normalize_card_id("Nuvio Enhanced 2.0.0-beta.3"), "nuvio-enhanced")

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
