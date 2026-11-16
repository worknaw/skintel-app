"""Apply preselected validation thresholds to research scores for the benchmark."""
import argparse
import json
import math
import sys
from pathlib import Path

FINDINGS = {"visible_acne", "visible_redness"}


def prepare(scores, calibration):
    if not isinstance(scores, dict) or not isinstance(calibration, dict):
        raise ValueError("Invalid input")
    if scores.get("split") not in {"validation", "test"} or calibration.get("calibrationSplit") != "validation":
        raise ValueError("Calibration must come from validation")
    if not all(isinstance(scores.get(k), str) and scores[k] for k in ("datasetVersion", "modelVersion", "promptVersion")):
        raise ValueError("Invalid scores metadata")
    if not isinstance(calibration.get("calibrationDatasetVersion"), str) or not calibration["calibrationDatasetVersion"]:
        raise ValueError("Missing calibration dataset version")
    if any(scores.get(k) != calibration.get(k) for k in ("modelVersion", "promptVersion")):
        raise ValueError("Calibration model/prompt does not match")
    if not isinstance(scores.get("records"), list) or not scores["records"] or not isinstance(calibration.get("thresholds"), dict):
        raise ValueError("Missing records or thresholds")
    records = []
    for record in scores["records"]:
        if not isinstance(record, dict) or record.get("finding") not in FINDINGS:
            raise ValueError("Invalid record")
        thresholds = calibration["thresholds"].get(record["finding"])
        if not isinstance(thresholds, dict):
            raise ValueError("Missing thresholds")
        low, high, margin = thresholds.get("notObservedAtOrBelow"), thresholds.get("observedAtOrAbove"), record.get("margin")
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (low, high, margin)) or low >= high:
            raise ValueError("Invalid thresholds or margin")
        prediction = "not_observed" if margin <= low else "observed" if margin >= high else "unassessable"
        records.append({k: record[k] for k in ("participantId", "imageId", "finding", "reference")} | {"predicted": prediction})
    return {"datasetVersion": scores["datasetVersion"], "split": scores["split"],
            "modelVersion": scores["modelVersion"], "calibrationDatasetVersion": calibration["calibrationDatasetVersion"],
            "promptVersion": scores["promptVersion"], "records": records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scores", required=True, type=Path)
    parser.add_argument("--calibration", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("Output already exists")
    output = prepare(json.loads(args.scores.read_text(encoding="utf-8")), json.loads(args.calibration.read_text(encoding="utf-8")))
    with args.output.open("x", encoding="utf-8") as stream:
        json.dump(output, stream, ensure_ascii=False, indent=2, allow_nan=False)
    print(f"Prepared {len(output['records'])} records for benchmark.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError) as error:
        print(f"Benchmark preparation failed: {type(error).__name__}. Check input and validation thresholds.", file=sys.stderr)
        raise SystemExit(1)
