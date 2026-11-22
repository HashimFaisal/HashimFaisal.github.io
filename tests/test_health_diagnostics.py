import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import check_links


class HealthDiagnosticsTests(unittest.TestCase):
    def test_success_is_healthy(self):
        result = check_links.diagnose_check({"name": "Manifest", "type": "manifest", "ok": True})
        self.assertEqual(result["failure_code"], "healthy")
        self.assertEqual(result["severity"], "info")

    def test_rate_limit_is_identified(self):
        result = check_links.diagnose_check({"name": "GitHub API", "type": "release", "ok": False, "http_status": 429})
        self.assertEqual(result["failure_code"], "rate_limited")
        self.assertEqual(result["failure_category"], "rate_limit")
        self.assertIn("rate limit", result["recommended_action"].lower())

    def test_permission_error_is_identified(self):
        result = check_links.diagnose_check({"name": "Release", "type": "release", "ok": False, "http_status": 403})
        self.assertEqual(result["failure_code"], "access_denied")

    def test_server_error_is_identified(self):
        result = check_links.diagnose_check({"name": "Release", "type": "release", "ok": False, "http_status": 503})
        self.assertEqual(result["failure_code"], "upstream_server_error")

    def test_timeout_is_identified(self):
        result = check_links.diagnose_check({"name": "Source", "type": "manifest", "ok": False, "error": "connection timed out"})
        self.assertEqual(result["failure_code"], "timeout")
        self.assertEqual(result["failure_category"], "network")

    def test_malformed_response_is_identified(self):
        result = check_links.diagnose_check({"name": "Source", "type": "manifest", "ok": False, "error": "JSON decode failed"})
        self.assertEqual(result["failure_code"], "invalid_response")
        self.assertEqual(result["failure_category"], "data_validation")

    def test_missing_asset_is_identified(self):
        result = check_links.diagnose_check({"name": "APK", "type": "download", "ok": False, "error": "Asset not found"})
        self.assertEqual(result["failure_code"], "not_found")

    def test_summary_groups_failure_categories(self):
        checks = [
            {"name": "one", "ok": False, "failure_category": "network"},
            {"name": "two", "ok": False, "failure_category": "network"},
            {"name": "three", "ok": False, "failure_category": "release"},
        ]
        summary = check_links.build_diagnostic_summary(checks)
        self.assertEqual(summary, "3 failure(s): categories 2 network, 1 release.")

    def test_summary_reports_all_healthy(self):
        self.assertEqual(check_links.build_diagnostic_summary([{"ok": True}]), "All checks are healthy.")


if __name__ == "__main__":
    unittest.main()
