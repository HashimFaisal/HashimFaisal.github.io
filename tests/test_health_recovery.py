import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from io import BytesIO

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import check_links


class FetchRetryTests(unittest.TestCase):
    def response(self, status=200):
        class Response(BytesIO):
            def __init__(self):
                super().__init__()
                self.status = status
                self.closed_flag = False

            def close(self):
                self.closed_flag = True
                super().close()
        return Response()

    def test_retries_transient_server_error_then_succeeds(self):
        first = HTTPError("https://test.invalid", 503, "unavailable", {}, None)
        with patch.object(check_links, "urlopen", side_effect=[first, self.response(200)]) as mocked, patch.object(check_links.time, "sleep"):
            result = check_links.fetch("https://test.invalid", retries=1)
        self.assertEqual(result.status, 200)
        self.assertEqual(mocked.call_count, 2)

    def test_retries_network_error_with_bounded_attempts(self):
        with patch.object(check_links, "urlopen", side_effect=URLError("temporary network issue")) as mocked, patch.object(check_links.time, "sleep"):
            with self.assertRaises(URLError):
                check_links.fetch("https://test.invalid", retries=2)
        self.assertEqual(mocked.call_count, 3)

    def test_permanent_http_error_is_not_retried(self):
        missing = HTTPError("https://test.invalid", 404, "missing", {}, None)
        with patch.object(check_links, "urlopen", side_effect=missing) as mocked, patch.object(check_links.time, "sleep"):
            with self.assertRaises(HTTPError):
                check_links.fetch("https://test.invalid", retries=2)
        self.assertEqual(mocked.call_count, 1)

    def test_backoff_delay_is_capped(self):
        transient = HTTPError("https://test.invalid", 503, "unavailable", {}, None)
        with patch.object(check_links, "urlopen", side_effect=[transient, transient, self.response(200)]), patch.object(check_links.time, "sleep") as sleeper:
            check_links.fetch("https://test.invalid", retries=2, backoff_seconds=10)
        self.assertEqual([call.args[0] for call in sleeper.call_args_list], [3, 3])


if __name__ == "__main__":
    unittest.main()
