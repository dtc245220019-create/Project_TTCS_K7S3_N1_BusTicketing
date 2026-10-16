"""Backend Core Source Code package.

Contains core database management, payment gateway integrations, notifications,
ticket operations, boarding validations, seed data, and AI engine.
"""

from __future__ import annotations

import os
import sys

_src_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_src_dir)
_api_dir = os.path.join(_backend_dir, "api")

for _p in [_backend_dir, _src_dir, _api_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)
