"""Audit a private, consented multi-view dataset before model development.

This tool produces aggregate counts only. It does not train a model or claim
that labels are medically valid. The input manifest must remain outside Git.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

SPLITS = {"train", "validation", "test"}
VIEWS = {"front", "left", "right"}
TASKS = {"acne_detection", "mark_segmentation", "skin_type"}
SKIN_TYPES = {"dry", "oily", "combination", "normal", "unassessable"}


def audit(records: object) -> dict:
    if not isinstance(records, list) or not records:
        raise ValueError("Manifest must be a nonempty JSON array")
    owners: dict[str, str] = {}
    sessions: dict[tuple[str, str], set[str]] = defaultdict(set)
    images: set[str] = set()
    counts: dict[str, Counter] = {split: Counter() for split in SPLITS}
    for row in records:
        if not isinstance(row, dict):
            raise ValueError("Each record must be an object")
        participant, session, image = (row.get(key) for key in ("participant_id", "session_id", "image_id"))
        if any(not isinstance(value, str) or not value.strip() for value in (participant, session, image, row.get("consent_reference"))):
            raise ValueError("Participant, session, image and consent references are required")
        split, view = row.get("split"), row.get("view")
        if split not in SPLITS or view not in VIEWS:
            raise ValueError("Invalid split or view")
        if image in images:
            raise ValueError("Duplicate image ID")
        images.add(image)
        if participant in owners and owners[participant] != split:
            raise ValueError("Participant appears in multiple splits")
        owners[participant] = split
        session_views = sessions[(participant, session)]
        if view in session_views:
            raise ValueError("Duplicate view in a capture session")
        session_views.add(view)
        tasks = row.get("tasks")
        if not isinstance(tasks, list) or not tasks or any(task not in TASKS for task in tasks) or len(tasks) != len(set(tasks)):
            raise ValueError("Invalid task list")
        if "skin_type" in tasks and row.get("skin_type_reference") not in SKIN_TYPES:
            raise ValueError("Skin type needs an independent reference or unassessable")
        counts[split]["images"] += 1
        counts[split][f"view_{view}"] += 1
        for task in tasks:
            counts[split][task] += 1
    if set(owners.values()) != SPLITS:
        raise ValueError("Each split must contain at least one participant")
    summary = {}
    for split in sorted(SPLITS):
        people = {person for person, assigned in owners.items() if assigned == split}
        owner_sessions = [views for (person, _), views in sessions.items() if person in people]
        summary[split] = {"participants": len(people), "sessions": len(owner_sessions),
                          "complete_three_view_sessions": sum(views == VIEWS for views in owner_sessions),
                          **dict(counts[split])}
    return {"splits": summary, "warning": "Counts do not establish consent, label quality, or model accuracy."}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    print(json.dumps(audit(json.loads(args.manifest.read_text(encoding="utf-8"))), indent=2))


if __name__ == "__main__":
    main()
