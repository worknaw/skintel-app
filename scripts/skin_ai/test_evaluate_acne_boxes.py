import unittest
from evaluate_acne_boxes import iou, match_boxes


class BoxMatchingTests(unittest.TestCase):
    def test_exact_and_non_overlapping(self):
        self.assertEqual(iou((0, 0, 1, 1), (0, 0, 1, 1)), 1)
        self.assertEqual(iou((0, 0, .2, .2), (.8, .8, 1, 1)), 0)

    def test_only_one_detection_can_match_a_reference(self):
        boxes = [{'x': .1, 'y': .1, 'width': .2, 'height': .2, 'confidence': .9},
                 {'x': .1, 'y': .1, 'width': .2, 'height': .2, 'confidence': .8}]
        self.assertEqual(match_boxes(boxes, [(.1, .1, .3, .3)]), (1, 1, 0))
