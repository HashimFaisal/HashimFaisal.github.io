import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import check_links


class AtomicJsonWriteTests(unittest.TestCase):
    def temporary_files(self, directory, target):
        return list(directory.glob(f".{target.name}.*.tmp"))

    def test_success_replaces_json_with_utf8_content_and_cleans_temp_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            target = directory / "nested" / "status.json"
            target.parent.mkdir()
            target.write_text('{"old": true}\n', encoding="utf-8")

            check_links.write_json_atomic(target, {"message": "تم التحديث", "ok": True})

            self.assertEqual(
                json.loads(target.read_text(encoding="utf-8")),
                {"message": "تم التحديث", "ok": True},
            )
            self.assertEqual(self.temporary_files(target.parent, target), [])

    def test_serialization_failure_preserves_previous_file_and_cleans_temp(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            target = directory / "status.json"
            original = '{"keep": true}\n'
            target.write_text(original, encoding="utf-8")

            with self.assertRaises(TypeError):
                check_links.write_json_atomic(target, {"invalid": object()})

            self.assertEqual(target.read_text(encoding="utf-8"), original)
            self.assertEqual(self.temporary_files(directory, target), [])

    def test_replace_failure_preserves_previous_file_and_cleans_temp(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            target = directory / "changelog.json"
            original = '[{"keep": true}]\n'
            target.write_text(original, encoding="utf-8")

            with patch.object(check_links.os, "replace", side_effect=OSError("replace failed")):
                with self.assertRaises(OSError):
                    check_links.write_json_atomic(target, [{"new": True}])

            self.assertEqual(target.read_text(encoding="utf-8"), original)
            self.assertEqual(self.temporary_files(directory, target), [])


if __name__ == "__main__":
    unittest.main()
