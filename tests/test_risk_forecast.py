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


    def test_score_breakdown_and_confidence_are_explained(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        previous = {"checks": [{"name": "API", "ok": False}]}
        history = [{"type": "status", "source": "API", "new_status": "unavailable"}] * 2
        risk = check_links.build_risk_forecast([item], previous, history)["risks"][0]
        self.assertEqual(risk["score_breakdown"], {
            "current_failure": 45,
            "consecutive_failure": 25,
            "outage_history": 10,
        })
        self.assertEqual(risk["confidence"], "high")
        self.assertIn("distinct evidence signals", risk["confidence_basis"])

    def test_single_failure_has_low_evidence_confidence(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        risk = check_links.build_risk_forecast([item], {}, [])["risks"][0]
        self.assertEqual(risk["confidence"], "low")
        self.assertEqual(risk["score_breakdown"]["consecutive_failure"], 0)
        self.assertEqual(risk["score_breakdown"]["outage_history"], 0)

    def test_cache_risk_exposes_its_score_basis(self):
        risk = check_links.build_risk_forecast([], {"release_cache_stale": True}, [])["risks"][0]
        self.assertEqual(risk["score_breakdown"], {"previous_report_cache_stale": 55})
        self.assertEqual(risk["confidence"], "low")

    def test_trend_identifies_new_risk_without_prior_forecast(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        result = check_links.build_risk_forecast([item], {}, [])
        risk = result["risks"][0]
        self.assertEqual(risk["trend"], "new")
        self.assertIsNone(risk["score_delta"])
        self.assertEqual(result["trend_summary"]["status"], "baseline")
        self.assertEqual(result["trend_summary"]["new_count"], 1)

    def test_trend_reports_worsening_and_resolved_risks(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        previous = {"risk_forecast": {"risks": [
            {"resource": "API", "score": 40}, {"resource": "Old service", "score": 30}
        ]}}
        history = [{"type": "status", "source": "API", "new_status": "unavailable"}] * 3
        result = check_links.build_risk_forecast([item], previous, history)
        risk = result["risks"][0]
        self.assertEqual(risk["trend"], "worsening")
        self.assertEqual(risk["previous_score"], 40)
        self.assertGreater(risk["score_delta"], 0)
        self.assertEqual(result["trend_summary"]["resolved_resources"], ["Old service"])
        self.assertEqual(result["trend_summary"]["status"], "worsening")

    def test_trend_reports_improvement_and_stable_scores(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        previous = {"checks": [{"name": "API", "ok": True}], "risk_forecast": {"risks": [
            {"resource": "API", "score": 70}
        ]}}
        result = check_links.build_risk_forecast([item], previous, [])
        self.assertEqual(result["risks"][0]["trend"], "improving")
        self.assertEqual(result["trend_summary"]["status"], "improving")
        unchanged_previous = {"risk_forecast": {"risks": [{"resource": "API", "score": 35}]}}
        unchanged = check_links.build_risk_forecast([item], unchanged_previous, [])
        self.assertEqual(unchanged["risks"][0]["trend"], "stable")
        self.assertEqual(unchanged["trend_summary"]["status"], "stable")

if __name__ == "__main__":
    unittest.main()
