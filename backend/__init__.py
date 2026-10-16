"""Backend package initialization.

Ensures backend/src and backend/api are accessible in sys.path.
"""

from __future__ import annotations

import os
import sys

_backend_dir = os.path.dirname(os.path.abspath(__file__))
_src_dir = os.path.join(_backend_dir, "src")
_api_dir = os.path.join(_backend_dir, "api")

for _p in [_backend_dir, _src_dir, _api_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)
