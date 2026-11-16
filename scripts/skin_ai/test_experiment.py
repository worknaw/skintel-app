import json
import tempfile
import unittest
from pathlib import Path

from run_experiment import load_manifest
from prepare_benchmark import prepare


class ManifestTests(unittest.TestCase):
    def test_validates_image_path_labels_and_identifiers(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "fake.png").write_bytes(b"not an actual image")
            manifest = root / "manifest.json"
            data = {"datasetVersion": "test-v1", "split": "validation", "images": [{"imageId": "image-1", "participantId": "person-1", "path": "fake.png", "reference": {"visible_acne": "unassessable"}}]}
            manifest.write_text(json.dumps(data), encoding="utf-8")
            self.assertEqual(load_manifest(manifest, root)["images"][0]["_resolved"], (root / "fake.png").resolve())
            data["images"][0]["path"] = "../secret.png"
            manifest.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_manifest(manifest, root)
            data["images"][0]["path"] = "fake.png"
            data["images"][0]["reference"]["visible_acne"] = "unknown"
            manifest.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_manifest(manifest, root)

    def test_benchmark_requires_validation_calibration_and_preserves_uncertainty(self):
        scores = {"datasetVersion": "dataset-v1", "split": "test", "modelVersion": "model-v1", "promptVersion": "prompt-v1", "records": [{"imageId": "i1", "participantId": "p1", "finding": "visible_acne", "reference": "observed", "margin": 0.1}]}
        calibration = {"calibrationSplit": "validation", "calibrationDatasetVersion": "dataset-v1", "modelVersion": "model-v1", "promptVersion": "prompt-v1", "thresholds": {"visible_acne": {"notObservedAtOrBelow": -1, "observedAtOrAbove": 1}}}
        self.assertEqual(prepare(scores, calibration)["records"][0]["predicted"], "unassessable")
        calibration["calibrationSplit"] = "test"
        with self.assertRaises(ValueError):
            prepare(scores, calibration)


if __name__ == "__main__":
    unittest.main()
