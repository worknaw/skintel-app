import json
import tempfile
import unittest
from pathlib import Path

from prepare_yolo_split import prepare


class SplitTests(unittest.TestCase):
    def test_people_never_cross_partitions_and_output_is_reproducible(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            images = root / "images"
            labels = root / "labels"
            images.mkdir()
            labels.mkdir()
            rows = []
            for owner in range(10):
                for index in range(2):
                    name = f"person{owner}_{index}"
                    (images / f"{name}.jpg").write_bytes(b"placeholder")
                    (labels / f"{name}.txt").write_text("0 0.5 0.5 0.1 0.1\n", encoding="utf-8")
                    rows.append({"participant_id": f"person{owner}", "consent_reference": "test-only", "image": f"{name}.jpg"})
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps(rows), encoding="utf-8")
            summary = prepare(manifest, images, root / "first")
            prepare(manifest, images, root / "second")
            self.assertEqual(sum(item["images"] for item in summary.values()), 20)
            self.assertEqual((root / "first" / "train.txt").read_text(), (root / "second" / "train.txt").read_text())
            splits = []
            for name in ("train", "val", "test"):
                paths = (root / "first" / f"{name}.txt").read_text().splitlines()
                splits.append({Path(path).stem.rsplit("_", 1)[0] for path in paths})
            self.assertFalse(splits[0] & splits[1] or splits[0] & splits[2] or splits[1] & splits[2])


if __name__ == "__main__":
    unittest.main()
