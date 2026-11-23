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

    def test_duplicate_failed_checks_count_one_risk_per_resource(self):
        failures = [
            {"name": "API", "type": "manifest", "ok": False, "error": "timeout"},
            {"name": "API", "type": "manifest", "ok": False, "error": "connection reset"},
            {"name": "Other", "type": "manifest", "ok": False, "error": "timeout"},
        ]
        result = check_links.build_risk_forecast(failures, {}, [])
        self.assertEqual(result["risk_count"], 2)
        self.assertEqual([risk["resource"] for risk in result["risks"]], ["API", "Other"])
        self.assertEqual(result["trend_summary"]["new_count"], 2)
        self.assertEqual(result["trend_summary"]["baseline_count"], 0)

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
        unchanged_previous = {"risk_forecast": {"risks": [{"resource": "API", "score": 45}]}}
        unchanged = check_links.build_risk_forecast([item], unchanged_previous, [])
        self.assertEqual(unchanged["risks"][0]["trend"], "stable")
        self.assertEqual(unchanged["trend_summary"]["status"], "stable")

    def test_invalid_previous_scores_are_baseline(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        for score in (None, "45", True, -1, 101, float("nan")):
            with self.subTest(score=score):
                previous = {"risk_forecast": {"risks": [{"resource": "API", "score": score}]}}
                result = check_links.build_risk_forecast([item], previous, [])
                risk = result["risks"][0]
                self.assertEqual(risk["trend"], "baseline")
                self.assertIsNone(risk["previous_score"])
                self.assertIsNone(risk["score_delta"])
                self.assertEqual(result["trend_summary"]["status"], "baseline")
                self.assertEqual(result["trend_summary"]["baseline_count"], 1)
                self.assertIsNone(result["trend_summary"]["previous_total_score"])

    def test_invalid_prior_resource_shapes_are_ignored(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        previous = {"risk_forecast": {"risks": [None, {"resource": [], "score": 40}, {"resource": "API", "score": {}}]}}
        result = check_links.build_risk_forecast([item], previous, [])
        self.assertEqual(result["risks"][0]["trend"], "baseline")
        self.assertEqual(result["trend_summary"]["status"], "baseline")

    def test_malformed_report_inputs_do_not_crash_forecast(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        previous = {"checks": "invalid", "risk_forecast": {"risks": "invalid"}}
        result = check_links.build_risk_forecast([None, "bad", item], previous, [None, "bad"])
        self.assertEqual(result["risk_count"], 1)
        self.assertEqual(result["risks"][0]["trend"], "new")
        self.assertEqual(result["trend_summary"]["status"], "baseline")

    def test_malformed_previous_report_sections_are_tolerated(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        for previous in (None, [], "broken", {"checks": None, "risk_forecast": None}):
            with self.subTest(previous=previous):
                result = check_links.build_risk_forecast([item], previous, [])
                self.assertEqual(result["risk_count"], 1)
                self.assertEqual(result["risks"][0]["trend"], "new")

    def test_duplicate_history_events_do_not_inflate_risk(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        event = {"type": "status", "source": "API", "new_status": "unavailable"}
        result = check_links.build_risk_forecast([item], {}, [event, event, event])
        risk = result["risks"][0]
        self.assertEqual(risk["evidence_count"], 1)
        self.assertEqual(risk["score_breakdown"]["outage_history"], 5)
        self.assertEqual(risk["score"], 50)

    def test_malformed_history_is_ignored_without_crashing(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        malformed = {"source": ["API"], "type": {"status": True}, "new_status": ["unavailable"]}
        result = check_links.build_risk_forecast([item], {}, [None, "broken", malformed])
        self.assertEqual(result["risk_count"], 1)
        self.assertEqual(result["risks"][0]["evidence_count"], 0)
        self.assertEqual(result["risks"][0]["score"], 45)

if __name__ == "__main__":
    unittest.main()
