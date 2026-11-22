import io
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_links


class ManifestCoverageTests(unittest.TestCase):
    def test_public_manifest_cards_have_health_checks_and_personal_cards_require_setup(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        card_names = []
        pattern = re.compile(
            r'<article class="plugin-card[^"]*" data-category="([^"]+)"'
            r'[\s\S]*?<h3>([\s\S]*?)</h3>[\s\S]*?</article>'
        )
        for match in pattern.finditer(html):
            name = re.sub(r"<[^>]+>", "", match.group(2)).strip()
            card_names.append("OpenSubtitles" if name == "OpenSubtitles v3" else name)

        self.assertEqual(len(card_names), 20, "Expected all 20 published plugin cards.")
        self.assertEqual(
            set(card_names) - {"AIOMetadata", "TMDB Discover+"},
            set(check_links.MANIFESTS),
            "Every public-manifest card must have exactly one configured health check.",
        )
        self.assertNotIn("AIOMetadata", check_links.MANIFESTS)
        self.assertNotIn("TMDB Discover+", check_links.MANIFESTS)
        self.assertIn("يتطلب إعداداً شخصياً", html)

    def test_personal_manifest_tokens_are_not_published(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        checker = (ROOT / "scripts/check_links.py").read_text(encoding="utf-8")
        for token in ("c6520fa9-2205-4058-baf9-d9e8e45a4711", "yMUI42Fodl"):
            self.assertNotIn(token, html)
            self.assertNotIn(token, checker)

    def test_manifest_http_errors_keep_the_status_code(self):
        error = HTTPError(
            "https://example.invalid/manifest.json",
            503,
            "Service Unavailable",
            {},
            io.BytesIO(b""),
        )
        with patch.object(check_links, "fetch", side_effect=error):
            result = check_links.check_manifest("Example", "https://example.invalid/manifest.json")

        self.assertFalse(result["ok"])
        self.assertEqual(result["http_status"], 503)
        self.assertEqual(check_links.diagnose_check(result)["failure_code"], "upstream_server_error")

    def test_connection_refusal_is_classified_as_network_failure(self):
        result = check_links.diagnose_check({
            "name": "Example",
            "type": "manifest",
            "ok": False,
            "error": "Connection refused",
        })
        self.assertEqual(result["failure_code"], "connection_failed")
        self.assertEqual(result["failure_category"], "network")


if __name__ == "__main__":
    unittest.main()
