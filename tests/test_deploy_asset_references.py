import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
DEPLOY_WORKFLOW = ROOT / ".github" / "workflows" / "pages.yml"

ASSET_PATTERN = re.compile(
    r'((?:href|src)=["\'])((?!https?:|//)[^"\'?#]+\.(?:css|js))(?:\?[^"\']*)?(["\'])',
    re.IGNORECASE,
)


class DeployAssetReferenceTests(unittest.TestCase):
    def test_every_local_asset_reference_is_copied_to_public(self):
        html = INDEX.read_text(encoding="utf-8")
        workflow = DEPLOY_WORKFLOW.read_text(encoding="utf-8")
        referenced = {
            match.group(2)
            for match in ASSET_PATTERN.finditer(html)
        }

        copied = set()
        for line in workflow.splitlines():
            match = re.match(r"\s*cp\s+(.+?)\s+public/\s*$", line)
            if match:
                copied.update(match.group(1).split())

        self.assertTrue(referenced, "Expected local CSS/JS references in index.html")
        self.assertEqual(
            referenced - copied,
            set(),
            "Every locally referenced CSS/JS file must be copied into public/.",
        )

    def test_deploy_validation_checks_files_instead_of_fixed_reference_count(self):
        workflow = DEPLOY_WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("missing_assets", workflow)
        self.assertIn('(Path("public") / asset).is_file()', workflow)
        self.assertNotIn("Expected 7 local CSS/JS references", workflow)

    def test_unapproved_preview_stylesheet_is_not_loaded_in_production(self):
        html = INDEX.read_text(encoding="utf-8")
        self.assertNotIn("premium-redesign-preview.css", html)


if __name__ == "__main__":
    unittest.main()
