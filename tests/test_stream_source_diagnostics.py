import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_links


class FakeResponse:
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, _size=-1):
        return b"source-code"


class StreamSourceDiagnosticsTests(unittest.TestCase):
    def test_torrentio_counts_candidates_without_storing_urls(self):
        with patch.object(check_links, "fetch_json", return_value=(
            {"streams": [{"url": "https://media.example/one.m3u8"}, {"infoHash": "abc"}]},
            200,
        )):
            result = check_links.check_torrentio_stream()

        self.assertTrue(result["ok"])
        self.assertEqual(result["probe_status"], "streams_found")
        self.assertEqual(result["stream_count"], 2)
        self.assertNotIn("url", result)

    def test_torrentio_empty_result_is_not_reported_as_a_working_stream(self):
        with patch.object(check_links, "fetch_json", return_value=({"streams": []}, 200)):
            result = check_links.check_torrentio_stream()

        self.assertFalse(result["ok"])
        self.assertEqual(
            check_links.diagnose_check(result)["failure_code"],
            "no_streams_found",
        )

    def test_cinemabox_checks_search_details_and_player(self):
        payloads = [
            ({"meta": {"name": "The Matrix", "year": "1999"}}, 200),
            ({"results": [{"id": 123, "type": "MOVIE", "title": "The Matrix"}]}, 200),
            ({"post_info": {"episode_id": 456}}, 200),
            ({"videos": [{"url": "https://media.example/matrix.mp4"}]}, 200),
        ]
        with patch.object(check_links, "fetch_json", side_effect=payloads):
            result = check_links.check_cinemabox_stream()

        self.assertTrue(result["ok"])
        self.assertEqual(result["probe_status"], "streams_found")
        self.assertEqual(result["stream_count"], 1)
        self.assertNotIn("url", result)

    def test_cinemana_checks_health_search_details_and_transcoded_files(self):
        payloads = [
            ({"meta": {"name": "The Matrix", "year": "1999"}}, 200),
            ({"data": [{"id": 123, "imdbUrlRef": "https://www.imdb.com/title/tt0133093/"}]}, 200),
            ({"nb": 123}, 200),
            ([{"videoUrl": "https://media.example/matrix.mp4"}], 200),
        ]
        with patch.object(check_links, "fetch_text", return_value=("ok", 200)), \
             patch.object(check_links, "fetch_json", side_effect=payloads):
            result = check_links.check_cinemana_stream()

        self.assertTrue(result["ok"])
        self.assertEqual(result["probe_status"], "streams_found")
        self.assertEqual(result["stream_count"], 1)
        self.assertEqual(result["host_health_status"], 200)
        self.assertNotIn("url", result)

    def test_catalog_miss_is_inconclusive_not_a_false_outage(self):
        payloads = [
            ({"meta": {"name": "The Matrix", "year": "1999"}}, 200),
            ({"results": []}, 200),
        ]
        with patch.object(check_links, "fetch_json", side_effect=payloads):
            result = check_links.check_cinemabox_stream()

        self.assertTrue(result["ok"])
        self.assertEqual(result["probe_status"], "inconclusive")
        self.assertEqual(
            check_links.diagnose_check(result)["failure_code"],
            "test_title_not_indexed",
        )

    def test_cinemana_outside_earthlink_is_inconclusive_not_a_provider_failure(self):
        from urllib.error import URLError

        with patch.object(
            check_links, "fetch_text",
            side_effect=[URLError("host unreachable"), ("ok", 200)],
        ):
            result = check_links.check_cinemana_stream()

        self.assertTrue(result["ok"])
        self.assertEqual(result["probe_status"], "inconclusive")
        self.assertEqual(result["reason_code"], "network_specific_provider")
        self.assertEqual(result["verification_scope"], "Earthlink user network")
        self.assertEqual(
            check_links.diagnose_check(result)["failure_code"],
            "test_title_not_indexed",
        )

    def test_cinemabox_reports_the_failing_probe_stage_without_exposing_urls(self):
        from urllib.error import HTTPError
        from io import BytesIO

        payloads = [
            ({"meta": {"name": "The Matrix", "year": "1999"}}, 200),
            HTTPError("https://cinema.albox.co/api/v4/search", 404, "Not Found", {}, BytesIO(b"missing")),
        ]
        with patch.object(check_links, "fetch_json", side_effect=payloads):
            result = check_links.check_cinemabox_stream()

        self.assertFalse(result["ok"])
        self.assertEqual(result["probe_stage"], "catalog_search")
        self.assertEqual(result["http_status"], 404)
        self.assertNotIn("url", result)

    def test_all_in_one_checks_registry_and_sample_provider_files(self):
        manifest = {
            "scrapers": [
                {"enabled": True, "filename": "providers/allanime.js"},
                {"enabled": True, "filename": "providers/1shows.js"},
                {"enabled": True, "filename": "providers/cineby.js"},
                {"enabled": False, "filename": "providers/disabled.js"},
            ]
        }
        with patch.object(check_links, "fetch_json", return_value=(manifest, 200)), \
             patch.object(check_links, "fetch", return_value=FakeResponse()):
            result = check_links.check_allinone_provider_bundle()

        self.assertTrue(result["ok"])
        self.assertEqual(result["enabled_provider_count"], 3)
        self.assertEqual(result["available_provider_files"], [
            "providers/allanime.js",
            "providers/1shows.js",
            "providers/cineby.js",
        ])
        self.assertIn("requires the Nuvio app runtime", result["note"])


if __name__ == "__main__":
    unittest.main()
