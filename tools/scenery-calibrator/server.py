#!/usr/bin/env python3
"""
Standalone Scenery Grid Calibration Studio Server.

Pure Python 3 stdlib HTTP server that serves the calibration UI, static
scenery/wall images from frontend/public/, and reads/writes buildArea
configurations directly in frontend/src/lib/assetsConfig.ts.
"""

from __future__ import annotations

import argparse
import http.server
import json
import math
import mimetypes
import os
import re
import tempfile
import threading
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

TOOL_DIR = Path(__file__).resolve().parent
REPO_ROOT = Path(__file__).resolve().parents[2]
INDEX_PATH = TOOL_DIR / "index.html"
DEFAULT_CONFIG_PATH = REPO_ROOT / "frontend" / "src" / "lib" / "assetsConfig.ts"
SCENERIES_DIR = REPO_ROOT / "frontend" / "public" / "sceneries"
WALLS_DIR = REPO_ROOT / "frontend" / "public" / "walls"

VALID_STATUSES = ("Doğrulandı", "Elle düzeltildi", "Güvenilmez")
ALLOWED_IMAGE_MIME = {
    ".webp": "image/webp",
    ".png": "image/png",
}

mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/png", ".png")

CONFIG_LOCK = threading.Lock()


def _skip_string(text: str, idx: int) -> int:
    """Advance past a single-, double-, or backtick-quoted JS/TS string literal."""
    quote = text[idx]
    i = idx + 1
    n = len(text)
    while i < n:
        ch = text[i]
        if ch == "\\":
            i += 2
            continue
        if ch == quote:
            return i + 1
        i += 1
    return n


def _skip_non_code(text: str, idx: int) -> int:
    """Advance past string literals and // or /* */ comments if present at idx."""
    n = len(text)
    if idx >= n:
        return idx
    ch = text[idx]
    if ch in ('"', "'", "`"):
        return _skip_string(text, idx)
    if ch == "/" and idx + 1 < n:
        nxt = text[idx + 1]
        if nxt == "/":
            nl = text.find("\n", idx + 2)
            return n if nl == -1 else nl + 1
        if nxt == "*":
            end = text.find("*/", idx + 2)
            return n if end == -1 else end + 2
    return idx


def _scan_balanced(text: str, open_idx: int, open_ch: str, close_ch: str) -> int:
    """Return index of matching close_ch for open_ch at open_idx, ignoring strings/comments."""
    if open_idx < 0 or open_idx >= len(text) or text[open_idx] != open_ch:
        raise ValueError(f"Expected {open_ch!r} at index {open_idx}")
    depth = 1
    i = open_idx + 1
    n = len(text)
    while i < n:
        skipped = _skip_non_code(text, i)
        if skipped != i:
            i = skipped
            continue
        ch = text[i]
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError(f"Unbalanced {open_ch!r} starting at index {open_idx}")


def _find_code_pattern(text: str, pattern: re.Pattern[str], start: int = 0, end: int | None = None) -> re.Match[str] | None:
    """Find pattern outside strings and comments within [start, end)."""
    limit = len(text) if end is None else end
    i = start
    while i < limit:
        skipped = _skip_non_code(text, i)
        if skipped != i:
            i = skipped
            continue
        m = pattern.match(text, i, limit)
        if m:
            return m
        i += 1
    return None


def find_assets_config_span(text: str) -> tuple[int, int]:
    """Return (brace_open, brace_close) for export const ASSETS_CONFIG ... = { ... }."""
    pat = re.compile(r"\bexport\s+const\s+ASSETS_CONFIG\b[^=]*=\s*\{")
    m = _find_code_pattern(text, pat)
    if not m:
        raise ValueError("Could not locate ASSETS_CONFIG object in assetsConfig.ts")
    open_idx = m.end() - 1
    close_idx = _scan_balanced(text, open_idx, "{", "}")
    return open_idx, close_idx


def find_sceneries_array_span(text: str) -> tuple[int, int]:
    """Return (bracket_open, bracket_close) for ASSETS_CONFIG.sceneries: [ ... ]."""
    cfg_start, cfg_end = find_assets_config_span(text)
    # Scan top-level properties of ASSETS_CONFIG so we don't match inside nested objects
    i = cfg_start + 1
    depth = 0
    pat = re.compile(r"\bsceneries\s*:\s*\[")
    while i < cfg_end:
        skipped = _skip_non_code(text, i)
        if skipped != i:
            i = skipped
            continue
        if depth == 0:
            m = pat.match(text, i, cfg_end)
            if m:
                open_idx = m.end() - 1
                close_idx = _scan_balanced(text, open_idx, "[", "]")
                return open_idx, close_idx
        ch = text[i]
        if ch in ("{", "["):
            depth += 1
        elif ch in ("}", "]"):
            depth -= 1
        i += 1
    raise ValueError("Could not locate sceneries: [...] inside ASSETS_CONFIG")


