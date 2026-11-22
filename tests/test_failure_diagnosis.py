import unittest

from scripts.check_links import diagnose_failure, enrich_failures


class FailureDiagnosisTests(unittest.TestCase):
    def test_rate_limit(self):
        self.assertEqual(diagnose_failure("HTTP Error 429: rate limit")["failure_category"], "rate_limit")

    def test_server_error(self):
        self.assertEqual(diagnose_failure("HTTP Error 503: Service unavailable")["failure_category"], "server_error")

    def test_timeout(self):
        self.assertEqual(diagnose_failure("socket timed out")["failure_category"], "timeout")

    def test_dns(self):
        self.assertEqual(diagnose_failure("getaddrinfo failed")["failure_category"], "dns")

    def test_tls(self):
        self.assertEqual(diagnose_failure("SSL certificate verify failed")["failure_category"], "tls")

    def test_client_error(self):
        self.assertEqual(diagnose_failure("HTTP Error 404: Not Found")["failure_category"], "client_error")

    def test_malformed_response(self):
        self.assertEqual(diagnose_failure("JSON decode error")["failure_category"], "malformed_response")

    def test_missing_asset(self):
        self.assertEqual(diagnose_failure("Asset not found in selected Beta release", "download")["failure_category"], "missing_asset")

    def test_unknown_fallback(self):
        self.assertEqual(diagnose_failure("unclassified error")["failure_category"], "unknown")

    def test_enrich_only_failed_checks_and_aggregate(self):
        checks = [
            {"name": "A", "type": "manifest", "ok": False, "error": "429 rate limit"},
            {"name": "B", "type": "manifest", "ok": False, "error": "HTTP 503"},
            {"name": "C", "type": "manifest", "ok": True},
        ]
        report = enrich_failures(checks)
        self.assertEqual(len(report["issues"]), 2)
        self.assertEqual(report["failure_categories"], {"rate_limit": 1, "server_error": 1})
        self.assertNotIn("failure_category", checks[2])


if __name__ == "__main__":
    unittest.main()
