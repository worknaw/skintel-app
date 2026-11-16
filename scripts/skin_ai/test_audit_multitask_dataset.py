import unittest

from audit_multitask_dataset import audit


def record(person, split, view="front"):
    return {"participant_id": person, "session_id": "session-1", "image_id": f"{person}-{view}",
            "consent_reference": "test-only", "split": split, "view": view,
            "tasks": ["acne_detection", "mark_segmentation", "skin_type"], "skin_type_reference": "unassessable"}


class MultiTaskAuditTests(unittest.TestCase):
    def test_aggregates_three_view_sessions(self):
        data = [record("a", "train", view) for view in ("front", "left", "right")]
        data += [record("b", "validation"), record("c", "test")]
        result = audit(data)
        self.assertEqual(result["splits"]["train"]["complete_three_view_sessions"], 1)
        self.assertEqual(result["splits"]["train"]["skin_type"], 3)

    def test_rejects_person_crossing_splits(self):
        data = [record("a", "train"), record("a", "test", "left"), record("b", "validation")]
        with self.assertRaisesRegex(ValueError, "multiple splits"):
            audit(data)

    def test_rejects_skin_type_without_reference(self):
        data = [record("a", "train"), record("b", "validation"), record("c", "test")]
        del data[0]["skin_type_reference"]
        with self.assertRaisesRegex(ValueError, "independent reference"):
            audit(data)


if __name__ == "__main__":
    unittest.main()