def find_default_scenery_span(text: str) -> tuple[int, int] | None:
    """Return (brace_open, brace_close) for ASSETS_CONFIG.scenery: { ... }."""
    cfg_start, cfg_end = find_assets_config_span(text)
    i = cfg_start + 1
    depth = 0
    pat = re.compile(r"\bscenery\s*:\s*\{")
    while i < cfg_end:
        skipped = _skip_non_code(text, i)
        if skipped != i:
            i = skipped
            continue
        if depth == 0:
            m = pat.match(text, i, cfg_end)
            if m:
                open_idx = m.end() - 1
                close_idx = _scan_balanced(text, open_idx, "{", "}")
                return open_idx, close_idx
        ch = text[i]
        if ch in ("{", "["):
            depth += 1
        elif ch in ("}", "]"):
            depth -= 1
        i += 1
    return None


def extract_top_level_objects(text: str, arr_open: int, arr_close: int) -> list[tuple[int, int]]:
    """Return [(obj_open, obj_close_inclusive), ...] for objects inside [arr_open, arr_close]."""
    spans: list[tuple[int, int]] = []
    i = arr_open + 1
    while i < arr_close:
        skipped = _skip_non_code(text, i)
        if skipped != i:
            i = skipped
            continue
        if text[i] == "{":
            obj_close = _scan_balanced(text, i, "{", "}")
            spans.append((i, obj_close))
            i = obj_close + 1
            continue
        i += 1
    return spans


def _extract_string_prop(obj_text: str, prop: str) -> str | None:
    pat = re.compile(rf'(?m)^\s*{re.escape(prop)}\s*:\s*("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\')')
    m = pat.search(obj_text)
    if not m:
        return None
    raw = m.group(1)
    if raw.startswith('"'):
        return json.loads(raw)
    # Single-quoted JS literal fallback
    inner = raw[1:-1].replace("\\'", "'").replace("\\\\", "\\")
    return inner


def _extract_int_prop(obj_text: str, prop: str) -> int | None:
    pat = re.compile(rf"(?m)^\s*{re.escape(prop)}\s*:\s*(-?\d+)\b")
    m = pat.search(obj_text)
    return int(m.group(1)) if m else None


def _extract_bool_prop(obj_text: str, prop: str) -> bool | None:
    pat = re.compile(rf"(?m)^\s*{re.escape(prop)}\s*:\s*(true|false)\b")
    m = pat.search(obj_text)
    if not m:
        return None
    return m.group(1) == "true"


def _find_build_area_span(obj_text: str) -> tuple[int, int, int]:
    """Return (prop_start, brace_open, brace_close) for buildArea: { ... } inside obj_text."""
    pat = re.compile(r"\bbuildArea\s*:\s*\{")
    m = _find_code_pattern(obj_text, pat)
    if not m:
        raise ValueError("Missing buildArea block in scenery object")
    brace_open = m.end() - 1
    brace_close = _scan_balanced(obj_text, brace_open, "{", "}")
    return m.start(), brace_open, brace_close


def _parse_build_area(obj_text: str) -> dict[str, dict[str, float]]:
    _, brace_open, brace_close = _find_build_area_span(obj_text)
    ba_text = obj_text[brace_open : brace_close + 1]
    corners: dict[str, dict[str, float]] = {}
    num_re = r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"
    for corner in ("top", "right", "bottom", "left"):
        c_pat = re.compile(
            rf"\b{corner}\s*:\s*\{{\s*x\s*:\s*({num_re})\s*,\s*y\s*:\s*({num_re})\s*,?\s*\}}"
        )
        m = c_pat.search(ba_text)
        if not m:
            raise ValueError(f"Missing corner {corner!r} in buildArea")
        corners[corner] = {
            "x": float(m.group(1)),
            "y": float(m.group(2)),
        }
    return corners


