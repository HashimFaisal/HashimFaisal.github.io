import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import check_links


class ProactiveAlertTests(unittest.TestCase):
    def test_healthy_report_has_no_alerts(self):
        result = check_links.build_proactive_alerts({"diagnostics": [], "release_cache_stale": False})
        self.assertEqual(result["status"], "healthy")
        self.assertEqual(result["alert_count"], 0)
        self.assertEqual(result["alerts"], [])

    def test_high_priority_failure_is_raised(self):
        result = check_links.build_proactive_alerts({
            "diagnostics": [{
                "name": "APK download",
                "failure_code": "download_check_failed",
                "failure_category": "download",
                "error": "timeout",
                "recommended_action": "Check URL",
            }],
            "release_cache_stale": False,
        })
        self.assertEqual(result["status"], "critical")
        self.assertEqual(result["alert_count"], 1)
        self.assertEqual(result["alerts"][0]["severity"], "high")
        self.assertEqual(result["alerts"][0]["recommended_action"], "Check URL")

    def test_stale_cache_generates_attention(self):
        result = check_links.build_proactive_alerts({"diagnostics": [], "release_cache_stale": True})
        self.assertEqual(result["status"], "attention")
        self.assertEqual(result["alert_count"], 1)
        self.assertEqual(result["alerts"][0]["code"], "release_cache_stale")

    def test_alerts_are_based_on_diagnostics(self):
        result = check_links.build_proactive_alerts({
            "diagnostics": [{"failure_category": "network", "failure_code": "timeout", "name": "API"}],
            "release_cache_stale": False,
        })
        self.assertEqual(result["status"], "attention")
        self.assertEqual(result["alerts"][0]["severity"], "medium")


if ____ == "__main__":
    unittest.main()
