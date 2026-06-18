#!/usr/bin/env python3
"""Small content-hash cache for deploy steps."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path


DEFAULT_STATE = Path("deploy/tmp/deploy-cache-state.json")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def iter_files(path: Path, exclude_names: set[str]) -> list[Path]:
    if path.is_file():
        return [path]
    if not path.is_dir():
        raise FileNotFoundError(path)

    files: list[Path] = []
    for root, dirs, names in os.walk(path):
        dirs[:] = sorted(name for name in dirs if name not in exclude_names)
        for name in sorted(names):
            if name in exclude_names:
                continue
            item = Path(root) / name
            if item.is_file():
                files.append(item)
    return files


def fingerprint(paths: list[Path], extras: list[str], exclude_names: set[str]) -> str:
    digest = hashlib.sha256()
    for extra in sorted(extras):
        digest.update(b"extra\0")
        digest.update(extra.encode("utf-8"))
        digest.update(b"\0")

    for path in sorted((item.resolve() for item in paths), key=lambda item: str(item)):
        for file_path in iter_files(path, exclude_names):
            resolved = file_path.resolve()
            relative = str(resolved.relative_to(path if path.is_dir() else path.parent))
            stat = resolved.stat()
            digest.update(b"file\0")
            digest.update(str(path).encode("utf-8"))
            digest.update(b"\0")
            digest.update(relative.encode("utf-8"))
            digest.update(b"\0")
            digest.update(str(stat.st_size).encode("ascii"))
            digest.update(b"\0")
            digest.update(sha256_file(resolved).encode("ascii"))
            digest.update(b"\0")
    return digest.hexdigest()


def load_state(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}
    with path.open("r", encoding="utf-8") as file:
        raw = json.load(file)
    if not isinstance(raw, dict):
        return {}
    return {str(key): str(value) for key, value in raw.items()}


def save_state(path: Path, state: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        json.dump(state, file, ensure_ascii=False, indent=2, sort_keys=True)
        file.write("\n")


def has_required_outputs(files: list[Path], dirs: list[Path]) -> bool:
    for path in files:
        if not path.is_file() or path.stat().st_size == 0:
            return False
    for path in dirs:
        if not path.is_dir():
            return False
        if not any(item.is_file() for item in path.rglob("*")):
            return False
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check or update deploy step fingerprints.")
    parser.add_argument("action", choices=("check", "mark", "digest"))
    parser.add_argument("--key", required=True)
    parser.add_argument("--state", type=Path, default=DEFAULT_STATE)
    parser.add_argument("--path", type=Path, action="append", default=[])
    parser.add_argument("--extra", action="append", default=[])
    parser.add_argument("--exclude-name", action="append", default=[])
    parser.add_argument("--require-file", type=Path, action="append", default=[])
    parser.add_argument("--require-nonempty-dir", type=Path, action="append", default=[])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    exclude_names = set(args.exclude_name)
    try:
        current = fingerprint(args.path, args.extra, exclude_names)
    except FileNotFoundError as cause:
        print(f"Falta entrada de caché: {cause}", file=sys.stderr)
        return 2

    if args.action == "digest":
        print(current)
        return 0

    state = load_state(args.state)

    if args.action == "check":
        if os.environ.get("FORCE_DEPLOY", "").lower() in {"1", "true", "yes", "sí", "si"}:
            print(current)
            return 1
        if not has_required_outputs(args.require_file, args.require_nonempty_dir):
            print(current)
            return 1
        print(current)
        return 0 if state.get(args.key) == current else 1

    state[args.key] = current
    save_state(args.state, state)
    print(current)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

