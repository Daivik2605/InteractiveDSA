#!/usr/bin/env python3
"""Run every `output` question's code and compare its stdout with the stored correct option.

Usage: python3 scripts/check_outputs.py [--dir content/questions]

An output question passes when its code exits cleanly, prints exactly one line, and that line
equals options[answer]. Exits 1 if any question fails (or a file can't be read), else 0.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

TIMEOUT_SECONDS = 10


def run_code(code: str) -> tuple[str | None, str | None]:
    """Returns (stdout, error). `-I` ignores the environment and the current directory."""
    with tempfile.TemporaryDirectory() as cwd:
        try:
            proc = subprocess.run(
                [sys.executable, "-I", "-c", code],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
                cwd=cwd,
            )
        except subprocess.TimeoutExpired:
            return None, f"timed out after {TIMEOUT_SECONDS}s"
    if proc.returncode != 0:
        last = proc.stderr.strip().splitlines()[-1] if proc.stderr.strip() else f"exit code {proc.returncode}"
        return None, f"code raised: {last}"
    return proc.stdout, None


def check_question(q: dict) -> str | None:
    """Returns a problem description, or None when the question is fine."""
    code = q.get("code")
    if not code:
        return "output question has no code"
    stdout, error = run_code(code)
    if error:
        return error
    lines = stdout.splitlines()
    if len(lines) != 1:
        return f"code must print exactly one line, printed {len(lines)}"
    expected = q["options"][q["answer"]]
    if lines[0] != expected:
        return f"prints {lines[0]!r} but the correct option is {expected!r}"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dir", default=str(Path(__file__).resolve().parent.parent / "content" / "questions"))
    args = parser.parse_args()

    if sys.version_info < (3, 11):
        print(f"warning: running on Python {sys.version.split()[0]}; questions target Python 3.11", file=sys.stderr)

    checked = 0
    failures = 0
    for path in sorted(Path(args.dir).glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"✗ {path.name}: cannot read ({exc})")
            failures += 1
            continue
        for q in data.get("questions", []):
            if q.get("type") != "output":
                continue
            checked += 1
            problem = check_question(q)
            if problem:
                failures += 1
                print(f"✗ {path.name} {q.get('id', '?')}: {problem}")
            else:
                print(f"✓ {path.name} {q['id']}")

    print(f"\n{checked} output question(s) checked, {failures} problem(s).")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
