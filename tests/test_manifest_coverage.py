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

        self.assertEqual(len(card_names), 33, "Expected all 33 published plugin cards.")
        self.assertEqual(len(card_names), len(set(card_names)), "Duplicate addon cards detected.")
        setup_names = set(check_links.SETUP_PAGES)
        self.assertEqual(len(setup_names), 13, "Expected 13 setup-page health checks.")
        manifest_card_names = set(card_names) - {"AIOMetadata", "TMDB Discover+"} - setup_names
        self.assertEqual(
            manifest_card_names,
            set(check_links.MANIFESTS),
            "Every public-manifest card must have exactly one configured manifest health check.",
        )
        self.assertEqual(
            setup_names,
            set(check_links.SETUP_PAGES),
            "Every setup-only card must have exactly one official setup-page health check.",
        )
        for name, url in check_links.SETUP_PAGES.items():
            self.assertIn(f'data-check="{name}"', html, f"Missing visible health status for {name}.")
            self.assertIn(f'href="{url}"', html, f"Missing official setup link for {name}.")
        self.assertNotIn("AIOMetadata", check_links.MANIFESTS)
        self.assertNotIn("TMDB Discover+", check_links.MANIFESTS)
        self.assertEqual(html.count("يتطلب إعداد API"), 4, "All required personal API cards must clearly require API setup.")
        for name in ("CouchPilot", "Pictorium", "TOP Posters"):
            heading = html.index(f"<h3>{name}</h3>")
            card_start = html.rfind("<article", 0, heading)
            card_end = html.index("</article>", heading)
            card = html[card_start:card_end]
            self.assertIn("setup-api-card", card, f"{name} must use the personal API setup card style.")
            self.assertIn("إعداد API", card, f"{name} must link directly to its setup page.")

    def test_setup_page_check_reports_page_health_without_claiming_a_manifest(self):
        class FakeResponse:
            status = 200
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False
            def read(self, limit):
                return b"<html><title>Example Setup</title></html>"

        with patch.object(check_links, "fetch", return_value=FakeResponse()):
            result = check_links.check_setup_page("Example Setup", "https://example.invalid/configure")

        self.assertTrue(result["ok"])
        self.assertEqual(result["type"], "setup")
        self.assertEqual(result["page_title"], "Example Setup")
        self.assertNotIn("version", result)

    def test_personal_manifest_urls_are_not_published(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        for name in ("AIOMetadata", "TMDB Discover+", "CouchPilot", "Pictorium", "TOP Posters"):
            heading = html.index(f"<h3>{name}</h3>")
            card_start = html.rfind("<article", 0, heading)
            card_end = html.index("</article>", heading)
            card = html[card_start:card_end]
            self.assertNotIn("manifest-url", card)
            self.assertNotIn("PERSONAL MANIFEST URL", card)
        self.assertNotIn("AIOMetadata", check_links.MANIFESTS)
        self.assertNotIn("TMDB Discover+", check_links.MANIFESTS)

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
