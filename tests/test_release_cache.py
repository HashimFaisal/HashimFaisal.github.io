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


if __name__ == "__main__":
    unittest.main()
