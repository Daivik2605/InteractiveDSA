# 90-Day Python DSA Interview Curriculum

Oct 24, 2026 · @Daivik

90 days of Python, 1.5–2.5 hours a day, from Oct 26, 2026 to Jan 23, 2027. Every day has coding, every other day has a mock, and 1–2 days a week revisit earlier topics without labels.

## How the plan works

The plan teaches by solving: each new topic starts with a cold attempt at one problem, and the concept comes right after. All coding happens on LeetCode, HackerRank or HackerEarth. The app only records the day.

- **Daily time:** 1.5–2.5 hours. A mock day is about 75 minutes of mock plus one problem. A non-mock day is 2–3 problems.
- **Mocks every other day:** 45 mocks on plan days 1, 3, 5 … 89. In odd weeks they fall on Days 1, 3, 5 and 7; in even weeks on Days 2, 4 and 6.
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

The order follows prerequisites: Python and arrays first, then sorting and recursion early (as Striver's A2Z sheet does), so trees, backtracking and DP stand on them. Totals: about 120 new topic problems, 40 old-topic problems and 45 mocks with about 65 mock programs, so roughly 225 programs in 90 days.

| Week | Plan days | Topic | New topic problems | Old-topic problems | Mocks |
| --- | --- | --- | --- | --- | --- |
| 1 | 1–7 | Python toolkit, Big-O, arrays & strings | 9 | 4 (HackerRank Python) | 4 |
| 2 | 8–14 | Hashing, counting, prefix sums | 10 | 3 | 3 |
| 3 | 15–21 | Two pointers & sliding window | 9 | 3 | 4 |
| 4 | 22–28 | Sorting & binary search | 9 | 3 | 3 |
| 5 | 29–35 | Stacks, queues, monotonic stack & deque | 9 | 3 | 4 |
| 6 | 36–42 | Recursion & linked lists | 10 | 3 | 3 |
| 7 | 43–49 | Trees & BST | 9 | 3 | 4 |
| 8 | 50–56 | Heaps, intervals & greedy | 10 | 3 | 3 |
| 9 | 57–63 | Backtracking & tries | 9 | 3 | 4 |
| 10 | 64–70 | Graphs I: BFS, DFS, grids, topological sort, union-find | 10 | 3 | 3 |
| 11 | 71–77 | DP I (1D) + Kadane | 9 | 3 | 4 |
| 12 | 78–84 | DP II (2D) + weighted graphs (Dijkstra, Prim, Bellman-Ford) | 10 | 3 | 3 |
| 13 | 85–90 | Bit tricks, practical class design, final mocks | 7 | 3 | 3 |

What changed from the old plan: sorting and quickselect added, recursion gets real time, bit tricks shrink from three days to part of one, and Pow(x, n) and Valid Sudoku move to the weeks that teach them. Any problem not listed for a day goes into that week's **pool**, which supplies later old-topic days and mock programs.

## Weekly rhythm

Mocks alternate days across the whole plan, so odd and even weeks have different templates. Both keep Day 4 and Day 7 for earlier topics.

| Day | Odd weeks (1, 3, 5 … 13) | Even weeks (2, 4 … 12) |
| --- | --- | --- |
| 1 | **Mock** + new topic: cold try (15–20 min), concept and template, then 1 problem | New topic: cold try, concept and template, then 2–3 problems |
| 2 | 3 topic problems | **Mock** + 1 topic problem |
| 3 | **Mock** + 1 topic problem | 3 topic problems |
| 4 | **Old topics:** 3 unlabelled problems from earlier weeks | **Mock** + 1 unlabelled old-topic problem |
| 5 | **Mock** + 1 topic problem | 2–3 topic problems |
| 6 | Timed: 2 Medium/Hard topic problems, 45 min each | **Mock** + 1 Hard topic problem, timed |
| 7 | **Mock** + 1–2 redos (fallback problem listed if the queue is empty) | **Old topics:** 2 unlabelled problems + redos |

On non-mock days, a 5-minute pattern drill in the app is optional. The weekly quiz and the review quiz are folded into the mocks, so there is one test format instead of three.

## Mock test spec

Each mock is 60–85 minutes in four timed parts, done in one sitting. Mock 1 (Day 1) is a diagnostic. Its score is your baseline and doesn't count against you.

| Part | Time | What it is |
| --- | --- | --- |
| A. MCQs | 20 min | 15–20 interview-level questions: about 7 Python language, 6 on this week and last week, 5 spaced-review cards from older weeks |
| B. Program 1 | 25 min | Every mock: one unlabelled problem from an earlier week's pool (Weeks 1–2: HackerRank Python domain or the Week 1 pool) |
| C. Program 2 | 30 min | Even-numbered mocks only: a practical multi-part program (see that section) or a CodeSignal-style implementation task |
| D. Extra | 10 min | Rotates by mock number: **Debug** a 15–25 line buggy function · **Explain aloud** brute force → optimal → Big-O in 3 min · **Complexity check** of your own Program 1 plus one edge case you tested |

The app records the MCQ score by type, each program's outcome and minutes, whether the extra was done, and a self-rating from 1 to 5.

**MCQ question types:** output (what does this print), bug (which line is wrong), complexity, pattern (which technique fits), approach (best plan for a problem), and Python concept.

**Python language rotation:** 15 themes, cycled three times across the 45 mocks. Mock n leads with theme ((n − 1) mod 15) + 1, so Mock 1, 16 and 31 cover theme 1.

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

| Day | Mock | Work |
| --- | --- | --- |
| 1 | Mock 1 (diagnostic) | Cold try: [Plus One](https://leetcode.com/problems/plus-one/) (E), then concepts |
| 2 |  | [Merge Sorted Array](https://leetcode.com/problems/merge-sorted-array/) (E), [Remove Duplicates from Sorted Array](https://leetcode.com/problems/remove-duplicates-from-sorted-array/) (E), [Longest Common Prefix](https://leetcode.com/problems/longest-common-prefix/) (E) |
| 3 | Mock 2 | [Best Time to Buy and Sell Stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) (E) |
| 4 |  | Python fluency on [HackerRank Python](https://www.hackerrank.com/domains/python): Nested Lists, Find the Runner-Up Score!, collections.Counter(), Word Order |
| 5 | Mock 3 | [Product of Array Except Self](https://leetcode.com/problems/product-of-array-except-self/) (M) |
| 6 |  | Timed: [Rotate Image](https://leetcode.com/problems/rotate-image/) (M), [Spiral Matrix](https://leetcode.com/problems/spiral-matrix/) (M) |
| 7 | Mock 4 | Redos; if none: [Set Matrix Zeroes](https://leetcode.com/problems/set-matrix-zeroes/) (M) |

**Pool:** [Move Zeroes](https://leetcode.com/problems/move-zeroes/), [Pascal's Triangle](https://leetcode.com/problems/pascals-triangle/), [Summary Ranges](https://leetcode.com/problems/summary-ranges/), [Rotate Array](https://leetcode.com/problems/rotate-array/), [Reverse Words in a String](https://leetcode.com/problems/reverse-words-in-a-string/), [String Compression](https://leetcode.com/problems/string-compression/), [Game of Life](https://leetcode.com/problems/game-of-life/), [Zigzag Conversion](https://leetcode.com/problems/zigzag-conversion/), [Roman to Integer](https://leetcode.com/problems/roman-to-integer/), [Integer to Roman](https://leetcode.com/problems/integer-to-roman/), [Text Justification](https://leetcode.com/problems/text-justification/) (H)

### Week 2 · Hashing, counting, prefix sums (Mon 2 Nov – Sun 8 Nov)

**Learn:** how a hash table works (buckets, collisions, resizing), average O(1) vs worst O(n), what makes a key hashable, `Counter` and `defaultdict`, prefix sums plus a count map, bucket sort by frequency. **Templates:** complement lookup, prefix sum + count map, frequency buckets.

| Day | Mock | Work |
| --- | --- | --- |
| 1 |  | Cold try: [Two Sum](https://leetcode.com/problems/two-sum/) (E), then [Valid Anagram](https://leetcode.com/problems/valid-anagram/) (E) |
| 2 | Mock 5 | [Group Anagrams](https://leetcode.com/problems/group-anagrams/) (M) |
| 3 |  | [Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/) (M), [Longest Consecutive Sequence](https://leetcode.com/problems/longest-consecutive-sequence/) (M), [Valid Sudoku](https://leetcode.com/problems/valid-sudoku/) (M) |
| 4 | Mock 6 | Old: [Reverse Words in a String](https://leetcode.com/problems/reverse-words-in-a-string/) (M, wk 1) |
| 5 |  | [Range Sum Query - Immutable](https://leetcode.com/problems/range-sum-query-immutable/) (E), [Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k/) (M), [Contiguous Array](https://leetcode.com/problems/contiguous-array/) (M) |
| 6 | Mock 7 | Timed: [First Missing Positive](https://leetcode.com/problems/first-missing-positive/) (H) |
| 7 |  | Old: [Game of Life](https://leetcode.com/problems/game-of-life/) (M, wk 1), [String Compression](https://leetcode.com/problems/string-compression/) (M, wk 1) + redos |

**Pool:** [Contains Duplicate](https://leetcode.com/problems/contains-duplicate/), [Isomorphic Strings](https://leetcode.com/problems/isomorphic-strings/), [Word Pattern](https://leetcode.com/problems/word-pattern/), [Ransom Note](https://leetcode.com/problems/ransom-note/), [Happy Number](https://leetcode.com/problems/happy-number/), [Majority Element](https://leetcode.com/problems/majority-element/), [Find Pivot Index](https://leetcode.com/problems/find-pivot-index/), [Sort Characters By Frequency](https://leetcode.com/problems/sort-characters-by-frequency/), [Insert Delete GetRandom O(1)](https://leetcode.com/problems/insert-delete-getrandom-o1/), [Brick Wall](https://leetcode.com/problems/brick-wall/), [Continuous Subarray Sum](https://leetcode.com/problems/continuous-subarray-sum/), [Range Sum Query 2D - Immutable](https://leetcode.com/problems/range-sum-query-2d-immutable/), [Majority Element II](https://leetcode.com/problems/majority-element-ii/), [Find All Duplicates in an Array](https://leetcode.com/problems/find-all-duplicates-in-an-array/)

### Week 3 · Two pointers & sliding window (Mon 9 Nov – Sun 15 Nov)

**Learn:** opposite-end pointers on sorted input, read/write pointers, fixed vs variable windows, why expand-and-shrink is O(n) overall, skipping duplicates in 3Sum, left-max/right-max for water. **Templates:** opposite-end two pointers, variable window with a count map.

| Day | Mock | Work |
| --- | --- | --- |
| 1 | Mock 8 | Cold try: [Valid Palindrome](https://leetcode.com/problems/valid-palindrome/) (E), then concepts |
| 2 |  | [Two Sum II - Input Array Is Sorted](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) (M), [3Sum](https://leetcode.com/problems/3sum/) (M), [Container With Most Water](https://leetcode.com/problems/container-with-most-water/) (M) |
| 3 | Mock 9 | [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/) (M) |
| 4 |  | Old: [Integer to Roman](https://leetcode.com/problems/integer-to-roman/) (M, wk 1), [Sort Characters By Frequency](https://leetcode.com/problems/sort-characters-by-frequency/) (M, wk 2), [Continuous Subarray Sum](https://leetcode.com/problems/continuous-subarray-sum/) (M, wk 2) |
| 5 | Mock 10 | [Permutation in String](https://leetcode.com/problems/permutation-in-string/) (M) |
| 6 |  | Timed: [Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/) (H), [Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/) (H) |
| 7 | Mock 11 | Redos; if none: [Longest Repeating Character Replacement](https://leetcode.com/problems/longest-repeating-character-replacement/) (M) |

**Pool:** [Squares of a Sorted Array](https://leetcode.com/problems/squares-of-a-sorted-array/), [Is Subsequence](https://leetcode.com/problems/is-subsequence/), [Maximum Average Subarray I](https://leetcode.com/problems/maximum-average-subarray-i/), [Sort Colors](https://leetcode.com/problems/sort-colors/), [3Sum Closest](https://leetcode.com/problems/3sum-closest/), [4Sum](https://leetcode.com/problems/4sum/), [Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/), [Minimum Size Subarray Sum](https://leetcode.com/problems/minimum-size-subarray-sum/), [Max Consecutive Ones III](https://leetcode.com/problems/max-consecutive-ones-iii/), [Substring with Concatenation of All Words](https://leetcode.com/problems/substring-with-concatenation-of-all-words/) (H)

### Week 4 · Sorting & binary search (Mon 16 Nov – Sun 22 Nov)

**Learn:** merge sort and quicksort (O(n log n), stability, worst cases), quickselect for kth element in average O(n), Python's `sort` (Timsort, stable, `key=`), closed vs half-open binary search, lower and upper bound with `bisect`, rotated arrays (one half is always sorted), binary search on the answer with a `feasible()` check. **Templates:** merge sort, quickselect, lower\_bound, search on answer.

| Day | Mock | Work |
| --- | --- | --- |
| 1 |  | Cold try: [Sort an Array](https://leetcode.com/problems/sort-an-array/) (M, write merge sort), then [Binary Search](https://leetcode.com/problems/binary-search/) (E) |
| 2 | Mock 12 | [Find First and Last Position of Element in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) (M) |
| 3 |  | [Search a 2D Matrix](https://leetcode.com/problems/search-a-2d-matrix/) (M), [Koko Eating Bananas](https://leetcode.com/problems/koko-eating-bananas/) (M), [Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) (M) |
| 4 | Mock 13 | Old: [Sort Colors](https://leetcode.com/problems/sort-colors/) (M, wk 3) |
| 5 |  | [Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/) (M), [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/) (M, quickselect and heap) |
| 6 | Mock 14 | Timed: [Median of Two Sorted Arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/) (H) |
| 7 |  | Old: [3Sum Closest](https://leetcode.com/problems/3sum-closest/) (M, wk 3), [Insert Delete GetRandom O(1)](https://leetcode.com/problems/insert-delete-getrandom-o1/) (M, wk 2) + redos |

**Pool:** [Search Insert Position](https://leetcode.com/problems/search-insert-position/), [Peak Index in a Mountain Array](https://leetcode.com/problems/peak-index-in-a-mountain-array/), [Find Peak Element](https://leetcode.com/problems/find-peak-element/), [Single Element in a Sorted Array](https://leetcode.com/problems/single-element-in-a-sorted-array/), [Capacity To Ship Packages Within D Days](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/), [Time Based Key-Value Store](https://leetcode.com/problems/time-based-key-value-store/), [Largest Number](https://leetcode.com/problems/largest-number/), [H-Index](https://leetcode.com/problems/h-index/), [Split Array Largest Sum](https://leetcode.com/problems/split-array-largest-sum/) (H)

## Weeks 5–8

### Week 5 · Stacks, queues, monotonic stack & deque (Mon 23 Nov – Sun 29 Nov)

**Learn:** a list as a stack, `deque` as a queue (and why `list.pop(0)` is O(n)), a queue from two stacks (amortized O(1)), a min-stack built from pairs, monotonic stacks for next greater/smaller, a monotonic deque for window max, evaluating expressions with a stack. **Templates:** monotonic stack of indices, monotonic deque, stack parser.

| Day | Mock | Work |
| --- | --- | --- |
| 1 | Mock 15 | Cold try: [Valid Parentheses](https://leetcode.com/problems/valid-parentheses/) (E), then concepts |
| 2 |  | [Min Stack](https://leetcode.com/problems/min-stack/) (M), [Evaluate Reverse Polish Notation](https://leetcode.com/problems/evaluate-reverse-polish-notation/) (M), [Implement Queue using Stacks](https://leetcode.com/problems/implement-queue-using-stacks/) (E) |
| 3 | Mock 16 | [Daily Temperatures](https://leetcode.com/problems/daily-temperatures/) (M) |
| 4 |  | Old: [Capacity To Ship Packages Within D Days](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) (M, wk 4), [Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/) (M, wk 3), [Brick Wall](https://leetcode.com/problems/brick-wall/) (M, wk 2) |
| 5 | Mock 17 | [Car Fleet](https://leetcode.com/problems/car-fleet/) (M) |
| 6 |  | Timed: [Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/) (H), [Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/) (H) |
| 7 | Mock 18 | Redos; if none: [Asteroid Collision](https://leetcode.com/problems/asteroid-collision/) (M) |

**Pool:** [Remove All Adjacent Duplicates In String](https://leetcode.com/problems/remove-all-adjacent-duplicates-in-string/), [Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/), [Number of Recent Calls](https://leetcode.com/problems/number-of-recent-calls/), [Next Greater Element II](https://leetcode.com/problems/next-greater-element-ii/), [Online Stock Span](https://leetcode.com/problems/online-stock-span/), [Decode String](https://leetcode.com/problems/decode-string/), [Simplify Path](https://leetcode.com/problems/simplify-path/), [Remove K Digits](https://leetcode.com/problems/remove-k-digits/), [Basic Calculator II](https://leetcode.com/problems/basic-calculator-ii/), [Basic Calculator](https://leetcode.com/problems/basic-calculator/) (H)

### Week 6 · Recursion & linked lists (Mon 30 Nov – Sun 6 Dec)

**Learn:** recursion as base case plus smaller subproblem, the call stack and how deep it goes, Python's recursion limit, divide and conquer (fast power), nodes and pointers, the dummy head, reversing in place iteratively and recursively, fast/slow pointers (middle, cycle, Floyd), hash map + doubly linked list (LRU). **Templates:** recursive skeleton, iterative reverse, slow/fast middle, dummy-node merge.

| Day | Mock | Work |
| --- | --- | --- |
| 1 |  | Cold try: [Pow(x, n)](https://leetcode.com/problems/powx-n/) (M), then [Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/) (E, both ways), [Merge Two Sorted Lists](https://leetcode.com/problems/merge-two-sorted-lists/) (E) |
| 2 | Mock 19 | [Remove Nth Node From End of List](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) (M) |
| 3 |  | [Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/) (E), [Reorder List](https://leetcode.com/problems/reorder-list/) (M), [Add Two Numbers](https://leetcode.com/problems/add-two-numbers/) (M) |
| 4 | Mock 20 | Old: [Decode String](https://leetcode.com/problems/decode-string/) (M, wk 5) |
| 5 |  | [Copy List with Random Pointer](https://leetcode.com/problems/copy-list-with-random-pointer/) (M), [LRU Cache](https://leetcode.com/problems/lru-cache/) (M) |
| 6 | Mock 21 | Timed: [Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/) (H, divide and conquer now; heap version in week 8) |
| 7 |  | Old: [Find Peak Element](https://leetcode.com/problems/find-peak-element/) (M, wk 4), [Simplify Path](https://leetcode.com/problems/simplify-path/) (M, wk 5) + redos |

**Pool:** [Fibonacci Number](https://leetcode.com/problems/fibonacci-number/), [Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/), [Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/), [Intersection of Two Linked Lists](https://leetcode.com/problems/intersection-of-two-linked-lists/), [K-th Symbol in Grammar](https://leetcode.com/problems/k-th-symbol-in-grammar/), [Swap Nodes in Pairs](https://leetcode.com/problems/swap-nodes-in-pairs/), [Rotate List](https://leetcode.com/problems/rotate-list/), [Partition List](https://leetcode.com/problems/partition-list/), [Sort List](https://leetcode.com/problems/sort-list/), [Reverse Linked List II](https://leetcode.com/problems/reverse-linked-list-ii/), [Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/), [Reverse Nodes in k-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/) (H)

### Week 7 · Trees & BST (Mon 7 Dec – Sun 13 Dec)

**Learn:** binary tree vs BST, height O(log n) when balanced and O(n) when not, pre/in/post-order and level order, DFS that returns a value while updating a global answer, iterative traversal with a stack, validating a BST with bounds, LCA. **Templates:** recursive DFS returning height, BFS by level, iterative inorder.

| Day | Mock | Work |
| --- | --- | --- |
| 1 | Mock 22 | Cold try: [Invert Binary Tree](https://leetcode.com/problems/invert-binary-tree/) (E), then concepts |
| 2 |  | [Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/) (E), [Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/) (E), [Balanced Binary Tree](https://leetcode.com/problems/balanced-binary-tree/) (E) |
| 3 | Mock 23 | [Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/) (M) |
| 4 |  | Old: [Sort List](https://leetcode.com/problems/sort-list/) (M, wk 6), [Remove K Digits](https://leetcode.com/problems/remove-k-digits/) (M, wk 5), [Time Based Key-Value Store](https://leetcode.com/problems/time-based-key-value-store/) (M, wk 4) |
| 5 | Mock 24 | [Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/) (M) |
| 6 |  | Timed: [Lowest Common Ancestor of a Binary Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) (M), [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/) (H) |
| 7 | Mock 25 | Redos; if none: [Kth Smallest Element in a BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/) (M) |

**Pool:** [Same Tree](https://leetcode.com/problems/same-tree/), [Subtree of Another Tree](https://leetcode.com/problems/subtree-of-another-tree/), [Lowest Common Ancestor of a Binary Search Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/), [Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/), [Count Good Nodes in Binary Tree](https://leetcode.com/problems/count-good-nodes-in-binary-tree/), [Construct Binary Tree from Preorder and Inorder Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/), [Binary Tree Zigzag Level Order Traversal](https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/), [Path Sum II](https://leetcode.com/problems/path-sum-ii/), [Flatten Binary Tree to Linked List](https://leetcode.com/problems/flatten-binary-tree-to-linked-list/), [Sum Root to Leaf Numbers](https://leetcode.com/problems/sum-root-to-leaf-numbers/), [Delete Node in a BST](https://leetcode.com/problems/delete-node-in-a-bst/), [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) (H)

### Week 8 · Heaps, intervals & greedy (Mon 14 Dec – Sun 20 Dec)

**Learn:** a binary heap stored as an array, `heapq` is a min-heap (negate for max, tuples for ties), `heapify` in O(n), push and pop in O(log n), a size-k heap for top-k, two heaps for a running median, intervals sorted by start (merge) or by end (scheduling), greedy choice and why it is safe (exchange argument). **Templates:** size-k heap, two heaps, merge intervals, greedy farthest-reach.

| Day | Mock | Work |
| --- | --- | --- |
| 1 |  | Cold try: [Kth Largest Element in a Stream](https://leetcode.com/problems/kth-largest-element-in-a-stream/) (E), then [Last Stone Weight](https://leetcode.com/problems/last-stone-weight/) (E) |
| 2 | Mock 26 | [K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/) (M) |
| 3 |  | [Merge Intervals](https://leetcode.com/problems/merge-intervals/) (M), [Insert Interval](https://leetcode.com/problems/insert-interval/) (M), [Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/) (M) |
| 4 | Mock 27 | Old: [Construct Binary Tree from Preorder and Inorder Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) (M, wk 7) |
| 5 |  | [Task Scheduler](https://leetcode.com/problems/task-scheduler/) (M), [Jump Game](https://leetcode.com/problems/jump-game/) (M), [Gas Station](https://leetcode.com/problems/gas-station/) (M) |
| 6 | Mock 28 | Timed: [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/) (H) |
| 7 |  | Old: [Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/) (M, wk 7), [Rotate List](https://leetcode.com/problems/rotate-list/) (M, wk 6) + redos |

**Pool:** [Top K Frequent Words](https://leetcode.com/problems/top-k-frequent-words/), [Reorganize String](https://leetcode.com/problems/reorganize-string/), [Design Twitter](https://leetcode.com/problems/design-twitter/), [Car Pooling](https://leetcode.com/problems/car-pooling/), [Partition Labels](https://leetcode.com/problems/partition-labels/), [Hand of Straights](https://leetcode.com/problems/hand-of-straights/), [Minimum Number of Arrows to Burst Balloons](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/), [Jump Game II](https://leetcode.com/problems/jump-game-ii/), [Merge Triplets to Form Target Triplet](https://leetcode.com/problems/merge-triplets-to-form-target-triplet/), [Valid Parenthesis String](https://leetcode.com/problems/valid-parenthesis-string/), [IPO](https://leetcode.com/problems/ipo/) (H), [Minimum Interval to Include Each Query](https://leetcode.com/problems/minimum-interval-to-include-each-query/) (H)

## Weeks 9–12

Weeks 9 and 10 cover the holidays: 25 Dec is Week 9 Day 5 and 1 Jan is Week 10 Day 5. Add a day in the app rather than squeezing.

### Week 9 · Backtracking & tries (Mon 21 Dec – Sun 27 Dec)

**Learn:** recursion trees and their size (2ⁿ subsets, n! permutations), choose → explore → un-choose, skipping duplicates after sorting, pruning, marking and restoring grid cells, a trie node as a children dict plus an end flag. **Templates:** backtracking skeleton, grid DFS with restore, Trie class.

| Day | Mock | Work |
| --- | --- | --- |
| 1 | Mock 29 | Cold try: [Subsets](https://leetcode.com/problems/subsets/) (M), then concepts |
| 2 |  | [Combination Sum](https://leetcode.com/problems/combination-sum/) (M), [Permutations](https://leetcode.com/problems/permutations/) (M), [Subsets II](https://leetcode.com/problems/subsets-ii/) (M) |
| 3 | Mock 30 | [Word Search](https://leetcode.com/problems/word-search/) (M) |
| 4 |  | Old: [Partition Labels](https://leetcode.com/problems/partition-labels/) (M, wk 8), [Count Good Nodes in Binary Tree](https://leetcode.com/problems/count-good-nodes-in-binary-tree/) (M, wk 7), [Online Stock Span](https://leetcode.com/problems/online-stock-span/) (M, wk 5) |
| 5 | Mock 31 | [Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/) (M) |
| 6 |  | Timed: [Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/) (M), [N-Queens](https://leetcode.com/problems/n-queens/) (H) |
| 7 | Mock 32 | Redos; if none: [Letter Combinations of a Phone Number](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) (M) |

**Pool:** [Combinations](https://leetcode.com/problems/combinations/), [Combination Sum II](https://leetcode.com/problems/combination-sum-ii/), [Combination Sum III](https://leetcode.com/problems/combination-sum-iii/), [Permutations II](https://leetcode.com/problems/permutations-ii/), [Generate Parentheses](https://leetcode.com/problems/generate-parentheses/), [Palindrome Partitioning](https://leetcode.com/problems/palindrome-partitioning/), [Restore IP Addresses](https://leetcode.com/problems/restore-ip-addresses/), [Search Suggestions System](https://leetcode.com/problems/search-suggestions-system/), [Replace Words](https://leetcode.com/problems/replace-words/), [Word Search II](https://leetcode.com/problems/word-search-ii/) (H), [Sudoku Solver](https://leetcode.com/problems/sudoku-solver/) (H)

### Week 10 · Graphs I: BFS, DFS, grids, topological sort, union-find (Mon 28 Dec – Sun 3 Jan)

**Learn:** adjacency list vs matrix, building a graph from edges with `defaultdict(list)`, BFS for unweighted shortest paths vs DFS, grids as graphs, when to mark visited, multi-source BFS, topological sort (Kahn) and cycle detection, union-find with path compression and union by rank. Everything is O(V + E). **Templates:** grid BFS/DFS, Kahn's algorithm, UnionFind class.

| Day | Mock | Work |
| --- | --- | --- |
| 1 |  | Cold try: [Number of Islands](https://leetcode.com/problems/number-of-islands/) (M), then [Flood Fill](https://leetcode.com/problems/flood-fill/) (E) |
| 2 | Mock 33 | [Max Area of Island](https://leetcode.com/problems/max-area-of-island/) (M) |
| 3 |  | [Clone Graph](https://leetcode.com/problems/clone-graph/) (M), [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/) (M), [Pacific Atlantic Water Flow](https://leetcode.com/problems/pacific-atlantic-water-flow/) (M) |
| 4 | Mock 34 | Old: [Generate Parentheses](https://leetcode.com/problems/generate-parentheses/) (M, wk 9) |
| 5 |  | [Course Schedule](https://leetcode.com/problems/course-schedule/) (M), [Course Schedule II](https://leetcode.com/problems/course-schedule-ii/) (M), [Redundant Connection](https://leetcode.com/problems/redundant-connection/) (M) |
| 6 | Mock 35 | Timed: [Word Ladder](https://leetcode.com/problems/word-ladder/) (H) |
| 7 |  | Old: [Hand of Straights](https://leetcode.com/problems/hand-of-straights/) (M, wk 8), [Palindrome Partitioning](https://leetcode.com/problems/palindrome-partitioning/) (M, wk 9) + redos |

**Pool:** [Find the Town Judge](https://leetcode.com/problems/find-the-town-judge/), [Find if Path Exists in Graph](https://leetcode.com/problems/find-if-path-exists-in-graph/), [Number of Provinces](https://leetcode.com/problems/number-of-provinces/), [Keys and Rooms](https://leetcode.com/problems/keys-and-rooms/), [Surrounded Regions](https://leetcode.com/problems/surrounded-regions/), [01 Matrix](https://leetcode.com/problems/01-matrix/), [Shortest Path in Binary Matrix](https://leetcode.com/problems/shortest-path-in-binary-matrix/), [Is Graph Bipartite?](https://leetcode.com/problems/is-graph-bipartite/), [Accounts Merge](https://leetcode.com/problems/accounts-merge/), [Evaluate Division](https://leetcode.com/problems/evaluate-division/), [Time Needed to Inform All Employees](https://leetcode.com/problems/time-needed-to-inform-all-employees/)

### Week 11 · DP I (1D) + Kadane (Mon 4 Jan – Sun 10 Jan)

**Learn:** overlapping subproblems and optimal substructure, defining state + transition + base case, top-down with `@cache` vs bottom-up tables, rolling variables for O(1) space, Kadane's running best, LIS in O(n²) and then O(n log n) with `bisect`. **Templates:** memoised recursion, bottom-up 1D with rolling variables, Kadane.

| Day | Mock | Work |
| --- | --- | --- |
| 1 | Mock 36 | Cold try: [Climbing Stairs](https://leetcode.com/problems/climbing-stairs/) (E), then concepts |
| 2 |  | [House Robber](https://leetcode.com/problems/house-robber/) (M), [House Robber II](https://leetcode.com/problems/house-robber-ii/) (M), [Min Cost Climbing Stairs](https://leetcode.com/problems/min-cost-climbing-stairs/) (E) |
| 3 | Mock 37 | [Coin Change](https://leetcode.com/problems/coin-change/) (M) |
| 4 |  | Old: [Accounts Merge](https://leetcode.com/problems/accounts-merge/) (M, wk 10), [Top K Frequent Words](https://leetcode.com/problems/top-k-frequent-words/) (M, wk 8), [Combination Sum II](https://leetcode.com/problems/combination-sum-ii/) (M, wk 9) |
| 5 | Mock 38 | [Maximum Subarray](https://leetcode.com/problems/maximum-subarray/) (M) |
| 6 |  | Timed: [Word Break](https://leetcode.com/problems/word-break/) (M), [Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/) (M) |
| 7 | Mock 39 | Redos; if none: [Decode Ways](https://leetcode.com/problems/decode-ways/) (M) |

**Pool:** [N-th Tribonacci Number](https://leetcode.com/problems/n-th-tribonacci-number/), [Maximum Product Subarray](https://leetcode.com/problems/maximum-product-subarray/), [Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/), [Palindromic Substrings](https://leetcode.com/problems/palindromic-substrings/), [Maximum Sum Circular Subarray](https://leetcode.com/problems/maximum-sum-circular-subarray/), [Delete and Earn](https://leetcode.com/problems/delete-and-earn/), [Perfect Squares](https://leetcode.com/problems/perfect-squares/), [Combination Sum IV](https://leetcode.com/problems/combination-sum-iv/), [Integer Break](https://leetcode.com/problems/integer-break/), [Number of Longest Increasing Subsequence](https://leetcode.com/problems/number-of-longest-increasing-subsequence/)

### Week 12 · DP II (2D) + weighted graphs (Mon 11 Jan – Sun 17 Jan)

**Learn:** 2D tables for grids and two strings, reading the answer from the table, rolling a 2D table down to 1D, 0/1 vs unbounded knapsack, counting combinations vs permutations, Dijkstra with `heapq` in O(E log V), Bellman-Ford with k-limited relaxations, Prim's MST. **Templates:** two-string DP, knapsack, Dijkstra.

| Day | Mock | Work |
| --- | --- | --- |
| 1 |  | Cold try: [Unique Paths](https://leetcode.com/problems/unique-paths/) (M), then [Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/) (M) |
| 2 | Mock 40 | [Edit Distance](https://leetcode.com/problems/edit-distance/) (M) |
| 3 |  | [Coin Change II](https://leetcode.com/problems/coin-change-ii/) (M), [Target Sum](https://leetcode.com/problems/target-sum/) (M), [Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/) (M) |
| 4 | Mock 41 | Old: [Maximum Product Subarray](https://leetcode.com/problems/maximum-product-subarray/) (M, wk 11) |
| 5 |  | [Network Delay Time](https://leetcode.com/problems/network-delay-time/) (M), [Min Cost to Connect All Points](https://leetcode.com/problems/min-cost-to-connect-all-points/) (M), [Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) (M) |
| 6 | Mock 42 | Timed: [Longest Increasing Path in a Matrix](https://leetcode.com/problems/longest-increasing-path-in-a-matrix/) (H) |
| 7 |  | Old: [Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/) (M, wk 11), [Evaluate Division](https://leetcode.com/problems/evaluate-division/) (M, wk 10) + redos |

**Pool:** [Unique Paths II](https://leetcode.com/problems/unique-paths-ii/), [Minimum Path Sum](https://leetcode.com/problems/minimum-path-sum/), [Maximal Square](https://leetcode.com/problems/maximal-square/), [Interleaving String](https://leetcode.com/problems/interleaving-string/), [Best Time to Buy and Sell Stock with Cooldown](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/), [Path With Minimum Effort](https://leetcode.com/problems/path-with-minimum-effort/), [Swim in Rising Water](https://leetcode.com/problems/swim-in-rising-water/) (H), [Reconstruct Itinerary](https://leetcode.com/problems/reconstruct-itinerary/) (H), [Distinct Subsequences](https://leetcode.com/problems/distinct-subsequences/) (H), [Burst Balloons](https://leetcode.com/problems/burst-balloons/) (H), [Regular Expression Matching](https://leetcode.com/problems/regular-expression-matching/) (H)

## Week 13 · Bit tricks, practical class design, final mocks (Mon 18 Jan – Sat 23 Jan)

The last six days (plan days 85–90) switch to interview conditions. They add the class-design problems that Wealthsimple, Shopify and Cohere-style pairing rounds use.

**Learn:** binary and the operators `& | ^ << >> ~`, `x & (x - 1)`, XOR cancelling pairs, Python's unbounded ints and 32-bit masking, designing a class (state, methods, the cost of each method) before coding it.

| Day | Mock | Work |
| --- | --- | --- |
| 1 | Mock 43 | [Single Number](https://leetcode.com/problems/single-number/) (E), [Missing Number](https://leetcode.com/problems/missing-number/) (E) |
| 2 |  | Class design: [Design Browser History](https://leetcode.com/problems/design-browser-history/) (M), [Design Underground System](https://leetcode.com/problems/design-underground-system/) (M), [Snapshot Array](https://leetcode.com/problems/snapshot-array/) (M) |
| 3 | Mock 44 | [Stock Price Fluctuation](https://leetcode.com/problems/stock-price-fluctuation/) (M) |
| 4 |  | Interview simulation, 45 min each, unlabelled: [Search Suggestions System](https://leetcode.com/problems/search-suggestions-system/) (M, wk 9), [Number of Provinces](https://leetcode.com/problems/number-of-provinces/) (M, wk 10), [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) (H, wk 7) |
| 5 | Mock 45 (final: 20 MCQs + 2 programs) | [Multiply Strings](https://leetcode.com/problems/multiply-strings/) (M) |
| 6 |  | Wrap-up: redo the 5 lowest-confidence problems in your journal, then write a one-page sheet of every pattern and its trigger |

**Pool:** [Number of 1 Bits](https://leetcode.com/problems/number-of-1-bits/), [Counting Bits](https://leetcode.com/problems/counting-bits/), [Reverse Bits](https://leetcode.com/problems/reverse-bits/), [Sum of Two Integers](https://leetcode.com/problems/sum-of-two-integers/), [Design Parking System](https://leetcode.com/problems/design-parking-system/), [Design a Food Rating System](https://leetcode.com/problems/design-a-food-rating-system/), [Flatten Nested List Iterator](https://leetcode.com/problems/flatten-nested-list-iterator/), [Peeking Iterator](https://leetcode.com/problems/peeking-iterator/), [LFU Cache](https://leetcode.com/problems/lfu-cache/) (H)

After Day 90 the app moves to free practice: keep mocks every other day, drawing programs from any week's pool.

## Practical multi-part programs

Even-numbered mocks (22 slots, plus the final mock) use Program 2 for a practical task in three levels. Each level extends the code you already wrote, which is the format Wealthsimple, Cohere, Meta's data rounds and CodeSignal's middle questions use. These are our own prompts, stored in the app and coded in your editor. Use only the standard library, no pandas. If a level is unfinished at 30 minutes, log how far you got.

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

The app's schedule, journal, redo and Leitner logic all carry over. The changes are mostly to the content shape and the mock.

1. **Curriculum file:** 13 weeks, with Week 13 having 6 days (90 plan days). Each day gets a `kind` (topic, old-topics, timed, redo, wrap-up). Problems get a `platform` (LeetCode or HackerRank) and, for old-topic items, a hidden `fromWeek`. Each week gets a `pool` list.
2. **Mock flag:** a plan day is a mock day when its plan-day number is odd. Extension days get no mock, so adding days never breaks the alternation.
3. **Mock replaces three learn items:** the weekly quiz, the review quiz and the drill become one "Mock N" item that ticks when the mock is finished.
4. **Mock builder:** 7 Python questions (theme rotation), 6 from this week and last, 5 Leitner-due cards; Program 1 from an earlier week's pool you haven't attempted; Program 2 on even mocks from the practical tasks; the extra slot by rotation.
5. **Mock record:** extend `MockSession` with MCQ score by type, each program's outcome and minutes, the extra slot's kind and whether it was done, and the 1–5 rating. Bump Dexie and migrate without losing data, as CLAUDE.md requires.
6. **New content files:** Python language questions tagged with a `theme` (1–15); practical tasks with their three levels.
7. **No change needed:** the problem journal already stores approach, code, minutes, complexity and confidence. Leave hints and mistake categories out.
8. **Docs to update:** SPEC 3.1, 3.6–3.8 and 3.10, CONTENT\_SCHEMA, CURRICULUM.md (regenerated from the JSON), BUILD\_PLAN content phases. Also fix the README folder path.

**Content workload:** 13 weeks of concept notes and templates, about 480 MCQs, 13 problem pools, and 16 practical tasks. Writing one week ahead of where you are studying keeps this manageable.

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
