# 90-Day Python DSA Interview Curriculum

Oct 24, 2026 · @Daivik

90 days of Python, 1.5–2.5 hours a day, from Oct 26, 2026 to Jan 23, 2027. Every day has coding with at least two counted problems and, from Day 5, two quick review problems the app draws for you; 26 mocks are on demand; and 1–2 days a week revisit earlier topics without labels.

## How the plan works

The plan teaches by solving: each new topic starts with a cold attempt at one problem, and the concept comes right after. All coding happens on LeetCode, HackerRank or HackerEarth. The app only records the day.

- **Daily time:** 1.5–2.5 hours. From plan day 5 a day is 2–3 counted problems plus 2 review problems (quick Easy/Medium repeats, about 15 minutes each). Days that would run over (estimated 150 minutes) are listed in `docs/CURRICULUM_V3_NOTES.md`.
- **Review slots:** every day from plan day 5 (except the Week 13 wrap-up) has two review problems. The app draws them at random from problems of earlier plan days (core problems and earlier weeks' pools, up to Medium; repeats allowed, even ones you solved), saves the draw the first time you open the day, and never shows where a problem came from. "Re-roll" works until you log that slot.
- **Mocks on demand:** 26 mocks in a sequence, about two per week (Mocks 1–2 after Week 1 … the final, Mock 26, after Week 13). They are not plan days or checklist rows: start any ready mock at any time, in any order.
- **Old-topic days:** Day 4 and Day 7 of every week from Week 2 on. Their problems come from earlier weeks and are shown without a topic label, so you practise spotting the pattern yourself.
- **Problem-first days:** Day 1 of each topic opens with a 15–20 minute cold try at a problem, then the concept notes, visuals and template, then a proper solve.
- **Hard days:** Day 6 is timed, at 45 minutes per problem.
- **No hints** in the app, and no mistake categories.
- **What you log per problem:** outcome (solved alone / needed hint / needed solution / failed), minutes, your approach in a few lines, your code, time and space complexity, and confidence 1–5.
- **Redos:** the app's existing rules apply (hint → 3 days; solution or failed → 3 and 7 days). Redos fill Day 7 and any extension days.
- **Falling behind:** use the app's "Add a day" for an extra practice day on a topic. Don't double up the next day.
- **Difficulty target:** Mediums solved cleanly in 25–35 minutes. That is what the online assessments and data and AI engineer rounds you researched mostly ask. Hards are about one a week.
- **Out of scope here:** SQL (a separate project later), system design and behavioural rounds.

## At a glance

The order follows prerequisites: Python and arrays first, then sorting and recursion early (as Striver's A2Z sheet does), so trees, backtracking and DP stand on them. Totals: 160 new topic problems, 41 old-topic problems, 170 review draws and 26 mocks with about 39 mock programs.

| Week | Plan days | Topic | Topic problems | Old-topic problems | Mocks suggested after |
| --- | --- | --- | --- | --- | --- |
| 1 | 1–7 | Python toolkit, Big-O, arrays & strings | 15 | 0 | Mock 1, Mock 2 |
| 2 | 8–14 | Hashing, counting, prefix sums | 12 | 4 | Mock 3, Mock 4 |
| 3 | 15–21 | Two pointers & sliding window | 13 | 3 | Mock 5, Mock 6 |
| 4 | 22–28 | Sorting & binary search | 11 | 4 | Mock 7, Mock 8 |
| 5 | 29–35 | Stacks, queues, monotonic stack & deque | 13 | 3 | Mock 9, Mock 10 |
| 6 | 36–42 | Recursion & linked lists | 12 | 4 | Mock 11, Mock 12 |
| 7 | 43–49 | Trees & BST | 13 | 3 | Mock 13, Mock 14 |
| 8 | 50–56 | Heaps, intervals & greedy | 12 | 4 | Mock 15, Mock 16 |
| 9 | 57–63 | Backtracking & tries | 13 | 3 | Mock 17, Mock 18 |
| 10 | 64–70 | Graphs I: BFS, DFS, grids, topological sort, union-find | 12 | 4 | Mock 19, Mock 20 |
| 11 | 71–77 | DP I (1D) + Kadane | 13 | 3 | Mock 21, Mock 22 |
| 12 | 78–84 | DP II (2D) + weighted graphs | 12 | 4 | Mock 23, Mock 24 |
| 13 | 85–90 | Bit tricks, practical class design, final mocks | 9 | 2 | Mock 25, Mock 26 |

What changed from the old plan: sorting and quickselect added, recursion gets real time, bit tricks shrink from three days to part of one, and Pow(x, n) and Valid Sudoku move to the weeks that teach them. Any problem not listed for a day goes into that week's **pool**, which supplies later old-topic days and mock programs.

## Weekly rhythm

Every week has the same shape (Week 1 days 1–4 are as first studied: no review slots there). There is no mock in any day. Each day from plan day 5 also has **2 review problems** the app draws for you.

| Day | What |
| --- | --- |
| 1 | New topic: cold try (15–20 min), concept and template, then 1–2 topic problems |
| 2 | 2–3 topic problems |
| 3 | 2 topic problems |
| 4 | **Old topics:** 2–3 unlabelled problems from earlier weeks (Week 1: HackerRank Python) |
| 5 | 2–3 topic problems |
| 6 | Timed: 2 topic problems, 45 min each |
| 7 | Odd weeks: **redo day** (2 topic problems, redos from the queue first, a fallback if the queue is empty). Even weeks: 2 unlabelled old-topic problems |

On days with spare time, a 5-minute pattern drill is optional. The weekly quiz and the review quiz are folded into the mocks.

## Mock test spec

Each mock is 60–85 minutes in four timed parts, done in one sitting. Mock 1 is a diagnostic. Its score is your baseline and doesn't count against you. Mocks are on demand: the Mocks page lists all 26 with the week each one is good after, and "this week and last week" below means that week.

| Part | Time | What it is |
| --- | --- | --- |
| A. MCQs | 20 min | 15–20 interview-level questions: about 7 Python language, 6 on this week and last week, 5 spaced-review cards from older weeks |
| B. Program 1 | 25 min | Every mock: one unlabelled problem from an earlier week's pool (Weeks 1–2: HackerRank Python domain or the Week 1 pool) |
| C. Program 2 | 30 min | Even-numbered mocks only: a practical multi-part program (see that section) or a CodeSignal-style implementation task |
| D. Extra | 10 min | Rotates by mock number: **Debug** a 15–25 line buggy function · **Explain aloud** brute force → optimal → Big-O in 3 min · **Complexity check** of your own Program 1 plus one edge case you tested |

The app records the MCQ score by type, each program's outcome and minutes, whether the extra was done, and a self-rating from 1 to 5.

**MCQ question types:** output (what does this print), bug (which line is wrong), complexity, pattern (which technique fits), approach (best plan for a problem), and Python concept.

**Python language rotation:** 15 themes. Mocks 1–15 lead with themes 1–15 in order; Mocks 16–26 revisit the trickier ones (6, 10, 11, 7, 12, 9, 13, 8, 4, 2 and, for the final, 3). The full table is in `docs/CURRICULUM_V3_NOTES.md`.

1. Types, mutability, identity (`is` vs `==`), truthiness
2. Lists: slicing, shallow vs deep copy, the `[[0]*n]*m` trap, cost of common operations
3. Strings: immutability, `join` vs `+=`, slicing, common methods, f-strings
4. Dicts and sets: hashability, insertion order, `get`/`setdefault`, `defaultdict`, `Counter`
5. Comprehensions, generator expressions, `any`/`all`, `zip`, `enumerate`
6. Functions: mutable default arguments, `*args`/`**kwargs`, keyword-only parameters, LEGB scope, `global`/`nonlocal`
7. Sorting: key functions, stability, `sort` vs `sorted`, tuple comparison, `cmp_to_key`
8. `collections`, `heapq`, `bisect`: `deque`, max-heap and tuple tricks, `bisect_left` vs `bisect_right`
9. Numbers: `//` and `%` with negatives, big ints, float precision, bit operators, `~x`
10. Recursion: the call stack, recursion limit, `functools.cache`/`lru_cache`, turning recursion into iteration
11. Closures, late binding in loops, lambdas, decorators with `functools.wraps`
12. Iterators and generators: `yield`, `yield from`, `StopIteration`, `itertools` (accumulate, groupby, product, permutations, combinations)
13. OOP: `__repr__`, `__eq__`/`__hash__`, `__lt__` for heaps, `@dataclass`, `classmethod`/`staticmethod`, `super()`, MRO
14. Exceptions and context managers: try/except/else/finally order, custom exceptions, `with`
15. Runtime: the GIL, threads vs processes, `asyncio` basics, generator vs list memory

**How much to write:** about 25 new topic MCQs per week plus about 10 per Python theme, so roughly 480 unique questions. Repeats come from the app's existing spaced-review (Leitner) boxes.

## Weeks 1–4

Dates assume no extensions; adding days pushes everything after them. E = Easy, M = Medium, H = Hard. Old-topic problems are shown here with their source week for planning, but the app should hide that label.

### Week 1 · Python toolkit, Big-O, arrays & strings (Mon 26 Oct – Sun 1 Nov)

**Learn:** Big-O for loops and recursion, what list, str, dict and set operations cost, list as a dynamic array, why strings are immutable, in-place edits, matrix traversal. **Templates:** prefix/suffix pass, read/write pointer, transpose + reverse, boundary-shrinking spiral.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Plus One](https://leetcode.com/problems/plus-one/) (E), then concepts | none yet |
| 2 | [Merge Sorted Array](https://leetcode.com/problems/merge-sorted-array/) (E), [Remove Duplicates from Sorted Array](https://leetcode.com/problems/remove-duplicates-from-sorted-array/) (E), [Longest Common Prefix](https://leetcode.com/problems/longest-common-prefix/) (E) | none yet |
| 3 | [Best Time to Buy and Sell Stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) (E) | none yet |
| 4 | Python fluency on [HackerRank Python](https://www.hackerrank.com/domains/python): Nested Lists, Find the Runner-Up Score!, collections.Counter(), Word Order | none yet |
| 5 | [Product of Array Except Self](https://leetcode.com/problems/product-of-array-except-self/) (M), [Running Sum of 1d Array](https://leetcode.com/problems/running-sum-of-1d-array/) (E) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Rotate Image](https://leetcode.com/problems/rotate-image/) (M), [Spiral Matrix](https://leetcode.com/problems/spiral-matrix/) (M) | 2 quick repeats, drawn by the app |
| 7 | [Remove Element](https://leetcode.com/problems/remove-element/) (E), [Spiral Matrix II](https://leetcode.com/problems/spiral-matrix-ii/) (M). Redos from your queue come first; if none are due, try [Set Matrix Zeroes](https://leetcode.com/problems/set-matrix-zeroes/) (M) | 2 quick repeats, drawn by the app |

**Pool:** [Move Zeroes](https://leetcode.com/problems/move-zeroes/), [Pascal's Triangle](https://leetcode.com/problems/pascals-triangle/), [Summary Ranges](https://leetcode.com/problems/summary-ranges/), [Rotate Array](https://leetcode.com/problems/rotate-array/), [Zigzag Conversion](https://leetcode.com/problems/zigzag-conversion/), [Roman to Integer](https://leetcode.com/problems/roman-to-integer/), [Text Justification](https://leetcode.com/problems/text-justification/) (H)

### Week 2 · Hashing, counting, prefix sums (Mon 2 Nov – Sun 8 Nov)

**Learn:** how a hash table works (buckets, collisions, resizing), average O(1) vs worst O(n), what makes a key hashable, `Counter` and `defaultdict`, prefix sums plus a count map, bucket sort by frequency. **Templates:** complement lookup, prefix sum + count map, frequency buckets.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Two Sum](https://leetcode.com/problems/two-sum/) (E), then concepts; then [Valid Anagram](https://leetcode.com/problems/valid-anagram/) (E) | 2 quick repeats, drawn by the app |
| 2 | [Group Anagrams](https://leetcode.com/problems/group-anagrams/) (M), [Longest Palindrome](https://leetcode.com/problems/longest-palindrome/) (E) | 2 quick repeats, drawn by the app |
| 3 | [Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/) (M), [Longest Consecutive Sequence](https://leetcode.com/problems/longest-consecutive-sequence/) (M), [Valid Sudoku](https://leetcode.com/problems/valid-sudoku/) (M) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Reverse Words in a String](https://leetcode.com/problems/reverse-words-in-a-string/) (M, wk 1), [Pascal's Triangle II](https://leetcode.com/problems/pascals-triangle-ii/) (E, wk 1) | 2 quick repeats, drawn by the app |
| 5 | [Range Sum Query - Immutable](https://leetcode.com/problems/range-sum-query-immutable/) (E), [Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k/) (M), [Contiguous Array](https://leetcode.com/problems/contiguous-array/) (M) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [First Missing Positive](https://leetcode.com/problems/first-missing-positive/) (H), [Subarray Sums Divisible by K](https://leetcode.com/problems/subarray-sums-divisible-by-k/) (M) | 2 quick repeats, drawn by the app |
| 7 | Old (unlabelled): [Game of Life](https://leetcode.com/problems/game-of-life/) (M, wk 1), [String Compression](https://leetcode.com/problems/string-compression/) (M, wk 1) | 2 quick repeats, drawn by the app |

**Pool:** [Contains Duplicate](https://leetcode.com/problems/contains-duplicate/), [Isomorphic Strings](https://leetcode.com/problems/isomorphic-strings/), [Word Pattern](https://leetcode.com/problems/word-pattern/), [Ransom Note](https://leetcode.com/problems/ransom-note/), [Happy Number](https://leetcode.com/problems/happy-number/), [Majority Element](https://leetcode.com/problems/majority-element/), [Find Pivot Index](https://leetcode.com/problems/find-pivot-index/), [Range Sum Query 2D - Immutable](https://leetcode.com/problems/range-sum-query-2d-immutable/), [Majority Element II](https://leetcode.com/problems/majority-element-ii/), [Find All Duplicates in an Array](https://leetcode.com/problems/find-all-duplicates-in-an-array/)

### Week 3 · Two pointers & sliding window (Mon 9 Nov – Sun 15 Nov)

**Learn:** opposite-end pointers on sorted input, read/write pointers, fixed vs variable windows, why expand-and-shrink is O(n) overall, skipping duplicates in 3Sum, left-max/right-max for water. **Templates:** opposite-end two pointers, variable window with a count map.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Valid Palindrome](https://leetcode.com/problems/valid-palindrome/) (E), then concepts; then [Reverse String](https://leetcode.com/problems/reverse-string/) (E) | 2 quick repeats, drawn by the app |
| 2 | [Two Sum II - Input Array Is Sorted](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) (M), [3Sum](https://leetcode.com/problems/3sum/) (M), [Container With Most Water](https://leetcode.com/problems/container-with-most-water/) (M) | 2 quick repeats, drawn by the app |
| 3 | [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/) (M), [Maximum Number of Vowels in a Substring of Given Length](https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/) (M) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Integer to Roman](https://leetcode.com/problems/integer-to-roman/) (M, wk 1), [Sort Characters By Frequency](https://leetcode.com/problems/sort-characters-by-frequency/) (M, wk 2), [Continuous Subarray Sum](https://leetcode.com/problems/continuous-subarray-sum/) (M, wk 2) | 2 quick repeats, drawn by the app |
| 5 | [Permutation in String](https://leetcode.com/problems/permutation-in-string/) (M), [Valid Palindrome II](https://leetcode.com/problems/valid-palindrome-ii/) (E) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/) (H), [Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/) (H) | 2 quick repeats, drawn by the app |
| 7 | [Remove Duplicates from Sorted Array II](https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/) (M), [Fruit Into Baskets](https://leetcode.com/problems/fruit-into-baskets/) (M). Redos from your queue come first; if none are due, try [Longest Repeating Character Replacement](https://leetcode.com/problems/longest-repeating-character-replacement/) (M) | 2 quick repeats, drawn by the app |

**Pool:** [Squares of a Sorted Array](https://leetcode.com/problems/squares-of-a-sorted-array/), [Is Subsequence](https://leetcode.com/problems/is-subsequence/), [Maximum Average Subarray I](https://leetcode.com/problems/maximum-average-subarray-i/), [4Sum](https://leetcode.com/problems/4sum/), [Minimum Size Subarray Sum](https://leetcode.com/problems/minimum-size-subarray-sum/), [Max Consecutive Ones III](https://leetcode.com/problems/max-consecutive-ones-iii/), [Substring with Concatenation of All Words](https://leetcode.com/problems/substring-with-concatenation-of-all-words/) (H)

### Week 4 · Sorting & binary search (Mon 16 Nov – Sun 22 Nov)

**Learn:** merge sort and quicksort (O(n log n), stability, worst cases), quickselect for kth element in average O(n), Python's `sort` (Timsort, stable, `key=`), closed vs half-open binary search, lower and upper bound with `bisect`, rotated arrays (one half is always sorted), binary search on the answer with a `feasible()` check. **Templates:** merge sort, quickselect, lower\_bound, search on answer.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Sort an Array](https://leetcode.com/problems/sort-an-array/) (M), then concepts; then [Binary Search](https://leetcode.com/problems/binary-search/) (E) | 2 quick repeats, drawn by the app |
| 2 | [Find First and Last Position of Element in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) (M), [Sqrt(x)](https://leetcode.com/problems/sqrtx/) (E) | 2 quick repeats, drawn by the app |
| 3 | [Search a 2D Matrix](https://leetcode.com/problems/search-a-2d-matrix/) (M), [Koko Eating Bananas](https://leetcode.com/problems/koko-eating-bananas/) (M), [Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) (M) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Sort Colors](https://leetcode.com/problems/sort-colors/) (M, wk 3), [Backspace String Compare](https://leetcode.com/problems/backspace-string-compare/) (E, wk 3) | 2 quick repeats, drawn by the app |
| 5 | [Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/) (M), [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/) (M) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Median of Two Sorted Arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/) (H), [Guess Number Higher or Lower](https://leetcode.com/problems/guess-number-higher-or-lower/) (E) | 2 quick repeats, drawn by the app |
| 7 | Old (unlabelled): [3Sum Closest](https://leetcode.com/problems/3sum-closest/) (M, wk 3), [Insert Delete GetRandom O(1)](https://leetcode.com/problems/insert-delete-getrandom-o1/) (M, wk 2) | 2 quick repeats, drawn by the app |

**Pool:** [Search Insert Position](https://leetcode.com/problems/search-insert-position/), [Peak Index in a Mountain Array](https://leetcode.com/problems/peak-index-in-a-mountain-array/), [Single Element in a Sorted Array](https://leetcode.com/problems/single-element-in-a-sorted-array/), [Largest Number](https://leetcode.com/problems/largest-number/), [H-Index](https://leetcode.com/problems/h-index/), [Split Array Largest Sum](https://leetcode.com/problems/split-array-largest-sum/) (H)

## Weeks 5–8

### Week 5 · Stacks, queues, monotonic stack & deque (Mon 23 Nov – Sun 29 Nov)

**Learn:** a list as a stack, `deque` as a queue (and why `list.pop(0)` is O(n)), a queue from two stacks (amortized O(1)), a min-stack built from pairs, monotonic stacks for next greater/smaller, a monotonic deque for window max, evaluating expressions with a stack. **Templates:** monotonic stack of indices, monotonic deque, stack parser.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Valid Parentheses](https://leetcode.com/problems/valid-parentheses/) (E), then concepts; then [Baseball Game](https://leetcode.com/problems/baseball-game/) (E) | 2 quick repeats, drawn by the app |
| 2 | [Min Stack](https://leetcode.com/problems/min-stack/) (M), [Evaluate Reverse Polish Notation](https://leetcode.com/problems/evaluate-reverse-polish-notation/) (M), [Implement Queue using Stacks](https://leetcode.com/problems/implement-queue-using-stacks/) (E) | 2 quick repeats, drawn by the app |
| 3 | [Daily Temperatures](https://leetcode.com/problems/daily-temperatures/) (M), [Make The String Great](https://leetcode.com/problems/make-the-string-great/) (E) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Capacity To Ship Packages Within D Days](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) (M, wk 4), [Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/) (M, wk 3), [Brick Wall](https://leetcode.com/problems/brick-wall/) (M, wk 2) | 2 quick repeats, drawn by the app |
| 5 | [Car Fleet](https://leetcode.com/problems/car-fleet/) (M), [Implement Stack using Queues](https://leetcode.com/problems/implement-stack-using-queues/) (E) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/) (H), [Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/) (H) | 2 quick repeats, drawn by the app |
| 7 | [Removing Stars From a String](https://leetcode.com/problems/removing-stars-from-a-string/) (M), [Final Prices With a Special Discount in a Shop](https://leetcode.com/problems/final-prices-with-a-special-discount-in-a-shop/) (E). Redos from your queue come first; if none are due, try [Asteroid Collision](https://leetcode.com/problems/asteroid-collision/) (M) | 2 quick repeats, drawn by the app |

**Pool:** [Remove All Adjacent Duplicates In String](https://leetcode.com/problems/remove-all-adjacent-duplicates-in-string/), [Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/), [Number of Recent Calls](https://leetcode.com/problems/number-of-recent-calls/), [Next Greater Element II](https://leetcode.com/problems/next-greater-element-ii/), [Basic Calculator II](https://leetcode.com/problems/basic-calculator-ii/), [Basic Calculator](https://leetcode.com/problems/basic-calculator/) (H)

### Week 6 · Recursion & linked lists (Mon 30 Nov – Sun 6 Dec)

**Learn:** recursion as base case plus smaller subproblem, the call stack and how deep it goes, Python's recursion limit, divide and conquer (fast power), nodes and pointers, the dummy head, reversing in place iteratively and recursively, fast/slow pointers (middle, cycle, Floyd), hash map + doubly linked list (LRU). **Templates:** recursive skeleton, iterative reverse, slow/fast middle, dummy-node merge.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Pow(x, n)](https://leetcode.com/problems/powx-n/) (M), then concepts; then [Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/) (E), [Merge Two Sorted Lists](https://leetcode.com/problems/merge-two-sorted-lists/) (E) | 2 quick repeats, drawn by the app |
| 2 | [Remove Nth Node From End of List](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) (M), [Remove Linked List Elements](https://leetcode.com/problems/remove-linked-list-elements/) (E) | 2 quick repeats, drawn by the app |
| 3 | [Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/) (E), [Reorder List](https://leetcode.com/problems/reorder-list/) (M), [Add Two Numbers](https://leetcode.com/problems/add-two-numbers/) (M) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Decode String](https://leetcode.com/problems/decode-string/) (M, wk 5), [Remove Outermost Parentheses](https://leetcode.com/problems/remove-outermost-parentheses/) (E, wk 5) | 2 quick repeats, drawn by the app |
| 5 | [Copy List with Random Pointer](https://leetcode.com/problems/copy-list-with-random-pointer/) (M), [LRU Cache](https://leetcode.com/problems/lru-cache/) (M) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/) (H), [Remove Duplicates from Sorted List](https://leetcode.com/problems/remove-duplicates-from-sorted-list/) (E) | 2 quick repeats, drawn by the app |
| 7 | Old (unlabelled): [Find Peak Element](https://leetcode.com/problems/find-peak-element/) (M, wk 4), [Simplify Path](https://leetcode.com/problems/simplify-path/) (M, wk 5) | 2 quick repeats, drawn by the app |

**Pool:** [Fibonacci Number](https://leetcode.com/problems/fibonacci-number/), [Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/), [Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/), [Intersection of Two Linked Lists](https://leetcode.com/problems/intersection-of-two-linked-lists/), [K-th Symbol in Grammar](https://leetcode.com/problems/k-th-symbol-in-grammar/), [Swap Nodes in Pairs](https://leetcode.com/problems/swap-nodes-in-pairs/), [Partition List](https://leetcode.com/problems/partition-list/), [Reverse Linked List II](https://leetcode.com/problems/reverse-linked-list-ii/), [Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/), [Reverse Nodes in k-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/) (H)

### Week 7 · Trees & BST (Mon 7 Dec – Sun 13 Dec)

**Learn:** binary tree vs BST, height O(log n) when balanced and O(n) when not, pre/in/post-order and level order, DFS that returns a value while updating a global answer, iterative traversal with a stack, validating a BST with bounds, LCA. **Templates:** recursive DFS returning height, BFS by level, iterative inorder.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Invert Binary Tree](https://leetcode.com/problems/invert-binary-tree/) (E), then concepts; then [Symmetric Tree](https://leetcode.com/problems/symmetric-tree/) (E) | 2 quick repeats, drawn by the app |
| 2 | [Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/) (E), [Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/) (E), [Balanced Binary Tree](https://leetcode.com/problems/balanced-binary-tree/) (E) | 2 quick repeats, drawn by the app |
| 3 | [Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/) (M), [Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/) (E) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Sort List](https://leetcode.com/problems/sort-list/) (M, wk 6), [Remove K Digits](https://leetcode.com/problems/remove-k-digits/) (M, wk 5), [Time Based Key-Value Store](https://leetcode.com/problems/time-based-key-value-store/) (M, wk 4) | 2 quick repeats, drawn by the app |
| 5 | [Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/) (M), [Minimum Depth of Binary Tree](https://leetcode.com/problems/minimum-depth-of-binary-tree/) (E) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Lowest Common Ancestor of a Binary Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) (M), [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/) (H) | 2 quick repeats, drawn by the app |
| 7 | [Path Sum](https://leetcode.com/problems/path-sum/) (E), [Convert Sorted Array to Binary Search Tree](https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/) (E). Redos from your queue come first; if none are due, try [Kth Smallest Element in a BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/) (M) | 2 quick repeats, drawn by the app |

**Pool:** [Same Tree](https://leetcode.com/problems/same-tree/), [Subtree of Another Tree](https://leetcode.com/problems/subtree-of-another-tree/), [Lowest Common Ancestor of a Binary Search Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/), [Binary Tree Zigzag Level Order Traversal](https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/), [Path Sum II](https://leetcode.com/problems/path-sum-ii/), [Flatten Binary Tree to Linked List](https://leetcode.com/problems/flatten-binary-tree-to-linked-list/), [Sum Root to Leaf Numbers](https://leetcode.com/problems/sum-root-to-leaf-numbers/), [Delete Node in a BST](https://leetcode.com/problems/delete-node-in-a-bst/)

### Week 8 · Heaps, intervals & greedy (Mon 14 Dec – Sun 20 Dec)

**Learn:** a binary heap stored as an array, `heapq` is a min-heap (negate for max, tuples for ties), `heapify` in O(n), push and pop in O(log n), a size-k heap for top-k, two heaps for a running median, intervals sorted by start (merge) or by end (scheduling), greedy choice and why it is safe (exchange argument). **Templates:** size-k heap, two heaps, merge intervals, greedy farthest-reach.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Kth Largest Element in a Stream](https://leetcode.com/problems/kth-largest-element-in-a-stream/) (E), then concepts; then [Last Stone Weight](https://leetcode.com/problems/last-stone-weight/) (E) | 2 quick repeats, drawn by the app |
| 2 | [K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/) (M), [The K Weakest Rows in a Matrix](https://leetcode.com/problems/the-k-weakest-rows-in-a-matrix/) (E) | 2 quick repeats, drawn by the app |
| 3 | [Merge Intervals](https://leetcode.com/problems/merge-intervals/) (M), [Insert Interval](https://leetcode.com/problems/insert-interval/) (M), [Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/) (M) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Construct Binary Tree from Preorder and Inorder Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) (M, wk 7), [Binary Tree Paths](https://leetcode.com/problems/binary-tree-paths/) (E, wk 7) | 2 quick repeats, drawn by the app |
| 5 | [Task Scheduler](https://leetcode.com/problems/task-scheduler/) (M), [Jump Game](https://leetcode.com/problems/jump-game/) (M), [Gas Station](https://leetcode.com/problems/gas-station/) (M) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/) (H), [Assign Cookies](https://leetcode.com/problems/assign-cookies/) (E) | 2 quick repeats, drawn by the app |
| 7 | Old (unlabelled): [Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/) (M, wk 7), [Rotate List](https://leetcode.com/problems/rotate-list/) (M, wk 6) | 2 quick repeats, drawn by the app |

**Pool:** [Reorganize String](https://leetcode.com/problems/reorganize-string/), [Design Twitter](https://leetcode.com/problems/design-twitter/), [Car Pooling](https://leetcode.com/problems/car-pooling/), [Minimum Number of Arrows to Burst Balloons](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/), [Jump Game II](https://leetcode.com/problems/jump-game-ii/), [Merge Triplets to Form Target Triplet](https://leetcode.com/problems/merge-triplets-to-form-target-triplet/), [Valid Parenthesis String](https://leetcode.com/problems/valid-parenthesis-string/), [IPO](https://leetcode.com/problems/ipo/) (H), [Minimum Interval to Include Each Query](https://leetcode.com/problems/minimum-interval-to-include-each-query/) (H)

## Weeks 9–12

Weeks 9 and 10 cover the holidays: 25 Dec is Week 9 Day 5 and 1 Jan is Week 10 Day 5. Add a day in the app rather than squeezing.

### Week 9 · Backtracking & tries (Mon 21 Dec – Sun 27 Dec)

**Learn:** recursion trees and their size (2ⁿ subsets, n! permutations), choose → explore → un-choose, skipping duplicates after sorting, pruning, marking and restoring grid cells, a trie node as a children dict plus an end flag. **Templates:** backtracking skeleton, grid DFS with restore, Trie class.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Subsets](https://leetcode.com/problems/subsets/) (M), then concepts; then [Letter Case Permutation](https://leetcode.com/problems/letter-case-permutation/) (M) | 2 quick repeats, drawn by the app |
| 2 | [Combination Sum](https://leetcode.com/problems/combination-sum/) (M), [Permutations](https://leetcode.com/problems/permutations/) (M), [Subsets II](https://leetcode.com/problems/subsets-ii/) (M) | 2 quick repeats, drawn by the app |
| 3 | [Word Search](https://leetcode.com/problems/word-search/) (M), [Beautiful Arrangement](https://leetcode.com/problems/beautiful-arrangement/) (M) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Partition Labels](https://leetcode.com/problems/partition-labels/) (M, wk 8), [Count Good Nodes in Binary Tree](https://leetcode.com/problems/count-good-nodes-in-binary-tree/) (M, wk 7), [Online Stock Span](https://leetcode.com/problems/online-stock-span/) (M, wk 5) | 2 quick repeats, drawn by the app |
| 5 | [Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/) (M), [Map Sum Pairs](https://leetcode.com/problems/map-sum-pairs/) (M) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/) (M), [N-Queens](https://leetcode.com/problems/n-queens/) (H) | 2 quick repeats, drawn by the app |
| 7 | [Letter Tile Possibilities](https://leetcode.com/problems/letter-tile-possibilities/) (M), [Non-decreasing Subsequences](https://leetcode.com/problems/non-decreasing-subsequences/) (M). Redos from your queue come first; if none are due, try [Letter Combinations of a Phone Number](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) (M) | 2 quick repeats, drawn by the app |

**Pool:** [Combinations](https://leetcode.com/problems/combinations/), [Combination Sum III](https://leetcode.com/problems/combination-sum-iii/), [Permutations II](https://leetcode.com/problems/permutations-ii/), [Restore IP Addresses](https://leetcode.com/problems/restore-ip-addresses/), [Replace Words](https://leetcode.com/problems/replace-words/), [Word Search II](https://leetcode.com/problems/word-search-ii/) (H), [Sudoku Solver](https://leetcode.com/problems/sudoku-solver/) (H)

### Week 10 · Graphs I: BFS, DFS, grids, topological sort, union-find (Mon 28 Dec – Sun 3 Jan)

**Learn:** adjacency list vs matrix, building a graph from edges with `defaultdict(list)`, BFS for unweighted shortest paths vs DFS, grids as graphs, when to mark visited, multi-source BFS, topological sort (Kahn) and cycle detection, union-find with path compression and union by rank. Everything is O(V + E). **Templates:** grid BFS/DFS, Kahn's algorithm, UnionFind class.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Number of Islands](https://leetcode.com/problems/number-of-islands/) (M), then concepts; then [Flood Fill](https://leetcode.com/problems/flood-fill/) (E) | 2 quick repeats, drawn by the app |
| 2 | [Max Area of Island](https://leetcode.com/problems/max-area-of-island/) (M), [Island Perimeter](https://leetcode.com/problems/island-perimeter/) (E) | 2 quick repeats, drawn by the app |
| 3 | [Clone Graph](https://leetcode.com/problems/clone-graph/) (M), [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/) (M), [Pacific Atlantic Water Flow](https://leetcode.com/problems/pacific-atlantic-water-flow/) (M) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Generate Parentheses](https://leetcode.com/problems/generate-parentheses/) (M, wk 9), [Implement Magic Dictionary](https://leetcode.com/problems/implement-magic-dictionary/) (M, wk 9) | 2 quick repeats, drawn by the app |
| 5 | [Course Schedule](https://leetcode.com/problems/course-schedule/) (M), [Course Schedule II](https://leetcode.com/problems/course-schedule-ii/) (M), [Redundant Connection](https://leetcode.com/problems/redundant-connection/) (M) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Word Ladder](https://leetcode.com/problems/word-ladder/) (H), [Find Center of Star Graph](https://leetcode.com/problems/find-center-of-star-graph/) (E) | 2 quick repeats, drawn by the app |
| 7 | Old (unlabelled): [Hand of Straights](https://leetcode.com/problems/hand-of-straights/) (M, wk 8), [Palindrome Partitioning](https://leetcode.com/problems/palindrome-partitioning/) (M, wk 9) | 2 quick repeats, drawn by the app |

**Pool:** [Find the Town Judge](https://leetcode.com/problems/find-the-town-judge/), [Find if Path Exists in Graph](https://leetcode.com/problems/find-if-path-exists-in-graph/), [Keys and Rooms](https://leetcode.com/problems/keys-and-rooms/), [Surrounded Regions](https://leetcode.com/problems/surrounded-regions/), [01 Matrix](https://leetcode.com/problems/01-matrix/), [Shortest Path in Binary Matrix](https://leetcode.com/problems/shortest-path-in-binary-matrix/), [Is Graph Bipartite?](https://leetcode.com/problems/is-graph-bipartite/), [Time Needed to Inform All Employees](https://leetcode.com/problems/time-needed-to-inform-all-employees/)

### Week 11 · DP I (1D) + Kadane (Mon 4 Jan – Sun 10 Jan)

**Learn:** overlapping subproblems and optimal substructure, defining state + transition + base case, top-down with `@cache` vs bottom-up tables, rolling variables for O(1) space, Kadane's running best, LIS in O(n²) and then O(n log n) with `bisect`. **Templates:** memoised recursion, bottom-up 1D with rolling variables, Kadane.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Climbing Stairs](https://leetcode.com/problems/climbing-stairs/) (E), then concepts; then [Divisor Game](https://leetcode.com/problems/divisor-game/) (E) | 2 quick repeats, drawn by the app |
| 2 | [House Robber](https://leetcode.com/problems/house-robber/) (M), [House Robber II](https://leetcode.com/problems/house-robber-ii/) (M), [Min Cost Climbing Stairs](https://leetcode.com/problems/min-cost-climbing-stairs/) (E) | 2 quick repeats, drawn by the app |
| 3 | [Coin Change](https://leetcode.com/problems/coin-change/) (M), [Minimum Cost For Tickets](https://leetcode.com/problems/minimum-cost-for-tickets/) (M) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Accounts Merge](https://leetcode.com/problems/accounts-merge/) (M, wk 10), [Top K Frequent Words](https://leetcode.com/problems/top-k-frequent-words/) (M, wk 8), [Combination Sum II](https://leetcode.com/problems/combination-sum-ii/) (M, wk 9) | 2 quick repeats, drawn by the app |
| 5 | [Maximum Subarray](https://leetcode.com/problems/maximum-subarray/) (M), [Longest Continuous Increasing Subsequence](https://leetcode.com/problems/longest-continuous-increasing-subsequence/) (E) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Word Break](https://leetcode.com/problems/word-break/) (M), [Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/) (M) | 2 quick repeats, drawn by the app |
| 7 | [Longest String Chain](https://leetcode.com/problems/longest-string-chain/) (M), [Best Time to Buy and Sell Stock with Transaction Fee](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/) (M). Redos from your queue come first; if none are due, try [Decode Ways](https://leetcode.com/problems/decode-ways/) (M) | 2 quick repeats, drawn by the app |

**Pool:** [N-th Tribonacci Number](https://leetcode.com/problems/n-th-tribonacci-number/), [Palindromic Substrings](https://leetcode.com/problems/palindromic-substrings/), [Maximum Sum Circular Subarray](https://leetcode.com/problems/maximum-sum-circular-subarray/), [Delete and Earn](https://leetcode.com/problems/delete-and-earn/), [Perfect Squares](https://leetcode.com/problems/perfect-squares/), [Combination Sum IV](https://leetcode.com/problems/combination-sum-iv/), [Integer Break](https://leetcode.com/problems/integer-break/), [Number of Longest Increasing Subsequence](https://leetcode.com/problems/number-of-longest-increasing-subsequence/)

### Week 12 · DP II (2D) + weighted graphs (Mon 11 Jan – Sun 17 Jan)

**Learn:** 2D tables for grids and two strings, reading the answer from the table, rolling a 2D table down to 1D, 0/1 vs unbounded knapsack, counting combinations vs permutations, Dijkstra with `heapq` in O(E log V), Bellman-Ford with k-limited relaxations, Prim's MST. **Templates:** two-string DP, knapsack, Dijkstra.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Unique Paths](https://leetcode.com/problems/unique-paths/) (M), then concepts; then [Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/) (M) | 2 quick repeats, drawn by the app |
| 2 | [Edit Distance](https://leetcode.com/problems/edit-distance/) (M), [Triangle](https://leetcode.com/problems/triangle/) (M) | 2 quick repeats, drawn by the app |
| 3 | [Coin Change II](https://leetcode.com/problems/coin-change-ii/) (M), [Target Sum](https://leetcode.com/problems/target-sum/) (M), [Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/) (M) | 2 quick repeats, drawn by the app |
| 4 | Old (unlabelled): [Maximum Product Subarray](https://leetcode.com/problems/maximum-product-subarray/) (M, wk 11), [Domino and Tromino Tiling](https://leetcode.com/problems/domino-and-tromino-tiling/) (M, wk 11) | 2 quick repeats, drawn by the app |
| 5 | [Network Delay Time](https://leetcode.com/problems/network-delay-time/) (M), [Min Cost to Connect All Points](https://leetcode.com/problems/min-cost-to-connect-all-points/) (M), [Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) (M) | 2 quick repeats, drawn by the app |
| 6 | Timed, 45 min each: [Longest Increasing Path in a Matrix](https://leetcode.com/problems/longest-increasing-path-in-a-matrix/) (H), [Minimum Falling Path Sum](https://leetcode.com/problems/minimum-falling-path-sum/) (M) | 2 quick repeats, drawn by the app |
| 7 | Old (unlabelled): [Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/) (M, wk 11), [Evaluate Division](https://leetcode.com/problems/evaluate-division/) (M, wk 10) | 2 quick repeats, drawn by the app |

**Pool:** [Unique Paths II](https://leetcode.com/problems/unique-paths-ii/), [Minimum Path Sum](https://leetcode.com/problems/minimum-path-sum/), [Maximal Square](https://leetcode.com/problems/maximal-square/), [Interleaving String](https://leetcode.com/problems/interleaving-string/), [Best Time to Buy and Sell Stock with Cooldown](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/), [Path With Minimum Effort](https://leetcode.com/problems/path-with-minimum-effort/), [Swim in Rising Water](https://leetcode.com/problems/swim-in-rising-water/) (H), [Reconstruct Itinerary](https://leetcode.com/problems/reconstruct-itinerary/) (H), [Distinct Subsequences](https://leetcode.com/problems/distinct-subsequences/) (H), [Burst Balloons](https://leetcode.com/problems/burst-balloons/) (H), [Regular Expression Matching](https://leetcode.com/problems/regular-expression-matching/) (H)

## Week 13 · Bit tricks, practical class design, final mocks (Mon 18 Jan – Sat 23 Jan)

The last six days (plan days 85–90) switch to interview conditions. They add the class-design problems that Wealthsimple, Shopify and Cohere-style pairing rounds use.

**Learn:** binary and the operators `& | ^ << >> ~`, `x & (x - 1)`, XOR cancelling pairs, Python's unbounded ints and 32-bit masking, designing a class (state, methods, the cost of each method) before coding it.

| Day | Work | Review |
| --- | --- | --- |
| 1 | Cold try: [Single Number](https://leetcode.com/problems/single-number/) (E), then concepts; then [Missing Number](https://leetcode.com/problems/missing-number/) (E) | 2 quick repeats, drawn by the app |
| 2 | [Design Browser History](https://leetcode.com/problems/design-browser-history/) (M), [Design Underground System](https://leetcode.com/problems/design-underground-system/) (M), [Snapshot Array](https://leetcode.com/problems/snapshot-array/) (M) (Class design) | 2 quick repeats, drawn by the app |
| 3 | [Stock Price Fluctuation](https://leetcode.com/problems/stock-price-fluctuation/) (M), [Design HashSet](https://leetcode.com/problems/design-hashset/) (E) | 2 quick repeats, drawn by the app |
| 4 | Interview simulation, 45 min each, unlabelled: [Search Suggestions System](https://leetcode.com/problems/search-suggestions-system/) (M, wk 9), [Number of Provinces](https://leetcode.com/problems/number-of-provinces/) (M, wk 10) | 2 quick repeats, drawn by the app |
| 5 | [Multiply Strings](https://leetcode.com/problems/multiply-strings/) (M), [Design Circular Queue](https://leetcode.com/problems/design-circular-queue/) (M) | 2 quick repeats, drawn by the app |
| 6 | Wrap-up: redo the 5 lowest-confidence problems in your journal, then write a one-page sheet of every pattern and its trigger |  |

**Pool:** [Number of 1 Bits](https://leetcode.com/problems/number-of-1-bits/), [Counting Bits](https://leetcode.com/problems/counting-bits/), [Reverse Bits](https://leetcode.com/problems/reverse-bits/), [Sum of Two Integers](https://leetcode.com/problems/sum-of-two-integers/), [Design Parking System](https://leetcode.com/problems/design-parking-system/), [Design a Food Rating System](https://leetcode.com/problems/design-a-food-rating-system/), [Flatten Nested List Iterator](https://leetcode.com/problems/flatten-nested-list-iterator/), [Peeking Iterator](https://leetcode.com/problems/peeking-iterator/), [LFU Cache](https://leetcode.com/problems/lfu-cache/) (H), [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) (H) (moved here from Day 4: the day would run over 2.5 hours)

After Day 90 the app moves to free practice: keep taking mocks, drawing programs from any week's pool.

## Practical multi-part programs

Even-numbered mocks (13 of the 26, the final included) use Program 2 for a practical task in three levels. Each level extends the code you already wrote, which is the format Wealthsimple, Cohere, Meta's data rounds and CodeSignal's middle questions use. These are our own prompts, stored in the app and coded in your editor. Use only the standard library, no pandas. If a level is unfinished at 30 minutes, log how far you got.

| # | Task | Level 1 → Level 2 → Level 3 | Usable from week |
| --- | --- | --- | --- |
| 1 | Word stats | Count words in a text → top k ignoring stopwords → most common bigrams | 2 |
| 2 | Bank ledger | Apply transactions to balances → reject overdrafts with a reason → monthly statement per account | 2 |
| 3 | Group-by report | Sum a list of dicts by key → join two lists of dicts on id → top 3 per group, sorted | 2 |
| 4 | Log analyzer | Parse request log lines → requests and average latency per endpoint → sessionize users with a 30-minute gap | 4 |
| 5 | Rover on a grid | Run L/R/F commands → obstacles stop the rover → several rovers that can't collide | 3 |
| 6 | Rate limiter | Fixed window per user → sliding window log → token bucket with refill | 5 |
| 7 | Key-value store | get/set/delete → keys with TTL → begin/rollback/commit transactions (a stack of changes) | 5 |
| 8 | Inventory system | Add and remove stock in a class → orders that partly fill → low-stock alerts in priority order | 6 |
| 9 | LRU cache with stats | `OrderedDict` version → your own linked list + dict → hit/miss rate and a size limit in bytes | 6 |
| 10 | Org chart | Build a tree from (employee, manager) rows → depth and team size per manager → lowest common manager of two people | 7 |
| 11 | Leaderboard | add\_score and top(k) → rank of a player → reset and ties broken by time | 8 |
| 12 | Meeting booker | Book a room if free → several rooms, pick the first free one → fewest rooms needed for a day's requests | 8 |
| 13 | Autocomplete | Insert words with counts → top 3 by prefix → update counts as words are typed | 9 |
| 14 | Dependency resolver | Install order for packages → detect cycles and name them → parallel install batches | 10 |
| 15 | Delivery routes | Shortest stops between cities (BFS) → cheapest route with costs (Dijkstra) → cheapest within k stops | 12 |
| 16 | Embedding search | Cosine similarity of two vectors → top k nearest from a list → cache repeated queries | 8 |

Slots not covered by these tasks use a CodeSignal-style implementation problem from the [HackerRank Interview Preparation Kit](https://www.hackerrank.com/interview/interview-preparation-kit).

## What the app needs to change

Curriculum v3 (this document) changes the day model. See `docs/MIGRATION_V2.md` for the migration notes and `docs/CURRICULUM_V3_NOTES.md` for the new problems and things to review.

1. **No mock on any day.** `content/curriculum.json` has a top-level `mocks` list (26 entries, each with `suggestedAfterWeek`); days have no `mock`, and a day's learn item exists only on new-topic days. Saving a mock ticks nothing.
2. **Review slots.** Every day from plan day 5 (except the wrap-up) has `reviewSlots: 2`: items `<dayId>:review-1` and `-2`. The problems are drawn by the app and stored in the `dayDraws` table (Dexie v5), once per slot, with Re-roll until you log it.
3. **Two counted problems a day** from plan day 5. Plan days 1–4 and all existing problem ids are unchanged; 48 problems were added with new ids, and one problem (`w13-d4-p3`) moved from its day to that week's pool, keeping its id.
4. **Mocks:** on demand, built from the week they are suggested after.

## Sources

- [About Grind 75 – Tech Interview Handbook](https://techinterviewhandbook.org/grind75/about)
- [LeetCode patterns: Blind 75 vs NeetCode 150 – techinterview.org](https://www.techinterview.org/post/3233474682/leetcode-patterns-by-frequency/)
- [Coding interview study plan around your schedule – techinterview.org](https://www.techinterview.org/post/3233476075/coding-interview-study-plan-around-your-schedule/?format=md)
- [LeetCode Top Interview 150 sections](https://lets-code.co.in/interview/leetcodetop150questions/)
- [NeetCode 250 categories](https://github.com/iamBelugax/neetcode-250)
- [Striver A2Z DSA Sheet order](https://github.com/CodeWithSameer04/Striver-A2Z-DSA-Sheet)
- [HackerRank Interview Preparation Kit](https://www.hackerrank.com/interview/interview-preparation-kit)
- [Amazon most-asked LeetCode problems](https://leetcompass.lovable.app/company/amazon)
- [Amazon Online Assessment 2026](https://www.lodely.com/blog/amazon-online-assessment-2025)
- [CodeSignal OA guide](https://prachub.com/resources/codesignal-oa-guide-scoring-question-types-and-how-companies-read-your-report)
- [Meta's AI-enabled coding round](https://dglearning.substack.com/p/inside-metas-new-ai-enabled-coding)
- [Google's AI-assisted coding interview](https://www.aced.io/blog/google-ai-coding-interview)
- [Wealthsimple interview process](https://www.designgurus.io/answers/detail/what-is-the-wealthsimple-interview-process-like-round-by-round)
- [Cohere interview process](https://www.designgurus.io/answers/detail/what-is-the-cohere-interview-process-like-round-by-round)
- [Meta Data Engineer guide](https://codemia.io/guides/meta-data-engineer)
- [CIBC Data Engineer guide](https://dataford.io/interview-guides/cibc/data-engineer)
- [Python interview questions and what they test](https://dev.to/fourleaf/python-interview-questions-what-each-one-actually-predicts-on-the-job-2026-27nc)
- [Interleaving research summary](https://retrievalpractice.org/archive/2017/interleaving)
