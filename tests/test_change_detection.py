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


if __name__ == "__main__":
    unittest.main()