def parse_scenery_object(obj_text: str) -> dict[str, Any]:
    """Parse a single SceneryAssetConfig object literal from assetsConfig.ts."""
    # Mask out buildArea block before matching outer properties to avoid any collision
    _, ba_open, ba_close = _find_build_area_span(obj_text)
    outer_text = obj_text[:ba_open] + "{}" + obj_text[ba_close + 1 :]

    sc_id = _extract_string_prop(outer_text, "id")
    name = _extract_string_prop(outer_text, "name")
    src = _extract_string_prop(outer_text, "src")
    thumb = _extract_string_prop(outer_text, "thumb")
    nat_w = _extract_int_prop(outer_text, "naturalWidth")
    nat_h = _extract_int_prop(outer_text, "naturalHeight")

    if not sc_id or not name or not src or not thumb or nat_w is None or nat_h is None:
        raise ValueError(f"Incomplete scenery object metadata for id={sc_id!r}")

    return {
        "id": sc_id,
        "name": name,
        "src": src,
        "thumb": thumb,
        "naturalWidth": nat_w,
        "naturalHeight": nat_h,
        "buildArea": _parse_build_area(obj_text),
        "wall": _extract_string_prop(outer_text, "wall"),
        "verified": _extract_bool_prop(outer_text, "verified"),
        "status": _extract_string_prop(outer_text, "status"),
        "method": _extract_string_prop(outer_text, "method"),
        "reason": _extract_string_prop(outer_text, "reason"),
    }


def parse_assets_config(text: str) -> dict[str, Any]:
    """Parse all sceneries and defaultSceneryId from assetsConfig.ts text."""
    cfg_start, cfg_end = find_assets_config_span(text)
    cfg_slice = text[cfg_start:cfg_end]
    default_id = _extract_string_prop(cfg_slice, "defaultSceneryId") or "winter"

    arr_open, arr_close = find_sceneries_array_span(text)
    obj_spans = extract_top_level_objects(text, arr_open, arr_close)
    sceneries = [parse_scenery_object(text[s : e + 1]) for s, e in obj_spans]
    return {
        "defaultSceneryId": default_id,
        "count": len(sceneries),
        "sceneries": sceneries,
    }


def _round1(val: Any) -> float:
    if isinstance(val, bool) or not isinstance(val, (int, float)):
        raise ValueError(f"Coordinate must be a finite number, got {val!r}")
    fval = float(val)
    if not math.isfinite(fval):
        raise ValueError(f"Coordinate must be finite, got {val!r}")
    r = round(fval, 1)
    return 0.0 if r == 0.0 else r


def validate_and_round_build_area(raw: Any) -> dict[str, dict[str, float]]:
    """Validate incoming buildArea JSON and round all 8 coordinates to 1 decimal place."""
    if not isinstance(raw, dict):
        raise ValueError("buildArea must be an object")
    out: dict[str, dict[str, float]] = {}
    for corner in ("top", "right", "bottom", "left"):
        pt = raw.get(corner)
        if not isinstance(pt, dict):
            raise ValueError(f"buildArea.{corner} must be an object with x and y")
        if "x" not in pt or "y" not in pt:
            raise ValueError(f"buildArea.{corner} missing x or y")
        out[corner] = {
            "x": _round1(pt["x"]),
            "y": _round1(pt["y"]),
        }
    return out


def _format_coord(val: float) -> str:
    return f"{val:.1f}"


def _format_build_area_block(build_area: dict[str, dict[str, float]], base_indent: str) -> str:
    inner = base_indent + "  "
    lines = ["buildArea: {"]
    for corner in ("top", "right", "bottom", "left"):
        pt = build_area[corner]
        lines.append(f"{inner}{corner}: {{ x: {_format_coord(pt['x'])}, y: {_format_coord(pt['y'])} }},")
    lines.append(f"{base_indent}}}")
    return "\n".join(lines)


def _line_indent_at(text: str, pos: int) -> str:
    line_start = text.rfind("\n", 0, pos) + 1
    m = re.match(r"[ \t]*", text[line_start:pos])
    return m.group(0) if m else ""


