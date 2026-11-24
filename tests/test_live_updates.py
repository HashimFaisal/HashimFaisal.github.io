import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import check_links


class LiveUpdateNormalizationTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 24, 12, 0, tzinfo=timezone.utc)

    def update(self, update_id, published, expires, **overrides):
        item = {
            "id": update_id,
            "type": "addon",
            "title": {"ar": "تحديث", "en": "Update"},
            "description": {"ar": "تفاصيل", "en": "Details"},
            "url": "https://example.com/details",
            "publishedAt": published,
            "expiresAt": expires,
        }
        item.update(overrides)
        return item

    def test_discards_malformed_expired_future_and_unsafe_updates(self):
        valid = self.update("valid", "2026-11-24T11:00:00Z", "2026-11-24T13:00:00Z")
        malformed_locale = self.update(
            "locale", "2026-11-24T11:00:00Z", "2026-11-24T13:00:00Z",
            title={"ar": "عنوان", "en": ""},
        )
        unsafe_url = self.update(
            "unsafe", "2026-11-24T11:00:00Z", "2026-11-24T13:00:00Z",
            url="http://example.com/details",
        )
        expired = self.update("expired", "2026-11-24T09:00:00Z", "2026-11-24T10:00:00Z")
        future = self.update("future", "2026-11-24T13:00:00Z", "2026-11-24T14:00:00Z")
        malformed_date = self.update("bad-date", "not-a-date", "2026-11-24T14:00:00Z")
        wrong_type = self.update(
            "wrong-type", "2026-11-24T11:00:00Z", "2026-11-24T13:00:00Z",
            type="other",
        )

        result = check_links.normalize_live_updates(
            [None, "broken", valid, malformed_locale, unsafe_url, expired, future, malformed_date, wrong_type],
            now=self.now,
        )
        self.assertEqual([item["id"] for item in result], ["valid"])

    def test_deduplicates_ids_and_sorts_by_absolute_utc_time(self):
        later = self.update(
            "later", "2026-11-24T14:00:00+03:00", "2026-11-24T17:00:00+03:00"
        )
        earlier = self.update(
            "earlier", "2026-11-24T10:30:00Z", "2026-11-24T14:00:00Z"
        )
        duplicate = self.update(
            "later", "2026-11-24T11:30:00Z", "2026-11-24T14:00:00Z"
        )
        result = check_links.normalize_live_updates(
            [earlier, later, duplicate], now=self.now
        )
        self.assertEqual([item["id"] for item in result], ["later", "earlier"])
        self.assertEqual(len(result), 2)

    def test_accepts_naive_utc_dates_and_enforces_limit(self):
        updates = [
            self.update(
                str(index),
                f"2026-11-24T{11 - index // 60:02d}:{59 - index % 60:02d}:00",
                "2026-11-24T14:00:00",
            )
            for index in range(3)
        ]
        result = check_links.normalize_live_updates(updates, now=self.now, limit=2)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["id"], "0")


if __name__ == "__main__":
    unittest.main()
