"""Local-only contract tests for the temporary camera relay.

Run: python3 -m unittest discover -s tools -p 'test_temporary_public_relay.py'
No camera, SSH connection, cloud tunnel, or external host is contacted.
"""
from contextlib import contextmanager
from email.message import Message
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
from pathlib import Path
import threading
import unittest


SPEC = importlib.util.spec_from_file_location(
    "temporary_public_relay", Path(__file__).with_name("temporary-public-relay.py")
)
relay = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(relay)

JPEG = b"\xff\xd8test frame\xff\xd9"
PNG = b"\x89PNG\r\n\x1a\ntest frameIEND\xaeB`\x82"


class FakeResponse:
    def __init__(self, data=JPEG, content_type="image/jpeg", status=200):
        self.data = data
        self.status = status
        self.headers = Message()
        if content_type:
            self.headers["Content-Type"] = content_type
        self.read_limits = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, limit):
        self.read_limits.append(limit)
        return self.data[:limit]


class FakeOpener:
    def __init__(self, response=None, on_open=None):
        self.response = response or FakeResponse()
        self.on_open = on_open
        self.calls = []

    def open(self, url, timeout):
        self.calls.append((url, timeout))
        if self.on_open:
            self.on_open()
        return self.response


@contextmanager
def running_server(handler):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(
        target=lambda: server.serve_forever(poll_interval=0.01), daemon=True
    )
    thread.start()
    try:
        yield server.server_address[1]
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def request(port, method="GET", path="/side.jpg"):
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
    try:
        connection.request(method, path)
        response = connection.getresponse()
        return response.status, dict(response.getheaders()), response.read()
    finally:
        connection.close()