def _patch_scenery_object_text(
    obj_text: str,
    rounded_area: dict[str, dict[str, float]],
    new_status: str,
    new_verified: bool | None,
) -> tuple[str, bool]:
    """Update buildArea, status, method, and optionally verified inside one object literal."""
    prop_start, _, brace_close = _find_build_area_span(obj_text)
    base_indent = _line_indent_at(obj_text, prop_start)
    formatted_ba = _format_build_area_block(rounded_area, base_indent)
    updated = obj_text[:prop_start] + formatted_ba + obj_text[brace_close + 1 :]

    # Determine standard property indent inside this object
    id_match = re.search(r"(?m)^([ \t]*)id\s*:", updated)
    prop_indent = id_match.group(1) if id_match else (base_indent)

    def _upsert_prop(src: str, prop: str, ts_value: str) -> str:
        pat = re.compile(rf"(?m)^([ \t]*{re.escape(prop)}\s*:\s*)([^,\r\n]+)(,?)")
        if pat.search(src):
            return pat.sub(rf"\g<1>{ts_value}\g<3>", src, count=1)
        # Insert right before closing brace
        closing_idx = src.rfind("}")
        prefix = src[:closing_idx].rstrip()
        if not prefix.endswith(","):
            prefix += ","
        return f"{prefix}\n{prop_indent}{prop}: {ts_value},\n{src[closing_idx:].lstrip()}"

    updated = _upsert_prop(updated, "status", json.dumps(new_status, ensure_ascii=False))
    updated = _upsert_prop(updated, "method", '"manual"')

    existing_verified = _extract_bool_prop(updated, "verified")
    if new_verified is not None:
        updated = _upsert_prop(updated, "verified", "true" if new_verified else "false")
        final_verified = new_verified
    else:
        final_verified = True if existing_verified is None else existing_verified

    return updated, final_verified


def update_scenery_in_text(
    text: str,
    scenery_id: str,
    build_area: dict[str, dict[str, float]],
    status: str | None = None,
    verified: bool | None = None,
) -> tuple[str, dict[str, Any]]:
    """Return (new_ts_text, response_payload) after updating matching scenery object(s)."""
    rounded_area = validate_and_round_build_area(build_area)
    if status is None:
        new_status = "Elle düzeltildi"
    else:
        if not isinstance(status, str) or status not in VALID_STATUSES:
            raise ValueError(f"Invalid status {status!r}; expected one of {VALID_STATUSES}")
        new_status = status

    if verified is not None and not isinstance(verified, bool):
        raise ValueError("verified must be a boolean if provided")

    cfg_start, cfg_end = find_assets_config_span(text)
    default_id = _extract_string_prop(text[cfg_start:cfg_end], "defaultSceneryId") or "winter"

    arr_open, arr_close = find_sceneries_array_span(text)
    obj_spans = extract_top_level_objects(text, arr_open, arr_close)

    target_span: tuple[int, int] | None = None
    for s, e in obj_spans:
        parsed = parse_scenery_object(text[s : e + 1])
        if parsed["id"] == scenery_id:
            target_span = (s, e)
            break

    if target_span is None:
        raise KeyError(f"Scenery id {scenery_id!r} not found")

    replacements: list[tuple[int, int, str]] = []

    t_start, t_end = target_span
    patched_item, final_verified = _patch_scenery_object_text(
        text[t_start : t_end + 1], rounded_area, new_status, verified
    )
    replacements.append((t_start, t_end, patched_item))

    if scenery_id == default_id:
        def_span = find_default_scenery_span(text)
        if def_span is not None:
            d_start, d_end = def_span
            def_obj = text[d_start : d_end + 1]
            if _extract_string_prop(def_obj, "id") == scenery_id:
                patched_def, _ = _patch_scenery_object_text(
                    def_obj, rounded_area, new_status, verified
                )
                replacements.append((d_start, d_end, patched_def))

    # Apply replacements from end to start so earlier offsets remain valid
    new_text = text
    for r_start, r_end, r_body in sorted(replacements, key=lambda x: x[0], reverse=True):
        new_text = new_text[:r_start] + r_body + new_text[r_end + 1 :]

    payload = {
        "ok": True,
        "id": scenery_id,
        "buildArea": rounded_area,
        "status": new_status,
        "method": "manual",
        "verified": final_verified,
    }
    return new_text, payload


def atomic_write_utf8_lf(path: Path, content: str) -> None:
    """Atomically write UTF-8 text with LF newlines to path."""
    fd, tmp_name = tempfile.mkstemp(
        dir=str(path.parent),
        prefix=f".{path.name}.",
        suffix=".tmp",
    )
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(content)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, path)
    except Exception:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def resolve_safe_asset(url_path: str) -> tuple[Path, str] | None:
    """Validate and resolve /sceneries/... or /walls/... against frontend/public/."""
    clean_path = unquote(urlparse(url_path).path)
    if "\x00" in clean_path or "\\" in clean_path:
        return None

    if clean_path.startswith("/sceneries/"):
        base_dir = SCENERIES_DIR.resolve()
        rel = clean_path[len("/sceneries/") :]
    elif clean_path.startswith("/walls/"):
        base_dir = WALLS_DIR.resolve()
        rel = clean_path[len("/walls/") :]
    else:
        return None

    parts = [p for p in rel.split("/") if p]
    if not parts or any(p in (".", "..") for p in parts):
        return None

    candidate = (base_dir / Path(*parts)).resolve()
    if candidate == base_dir or not candidate.is_relative_to(base_dir):
        return None

    mime = ALLOWED_IMAGE_MIME.get(candidate.suffix.lower())
    if not mime or not candidate.is_file():
        return None
    return candidate, mime


