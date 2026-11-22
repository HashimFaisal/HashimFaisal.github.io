import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import check_links


def sample_release():
    suffixes = tuple(check_links.APK_ASSETS.values()) + ("-enhanced-release.ipa",)
    return {
        "tag_name": "1.2.3-beta.1",
        "assets": [
            {"name": f"nuvio-1.2.3-{suffix}", "browser_download_url": f"https://example.invalid/{index}", "size": 1024}
            for index, suffix in enumerate(suffixes)
        ],
    }


class ReleaseCacheTests(unittest.TestCase):
    def test_cache_age_within_freshness_window(self):
        now = check_links.datetime(2026, 11, 22, 12, 0, tzinfo=check_links.timezone.utc)
        cached_at = "2026-11-21T12:00:00Z"
        self.assertEqual(check_links.release_cache_age_seconds(cached_at, now=now), 86400)
        self.assertFalse(check_links.release_cache_is_stale(cached_at, now=now))

    def test_cache_is_fresh_at_exact_72_hour_boundary(self):
        now = check_links.datetime(2026, 11, 22, 12, 0, tzinfo=check_links.timezone.utc)
        cached_at = "2026-11-19T12:00:00Z"
        self.assertEqual(check_links.release_cache_age_seconds(cached_at, now=now), 259200)
        self.assertFalse(check_links.release_cache_is_stale(cached_at, now=now))

    def test_cache_is_stale_after_72_hours(self):
        now = check_links.datetime(2026, 11, 22, 12, 0, tzinfo=check_links.timezone.utc)
        cached_at = "2026-11-19T11:59:59Z"
        self.assertTrue(check_links.release_cache_is_stale(cached_at, now=now))
        self.assertEqual(check_links.release_cache_age_seconds(cached_at, now=now), 259201)

    def test_missing_or_invalid_cache_timestamp_is_stale(self):
        now = check_links.datetime(2026, 11, 22, 12, 0, tzinfo=check_links.timezone.utc)
        for cached_at in (None, "", "not-a-date", "2026-11-22Tbad"):
            with self.subTest(cached_at=cached_at):
                self.assertIsNone(check_links.release_cache_age_seconds(cached_at, now=now))
                self.assertTrue(check_links.release_cache_is_stale(cached_at, now=now))

    def test_future_timestamp_has_zero_age_and_is_not_stale(self):
        now = check_links.datetime(2026, 11, 22, 12, 0, tzinfo=check_links.timezone.utc)
        cached_at = "2026-11-22T12:30:00Z"
        self.assertEqual(check_links.release_cache_age_seconds(cached_at, now=now), 0)
        self.assertFalse(check_links.release_cache_is_stale(cached_at, now=now))

    def test_valid_cache_is_loaded(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "release-cache.json"
            path.write_text(json.dumps({"cached_at": "2026-11-22T00:00:00Z", "release": sample_release()}), encoding="utf-8")
            with patch.object(check_links, "RELEASE_CACHE_PATH", str(path)):
                cache = check_links.load_release_cache()
            self.assertIsNotNone(cache)
            self.assertEqual(cache["release"]["tag_name"], "1.2.3-beta.1")

    def test_missing_asset_rejects_cache(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "release-cache.json"
            release = sample_release()
            release["assets"].pop()
            path.write_text(json.dumps({"release": release}), encoding="utf-8")
            with patch.object(check_links, "RELEASE_CACHE_PATH", str(path)):
                self.assertIsNone(check_links.load_release_cache())

    def test_save_writes_only_complete_https_release(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "release-cache.json"
            with patch.object(check_links, "RELEASE_CACHE_PATH", str(path)):
                self.assertTrue(check_links.save_release_cache(sample_release(), None))
                saved = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual(saved["release"]["tag_name"], "1.2.3-beta.1")
                self.assertFalse(path.with_suffix(".json.tmp").exists())
                incomplete = sample_release()
                incomplete["assets"][0]["browser_download_url"] = "http://insecure.example/file"
                self.assertFalse(check_links.save_release_cache(incomplete, None))


    def test_discover_version_downloads_extracts_card_and_tag(self):
        html = '''
        <article class="version-card">
          <h3>Nuvio Mobile</h3>
          <div class="version-actions">
            <a class="version-download" href="https://github.com/example/app/releases/download/v2.4.0/app.apk">Download APK · ARM64</a>
          </div>
        </article>
        '''
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "index.html"
            path.write_text(html, encoding="utf-8")
            entries, error = check_links.discover_version_downloads(str(path))
        self.assertIsNone(error)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["card"], "Nuvio Mobile")
        self.assertEqual(entries[0]["tag"], "v2.4.0")
        self.assertEqual(entries[0]["label"], "Download APK · ARM64")

    def test_discover_version_downloads_ignores_non_download_source_links(self):
        html = '''
        <article class="version-card">
          <h3>Nuvio TV</h3>
          <a class="version-source" href="https://github.com/example/app/releases">Source</a>
          <a class="version-download" href="https://github.com/example/app/releases/download/1.0/tv.apk">Download</a>
        </article>
        '''
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "index.html"
            path.write_text(html, encoding="utf-8")
            entries, error = check_links.discover_version_downloads(str(path))
        self.assertIsNone(error)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["tag"], "1.0")


if __name__ == "__main__":
    unittest.main()
