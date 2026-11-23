import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import check_links


class ChangeSummaryTests(unittest.TestCase):
    def test_empty_changes_are_zero(self):
        summary = check_links.build_change_summary([])
        self.assertEqual(summary["count"], 0)
        self.assertEqual(summary["by_type"], {})
        self.assertEqual(summary["events"], [])

    def test_summary_groups_types_and_preserves_evidence(self):
        events = [
            {"type": "status", "source": "A", "old_status": "available", "new_status": "unavailable"},
            {"type": "status", "source": "B", "old_status": "unavailable", "new_status": "available"},
            {"type": "version", "source": "C", "old_version": "1", "new_version": "2"},
        ]
        summary = check_links.build_change_summary(events)
        self.assertEqual(summary["count"], 3)
        self.assertEqual(summary["by_type"], {"status": 2, "version": 1})
        self.assertEqual(summary["events"], events)

    def test_unknown_event_type_is_counted(self):
        summary = check_links.build_change_summary([{"type": "other"}])
        self.assertEqual(summary["by_type"], {"other": 1})


    def test_history_discards_non_object_records_and_duplicates(self):
        events = [
            {"type": "status", "source": "A", "old_status": "available", "new_status": "unavailable"},
            None,
            "broken record",
            {"type": "status", "source": "A", "old_status": "available", "new_status": "unavailable"},
            {"type": "status", "source": "A", "old_status": "unavailable", "new_status": "available"},
        ]
        normalized = check_links.normalize_event_history(events)
        self.assertEqual(len(normalized), 2)
        self.assertEqual(normalized[0]["new_status"], "unavailable")
        self.assertEqual(normalized[1]["new_status"], "available")

    def test_history_event_identity_handles_unhashable_values(self):
        malformed = {"type": ["status"], "source": {"name": "A"}, "new_status": ["unavailable"]}
        key = check_links.build_event_key(malformed)
        self.assertIsNotNone(key)
        self.assertEqual(len({key}), 1)
        normalized = check_links.normalize_event_history([malformed, malformed, {"bad": ["shape"]}, []])
        self.assertEqual(len(normalized), 2)

    def test_history_normalization_respects_limit(self):
        events = [{"type": "status", "source": str(i), "new_status": "unavailable"} for i in range(105)]
        normalized = check_links.normalize_event_history(events, limit=100)
        self.assertEqual(len(normalized), 100)
        self.assertEqual(normalized[0]["source"], "5")
        self.assertEqual(normalized[-1]["source"], "104")

if __name__ == "__main__":
    unittest.main()
