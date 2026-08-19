#!/usr/bin/env python3
"""Unit tests for build.py fetch retry + hard-fail behavior.

Regression guard for the 2026-08-19 outage: a transient Fibery 429 during
the production build must NOT ship the under-construction fallback. The
build retries, then exits non-zero so CI fails and the previous deploy
stays live. The fallback is reserved for deliberate paths only (no token,
or Site Mode = under-construction).

Usage: python3 tests/test_build_fetch_retry.py
"""

import sys
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import build  # noqa: E402


def _http_429():
    return urllib.error.HTTPError(
        "https://subscript.fibery.io/api/commands", 429,
        "Too Many Requests", hdrs=None, fp=None,
    )


class FetchAllWithRetryTests(unittest.TestCase):
    def test_success_first_try_no_retry(self):
        with mock.patch.object(build, "fetch_all",
                               return_value=({"Home": {}}, {})) as fa:
            content, files = build.fetch_all_with_retry("tok", attempts=3,
                                                        base_delay=0)
        self.assertEqual(content, {"Home": {}})
        self.assertEqual(fa.call_count, 1)

    def test_transient_429_then_success_retries(self):
        with mock.patch.object(
            build, "fetch_all",
            side_effect=[_http_429(), _http_429(), ({"Home": {}}, {})],
        ) as fa:
            content, _ = build.fetch_all_with_retry("tok", attempts=3,
                                                    base_delay=0)
        self.assertEqual(content, {"Home": {}})
        self.assertEqual(fa.call_count, 3)

    def test_persistent_failure_raises_after_exhausting_attempts(self):
        with mock.patch.object(build, "fetch_all",
                               side_effect=_http_429()) as fa:
            with self.assertRaises(urllib.error.HTTPError):
                build.fetch_all_with_retry("tok", attempts=3, base_delay=0)
        self.assertEqual(fa.call_count, 3)


class MainFailsClosedTests(unittest.TestCase):
    """A fetch error in main() must exit non-zero, never build the fallback."""

    def test_fetch_error_exits_nonzero_and_never_builds_fallback(self):
        with mock.patch.object(build, "get_token", return_value="tok"), \
             mock.patch.object(build, "fetch_all", side_effect=_http_429()), \
             mock.patch.object(build.time, "sleep"), \
             mock.patch.object(build.shutil, "rmtree") as rmtree, \
             mock.patch.object(build.os, "makedirs") as makedirs, \
             mock.patch.object(sys, "argv", ["build.py", "--env=production"]):
            with self.assertRaises(SystemExit) as ctx:
                build.main()
        self.assertNotEqual(ctx.exception.code, 0)
        # dist/ must be untouched: no rmtree of the old build, no new dirs
        rmtree.assert_not_called()
        makedirs.assert_not_called()


if __name__ == "__main__":
    unittest.main(verbosity=2)
