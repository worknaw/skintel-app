import tempfile
import unittest
from pathlib import Path

from skin_type_baseline import summarize, validate_manifest


class SkinTypeBaselineTests(unittest.TestCase):
    def test_overlapping_participants_are_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "a.jpg").write_bytes(b"test")
            (root / "b.jpg").write_bytes(b"test")
            rows = [{"participant_id": "p1", "image_id": "a", "split": "validation", "reference": "dry", "path": "a.jpg", "consent_reference": "test"},
                    {"participant_id": "p1", "image_id": "b", "split": "test", "reference": "oily", "path": "b.jpg", "consent_reference": "test"}]
            with self.assertRaisesRegex(ValueError, "overlaps"):
                validate_manifest(rows, root)

    def test_combination_is_not_counted_as_supported_class(self):
        result = summarize([{"split": "test", "reference": "combination", "predicted": "oily"},
                            {"split": "test", "reference": "dry", "predicted": "dry"}])
        self.assertEqual(result["test"]["comparable"], 1)
        self.assertEqual(result["test"]["correct"], 1)
        self.assertEqual(result["test"]["reference_combination"], 1)
