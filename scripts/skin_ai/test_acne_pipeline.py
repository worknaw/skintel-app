import unittest
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
from PIL import Image

from acne_pipeline import ScanConfig, acne_detections, concern_detections, image_quality, suppress_duplicates
from benchmark_acne_pipeline import benchmark, match, validate_manifest


class PipelineTests(unittest.TestCase):
    def session(self, rows):
        session = Mock()
        session.get_inputs.return_value = [SimpleNamespace(name="images")]
        session.run.return_value = [np.array([rows], dtype=np.float32).reshape(1, -1, 6)]
        return session

    def test_quality_rejects_dark_bright_and_flat_images(self):
        for color, issue in [(0, "image_too_dark"), (255, "image_too_bright"), (128, "image_too_blurry")]:
            self.assertIn(issue, image_quality(Image.new("RGB", (640, 640), (color,)*3))["issues"])

    def test_texture_passes_basic_quality_but_does_not_prove_face_presence(self):
        pixels = np.random.default_rng(42).integers(60, 190, (512, 512, 3), dtype=np.uint8)
        self.assertTrue(image_quality(Image.fromarray(pixels))["passed"])

    def test_letterbox_maps_portrait_coordinates_and_filters_class(self):
        session = self.session([[160, 0, 480, 640, .9, 1], [160, 0, 480, 640, .9, 2]])
        boxes = acne_detections(Image.new("RGB", (400, 800)), session)
        self.assertEqual(len(boxes), 1)
        for key, expected in {"x": 0, "y": 0, "width": 1, "height": 1}.items():
            self.assertAlmostEqual(boxes[0][key], expected)

    def test_redness_is_kept_separate_from_acne(self):
        results = concern_detections(Image.new("RGB", (640, 640)), self.session([
            [10, 10, 50, 50, .9, 1], [100, 100, 200, 200, .8, 2], [250, 250, 300, 300, .9, 0],
        ]))
        self.assertEqual([item["class"] for item in results], ["acne", "redness"])

    def test_detection_coordinates_are_native_python_numbers(self):
        results = concern_detections(Image.new("RGB", (640, 480)), self.session([
            np.array([[[100, 100, 200, 200, 0.9, 1]]], dtype=np.float32)
        ]))
        self.assertIs(type(results[0]["x"]), float)
        self.assertIs(type(results[0]["width"]), float)

    def test_tiled_coordinates_map_to_original_image(self):
        session = self.session([[0, 0, 64, 64, .9, 1]])
        boxes = acne_detections(Image.new("RGB", (1000, 1000)), session, ScanConfig(tiled=True))
        self.assertEqual(session.run.call_count, 5)
        self.assertTrue(any(abs(b["x"]-.35) < .00001 and abs(b["y"]-.35) < .00001 for b in boxes))
        self.assertTrue(all(b["x"]+b["width"] <= 1 for b in boxes))

    def test_duplicates_keep_highest_confidence(self):
        box = {"x": .1, "y": .1, "width": .2, "height": .2}
        result = suppress_duplicates([{**box, "confidence": .6}, {**box, "confidence": .9}], .5)
        self.assertEqual([b["confidence"] for b in result], [.9])

    def test_threshold_and_empty_output(self):
        session = self.session([[0, 0, 100, 100, .3, 1]])
        self.assertEqual(acne_detections(Image.new("RGB", (640, 640)), session, ScanConfig(confidence=.5)), [])
        self.assertEqual(acne_detections(Image.new("RGB", (640, 640)), self.session([])), [])

    def test_nan_and_unexpected_output_fail_closed(self):
        with self.assertRaisesRegex(RuntimeError, "invalid_model_output"):
            acne_detections(Image.new("RGB", (640, 640)), self.session([[0, 0, 10, 10, float("nan"), 1]]))
        for value in [0, -1, 1.1, float("nan")]:
            with self.assertRaises(ValueError):
                ScanConfig(confidence=value)

    def test_manifest_rejects_person_leakage_and_missing_annotations(self):
        row = {"participant_id": "p1", "image": "a.jpg", "split": "validation", "consent_reference": "c1", "boxes": []}
        validate_manifest([row])
        with self.assertRaisesRegex(ValueError, "Participant"):
            validate_manifest([row, {**row, "image": "b.jpg", "split": "test"}])
        with self.assertRaises(ValueError):
            validate_manifest([{**row, "boxes": None}])

    def test_matching_counts_duplicates_and_negative_images(self):
        box = {"x": .1, "y": .1, "width": .2, "height": .2, "confidence": .9}
        self.assertEqual(match([box, box], [[.1, .1, .3, .3]]), (1, 1, 0))
        self.assertEqual(match([box], []), (0, 1, 0))
        self.assertEqual(match([], [[.1, .1, .3, .3]]), (0, 0, 1))

    def test_benchmark_reports_rejections_separately_from_negative_images(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            pixels = np.random.default_rng(42).integers(60, 190, (512, 512, 3), dtype=np.uint8)
            Image.fromarray(pixels).save(root / "accepted.jpg", quality=95)
            Image.new("RGB", (512, 512)).save(root / "rejected.jpg")
            session = self.session([])
            report = benchmark([{"image": "accepted.jpg", "boxes": []},
                                {"image": "rejected.jpg", "boxes": [[0, 0, .1, .1]]}], root, session, ScanConfig())
            self.assertEqual(report["accepted"], 1)
            self.assertEqual(report["coverage"], .5)
            self.assertEqual(report["rejected"], {"image_too_dark": 1})
            self.assertIsNone(report["recall"])
            self.assertEqual(report["count_mae"], 0)
            self.assertEqual(session.run.call_count, 1)

    def test_configuration_is_traceable_in_history_version(self):
        self.assertEqual(ScanConfig().result_version("model"), ScanConfig().result_version("model"))
        self.assertNotEqual(ScanConfig().result_version("model"), ScanConfig(tiled=True).result_version("model"))


if __name__ == "__main__":
    unittest.main()
