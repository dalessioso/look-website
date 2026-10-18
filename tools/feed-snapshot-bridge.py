"""Read-only website snapshots from images already written by the running demos.

Does not open cameras, import robotics code, or issue commands. Loopback only.
"""
import argparse
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

FILES = {
    "/side.jpg": ("side_check.jpg", "image/jpeg"),
    "/front.png": ("front_now.png", "image/png"),
    "/wrist.jpg": ("wrist_check.jpg", "image/jpeg"),
}
MAX_AGE = 10
MAX_BYTES = 10 * 1024 * 1024


def read_frame(root, name):
    path = root / name
    before = path.stat()
    age = time.time() - before.st_mtime
    if age < -2 or age > MAX_AGE or before.st_size > MAX_BYTES:
        raise ValueError("No fresh frame available")
    data = path.read_bytes()
    after = path.stat()
    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
        raise ValueError("Frame is being updated")
    if name.endswith(".jpg") and not (data.startswith(b"\xff\xd8") and data.endswith(b"\xff\xd9")):
        raise ValueError("Frame is being updated")
    if name.endswith(".png") and not (data.startswith(b"\x89PNG\r\n\x1a\n") and data.endswith(b"IEND\xaeB`\x82")):
        raise ValueError("Frame is being updated")
    return data, age


def handler_for(root):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            self.respond(False)

        def do_HEAD(self):
            self.respond(True)

        def respond(self, head):
            route = urlsplit(self.path).path
            code, content_type = 200, "application/json"
            if route == "/status":
                feeds = {}
                for endpoint, (name, _) in FILES.items():
                    try:
                        _, age = read_frame(root, name)
                        feeds[endpoint] = {"available": True, "age_seconds": round(age, 2)}
                    except (OSError, ValueError):
                        feeds[endpoint] = {"available": False}
                data = json.dumps({"read_only": True, "max_frame_age_seconds": MAX_AGE, "feeds": feeds}).encode()
            elif route in FILES:
                name, content_type = FILES[route]
                try:
                    data, _ = read_frame(root, name)
                except (OSError, ValueError):
                    code, content_type, data = 503, "application/json", b'{"error":"No fresh frame available"}'
            else:
                code, data = 404, b'{"error":"Not found"}'
            self.send_response(code)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if not head:
                self.wfile.write(data)
    return Handler


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--logs", type=Path, required=True)
    parser.add_argument("--port", type=int, default=8771)
    args = parser.parse_args()
    ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(args.logs.resolve())).serve_forever()
