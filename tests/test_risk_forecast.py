import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import check_links


class RiskForecastTests(unittest.TestCase):
    def test_healthy_checks_report_low_risk(self):
        result = check_links.build_risk_forecast([{"name": "API", "ok": True}], {}, [])
        self.assertEqual(result["status"], "healthy")
        self.assertEqual(result["overall_level"], "low")
        self.assertEqual(result["risk_count"], 0)

    def test_current_failure_creates_evidence_based_risk(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        result = check_links.build_risk_forecast([item], {}, [])
        self.assertEqual(result["risk_count"], 1)
        self.assertEqual(result["risks"][0]["resource"], "API")
        self.assertIn("current_check_failed", result["risks"][0]["signals"])

    def test_repeat_failure_and_history_raise_score(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        previous = {"checks": [{"name": "API", "ok": False}]}
        history = [{"type": "status", "source": "API", "new_status": "unavailable"}] * 3
        result = check_links.build_risk_forecast([item], previous, history)
        risk = result["risks"][0]
        self.assertEqual(risk["level"], "high")
        self.assertIn("consecutive_failure", risk["signals"])
        self.assertIn("recurring_outage_history", risk["signals"])

    def test_stale_cache_adds_risk_indicator(self):
        result = check_links.build_risk_forecast([], {"release_cache_stale": True}, [])
        self.assertEqual(result["risk_count"], 1)
        self.assertEqual(result["risks"][0]["resource"], "Release cache")
        self.assertEqual(result["overall_level"], "medium")

    def test_risk_scores_are_bounded(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "failure"}
        previous = {"checks": [{"name": "API", "ok": False}]}
        history = [{"type": "status", "source": "API", "new_status": "unavailable"}] * 50
        result = check_links.build_risk_forecast([item], previous, history)
        self.assertLessEqual(result["risks"][0]["score"], 100)


if __name__ == "__main__":
    unittest.main()
