"""Publish three read-only camera snapshots through a bounded Cloudflare tunnel.

The upstream is a local SSH forward, never a camera device or robot API.
"""
import argparse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.client import HTTPException
import json
from pathlib import Path
import re
import shutil
import signal
import subprocess
import threading
import tempfile
import time
import urllib.error
import urllib.request

ROUTES = {"/side.jpg": "image/jpeg", "/front.png": "image/png", "/wrist.jpg": "image/jpeg"}
MAX_BYTES = 10 * 1024 * 1024


class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        return None


def make_handler(upstream, expires_at, clock=time.time, opener=None):
    opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirects())

    class Handler(BaseHTTPRequestHandler):
        server_version = "LookRelay"
        sys_version = ""

        def log_message(self, *_args):
            pass

        def send_data(self, code, content_type, data, head=False):
            self.send_response(code)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if not head:
                try:
                    self.wfile.write(data)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        def reject(self, code, message, head=False):
            self.send_data(code, "application/json", json.dumps({"error": message}).encode(), head)

        def do_GET(self):
            self.respond(False)

        def do_HEAD(self):
            self.respond(True)

        def do_POST(self):
            self.reject(405, "Read-only image relay")

        do_PUT = do_DELETE = do_PATCH = do_OPTIONS = do_POST

        def respond(self, head):
            # Match the literal path; never decode traversal or forward queries.
            route = self.path.split("?", 1)[0]
            if clock() >= expires_at:
                self.reject(410, "Live session ended", head)
                return
            if route not in ROUTES:
                self.reject(404, "Not found", head)
                return
            try:
                with opener.open(upstream + route, timeout=4) as response:
                    content_type = response.headers.get_content_type()
                    if response.status != 200 or content_type != ROUTES[route]:
                        raise ValueError("Invalid upstream image")
                    data = response.read(MAX_BYTES + 1)
                if not data or len(data) > MAX_BYTES:
                    raise ValueError("Invalid image size")
                if route.endswith(".jpg") and not (data.startswith(b"\xff\xd8") and data.endswith(b"\xff\xd9")):
                    raise ValueError("Invalid JPEG")
                if route.endswith(".png") and not (data.startswith(b"\x89PNG\r\n\x1a\n") and data.endswith(b"IEND\xaeB`\x82")):
                    raise ValueError("Invalid PNG")
            except (OSError, ValueError, HTTPException, urllib.error.URLError):
                self.reject(503, "Camera currently unavailable", head)
                return
            # A request started before expiry must not publish after expiry.
            if clock() >= expires_at:
                self.reject(410, "Live session ended", head)
                return
            self.send_data(200, content_type, data, head)

    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--upstream-port", type=int, default=18771)
    parser.add_argument("--port", type=int, default=18772)
    parser.add_argument("--duration", type=int, default=7200, help="Seconds, maximum two hours")
    parser.add_argument("--config-output", type=Path, required=True)
    args = parser.parse_args()
    if not 1 <= args.duration <= 7200 or not all(1 <= port <= 65535 for port in (args.port, args.upstream_port)):
        parser.error("Use valid ports and a duration of 1–7200 seconds")
    cloudflared = shutil.which("cloudflared")
    if not cloudflared:
        parser.error("Install the official cloudflared command before starting the relay")
    deadline = time.time() + args.duration
    expiry = datetime.fromtimestamp(deadline, timezone.utc).isoformat().replace("+00:00", "Z")
    monotonic_deadline = time.monotonic() + args.duration
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(f"http://127.0.0.1:{args.upstream_port}", monotonic_deadline, clock=time.monotonic))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    # Keep unrelated installed tunnel configurations out of this temporary run.
    isolated_config = tempfile.NamedTemporaryFile(mode="w", suffix=".yml", prefix="look-public-relay-", delete=False)
    isolated_config.write("{}\n")
    isolated_config.close()
    tunnel = subprocess.Popen([
        cloudflared, "tunnel", "--config", isolated_config.name, "--no-autoupdate", "--url", f"http://127.0.0.1:{args.port}",
        # Use TCP transport on the booth network, which dropped the UDP/QUIC
        # connection during a network change. TLS verification stays enabled.
        "--protocol", "http2", "--metrics", "127.0.0.1:0", "--loglevel", "info",
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    def stop_tunnel():
        if tunnel.poll() is None:
            tunnel.terminate()
            try:
                tunnel.wait(timeout=5)
            except subprocess.TimeoutExpired:
                tunnel.kill()
    timer = threading.Timer(args.duration, stop_tunnel)
    timer.daemon = True
    timer.start()
    print(f"Public camera lease expires at {expiry}", flush=True)
    published = False
    # A normal process stop must also close this run's owned tunnel.
    def interrupt(_signum, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, interrupt)
    try:
        for line in tunnel.stdout:
            match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
            if match and not published:
                config = {"baseUrl": match.group(), "expiresAt": expiry}
                args.config_output.parent.mkdir(parents=True, exist_ok=True)
                temporary = args.config_output.with_suffix(".tmp")
                temporary.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
                temporary.replace(args.config_output)
                print(json.dumps(config), flush=True)
                published = True
            elif "Registered tunnel connection" in line or "ERR" in line:
                print(line.rstrip(), flush=True)
    except KeyboardInterrupt:
        pass
    finally:
        timer.cancel()
        stop_tunnel()
        server.shutdown()
        server.server_close()
        Path(isolated_config.name).unlink(missing_ok=True)
        print("Public camera relay stopped.", flush=True)


if __name__ == "__main__":
    main()