class RelayTests(unittest.TestCase):
    def handler(self, opener, clock=lambda: 100):
        return relay.make_handler("http://127.0.0.1:12345", 200, clock, opener)

    def assert_uncached(self, result, status):
        code, headers, _ = result
        self.assertEqual(code, status)
        self.assertEqual(headers["Cache-Control"], "no-store, max-age=0")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertNotIn("Set-Cookie", headers)
        self.assertNotIn("Location", headers)

    def test_get_only_fixed_image_upstream_and_ignores_incoming_query(self):
        for route, data, content_type in (
            ("/side.jpg", JPEG, "image/jpeg"),
            ("/wrist.jpg", JPEG, "image/jpeg"),
            ("/front.png", PNG, "image/png"),
        ):
            with self.subTest(route=route):
                response = FakeResponse(data, content_type)
                opener = FakeOpener(response)
                with running_server(self.handler(opener)) as port:
                    result = request(port, path=route + "?_look_frame=123&url=http://other.invalid/")
                self.assert_uncached(result, 200)
                self.assertEqual(result[1]["Content-Type"], content_type)
                self.assertEqual(result[2], data)
                self.assertEqual(opener.calls, [("http://127.0.0.1:12345" + route, 4)])
                self.assertEqual(response.read_limits, [relay.MAX_BYTES + 1])

    def test_head_validates_image_but_sends_no_image_body(self):
        opener = FakeOpener()
        with running_server(self.handler(opener)) as port:
            result = request(port, "HEAD")
        self.assert_uncached(result, 200)
        self.assertEqual(result[1]["Content-Length"], str(len(JPEG)))
        self.assertEqual(result[2], b"")
        self.assertEqual(len(opener.calls), 1)

    def test_unknown_private_and_traversal_paths_never_request_upstream(self):
        opener = FakeOpener()
        paths = ("/", "/status", "/wrist_align0.jpg", "/side_raw.jpg", "/control",
                 "/../side.jpg", "/%2e%2e/side.jpg", "/%73ide.jpg", "/side.jpg/extra",
                 "http://127.0.0.1:12345/side.jpg")
        with running_server(self.handler(opener)) as port:
            for method in ("GET", "HEAD"):
                for path in paths:
                    with self.subTest(method=method, path=path):
                        result = request(port, method, path)
                        self.assert_uncached(result, 404)
                        if method == "HEAD":
                            self.assertEqual(result[2], b"")
        self.assertEqual(opener.calls, [])

    def test_mutating_and_options_methods_never_request_upstream(self):
        opener = FakeOpener()
        with running_server(self.handler(opener)) as port:
            for method in ("POST", "PUT", "DELETE", "PATCH", "OPTIONS"):
                with self.subTest(method=method):
                    self.assert_uncached(request(port, method), 405)
        self.assertEqual(opener.calls, [])

    def test_expired_lease_denies_get_and_head_without_upstream_request(self):
        opener = FakeOpener()
        with running_server(self.handler(opener, clock=lambda: 200)) as port:
            for method in ("GET", "HEAD"):
                with self.subTest(method=method):
                    result = request(port, method)
                    self.assert_uncached(result, 410)
                    if method == "HEAD":
                        self.assertEqual(result[2], b"")
        self.assertEqual(opener.calls, [])

    def test_frame_fetched_across_expiry_is_never_published(self):
        current_time = [199]
        opener = FakeOpener(on_open=lambda: current_time.__setitem__(0, 201))
        with running_server(self.handler(opener, clock=lambda: current_time[0])) as port:
            result = request(port)
        self.assert_uncached(result, 410)
        self.assertNotIn(JPEG, result[2])
        self.assertEqual(len(opener.calls), 1)

    def test_invalid_mime_status_size_and_signatures_are_unavailable(self):
        cases = (
            ("missing MIME", "/side.jpg", FakeResponse(content_type=None)),
            ("wrong MIME", "/side.jpg", FakeResponse(content_type="text/html")),
            ("non-200", "/side.jpg", FakeResponse(status=206)),
            ("empty", "/side.jpg", FakeResponse(data=b"")),
            ("large", "/side.jpg", FakeResponse(data=b"\xff\xd8" + b"x" * relay.MAX_BYTES + b"\xff\xd9")),
            ("bad JPEG prefix", "/side.jpg", FakeResponse(data=b"bad\xff\xd9")),
            ("truncated JPEG", "/side.jpg", FakeResponse(data=b"\xff\xd8bad")),
            ("bad PNG prefix", "/front.png", FakeResponse(data=b"badIEND\xaeB`\x82", content_type="image/png")),
            ("truncated PNG", "/front.png", FakeResponse(data=b"\x89PNG\r\n\x1a\nbad", content_type="image/png")),
        )
        for label, route, response in cases:
            with self.subTest(case=label):
                opener = FakeOpener(response)
                with running_server(self.handler(opener)) as port:
                    result = request(port, path=route)
                self.assert_uncached(result, 503)
                self.assertEqual(result[1]["Content-Type"], "application/json")
                self.assertEqual(result[2], b'{"error": "Camera currently unavailable"}')

    def test_upstream_failure_returns_sanitized_uncached_error(self):
        def unavailable():
            raise OSError("private upstream connection details")

        opener = FakeOpener(on_open=unavailable)
        with running_server(self.handler(opener)) as port:
            result = request(port)
        self.assert_uncached(result, 503)
        self.assertNotIn(b"private upstream", result[2])

    def test_real_http_redirect_is_not_followed_or_forwarded(self):
        upstream_paths = []

        class RedirectingUpstream(BaseHTTPRequestHandler):
            def log_message(self, *_args):
                pass

            def do_GET(self):
                upstream_paths.append(self.path)
                self.send_response(302)
                self.send_header("Location", "/private-control")
                self.send_header("Set-Cookie", "private=not-public")
                self.send_header("Content-Length", "0")
                self.end_headers()

        with running_server(RedirectingUpstream) as upstream_port:
            handler = relay.make_handler(f"http://127.0.0.1:{upstream_port}", 200, clock=lambda: 100)
            with running_server(handler) as port:
                result = request(port)
        self.assert_uncached(result, 503)
        self.assertEqual(upstream_paths, ["/side.jpg"])


if __name__ == "__main__":
    unittest.main()
