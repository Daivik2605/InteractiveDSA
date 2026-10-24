import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const python = spawnSync("python3", ["--version"]).status === 0;

function run(questions: object[]) {
  const dir = mkdtempSync(join(tmpdir(), "check-outputs-"));
  try {
    writeFileSync(join(dir, "week-01.json"), JSON.stringify({ week: 1, questions }));
    return spawnSync("python3", ["scripts/check_outputs.py", "--dir", dir], { encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const output = (id: string, code: string, correct: string) => ({
  id,
  type: "output",
  code,
  options: [correct, "x", "y", "z"],
  answer: 0,
});

describe.skipIf(!python)("scripts/check_outputs.py", () => {
  it("passes the real content", () => {
    const r = spawnSync("python3", ["scripts/check_outputs.py"], { encoding: "utf8" });
    expect(r.stdout).toMatch(/0 problem/);
    expect(r.status).toBe(0);
  });
  it("passes when stdout equals the correct option", () => {
    const r = run([output("a", "print([1, 2][0] + 1)", "2"), { id: "b", type: "bug", options: [], answer: 0 }]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/1 output question/);
  });
  it("fails when stdout differs from the correct option", () => {
    const r = run([output("a", "print(1 + 1)", "3")]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/prints '2' but the correct option is '3'/);
  });
  it("fails when the code prints more than one line, nothing, or raises", () => {
    expect(run([output("a", "print(1)\nprint(2)", "1")]).stdout).toMatch(/exactly one line, printed 2/);
    expect(run([output("a", "x = 1", "1")]).stdout).toMatch(/printed 0/);
    expect(run([output("a", "raise ValueError('boom')", "1")]).stdout).toMatch(/code raised: ValueError: boom/);
    expect(run([output("a", "raise ValueError('boom')", "1")]).status).toBe(1);
  });
});
