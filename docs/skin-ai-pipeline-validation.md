# SkinCycle skin-scan pipeline v2

Implemented for the local ONNX and hosted Python endpoints, with Gemini comparison through Supabase Edge Function.
This is an evaluation-ready implementation, not a newly trained or clinically
validated model. Restart the local service or deploy the updated Python API before
the app receives the new quality errors. No production deployment is performed
by adding these files.

Focused checks (API tests need `httpx==0.28.1`, also pinned in requirements-https.txt):

```powershell
.\.venv-skin-ai\Scripts\python.exe -m unittest discover -s scripts/skin_ai -p test_acne_pipeline.py -v
.\.venv-skin-ai\Scripts\python.exe -m unittest discover -s scripts/skin_ai -p test_acne_api.py -v
npm run typecheck
```

## Behavior

- Basic whole-image exposure and Laplacian sharpness checks run before inference.
- A separate MIT-licensed UltraFace/RFB-320 ONNX model requires exactly one sufficiently large, centered face. Invalid captures return a specific face-quality error.
- YOLO class 1 is reported as `acne`; class 2 is reported as a redness/rosacea proxy. It is not a dedicated dark-mark model.
- Gemini receives onboarding answers plus detector counts, must preserve those counts, and returns `ยังประเมินไม่ได้` when visual evidence is unclear or conflicts with the questionnaire.
  Rejected images return HTTP 422 with a retake reason; no zero-acne result is saved.
- These thresholds are provisional heuristics. They do not detect a face, pose,
  makeup, or uneven lighting, and may reject usable images or accept unsuitable ones.
  Measure rejection rates across skin tones and devices before rollout.
- Full-frame inference is the default. An optional experiment uses the full frame
  plus four overlapping 65% crops, maps boxes to the original image, then applies
  IoU suppression. This may miss or double-count lesions and costs five inferences.
  It is not anatomical face cropping or multi-view fusion.
- API results include quality metrics, configuration, and a configuration fingerprint
  in modelVersion, so existing history distinguishes different pipeline settings.
- The result screen reports candidate points, not an unvalidated skin-health score.
  Legacy score storage and routine personalization remain for schema compatibility.

Server environment settings (restart after changing):

```text
SKINCYCLE_ACNE_CONFIDENCE=0.25
SKINCYCLE_ACNE_NMS_IOU=0.5
SKINCYCLE_ACNE_TILED=0
```

## Local labelled benchmark

Put images and a manifest in the ignored `skin-ai-data/` directory. Each image must
have reviewed annotations; an empty list means a reviewed negative, not missing
labels. Coordinates are normalized to the EXIF-corrected image. Include all splits
in one manifest so the tool can reject participant overlap. Use pseudonymous IDs.
Example structure (replace with real consented images and verified labels):

```json
[
  {"participant_id":"p1","image":"p1-front.jpg","split":"validation","consent_reference":"record-1","boxes":[[0.1,0.2,0.15,0.25]]},
  {"participant_id":"p2","image":"p2-front.jpg","split":"test","consent_reference":"record-2","boxes":[]}
]
```

Compare thresholds and crop mode on validation only:

```powershell
.\.venv-skin-ai\Scripts\python.exe scripts/skin_ai/benchmark_acne_pipeline.py skin-ai-data/manifest.json --split validation --confidence 0.25 0.4 0.55 --mode compare --output skin-ai-data/validation-v1.json
```

After choosing settings, evaluate a single frozen configuration on test:

```powershell
.\.venv-skin-ai\Scripts\python.exe scripts/skin_ai/benchmark_acne_pipeline.py skin-ai-data/manifest.json --split test --confidence 0.4 --mode full --output skin-ai-data/test-v1.json
```

The `0.4` above is an example, not a recommended or calibrated threshold. Reports
contain model/manifest hashes, accepted-image precision and recall at IoU 0.5,
count MAE, rejection coverage and elapsed runtime. Rejections are not true negatives.
Compare on the same dataset and review coverage, false positives and missed lesions
together. The report excludes images and participant identifiers.

Remaining work needs real evidence: expert annotations, independent data provenance
review, device/skin-tone subgroup analysis, repeat-capture stability, face-region
  detection, multiple-view capture and deduplication, custom training, and separate
validated models for marks/skin type. Do not claim improved accuracy from synthetic
tests or switch the default to tiled mode solely because it finds more points.

## Three local demo images

The ignored `skin-ai-data/demo-ready/` folder contains three padded, local-only images
that pass the new face gate. They are for classroom demonstration, not ground truth:

```text
01-low-acne-padded.jpg
02-medium-acne-padded.jpg
03-redness-padded.jpg
```

`expected-results.json` is only a human-readable reference. Run the API on all three
and compare face quality, acne/redness counts, and Gemini output. Do not report 80%
accuracy from three images; a real accuracy claim needs a held-out, consented set with
expert-reviewed labels.
