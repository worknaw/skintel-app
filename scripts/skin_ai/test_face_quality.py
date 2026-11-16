import unittest
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
from PIL import Image

from face_quality import detect_faces, require_scan_face


class FaceQualityTests(unittest.TestCase):
    def session(self, entries):
        scores = np.zeros((1, 4420, 2), dtype=np.float32)
        boxes = np.zeros((1, 4420, 4), dtype=np.float32)
        for index, (score, box) in enumerate(entries):
            scores[0, index, 1] = score
            boxes[0, index] = box
        session = Mock()
        session.get_inputs.return_value = [SimpleNamespace(name="input")]
        session.run.return_value = [scores, boxes]
        return session

    def test_accepts_one_centered_face(self):
        result = require_scan_face(Image.new("RGB", (640, 640)), self.session([(.9, (.2, .12, .8, .9))]))
        self.assertGreater(result["box"]["width"], .5)

    def test_rejects_missing_multiple_small_and_off_center_faces(self):
        cases = [
            ([], "face_not_found"),
            ([(.9, (.15, .15, .55, .65)), (.85, (.55, .15, .9, .65))], "multiple_faces"),
            ([(.9, (.4, .4, .6, .6))], "face_too_far"),
            ([(.9, (.05, .2, .45, .7))], "face_not_centered"),
        ]
        for entries, message in cases:
            with self.subTest(message=message), self.assertRaisesRegex(ValueError, message):
                require_scan_face(Image.new("RGB", (640, 640)), self.session(entries))

    def test_nms_merges_overlapping_face_boxes(self):
        faces = detect_faces(Image.new("RGB", (640, 640)), self.session([(.9, (.2, .2, .8, .8)), (.8, (.21, .21, .79, .79))]))
        self.assertEqual(len(faces), 1)


if __name__ == "__main__":
    unittest.main()
