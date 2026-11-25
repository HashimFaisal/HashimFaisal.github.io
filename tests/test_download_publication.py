import re
import unittest
from pathlib import Path


class DownloadPublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = Path("index.html").read_text(encoding="utf-8")
        cls.cards = re.findall(
            r'<article class="[^"]*\bdownloads-device-card\b[^"]*">[\s\S]*?</article>',
            cls.html,
        )

    def card(self, title):
        for card in self.cards:
            if re.search(r"<h3>\s*" + re.escape(title) + r"\s*</h3>", card):
                return card
        self.fail(f"Download card not found: {title}")

    @staticmethod
    def release_tags(card):
        urls = re.findall(r'href="([^"]+)"', card)
        return {
            match.group(1)
            for url in urls
            if (match := re.search(r"/releases/download/([^/]+)/", url))
        }

    def test_official_android_card_contains_all_four_abis(self):
        card = self.card("Nuvio Mobile")
        urls = re.findall(r'href="([^"]+)"', card)
        expected = (
            "androidApp-full-arm64-v8a-release.apk",
            "androidApp-full-armeabi-v7a-release.apk",
            "androidApp-full-x86-release.apk",
            "androidApp-full-x86_64-release.apk",
        )
        for asset in expected:
            with self.subTest(asset=asset):
                self.assertEqual(sum(url.endswith("/" + asset) for url in urls), 1)

    def test_official_ios_ipa_matches_android_release_tag(self):
        android_tags = self.release_tags(self.card("Nuvio Mobile"))
        ios_tags = self.release_tags(self.card("Nuvio Mobile for iOS"))
        self.assertEqual(len(android_tags), 1)
        self.assertEqual(ios_tags, android_tags)

    def test_pages_deploys_after_successful_release_sync_and_health_runs(self):
        workflow = Path(".github/workflows/pages.yml").read_text(encoding="utf-8")
        workflow_run = re.search(r"workflow_run:\s*\n(?P<body>(?:[ \t]+.*\n)+)", workflow)
        self.assertIsNotNone(workflow_run, "Pages workflow_run trigger is missing")
        body = workflow_run.group("body")
        self.assertIn("Nuvio Control Center - Health", body)
        self.assertIn("Sync Nuvio download releases", body)
        self.assertIn("conclusion == 'success'", workflow)


    def test_health_and_release_sync_serialize_shared_data_writes(self):
        health = Path(".github/workflows/addon-health.yml").read_text(encoding="utf-8")
        sync = Path(".github/workflows/release-sync.yml").read_text(encoding="utf-8")
        group_pattern = r"concurrency:\s*\n\s+group:\s*([^\s#]+)"
        health_group = re.search(group_pattern, health)
        sync_group = re.search(group_pattern, sync)
        self.assertIsNotNone(health_group)
        self.assertIsNotNone(sync_group)
        self.assertEqual(health_group.group(1), sync_group.group(1))
        self.assertIn("cancel-in-progress: false", health)
        self.assertIn("cancel-in-progress: false", sync)


if __name__ == "__main__":
    unittest.main()
