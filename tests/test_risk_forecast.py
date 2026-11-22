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

    def test_malformed_failed_resource_names_are_normalized(self):
        failures = [
            {"name": [], "type": "manifest", "ok": False, "error": "timeout"},
            {"name": {}, "type": "manifest", "ok": False, "error": "timeout"},
            {"name": "  ", "type": "manifest", "ok": False, "error": "timeout"},
            {"name": "Named", "type": "manifest", "ok": False, "error": "timeout"},
        ]
        result = check_links.build_risk_forecast(failures, {}, [])
        self.assertEqual(result["risk_count"], 2)
        self.assertEqual([risk["resource"] for risk in result["risks"]], ["Unknown", "Named"])
        self.assertEqual(result["trend_summary"]["new_count"], 2)

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
        self.assertIn("High confidence from 3 distinct signal(s)", risk["confidence_details"])
        self.assertIn("current_check_failed", risk["confidence_details"])
        self.assertIn("consecutive_failure", risk["confidence_details"])
        self.assertIn("recurring_outage_history", risk["confidence_details"])

    def test_single_failure_has_low_evidence_confidence(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        risk = check_links.build_risk_forecast([item], {}, [])["risks"][0]
        self.assertEqual(risk["confidence"], "low")
        self.assertEqual(risk["confidence_details"], "Low confidence from 1 distinct signal(s): current_check_failed.")
        self.assertEqual(risk["score_breakdown"]["consecutive_failure"], 0)
        self.assertEqual(risk["score_breakdown"]["outage_history"], 0)

    def test_cache_risk_exposes_its_score_basis(self):
        risk = check_links.build_risk_forecast([], {"release_cache_stale": True}, [])["risks"][0]
        self.assertEqual(risk["score_breakdown"], {"previous_report_cache_stale": 55})
        self.assertEqual(risk["confidence"], "low")
        self.assertEqual(risk["confidence_details"], "Low confidence from one signal: previous_report_cache_stale.")

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


    def test_http_status_normalization_accepts_valid_codes_and_numeric_strings(self):
        for value, expected in ((503, 503), (" 429 ", 429), (404, 404), (200, 200)):
            with self.subTest(value=value):
                self.assertEqual(check_links.normalize_http_status(value), expected)

    def test_http_status_normalization_rejects_invalid_values(self):
        for value in (None, True, False, "5xx", "503.0", {}, [], 99, 600, -1):
            with self.subTest(value=value):
                self.assertIsNone(check_links.normalize_http_status(value))

    def test_diagnose_check_handles_malformed_http_status_without_crashing(self):
        for status in ("503", "invalid", True, 999, None):
            with self.subTest(status=status):
                item = {"name": "API", "ok": False, "http_status": status, "error": ""}
                diagnostic = check_links.diagnose_check(item)
                self.assertIsInstance(diagnostic, dict)
                self.assertIn("failure_code", diagnostic)
        numeric_string = check_links.diagnose_check(
            {"name": "API", "ok": False, "http_status": "503"}
        )
        self.assertEqual(numeric_string["failure_code"], "upstream_server_error")

    def test_http_timeout_statuses_are_classified_as_network_timeouts(self):
        for status in (408, 504, "408", "504"):
            with self.subTest(status=status):
                diagnostic = check_links.diagnose_check(
                    {"name": "API", "ok": False, "http_status": status}
                )
                self.assertEqual(diagnostic["failure_code"], "timeout")
                self.assertEqual(diagnostic["failure_category"], "network")

    def test_http_425_is_classified_as_retryable_rate_limit(self):
        diagnostic = check_links.diagnose_check(
            {"name": "API", "ok": False, "http_status": 425}
        )
        self.assertEqual(diagnostic["failure_code"], "rate_limited")

    def test_duplicate_outage_history_events_do_not_inflate_risk(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        event = {"type": "status", "source": "API", "new_status": "unavailable", "timestamp": "2026-11-22T00:00:00Z"}
        result = check_links.build_risk_forecast([item], {}, [event, dict(event), dict(event)])
        risk = result["risks"][0]
        self.assertEqual(risk["evidence_count"], 1)
        self.assertEqual(risk["score_breakdown"]["outage_history"], 5)

    def test_distinct_outage_events_remain_distinct(self):
        item = {"name": "API", "type": "manifest", "ok": False, "error": "timeout"}
        history = [
            {"type": "status", "source": "API", "new_status": "unavailable", "timestamp": f"2026-11-22T00:0{i}:00Z"}
            for i in range(3)
        ]
        risk = check_links.build_risk_forecast([item], {}, history)["risks"][0]
        self.assertEqual(risk["evidence_count"], 3)
        self.assertEqual(risk["score_breakdown"]["outage_history"], 15)

    def test_resource_identity_matches_case_and_whitespace_variants(self):
        item = {"name": "  API   Gateway ", "type": "manifest", "ok": False, "error": "timeout"}
        previous = {
            "checks": [{"name": "api gateway", "ok": False}],
            "risk_forecast": {"risks": [{"resource": "API gateway", "score": 40}]},
        }
        history = [{"type": "status", "source": "api  GATEWAY", "new_status": "unavailable"}]
        result = check_links.build_risk_forecast([item], previous, history)
        risk = result["risks"][0]
        self.assertEqual(risk["resource"], "API   Gateway")
        self.assertEqual(risk["trend"], "worsening")
        self.assertIn("consecutive_failure", risk["signals"])
        self.assertEqual(risk["evidence_count"], 1)

    def test_normalized_duplicate_resource_names_count_once(self):
        failures = [
            {"name": "API", "ok": False, "error": "timeout"},
            {"name": " api ", "ok": False, "error": "timeout"},
        ]
        result = check_links.build_risk_forecast(failures, {}, [])
        self.assertEqual(result["risk_count"], 1)

    def test_integrity_summary_reports_filtered_and_duplicate_inputs(self):
        failures = [
            {"name": "API", "ok": False, "error": "timeout"},
            {"name": "API", "ok": False, "error": "connection reset"},
            None,
            "malformed",
        ]
        result = check_links.build_risk_forecast(failures, {}, [])
        self.assertEqual(result["integrity"], {
            "input_result_count": 4,
            "evaluated_failure_count": 1,
            "ignored_malformed_result_count": 2,
            "duplicate_failure_count": 1,
            "history_window_size": 0,
            "history_evidence_deduplicated": True,
        })

    def test_integrity_summary_reports_bounded_history_window(self):
        history = [{"type": "note"} for _ in range(125)]
        result = check_links.build_risk_forecast([], {}, history)
        self.assertEqual(result["integrity"]["history_window_size"], 100)

if __name__ == "__main__":
    unittest.main()
