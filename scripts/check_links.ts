// Requests every URL in content/resources.json (and the roadmap link) and reports anything that is not a plain 200,
// or that redirects to a different path. Read-only: it never edits the file.
// Usage: npx tsx scripts/check_links.ts
// Exit code 1 when something needs a look, 0 when every link is a clean 200.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = JSON.parse(readFileSync(join(root, "content", "resources.json"), "utf8")) as {
  roadmap: { title: string; url: string };
  weeks: { week: number; topics: { id: string; resources: { site: string; title: string; url: string }[] }[] }[];
};

interface Ref { url: string; where: string }
const refs: Ref[] = [{ url: file.roadmap.url, where: "roadmap" }];
for (const w of file.weeks) for (const t of w.topics) for (const r of t.resources) refs.push({ url: r.url, where: `week ${w.week} · ${t.id} · ${r.site}: ${r.title}` });

const byUrl = new Map<string, string[]>();
for (const r of refs) byUrl.set(r.url, [...(byUrl.get(r.url) ?? []), r.where]);

const normPath = (u: URL) => decodeURIComponent(u.pathname).replace(/\/+$/, "") || "/";
const normHost = (u: URL) => u.hostname.replace(/^www\./, "");

type Result = { url: string; status: number | string; finalUrl?: string; problem?: string };

async function check(url: string): Promise<Result> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctl.signal,
      headers: { "user-agent": "Mozilla/5.0 (link check for a personal study app)", accept: "text/html,*/*" },
    });
    await res.body?.cancel();
    const from = new URL(url);
    const to = new URL(res.url);
    const moved = normPath(from) !== normPath(to) || normHost(from) !== normHost(to);
    if (res.status !== 200) return { url, status: res.status, finalUrl: res.url, problem: `status ${res.status}` };
    if (moved) return { url, status: 200, finalUrl: res.url, problem: `redirects to a different path: ${res.url}` };
    return { url, status: 200 };
  } catch (e) {
    return { url, status: "error", problem: `request failed: ${(e as Error).name === "AbortError" ? "timed out after 20 s" : (e as Error).message}` };
  } finally {
    clearTimeout(timer);
  }
}

const urls = [...byUrl.keys()];
const results: Result[] = [];
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < urls.length) results.push(await check(urls[next++]!));
  }),
);

const bad = results.filter((r) => r.problem).sort((a, b) => a.url.localeCompare(b.url));
console.log(`${refs.length} links, ${urls.length} unique URLs checked.`);
console.log(`${results.length - bad.length} clean 200s, ${bad.length} to look at.`);
for (const r of bad) {
  console.log(`\n✗ ${r.url}\n    ${r.problem}`);
  for (const w of byUrl.get(r.url)!) console.log(`    used by: ${w}`);
}
process.exit(bad.length > 0 ? 1 : 0);
