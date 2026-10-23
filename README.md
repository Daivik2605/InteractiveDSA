# InteractiveDSA

A personal 13-week Python DSA study app: daily checklists with missed-day tracking, weekly visual lessons, 30+ MCQ quizzes per week, spaced review, a LeetCode problem log and a weak-spot dashboard.

## Prerequisites (on your Mac)
1. **Node.js 20+** — check with `node -v`. Install from nodejs.org or `brew install node`.
2. **Python 3.10+** — check with `python3 --version` (used to verify quiz code snippets).
3. **Git** — `git --version`. Optional: a GitHub account for free hosting on GitHub Pages or Vercel.
4. **Claude Code** — run `claude` in this folder.
5. A **LeetCode** account (free tier covers almost every problem in the plan).

## Start building
```bash
cd ~/Desktop/Projects/Learning/InteractiveDSA
git init
claude
```
Then paste the Phase 1 prompt from `docs/BUILD_PLAN.md`. Do one phase per session and check the result before moving on.

## What's in here
| File | Purpose |
|---|---|
| `CLAUDE.md` | Instructions Claude Code reads every session |
| `docs/SPEC.md` | Full feature spec |
| `docs/CURRICULUM.md` | 13-week plan: topics, concepts, visuals, problems |
| `docs/CONTENT_SCHEMA.md` | Data types for questions, curriculum and progress |
| `docs/BUILD_PLAN.md` | Phased build order with ready-to-paste prompts |
| `content/curriculum.json` | Weeks → days → LeetCode problems (161 problems) |
