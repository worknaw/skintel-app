import io
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import UUID

import httpx
from PIL import Image, ImageDraw

import serve_https_scan as scanner

TESTER = UUID("6ed921ce-2e5b-453b-95fd-81ac451e681a")
HEADERS = {"Authorization": "Bearer allowed", "X-SkinCycle-Consent": scanner.CONSENT_VERSION}


def sample_jpeg():
    with Image.new("RGB", (256, 256), "#424b54") as image:
        ImageDraw.Draw(image).rectangle((128, 0, 255, 255), fill="#d1dbdf")
        stream = io.BytesIO()
        image.save(stream, format="JPEG")
        return stream.getvalue()


class HttpsScannerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        settings = scanner.Settings("https://auth.example.com", "sb_publishable_test", frozenset({TESTER}), Path("."))
        self.auth_requests = []

        def supabase(request):
            self.auth_requests.append(request)
            match request.headers["authorization"]:
                case "Bearer allowed":
                    return httpx.Response(200, json={"id": str(TESTER)})
                case "Bearer unknown-user":
                    return httpx.Response(200, json={"id": "8c06195f-eb05-4fa8-97b6-97f1781d615c"})
                case "Bearer auth-offline":
                    raise httpx.ConnectError("offline")
                case _:
                    return httpx.Response(401)

        auth = httpx.AsyncClient(base_url=settings.supabase_url, transport=httpx.MockTransport(supabase))
        app = scanner.create_app(settings)
        self.client = await self.enterAsyncContext(
            httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="https://testserver")
        )
        self.enterContext(patch.object(scanner.httpx, "AsyncClient", return_value=auth))
        self.enterContext(patch.object(scanner, "load_model", return_value=(None, None)))
        self.infer = self.enterContext(patch.object(scanner, "research_result", return_value={"mode": "research"}))
        await self.enterAsyncContext(app.router.lifespan_context(app))

    async def test_health_verifies_user_with_supabase(self):
        response = await self.client.get("/health", headers=HEADERS)
        self.assertEqual(response.json(), {"mode": "research", "ready": True})
        request = self.auth_requests[0]
        self.assertEqual(str(request.url), "https://auth.example.com/auth/v1/user")
        self.assertEqual(request.headers["apikey"], "sb_publishable_test")
        self.assertEqual(request.content, b"")

    async def test_plain_http_and_missing_consent_do_not_reach_auth(self):
        self.assertEqual((await self.client.get("http://testserver/health", headers=HEADERS)).status_code, 403)
        self.assertEqual((await self.client.post("/scan", headers={"Authorization": "Bearer allowed"})).status_code, 403)
        self.assertEqual(self.auth_requests, [])
        self.infer.assert_not_called()

    async def test_missing_expired_unlisted_and_unverifiable_sessions_are_rejected(self):
        headers = {"X-SkinCycle-Consent": scanner.CONSENT_VERSION}
        self.assertEqual((await self.client.post("/scan", headers=headers)).status_code, 401)
        for token, expected_status in (("expired", 401), ("unknown-user", 403), ("auth-offline", 503)):
            with self.subTest(token=token):
                response = await self.client.post("/scan", headers={**headers, "Authorization": f"Bearer {token}"})
                self.assertEqual(response.status_code, expected_status)
        self.infer.assert_not_called()

    async def test_rejects_bad_format_and_oversized_stream_before_inference(self):
        async def oversized():
            yield b"123"
            yield b"45"

        self.assertEqual((await self.client.post("/scan", headers=HEADERS, content=b"invalid")).status_code, 415)
        jpeg_headers = {**HEADERS, "Content-Type": "image/jpeg"}
        with patch.object(scanner, "MAX_BYTES", 4):
            response = await self.client.post("/scan", headers=jpeg_headers, content=oversized())
        self.assertEqual(response.status_code, 413)
        response = await self.client.post("/scan", headers=jpeg_headers, content=b"not a JPEG")
        self.assertEqual(response.json(), {"error": "invalid_image"})
        self.infer.assert_not_called()

    async def test_authorized_scan_runs_inference_and_enforces_cooldown(self):
        jpeg_headers = {**HEADERS, "Content-Type": "image/jpeg"}
        photo = sample_jpeg()
        response = await self.client.post("/scan", headers=jpeg_headers, content=photo)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.json(), {"mode": "research"})
        self.assertEqual((await self.client.post("/scan", headers=jpeg_headers, content=photo)).status_code, 429)
        self.infer.assert_called_once()


if __name__ == "__main__":
    unittest.main()