class CalibratorHandler(http.server.BaseHTTPRequestHandler):
    """HTTP request handler for the standalone Scenery Calibrator Studio."""

    config_path: Path = DEFAULT_CONFIG_PATH
    server_version = "SceneryCalibrator/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        # Concise single-line stdout logging
        print(f"[{self.address_string()}] {format % args}")

    def _send_bytes(self, status: int, content_type: str, data: bytes, cache_control: str = "no-cache") -> None:
        try:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", cache_control)
            self.end_headers()
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _send_json(self, status: int, payload: Any) -> None:
        raw = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self._send_bytes(status, "application/json; charset=utf-8", raw, cache_control="no-store")

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/" or path == "/index.html":
            if not INDEX_PATH.is_file():
                self._send_json(404, {"ok": False, "error": "index.html not found"})
                return
            self._send_bytes(
                200,
                "text/html; charset=utf-8",
                INDEX_PATH.read_bytes(),
                cache_control="no-cache",
            )
            return

        if path == "/api/sceneries":
            try:
                with CONFIG_LOCK:
                    text = self.config_path.read_text(encoding="utf-8")
                data = parse_assets_config(text)
                self._send_json(200, {"ok": True, **data})
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": str(exc)})
            return

        if path.startswith("/sceneries/") or path.startswith("/walls/"):
            resolved = resolve_safe_asset(self.path)
            if not resolved:
                self._send_json(404, {"ok": False, "error": "Asset not found or forbidden"})
                return
            asset_path, mime = resolved
            self._send_bytes(200, mime, asset_path.read_bytes(), cache_control="public, max-age=3600")
            return

        self._send_json(404, {"ok": False, "error": "Not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path).rstrip("/")
        prefix = "/api/sceneries/"
        if not path.startswith(prefix):
            self._send_json(404, {"ok": False, "error": "Not found"})
            return

        scenery_id = path[len(prefix) :]
        if not scenery_id or "/" in scenery_id:
            self._send_json(400, {"ok": False, "error": "Invalid scenery id"})
            return

        try:
            content_len = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"ok": False, "error": "Invalid Content-Length"})
            return

        if content_len <= 0 or content_len > 1_000_000:
            self._send_json(400, {"ok": False, "error": "Invalid request body size"})
            return

        try:
            body_bytes = self.rfile.read(content_len)
            body = json.loads(body_bytes.decode("utf-8"))
        except Exception as exc:
            self._send_json(400, {"ok": False, "error": f"Invalid JSON body: {exc}"})
            return

        if not isinstance(body, dict):
            self._send_json(400, {"ok": False, "error": "JSON body must be an object"})
            return

        try:
            with CONFIG_LOCK:
                text = self.config_path.read_text(encoding="utf-8")
                new_text, resp = update_scenery_in_text(
                    text,
                    scenery_id=scenery_id,
                    build_area=body.get("buildArea"),
                    status=body.get("status"),
                    verified=body.get("verified"),
                )
                atomic_write_utf8_lf(self.config_path, new_text)
            self._send_json(200, resp)
        except KeyError as exc:
            self._send_json(404, {"ok": False, "error": str(exc)})
        except ValueError as exc:
            self._send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self._send_json(500, {"ok": False, "error": str(exc)})


def make_server(host: str, port: int, config_path: Path = DEFAULT_CONFIG_PATH) -> http.server.ThreadingHTTPServer:
    """Create a configured ThreadingHTTPServer instance."""
    class BoundHandler(CalibratorHandler):
        pass

    BoundHandler.config_path = config_path
    return http.server.ThreadingHTTPServer((host, port), BoundHandler)


def main() -> None:
    parser = argparse.ArgumentParser(description="Standalone Scenery Grid Calibration Studio Server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765, help="Bind port (default: 8765)")
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help="Path to assetsConfig.ts (default: frontend/src/lib/assetsConfig.ts)",
    )
    args = parser.parse_args()

    config_path = args.config.resolve()
    if not config_path.is_file():
        raise SystemExit(f"Config file not found: {config_path}")

    server = make_server(args.host, args.port, config_path=config_path)
    actual_port = server.server_address[1]
    print(f"Scenery Calibrator Studio running at http://{args.host}:{actual_port}")
    print(f"Reading/writing config: {config_path}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
