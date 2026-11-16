"""Android USB development bridge for local SigLIP 2 research inference."""
import io
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageOps, ImageStat, UnidentifiedImageError

from run_experiment import MODEL_ID, MODEL_REVISION, PROMPTS, load_model, score_image

HOST = "127.0.0.1"
PORT = 8765
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 25_000_000


def decode_photo(data: bytes):
    with Image.open(io.BytesIO(data), formats=["JPEG"]) as source:
        if min(source.size) < 224 or source.width * source.height > MAX_PIXELS:
            raise ValueError("invalid_dimensions")
        photo = ImageOps.exif_transpose(source).convert("RGB")
    sample = photo.convert("L")
    sample.thumbnail((224, 224))
    stats = ImageStat.Stat(sample)
    if stats.mean[0] < 38 or stats.mean[0] > 222 or stats.stddev[0] < 10:
        raise ValueError("poor_lighting")
    return photo


def research_result(photo, processor, model):
    findings = []
    for kind in PROMPTS:
        positive, negative = score_image(photo, kind, processor, model)
        findings.append({"kind": kind, "margin": positive - negative})
    return {"mode": "research", "modelVersion": f"{MODEL_ID}@{MODEL_REVISION}", "findings": findings}


def main():
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    cache = Path(__file__).resolve().parents[2] / ".venv-skin-ai" / "hf-cache"
    processor, model = load_model(False, cache)
    inference = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            self.request.settimeout(15)
            super().setup()

        def log_message(self, *_args):
            pass

        def reply(self, status, body):
            payload = json.dumps(body, allow_nan=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)

        def verify_local(self):
            if self.headers.get("Host") != f"{HOST}:{PORT}" or self.headers.get("Origin") or self.headers.get("X-SkinCycle-Pilot") != "1":
                self.reply(403, {"error": "local_only"})
                return False
            return True

        def do_GET(self):
            if self.verify_local():
                if self.path == "/health":
                    self.reply(200, {"mode": "research", "ready": True})
                else:
                    self.reply(404, {"error": "not_found"})

        def do_POST(self):
            if not self.verify_local():
                return
            if self.path != "/scan":
                self.reply(404, {"error": "not_found"})
                return
            if self.headers.get("Content-Type") != "image/jpeg":
                self.reply(415, {"error": "invalid_image"})
                return
            lengths = self.headers.get_all("Content-Length", [])
            if self.headers.get("Transfer-Encoding") or len(lengths) != 1 or len(lengths[0]) > 8 or not lengths[0].isascii() or not lengths[0].isdigit():
                self.reply(411, {"error": "invalid_image"})
                return
            size = int(lengths[0])
            if not 0 < size <= MAX_BYTES:
                self.reply(413, {"error": "invalid_image"})
                return
            if not inference.acquire(blocking=False):
                self.reply(503, {"error": "busy"})
                return
            try:
                try:
                    data = self.rfile.read(size)
                    if len(data) != size:
                        raise ValueError("invalid_image")
                    photo = decode_photo(data)
                except ValueError as error:
                    code = str(error)
                    self.reply(422, {"error": code if code in {"invalid_dimensions", "poor_lighting"} else "invalid_image"})
                    return
                except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
                    self.reply(422, {"error": "invalid_image"})
                    return

                try:
                    result = research_result(photo, processor, model)
                except Exception:
                    self.reply(500, {"error": "inference_failed"})
                    return
                self.reply(200, result)
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                inference.release()

    with ThreadingHTTPServer((HOST, PORT), Handler) as server:
        print(f"SkinCycle research scanner ready at http://{HOST}:{PORT}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
