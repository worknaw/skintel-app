import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from PIL import Image

import explore_acne04


class ExplorationTests(unittest.TestCase):
    def test_selects_training_rows_and_does_not_persist_image_or_signed_url(self):
        buffer = io.BytesIO()
        Image.new("RGB", (8, 8), "white").save(buffer, format="PNG")
        revision = "a" * 40
        signed_url = f"https://datasets-server.huggingface.co/cached-assets/Layered-Labs/ACNE04/--/{revision}/--/image.png?secret=signature"
        rows = [
            {"row_idx": 0, "row": {"split": "test"}},
            {"row_idx": 1, "row": {"split": "train", "image": {"src": signed_url}, "level": 0, "num_lesions_annotated": 3}},
        ]
        metadata = MagicMock()
        metadata.json.return_value = {"rows": rows}
        image_response = MagicMock()
        image_response.status_code = 200
        image_response.iter_content.return_value = [buffer.getvalue()]
        image_response.__enter__.return_value = image_response
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "result.json"
            with patch.object(sys, "argv", ["explore_acne04.py", "--output", str(output), "--limit", "1"]), \
                 patch.object(explore_acne04.requests, "get", side_effect=[metadata, image_response]), \
                 patch.object(explore_acne04, "load_model", return_value=(None, None)), \
                 patch.object(explore_acne04, "score_image", return_value=(0.2, 0.1)):
                explore_acne04.main()
            report = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(report["records"][0]["rowIndex"], 1)
            self.assertEqual(report["revision"], revision)
            self.assertNotIn("signature", json.dumps(report))
            self.assertEqual(len(list(Path(folder).iterdir())), 1)

    def test_rejects_image_from_another_host(self):
        metadata = MagicMock()
        metadata.json.return_value = {"rows": [{"row_idx": 0, "row": {"split": "train", "image": {"src": "https://example.org/image.png"}}}]}
        with tempfile.TemporaryDirectory() as folder, \
             patch.object(sys, "argv", ["explore_acne04.py", "--output", str(Path(folder) / "output.json"), "--limit", "1"]), \
             patch.object(explore_acne04.requests, "get", return_value=metadata), \
             patch.object(explore_acne04, "load_model", return_value=(None, None)):
            with self.assertRaisesRegex(ValueError, "Unexpected image source"):
                explore_acne04.main()


if __name__ == "__main__":
    unittest.main()
