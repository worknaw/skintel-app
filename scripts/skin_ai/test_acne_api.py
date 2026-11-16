import io
import unittest
from unittest.mock import Mock, patch

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from api import skin_scan as hosted
from scripts.skin_ai import serve_prototype_onnx as local
from scripts.skin_ai.acne_pipeline import ScanConfig


def jpeg(image):
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=95)
    return output.getvalue()


class EndpointTests(unittest.TestCase):
    def test_dark_image_rejected_before_hosted_inference(self):
        with patch.object(hosted, "verify_user", return_value="test-user"), \
                patch.object(hosted, "rate_limit"), patch.object(hosted, "get_session") as session, \
                patch.object(hosted, "require_scan_face"):
            client = TestClient(hosted.app)
            response = client.post("/api/skin_scan", content=jpeg(Image.new("RGB", (640, 640))),
                                   headers={"Content-Type": "image/jpeg"})
            self.assertEqual(response.status_code, 422)
            self.assertEqual(response.json()["detail"], "image_too_dark")
            session.assert_not_called()

    def test_local_quality_rejection_and_authorization(self):
        local.app.state.session = Mock()
        local.app.state.face_session = Mock()
        local.app.state.config = ScanConfig()
        client = TestClient(local.app, base_url="http://127.0.0.1:8766")
        data = jpeg(Image.new("RGB", (640, 640), "white"))
        self.assertEqual(client.post("/scan", content=data).status_code, 403)
        with patch.object(local, "require_scan_face"):
            response = client.post("/scan", content=data, headers={"Content-Type": "image/jpeg", "X-SkinCycle-Pilot": "1"})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"], "image_too_bright")
        local.app.state.session.run.assert_not_called()

    def test_hosted_and_local_share_result_contract(self):
        pixels = np.random.default_rng(2).integers(60, 190, (512, 512, 3), dtype=np.uint8)
        data = jpeg(Image.fromarray(pixels))
        session = Mock()
        session.get_inputs.return_value = [Mock(name="images")]
        session.run.return_value = [np.array([[[100, 100, 200, 200, .9, 1]]])]
        local.app.state.session = session
        local.app.state.face_session = Mock()
        local.app.state.config = ScanConfig()
        with patch.object(hosted, "verify_user", return_value="test-user"), \
                patch.object(hosted, "rate_limit"), patch.object(hosted, "get_session", return_value=session), \
                patch.object(hosted.ScanConfig, "from_environment", return_value=ScanConfig()), \
                patch.object(hosted, "require_scan_face", return_value={"version": "test", "confidence": .9, "box": {}}), \
                patch.object(local, "require_scan_face", return_value={"version": "test", "confidence": .9, "box": {}}):
            a = TestClient(hosted.app).post("/api/skin_scan", content=data, headers={"Content-Type": "image/jpeg"})
            b = TestClient(local.app, base_url="http://127.0.0.1:8766").post("/scan", content=data,
                  headers={"Content-Type": "image/jpeg", "X-SkinCycle-Pilot": "1"})
        self.assertEqual(a.status_code, 200)
        self.assertEqual(b.status_code, 200)
        for key in ("acne", "quality", "pipeline", "modelVersion"):
            self.assertEqual(a.json()[key], b.json()[key])
        self.assertLessEqual(len(a.json()["modelVersion"]), 120)


if __name__ == "__main__":
    unittest.main()
