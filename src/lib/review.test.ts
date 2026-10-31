import { describe, expect, it } from "vitest";
import { curriculum } from "./curriculum";
import { mulberry32 } from "./quiz";
import { drawReview, parseReviewSlotId, reviewPool, reviewSlotId } from "./review";
import type { Problem } from "../types/content";

const ids = (ps: readonly Problem[]) => ps.map((p) => p.id);
const planDayOf = (id: string) => curriculum.weeks.flatMap((w) => w.days).find((d) => `w${String(curriculum.weeks.find((w) => w.days.includes(d))!.week).padStart(2, "0")}-d${d.day}` === id)!.planDay;

describe("review slot ids", () => {
  it("are '<dayId>:review-N' and round-trip", () => {
    expect(reviewSlotId("w03-d6", 2)).toBe("w03-d6:review-2");
    expect(parseReviewSlotId("w03-d6:review-2")).toEqual({ planDayId: "w03-d6", n: 2 });
    expect(parseReviewSlotId("w03-d6:learn")).toBeUndefined();
    expect(parseReviewSlotId("w03-x1:review-1")).toBeUndefined();
  });
});

describe("reviewPool", () => {
  it("on plan day 5 holds only the core problems of plan days 1-4, up to Medium", () => {
    const pool = reviewPool(curriculum, "w01-d5");
    expect(ids(pool)).toEqual(["w01-d1-p1", "w01-d2-p1", "w01-d2-p2", "w01-d2-p3", "w01-d3-p1", "w01-d4-p1", "w01-d4-p2", "w01-d4-p3", "w01-d4-p4"]);
    expect(pool.every((p) => p.difficulty !== "Hard")).toBe(true);
  });

  it("never holds anything from the same or a later plan day, or from the same or a later week's pool", () => {
    for (const w of curriculum.weeks) {
      for (const d of w.days.filter((x) => x.reviewSlots > 0)) {
        const id = `w${String(w.week).padStart(2, "0")}-d${d.day}`;
        for (const p of reviewPool(curriculum, id)) {
          if (p.role === "pool") expect(Number(p.id.slice(1, 3)), `${p.id} for ${id}`).toBeLessThan(w.week);
          else expect(planDayOf(`${p.id.slice(0, 6)}`), `${p.id} for ${id}`).toBeLessThan(d.planDay);
        }
      }
    }
  });

  it("leaves out old-topic problems, fallbacks and Hard problems, and every review day has plenty to draw from", () => {
    const all = curriculum.weeks.flatMap((w) => [...w.days.flatMap((d) => d.problems), ...w.pool]);
    const bad = new Set(all.filter((p) => p.role === "old-topic" || p.role === "fallback" || p.difficulty === "Hard").map((p) => p.id));
    for (const w of curriculum.weeks) {
      for (const d of w.days.filter((x) => x.reviewSlots > 0)) {
        const pool = reviewPool(curriculum, `w${String(w.week).padStart(2, "0")}-d${d.day}`);
        expect(pool.some((p) => bad.has(p.id))).toBe(false);
        expect(pool.length, `plan day ${d.planDay}`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("grows as the plan goes on, and includes earlier weeks' pools", () => {
    expect(reviewPool(curriculum, "w13-d5").length).toBeGreaterThan(reviewPool(curriculum, "w05-d5").length);
    expect(ids(reviewPool(curriculum, "w02-d5"))).toContain("w01-pool-01");
    expect(ids(reviewPool(curriculum, "w01-d7"))).not.toContain("w01-pool-01");
  });

  it("is empty for an extension day or an unknown day", () => {
    expect(reviewPool(curriculum, "w02-x1")).toEqual([]);
    expect(reviewPool(curriculum, "w99-d1")).toEqual([]);
  });
});

describe("drawReview", () => {
  const pool = reviewPool(curriculum, "w05-d5");

  it("draws distinct problems, repeatably for the same rng", () => {
    const a = drawReview(pool, 2, mulberry32(1));
    expect(a).toHaveLength(2);
    expect(a[0]!.id).not.toBe(a[1]!.id);
    expect(ids(drawReview(pool, 2, mulberry32(1)))).toEqual(ids(a));
  });

  it("covers the whole pool over many draws, and any draw is in the pool", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 400; seed++) for (const p of drawReview(pool, 2, mulberry32(seed))) seen.add(p.id);
    expect(seen.size).toBe(pool.length);
  });

  it("skips the problems in `avoid` while others remain, and falls back when nothing else is left", () => {
    const [first] = pool;
    for (let seed = 0; seed < 50; seed++) expect(ids(drawReview(pool, 1, mulberry32(seed), new Set([first!.id])))).not.toContain(first!.id);
    expect(ids(drawReview([first!], 1, mulberry32(1), new Set([first!.id])))).toEqual([first!.id]);
    expect(drawReview([], 2, mulberry32(1))).toEqual([]);
  });
});

describe("existing ids", () => {
  it("every problem id from curriculum v2 still exists with the same title and URL, and plan days 1-4 are the same", async () => {
    const before = (await import("./fixtures/curriculum-v2-ids.json")).default as Record<string, { title: string; url: string; home: string }>;
    const now = new Map(curriculum.weeks.flatMap((w) => [...w.days.flatMap((d) => [...d.problems, ...(d.fallback ? [d.fallback] : [])]), ...w.pool]).map((p) => [p.id, p]));
    for (const [id, was] of Object.entries(before)) {
      expect(now.get(id), id).toMatchObject({ title: was.title, url: was.url });
    }
    expect(Object.keys(before)).toHaveLength(266);
    expect(now.size).toBe(314); // 48 added, none removed
    const week1 = curriculum.weeks[0]!.days.slice(0, 4).flatMap((d) => d.problems.map((p) => p.id));
    expect(week1).toEqual(Object.entries(before).filter(([, v]) => ["w01-d1", "w01-d2", "w01-d3", "w01-d4"].includes(v.home)).map(([k]) => k));
  });

  it("the 48 new ids are day problems from plan day 5 onward, none in a pool, with real LeetCode URLs", async () => {
    const before = (await import("./fixtures/curriculum-v2-ids.json")).default as Record<string, unknown>;
    const days = curriculum.weeks.flatMap((w) => w.days.map((d) => ({ w: w.week, d })));
    const added = days.flatMap(({ w, d }) => d.problems.map((p) => ({ p, w, d }))).filter(({ p }) => !(p.id in before));
    expect(added).toHaveLength(48);
    for (const { p, d } of added) {
      expect(d.planDay, p.id).toBeGreaterThanOrEqual(5);
      expect(p.url).toMatch(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/);
      expect(["core", "old-topic"]).toContain(p.role);
    }
    expect(curriculum.weeks.flatMap((w) => w.pool).filter((p) => !(p.id in before))).toEqual([]);
    expect(new Set(added.map(({ p }) => p.url)).size).toBe(48);
  });
});
