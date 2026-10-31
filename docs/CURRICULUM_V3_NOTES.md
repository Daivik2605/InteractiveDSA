# Curriculum v3 notes

Generated from `content/curriculum.json` (version 3) and the version-2 file it replaced. The generator is `scripts/build_curriculum.py`; never edit the JSON by hand.

## What changed

- **No mock on any plan day.** 26 on-demand mocks live in a top-level `mocks` list; each has a `suggestedAfterWeek`. Mocks 1 and 2 stay "good after Week 1" and show as done if you saved them.
- **Two review slots a day** (`<dayId>:review-1`, `:review-2`) from plan day 5 on (not the Week 13 wrap-up). The app draws them; they are not in the JSON.
- **At least 2 counted problems a day** from plan day 5: 36 single-problem days got 1 more, the 6 redo days got 2 each (fallbacks kept), 48 problems in all. Nothing was removed, and every existing id, title and URL is unchanged (checked by `src/lib/review.test.ts` against `src/lib/fixtures/curriculum-v2-ids.json`).
- **Plan days 1–4 are exactly as you studied them** (same problems, same ids). Day 1 keeps its lesson row, now labelled "New topic: cold try, then concepts and templates" (it used to start with "Mock 1 (diagnostic) + …"). Day 3 no longer has a learn row (that was Mock 2's tick).
- Pools are untouched (same ids, same order), except Week 13's, which gained `w13-d4-p3`. No added problem is in a pool.

## Added problems (48)

Each was opened on leetcode.com and checked for number, title, difficulty and URL slug on 2026-10-29. No URL appears twice anywhere in the file (checked by the generator and `npm run validate`). Only Easy and Medium were added; Hard problems are all pre-existing timed-day ones.

| Week · Day (plan day) | Id | Problem | Difficulty | Role | URL |
| --- | --- | --- | --- | --- | --- |
| W1 · D5 (5) | `w01-d5-p2` | Running Sum of 1d Array (LC 1480) | Easy | core | https://leetcode.com/problems/running-sum-of-1d-array/ |
| W1 · D7 (7) | `w01-d7-p1` | Remove Element (LC 27) | Easy | core | https://leetcode.com/problems/remove-element/ |
| W1 · D7 (7) | `w01-d7-p2` | Spiral Matrix II (LC 59) | Medium | core | https://leetcode.com/problems/spiral-matrix-ii/ |
| W2 · D2 (9) | `w02-d2-p2` | Longest Palindrome (LC 409) | Easy | core | https://leetcode.com/problems/longest-palindrome/ |
| W2 · D4 (11) | `w02-d4-p2` | Pascal's Triangle II (LC 119) | Easy | old-topic (from wk 1) | https://leetcode.com/problems/pascals-triangle-ii/ |
| W2 · D6 (13) | `w02-d6-p2` | Subarray Sums Divisible by K (LC 974) | Medium | core | https://leetcode.com/problems/subarray-sums-divisible-by-k/ |
| W3 · D1 (15) | `w03-d1-p2` | Reverse String (LC 344) | Easy | core | https://leetcode.com/problems/reverse-string/ |
| W3 · D3 (17) | `w03-d3-p2` | Maximum Number of Vowels in a Substring of Given Length (LC 1456) | Medium | core | https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/ |
| W3 · D5 (19) | `w03-d5-p2` | Valid Palindrome II (LC 680) | Easy | core | https://leetcode.com/problems/valid-palindrome-ii/ |
| W3 · D7 (21) | `w03-d7-p1` | Remove Duplicates from Sorted Array II (LC 80) | Medium | core | https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/ |
| W3 · D7 (21) | `w03-d7-p2` | Fruit Into Baskets (LC 904) | Medium | core | https://leetcode.com/problems/fruit-into-baskets/ |
| W4 · D2 (23) | `w04-d2-p2` | Sqrt(x) (LC 69) | Easy | core | https://leetcode.com/problems/sqrtx/ |
| W4 · D4 (25) | `w04-d4-p2` | Backspace String Compare (LC 844) | Easy | old-topic (from wk 3) | https://leetcode.com/problems/backspace-string-compare/ |
| W4 · D6 (27) | `w04-d6-p2` | Guess Number Higher or Lower (LC 374) | Easy | core | https://leetcode.com/problems/guess-number-higher-or-lower/ |
| W5 · D1 (29) | `w05-d1-p2` | Baseball Game (LC 682) | Easy | core | https://leetcode.com/problems/baseball-game/ |
| W5 · D3 (31) | `w05-d3-p2` | Make The String Great (LC 1544) | Easy | core | https://leetcode.com/problems/make-the-string-great/ |
| W5 · D5 (33) | `w05-d5-p2` | Implement Stack using Queues (LC 225) | Easy | core | https://leetcode.com/problems/implement-stack-using-queues/ |
| W5 · D7 (35) | `w05-d7-p1` | Removing Stars From a String (LC 2390) | Medium | core | https://leetcode.com/problems/removing-stars-from-a-string/ |
| W5 · D7 (35) | `w05-d7-p2` | Final Prices With a Special Discount in a Shop (LC 1475) | Easy | core | https://leetcode.com/problems/final-prices-with-a-special-discount-in-a-shop/ |
| W6 · D2 (37) | `w06-d2-p2` | Remove Linked List Elements (LC 203) | Easy | core | https://leetcode.com/problems/remove-linked-list-elements/ |
| W6 · D4 (39) | `w06-d4-p2` | Remove Outermost Parentheses (LC 1021) | Easy | old-topic (from wk 5) | https://leetcode.com/problems/remove-outermost-parentheses/ |
| W6 · D6 (41) | `w06-d6-p2` | Remove Duplicates from Sorted List (LC 83) | Easy | core | https://leetcode.com/problems/remove-duplicates-from-sorted-list/ |
| W7 · D1 (43) | `w07-d1-p2` | Symmetric Tree (LC 101) | Easy | core | https://leetcode.com/problems/symmetric-tree/ |
| W7 · D3 (45) | `w07-d3-p2` | Binary Tree Inorder Traversal (LC 94) | Easy | core | https://leetcode.com/problems/binary-tree-inorder-traversal/ |
| W7 · D5 (47) | `w07-d5-p2` | Minimum Depth of Binary Tree (LC 111) | Easy | core | https://leetcode.com/problems/minimum-depth-of-binary-tree/ |
| W7 · D7 (49) | `w07-d7-p1` | Path Sum (LC 112) | Easy | core | https://leetcode.com/problems/path-sum/ |
| W7 · D7 (49) | `w07-d7-p2` | Convert Sorted Array to Binary Search Tree (LC 108) | Easy | core | https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/ |
| W8 · D2 (51) | `w08-d2-p2` | The K Weakest Rows in a Matrix (LC 1337) | Easy | core | https://leetcode.com/problems/the-k-weakest-rows-in-a-matrix/ |
| W8 · D4 (53) | `w08-d4-p2` | Binary Tree Paths (LC 257) | Easy | old-topic (from wk 7) | https://leetcode.com/problems/binary-tree-paths/ |
| W8 · D6 (55) | `w08-d6-p2` | Assign Cookies (LC 455) | Easy | core | https://leetcode.com/problems/assign-cookies/ |
| W9 · D1 (57) | `w09-d1-p2` | Letter Case Permutation (LC 784) | Medium | core | https://leetcode.com/problems/letter-case-permutation/ |
| W9 · D3 (59) | `w09-d3-p2` | Beautiful Arrangement (LC 526) | Medium | core | https://leetcode.com/problems/beautiful-arrangement/ |
| W9 · D5 (61) | `w09-d5-p2` | Map Sum Pairs (LC 677) | Medium | core | https://leetcode.com/problems/map-sum-pairs/ |
| W9 · D7 (63) | `w09-d7-p1` | Letter Tile Possibilities (LC 1079) | Medium | core | https://leetcode.com/problems/letter-tile-possibilities/ |
| W9 · D7 (63) | `w09-d7-p2` | Non-decreasing Subsequences (LC 491) | Medium | core | https://leetcode.com/problems/non-decreasing-subsequences/ |
| W10 · D2 (65) | `w10-d2-p2` | Island Perimeter (LC 463) | Easy | core | https://leetcode.com/problems/island-perimeter/ |
| W10 · D4 (67) | `w10-d4-p2` | Implement Magic Dictionary (LC 676) | Medium | old-topic (from wk 9) | https://leetcode.com/problems/implement-magic-dictionary/ |
| W10 · D6 (69) | `w10-d6-p2` | Find Center of Star Graph (LC 1791) | Easy | core | https://leetcode.com/problems/find-center-of-star-graph/ |
| W11 · D1 (71) | `w11-d1-p2` | Divisor Game (LC 1025) | Easy | core | https://leetcode.com/problems/divisor-game/ |
| W11 · D3 (73) | `w11-d3-p2` | Minimum Cost For Tickets (LC 983) | Medium | core | https://leetcode.com/problems/minimum-cost-for-tickets/ |
| W11 · D5 (75) | `w11-d5-p2` | Longest Continuous Increasing Subsequence (LC 674) | Easy | core | https://leetcode.com/problems/longest-continuous-increasing-subsequence/ |
| W11 · D7 (77) | `w11-d7-p1` | Longest String Chain (LC 1048) | Medium | core | https://leetcode.com/problems/longest-string-chain/ |
| W11 · D7 (77) | `w11-d7-p2` | Best Time to Buy and Sell Stock with Transaction Fee (LC 714) | Medium | core | https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/ |
| W12 · D2 (79) | `w12-d2-p2` | Triangle (LC 120) | Medium | core | https://leetcode.com/problems/triangle/ |
| W12 · D4 (81) | `w12-d4-p2` | Domino and Tromino Tiling (LC 790) | Medium | old-topic (from wk 11) | https://leetcode.com/problems/domino-and-tromino-tiling/ |
| W12 · D6 (83) | `w12-d6-p2` | Minimum Falling Path Sum (LC 931) | Medium | core | https://leetcode.com/problems/minimum-falling-path-sum/ |
| W13 · D3 (87) | `w13-d3-p2` | Design HashSet (LC 705) | Easy | core | https://leetcode.com/problems/design-hashset/ |
| W13 · D5 (89) | `w13-d5-p2` | Design Circular Queue (LC 622) | Medium | core | https://leetcode.com/problems/design-circular-queue/ |

## Moved to a pool for time

A day with three problems keeps all three only if it fits about 2.5 hours with the two reviews. One did not:

| Id | Problem | Was on | Why | Now |
| --- | --- | --- | --- | --- |
| `w13-d4-p3` | Serialize and Deserialize Binary Tree (Hard) | Week 13 Day 4 (plan day 88): interview simulation, 3 × 45 min | 3 × 45 + 2 reviews × 15 = 165 min, over 150 | Week 13 pool, same id; the day keeps 2 problems and is now 120 min |

All other days with three problems fit: the longest is 135 minutes.

## Time estimates

Rough minutes per problem: Easy 20, Medium 35, Hard 50; timed days (45 min each) count 45; a new-topic lesson 30; each review problem 15. Budget 150 minutes (2.5 h). The generator refuses a build with a day over budget. Longest days:

| Plan day | Week · Day | Kind | Estimate |
| --- | --- | --- | --- |
| 10 | W2 · D3 | topic | 135 min |
| 16 | W3 · D2 | topic | 135 min |
| 18 | W3 · D4 | old-topics | 135 min |
| 24 | W4 · D3 | topic | 135 min |
| 32 | W5 · D4 | old-topics | 135 min |
| 36 | W6 · D1 | new-topic | 135 min |
| 46 | W7 · D4 | old-topics | 135 min |
| 52 | W8 · D3 | topic | 135 min |
| 54 | W8 · D5 | topic | 135 min |
| 58 | W9 · D2 | topic | 135 min |

**No day is estimated over 2.5 h**, so none is flagged. Please sanity-check these anyway: real time depends on your solve speed; the review problems are the unknown. Likeliest to run long: the timed days (Day 6 of each week) if both timed problems use all 45 minutes plus two reviews (about 120 min), and the 135-minute three-problem days.

## Mock table

Mocks are not on plan days and have no dates. Numbers 1–15 use Python themes 1–15 in order; 16–26 revisit trickier themes. Extra rotates debug / explain-aloud / complexity-check by mock number. Program 2 is on even-numbered mocks (the final included). A mock is **ready** when its week's questions and its theme's questions exist; **Mocks 1–8 are ready** (Weeks 1–4 are written), Mocks 9–26 wait for Week 5+ question files (and Week 13 for the final).

| Mock | Good after week | Python theme | Extra | Program 2 | MCQs | Note | Ready |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1. Types, mutability, identity (is vs ==), truthiness | debug | no | 18 | diagnostic | yes |
| 2 | 1 | 2. Lists | explain-aloud | yes | 18 |  | yes |
| 3 | 2 | 3. Strings | complexity-check | no | 18 |  | yes |
| 4 | 2 | 4. Dicts and sets | debug | yes | 18 |  | yes |
| 5 | 3 | 5. Comprehensions, generator expressions, any/all, zip, enumerate | explain-aloud | no | 18 |  | yes |
| 6 | 3 | 6. Functions | complexity-check | yes | 18 |  | yes |
| 7 | 4 | 7. Sorting | debug | no | 18 |  | yes |
| 8 | 4 | 8. collections, heapq, bisect | explain-aloud | yes | 18 |  | yes |
| 9 | 5 | 9. Numbers | complexity-check | no | 18 |  | no (needs Week 5 questions) |
| 10 | 5 | 10. Recursion | debug | yes | 18 |  | no (needs Week 5 questions) |
| 11 | 6 | 11. Closures, late binding in loops, lambdas, decorators with functools.wraps | explain-aloud | no | 18 |  | no (needs Week 6 questions) |
| 12 | 6 | 12. Iterators and generators | complexity-check | yes | 18 |  | no (needs Week 6 questions) |
| 13 | 7 | 13. OOP | debug | no | 18 |  | no (needs Week 7 questions) |
| 14 | 7 | 14. Exceptions and context managers | explain-aloud | yes | 18 |  | no (needs Week 7 questions) |
| 15 | 8 | 15. Runtime | complexity-check | no | 18 |  | no (needs Week 8 questions) |
| 16 | 8 | 6. Functions | debug | yes | 18 |  | no (needs Week 8 questions) |
| 17 | 9 | 10. Recursion | explain-aloud | no | 18 |  | no (needs Week 9 questions) |
| 18 | 9 | 11. Closures, late binding in loops, lambdas, decorators with functools.wraps | complexity-check | yes | 18 |  | no (needs Week 9 questions) |
| 19 | 10 | 7. Sorting | debug | no | 18 |  | no (needs Week 10 questions) |
| 20 | 10 | 12. Iterators and generators | explain-aloud | yes | 18 |  | no (needs Week 10 questions) |
| 21 | 11 | 9. Numbers | complexity-check | no | 18 |  | no (needs Week 11 questions) |
| 22 | 11 | 13. OOP | debug | yes | 18 |  | no (needs Week 11 questions) |
| 23 | 12 | 8. collections, heapq, bisect | explain-aloud | no | 18 |  | no (needs Week 12 questions) |
| 24 | 12 | 4. Dicts and sets | complexity-check | yes | 18 |  | no (needs Week 12 questions) |
| 25 | 13 | 2. Lists | debug | no | 18 |  | no (needs Week 13 questions) |
| 26 | 13 | 3. Strings | explain-aloud | yes | 20 | final | no (needs Week 13 questions) |

## For you to review

1. **Mocks 16–26 themes** (6, 10, 11, 7, 12, 9, 13, 8, 4, 2, 3 for the final) are my guess at the trickiest ones, spread out. Change `REVISIT_THEMES` in the generator if you prefer another order.
2. **Old ticks stay.** `w01-d1:learn` (now the lesson row) and `w01-d3:learn` (Mock 2's old row, no longer an item) remain in the database. Day 1's lesson row counts as ticked if you ticked "Mock 1" there; nothing else changes. Saved Mock 1 and Mock 2 sessions, answers, retakes and runs are untouched and show on the Mocks page.
3. **Review pools are small early on**: plan day 5 draws from only 9 problems (days 1–4), so repeats are likely until about Week 3. Draws are Easy/Medium core problems of earlier days plus earlier weeks' pools; old-topic problems and Hard problems are never drawn.
4. **Old-topic days** (Day 4, and Day 7 of even weeks) got one more unlabelled problem from an earlier week (six days, listed above as "old-topic"). They are all new problems, not repeats.
5. **Fit with the topic.** The added problems are simple Easy/Medium companions to each day's topic (e.g. Week 5 `Baseball Game`, Week 7 `Symmetric Tree`, Week 11 `Divisor Game`). Swap any you dislike by editing the day lists in the generator and rebuilding; use a new id only by appending, never by renumbering.
6. **`Non-decreasing Subsequences`** (LeetCode 491) used to be named "Increasing Subsequences"; the title above is the current one.
7. **Sync is still paused.** `dayDraws` is a local table only; `docs/DATA_CONTRACT.md` has a note for when sync resumes.
