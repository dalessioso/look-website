"""Private bridge checks using temporary files; no cameras or robot access."""
import http.client
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "feed_snapshot_bridge", Path(__file__).with_name("feed-snapshot-bridge.py")
)
bridge = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bridge)
NOW = 1_800_000_000.0


def jpeg(label):
    return b"\xff\xd8" + label.encode() + b"\xff\xd9"


class SnapshotBridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        clock = patch.object(bridge.time, "time", return_value=NOW)
        clock.start()
        self.addCleanup(clock.stop)

    def write(self, name, data, age=0):
        path = self.root / name
        path.write_bytes(data)
        os.utime(path, (NOW - age, NOW - age))
        return path

    def wrist(self):
        return bridge.read_source(self.root, bridge.FILES["/wrist.jpg"][0])

    def serve(self):
        server = bridge.ThreadingHTTPServer(("127.0.0.1", 0), bridge.handler_for(self.root))
        worker = threading.Thread(target=lambda: server.serve_forever(poll_interval=0.01), daemon=True)
        worker.start()

        def close():
            server.shutdown()
            server.server_close()
            worker.join(timeout=2)

        self.addCleanup(close)
        return server.server_address[1]

    def request(self, port, path, method="GET"):
        connection = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
        try:
            connection.request(method, path)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_newest_alignment_frame_wins_regardless_of_round_number(self):
        self.write("wrist_check.jpg", jpeg("old check"), age=200)
        self.write("wrist_align0.jpg", jpeg("new pickup"), age=0.5)
        self.write("wrist_align1.jpg", jpeg("previous pickup"), age=4)
        self.write("wrist_align2.jpg", jpeg("previous pickup final"), age=3)
        self.assertEqual(self.wrist(), (jpeg("new pickup"), 0.5))

    def test_current_check_frame_remains_available_as_fallback_source(self):
        self.write("wrist_align2.jpg", jpeg("alignment"), age=5)
        self.write("wrist_check.jpg", jpeg("check"), age=1)
        self.assertEqual(self.wrist(), (jpeg("check"), 1))

    def test_partial_newest_frame_falls_back_to_fresh_complete_frame(self):
        self.write("wrist_align2.jpg", b"\xff\xd8unfinished", age=0)
        self.write("wrist_align1.jpg", jpeg("complete"), age=1)
        self.assertEqual(self.wrist(), (jpeg("complete"), 1))

    def test_missing_or_invalid_candidates_do_not_hide_valid_check_frame(self):
        self.write("wrist_align0.jpg", b"not a jpeg", age=0)
        self.write("wrist_check.jpg", jpeg("fallback"), age=2)
        self.assertEqual(self.wrist(), (jpeg("fallback"), 2))

    def test_oversized_candidate_is_rejected_before_file_contents_are_read(self):
        oversized = self.write("wrist_align2.jpg", b"", age=0)
        with oversized.open("wb") as stream:
            stream.truncate(bridge.MAX_BYTES + 1)
        os.utime(oversized, (NOW, NOW))
        self.write("wrist_align0.jpg", jpeg("small"), age=1)
        self.assertEqual(self.wrist(), (jpeg("small"), 1))

    def test_read_bound_also_rejects_file_growth_during_read(self):
        self.write("wrist_align0.jpg", jpeg("before"), age=0)
        real_open = Path.open
        reads = []

        class GrowingStream:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self, limit):
                reads.append(limit)
                return b"x" * limit

        def changing_open(path, *args, **kwargs):
            if path.name == "wrist_align0.jpg" and args == ("rb",):
                return GrowingStream()
            return real_open(path, *args, **kwargs)

        with patch.object(Path, "open", changing_open):
            with self.assertRaises(ValueError):
                self.wrist()
        self.assertEqual(reads, [bridge.MAX_BYTES + 1])

    def test_all_stale_or_future_frames_are_unavailable(self):
        self.write("wrist_align0.jpg", jpeg("stale"), age=10.01)
        self.write("wrist_align1.jpg", jpeg("future"), age=-3)
        with self.assertRaises(ValueError):
            self.wrist()

    def test_unlisted_wrist_files_are_never_used(self):
        self.write("wrist_now.jpg", jpeg("unlisted"), age=0)
        self.write("wrist_cal_centre.jpg", jpeg("calibration"), age=0)
        self.write("wrist_align3.jpg", jpeg("unlisted round"), age=0)
        with self.assertRaises(ValueError):
            self.wrist()

    def test_http_wrist_status_and_head_use_same_latest_source(self):
        frame = jpeg("alignment")
        self.write("wrist_align1.jpg", frame, age=2)
        port = self.serve()
        code, headers, data = self.request(port, "/wrist.jpg?fresh=123")
        self.assertEqual((code, data), (200, frame))
        self.assertEqual(headers["Content-Type"], "image/jpeg")
        self.assertEqual(headers["Cache-Control"], "no-store, max-age=0")
        code, headers, data = self.request(port, "/wrist.jpg", "HEAD")
        self.assertEqual((code, data), (200, b""))
        self.assertEqual(headers["Content-Length"], str(len(frame)))
        code, _, data = self.request(port, "/status")
        self.assertEqual(code, 200)
        report = json.loads(data)
        self.assertEqual(report["feeds"]["/wrist.jpg"], {"available": True, "age_seconds": 2})
        self.assertNotIn("wrist_align", data.decode())

    def test_http_expiry_removes_previous_alignment_without_touching_file(self):
        path = self.write("wrist_align2.jpg", jpeg("alignment"), age=9)
        original_mtime = path.stat().st_mtime_ns
        port = self.serve()
        self.assertEqual(self.request(port, "/wrist.jpg")[0], 200)
        with patch.object(bridge.time, "time", return_value=NOW + 2):
            self.assertEqual(self.request(port, "/wrist.jpg")[0], 503)
            status = json.loads(self.request(port, "/status")[2])
            self.assertEqual(status["feeds"]["/wrist.jpg"], {"available": False})
        self.assertEqual(path.stat().st_mtime_ns, original_mtime)

    def test_http_preserves_side_and_front_sources_and_route_scope(self):
        side = jpeg("side")
        front = b"\x89PNG\r\n\x1a\nfrontIEND\xaeB`\x82"
        self.write("side_check.jpg", side, age=1)
        self.write("front_now.png", front, age=1)
        self.write("wrist_align0.jpg", jpeg("private file"), age=0)
        port = self.serve()
        self.assertEqual(self.request(port, "/side.jpg")[2], side)
        self.assertEqual(self.request(port, "/front.png")[2], front)
        for path in ("/wrist_align0.jpg", "/../wrist_align0.jpg", "/%2e%2e/wrist_align0.jpg", "/", "/control"):
            with self.subTest(path=path):
                self.assertEqual(self.request(port, path)[0], 404)


if __name__ == "__main__":
    unittest.main()
