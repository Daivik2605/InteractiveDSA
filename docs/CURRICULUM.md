# 13-Week Curriculum (Python)

Generated from `content/curriculum.json` — edit the JSON, not this file.

Every day has coding. Day 7 codes redos from your miss list. Problems marked ➕ were added to the original 150 to give thin weeks enough practice.

| Week | Topic | Problems |
|---|---|---|
| 1 | Big-O + Arrays & Strings | 12 |
| 2 | Hashing, Prefix Sums & Bit Tricks | 15 |
| 3 | Two Pointers & Sliding Window | 13 |
| 4 | Stacks, Queues & Monotonic Stack | 12 |
| 5 | Binary Search | 12 |
| 6 | Linked Lists | 12 |
| 7 | Trees & BST | 15 |
| 8 | Heaps & Intervals | 11 |
| 9 | Backtracking & Tries | 12 |
| 10 | Graphs I: BFS, DFS, Topological Sort, Union-Find | 11 |
| 11 | Graphs II (Weighted) & Greedy | 13 |
| 12 | Dynamic Programming I (1D) | 12 |
| 13 | Dynamic Programming II (2D) + Mock Interviews | 11 |
| | **Total** | **161** |

## Week 1 — Big-O + Arrays & Strings

**Goal:** Analyse the time and space of any loop or recursion; know what every Python list/str operation costs.

**Concepts:** Big-O, Big-Θ, Big-Ω; dropping constants; Best / average / worst case; Space: auxiliary vs input, recursion stack; Amortized analysis (list.append); Python list = dynamic array; str is immutable; Matrix traversal (rows, cols, layers)

**Visuals to build:** Growth-rate race: O(1) … O(n!) as n grows; Dynamic array: append, resize (capacity doubling), insert at front shifting; Matrix rotate = transpose + reverse rows; Spiral traversal shrinking boundaries

**Python templates:** Prefix/suffix product pass; In-place matrix transpose

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Contains Duplicate](https://leetcode.com/problems/contains-duplicate/) (E), [Plus One](https://leetcode.com/problems/plus-one/) (E) |
| 2 | Weekly quiz (30+ MCQs) | [Merge Sorted Array](https://leetcode.com/problems/merge-sorted-array/) (E) ➕, [Longest Common Prefix](https://leetcode.com/problems/longest-common-prefix/) (E) ➕ |
| 3 | Pattern drill (5 min) | [Product of Array Except Self](https://leetcode.com/problems/product-of-array-except-self/) (M), [Valid Sudoku](https://leetcode.com/problems/valid-sudoku/) (M) |
| 4 | Pattern drill (5 min) | [Rotate Image](https://leetcode.com/problems/rotate-image/) (M), [Spiral Matrix](https://leetcode.com/problems/spiral-matrix/) (M) |
| 5 | Pattern drill (5 min) | [Set Matrix Zeroes](https://leetcode.com/problems/set-matrix-zeroes/) (M), [Multiply Strings](https://leetcode.com/problems/multiply-strings/) (M) |
| 6 | Timed session: 45 min per problem | [Pow(x, n)](https://leetcode.com/problems/powx-n/) (M), [Rotate Array](https://leetcode.com/problems/rotate-array/) (M) ➕ |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 2 — Hashing, Prefix Sums & Bit Tricks

**Goal:** Turn O(n²) searches into O(n) with dict/set; use prefix sums and XOR tricks.

**Concepts:** Hash function, collisions, load factor, resizing; dict/set O(1) avg vs O(n) worst; hashable keys; Counter / defaultdict; Prefix sums + hashmap of prefix counts; Binary, &, |, ^, <<, >>; x & (x-1); 32-bit masking in Python

**Visuals to build:** Hash table buckets with chaining and a resize; Prefix-sum array and the 'prefix − k' lookup; XOR cancelling pairs bit by bit

**Python templates:** Seen-set / complement lookup; Prefix sum + count map; Frequency bucket sort

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Valid Anagram](https://leetcode.com/problems/valid-anagram/) (E), [Two Sum](https://leetcode.com/problems/two-sum/) (E) |
| 2 | Weekly quiz (30+ MCQs) | [Happy Number](https://leetcode.com/problems/happy-number/) (E), [Single Number](https://leetcode.com/problems/single-number/) (E) |
| 3 | Pattern drill (5 min) | [Number of 1 Bits](https://leetcode.com/problems/number-of-1-bits/) (E), [Counting Bits](https://leetcode.com/problems/counting-bits/) (E), [Reverse Bits](https://leetcode.com/problems/reverse-bits/) (E) |
| 4 | Pattern drill (5 min) | [Missing Number](https://leetcode.com/problems/missing-number/) (E), [Group Anagrams](https://leetcode.com/problems/group-anagrams/) (M), [Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/) (M) |
| 5 | Pattern drill (5 min) | [Longest Consecutive Sequence](https://leetcode.com/problems/longest-consecutive-sequence/) (M), [Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k/) (M), [Detect Squares](https://leetcode.com/problems/detect-squares/) (M) |
| 6 | Timed session: 45 min per problem | [Sum of Two Integers](https://leetcode.com/problems/sum-of-two-integers/) (M), [Reverse Integer (then redo your 5 weakest problems)](https://leetcode.com/problems/reverse-integer/) (M) |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 3 — Two Pointers & Sliding Window

**Goal:** Instantly recognise sorted-pair and contiguous-subarray/substring problems.

**Concepts:** Opposite-end pointers on sorted input; Fast/slow and read/write pointers; Fixed vs variable window; Why expand/shrink is O(n) (amortized); Monotonic deque for window max

**Visuals to build:** Two pointers closing in on a target sum; 3Sum: fixed i + inner two pointers, skipping duplicates; Variable window expanding and shrinking over a string; Trapping rain water: left/right max

**Python templates:** Opposite-end two pointers; Variable sliding window with counts; Monotonic deque

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Valid Palindrome](https://leetcode.com/problems/valid-palindrome/) (E), [Best Time to Buy and Sell Stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) (E) |
| 2 | Weekly quiz (30+ MCQs) | [Two Sum II - Input Array Is Sorted](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) (M), [Sort Colors](https://leetcode.com/problems/sort-colors/) (M) |
| 3 | Pattern drill (5 min) | [3Sum](https://leetcode.com/problems/3sum/) (M), [Container With Most Water](https://leetcode.com/problems/container-with-most-water/) (M), [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/) (M) |
| 4 | Pattern drill (5 min) | [Longest Repeating Character Replacement](https://leetcode.com/problems/longest-repeating-character-replacement/) (M), [Permutation in String](https://leetcode.com/problems/permutation-in-string/) (M) |
| 5 | Pattern drill (5 min) | [Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/) (M), [Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/) (H) |
| 6 | Timed session: 45 min per problem | [Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/) (H), [Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/) (H) |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 4 — Stacks, Queues & Monotonic Stack

**Goal:** Use LIFO/FIFO structures and monotonic stacks for 'next greater/smaller' problems.

**Concepts:** Stack (list) vs queue (collections.deque) and why list.pop(0) is O(n); Implementing a queue with two stacks (amortized O(1)); Min-stack pairing; Monotonic increasing/decreasing stacks; Expression evaluation

**Visuals to build:** Bracket matching push/pop; Monotonic stack popping for Daily Temperatures; Largest rectangle: each pop computes an area

**Python templates:** Monotonic stack of indices; Stack-based parser

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Valid Parentheses](https://leetcode.com/problems/valid-parentheses/) (E), [Implement Queue using Stacks](https://leetcode.com/problems/implement-queue-using-stacks/) (E) |
| 2 | Weekly quiz (30+ MCQs) | [Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/) (E) ➕, [Min Stack](https://leetcode.com/problems/min-stack/) (M) |
| 3 | Pattern drill (5 min) | [Evaluate Reverse Polish Notation](https://leetcode.com/problems/evaluate-reverse-polish-notation/) (M), [Daily Temperatures](https://leetcode.com/problems/daily-temperatures/) (M) |
| 4 | Pattern drill (5 min) | [Generate Parentheses](https://leetcode.com/problems/generate-parentheses/) (M), [Car Fleet](https://leetcode.com/problems/car-fleet/) (M) |
| 5 | Pattern drill (5 min) | [Asteroid Collision](https://leetcode.com/problems/asteroid-collision/) (M) ➕, [Online Stock Span](https://leetcode.com/problems/online-stock-span/) (M) ➕ |
| 6 | Timed session: 45 min per problem | [Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/) (H), [Basic Calculator](https://leetcode.com/problems/basic-calculator/) (H) ➕ |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 5 — Binary Search

**Goal:** Write bug-free binary search and apply it to answer spaces, not just arrays.

**Concepts:** Why O(log n); Closed vs half-open templates; avoiding off-by-one; Lower/upper bound; bisect module; Rotated arrays: one half is always sorted; Binary search on the answer (monotonic predicate)

**Visuals to build:** lo/mid/hi narrowing step by step; Rotated array with the sorted half highlighted; Answer-space search: feasible/infeasible line

**Python templates:** lower_bound; Binary search on answer with feasible()

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Binary Search](https://leetcode.com/problems/binary-search/) (E), [Search Insert Position](https://leetcode.com/problems/search-insert-position/) (E) ➕ |
| 2 | Weekly quiz (30+ MCQs) | [Find First and Last Position in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) (M), [Search a 2D Matrix](https://leetcode.com/problems/search-a-2d-matrix/) (M) |
| 3 | Pattern drill (5 min) | [Koko Eating Bananas](https://leetcode.com/problems/koko-eating-bananas/) (M), [Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) (M) |
| 4 | Pattern drill (5 min) | [Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/) (M), [Time Based Key-Value Store](https://leetcode.com/problems/time-based-key-value-store/) (M) |
| 5 | Pattern drill (5 min) | [Find Peak Element](https://leetcode.com/problems/find-peak-element/) (M) ➕, [Capacity To Ship Packages Within D Days](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) (M) ➕ |
| 6 | Timed session: 45 min per problem | [Median of Two Sorted Arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/) (H), [Split Array Largest Sum](https://leetcode.com/problems/split-array-largest-sum/) (H) ➕ |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 6 — Linked Lists

**Goal:** Manipulate pointers confidently: reverse, merge, detect cycles, design an LRU cache.

**Concepts:** Singly vs doubly linked lists vs arrays; Dummy head node; Fast/slow pointers (Floyd); Reversal in place; Hash map + doubly linked list (LRU); Recursion and the call stack

**Visuals to build:** Reversal: prev/curr/next pointer flip; Floyd cycle detection meeting point; LRU: move-to-front and evict tail

**Python templates:** Iterative reverse; Find middle with slow/fast; Dummy-node merge

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/) (E), [Merge Two Sorted Lists](https://leetcode.com/problems/merge-two-sorted-lists/) (E) |
| 2 | Weekly quiz (30+ MCQs) | [Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/) (E), [Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/) (E) |
| 3 | Pattern drill (5 min) | [Reorder List](https://leetcode.com/problems/reorder-list/) (M), [Remove Nth Node From End of List](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) (M) |
| 4 | Pattern drill (5 min) | [Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/) (M), [Add Two Numbers](https://leetcode.com/problems/add-two-numbers/) (M) |
| 5 | Pattern drill (5 min) | [Copy List with Random Pointer](https://leetcode.com/problems/copy-list-with-random-pointer/) (M), [LRU Cache](https://leetcode.com/problems/lru-cache/) (M) |
| 6 | Timed session: 45 min per problem | [Merge K Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/) (H), [Reverse Nodes in K-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/) (H) |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 7 — Trees & BST

**Goal:** Solve tree problems with DFS that returns values and BFS by level.

**Concepts:** Binary tree vs BST; height O(log n) vs O(n); Pre/in/post-order and level-order; Recursive DFS returning values + global answer; Iterative traversal with a stack; BST validation with bounds; Serialisation

**Visuals to build:** DFS traversal order animation (pre/in/post); BFS level by level with a queue; Max path sum: value returned vs answer updated

**Python templates:** Recursive DFS returning height; BFS by level; Iterative inorder

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Invert Binary Tree](https://leetcode.com/problems/invert-binary-tree/) (E), [Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/) (E) |
| 2 | Weekly quiz (30+ MCQs) | [Same Tree](https://leetcode.com/problems/same-tree/) (E), [Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/) (E) |
| 3 | Pattern drill (5 min) | [Balanced Binary Tree](https://leetcode.com/problems/balanced-binary-tree/) (E), [Subtree of Another Tree](https://leetcode.com/problems/subtree-of-another-tree/) (E), [Lowest Common Ancestor of a BST](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/) (M) |
| 4 | Pattern drill (5 min) | [Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/) (M), [Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/) (M), [Count Good Nodes in Binary Tree](https://leetcode.com/problems/count-good-nodes-in-binary-tree/) (M) |
| 5 | Pattern drill (5 min) | [Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/) (M), [Kth Smallest Element in a BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/) (M), [Construct Binary Tree from Preorder and Inorder](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) (M) |
| 6 | Timed session: 45 min per problem | [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/) (H), [Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) (H) |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 8 — Heaps & Intervals

**Goal:** Use heapq for top-k, k-way merge and streaming medians; solve interval problems by sorting.

**Concepts:** Binary heap as an array; sift up/down; heapq is a min-heap; negate for max; heapify O(n); push/pop O(log n); Top-k with a size-k heap; Two heaps for the median; Intervals: sort by start (merge) vs by end (scheduling)

**Visuals to build:** Heap push/pop sifting in tree + array views; Two-heap median balancing; Merging overlapping intervals on a timeline

**Python templates:** Size-k heap; Two heaps; Merge intervals

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Kth Largest Element in a Stream](https://leetcode.com/problems/kth-largest-element-in-a-stream/) (E), [Last Stone Weight](https://leetcode.com/problems/last-stone-weight/) (E) |
| 2 | Weekly quiz (30+ MCQs) | [K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/) (M), [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/) (M) |
| 3 | Pattern drill (5 min) | [Task Scheduler](https://leetcode.com/problems/task-scheduler/) (M), [Design Twitter](https://leetcode.com/problems/design-twitter/) (M) |
| 4 | Pattern drill (5 min) | [Insert Interval](https://leetcode.com/problems/insert-interval/) (M), [Merge Intervals](https://leetcode.com/problems/merge-intervals/) (M) |
| 5 | Pattern drill (5 min) | [Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/) (M), [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/) (H) |
| 6 | Timed session: 45 min per problem | [Minimum Interval to Include Each Query](https://leetcode.com/problems/minimum-interval-to-include-each-query/) (H) |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 9 — Backtracking & Tries

**Goal:** Apply one choose/explore/un-choose template to subsets, permutations and grid search; build a trie.

**Concepts:** Recursion trees and their size (2ⁿ, n!); Choose → explore → un-choose; Skipping duplicates after sorting; Pruning; Trie nodes: children dict + end flag

**Visuals to build:** Recursion tree for subsets of [1,2,3]; Word Search DFS marking and restoring cells; Trie insert/search path

**Python templates:** Backtracking template; Trie class

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Subsets](https://leetcode.com/problems/subsets/) (M), [Subsets II](https://leetcode.com/problems/subsets-ii/) (M) |
| 2 | Weekly quiz (30+ MCQs) | [Combination Sum](https://leetcode.com/problems/combination-sum/) (M), [Combination Sum II](https://leetcode.com/problems/combination-sum-ii/) (M) |
| 3 | Pattern drill (5 min) | [Permutations](https://leetcode.com/problems/permutations/) (M), [Word Search](https://leetcode.com/problems/word-search/) (M) |
| 4 | Pattern drill (5 min) | [Palindrome Partitioning](https://leetcode.com/problems/palindrome-partitioning/) (M), [Letter Combinations of a Phone Number](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) (M) |
| 5 | Pattern drill (5 min) | [Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/) (M), [Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/) (M) |
| 6 | Timed session: 45 min per problem | [N-Queens](https://leetcode.com/problems/n-queens/) (H), [Word Search II](https://leetcode.com/problems/word-search-ii/) (H) |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 10 — Graphs I: BFS, DFS, Topological Sort, Union-Find

**Goal:** Model problems as graphs and traverse them in O(V+E).

**Concepts:** Adjacency list vs matrix; BFS (shortest path unweighted) vs DFS; Grids as graphs; visited handling; Multi-source BFS; Topological sort (Kahn) and cycle detection; Union-Find with path compression + rank

**Visuals to build:** BFS wave spreading across a grid; Topological sort removing zero in-degree nodes; Union-Find merging components

**Python templates:** Grid DFS/BFS; Kahn's algorithm; UnionFind class

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Number of Islands](https://leetcode.com/problems/number-of-islands/) (M), [Max Area of Island](https://leetcode.com/problems/max-area-of-island/) (M) |
| 2 | Weekly quiz (30+ MCQs) | [Clone Graph](https://leetcode.com/problems/clone-graph/) (M), [Number of Provinces](https://leetcode.com/problems/number-of-provinces/) (M) |
| 3 | Pattern drill (5 min) | [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/) (M), [Pacific Atlantic Water Flow](https://leetcode.com/problems/pacific-atlantic-water-flow/) (M) |
| 4 | Pattern drill (5 min) | [Surrounded Regions](https://leetcode.com/problems/surrounded-regions/) (M), [Course Schedule](https://leetcode.com/problems/course-schedule/) (M) |
| 5 | Pattern drill (5 min) | [Course Schedule II](https://leetcode.com/problems/course-schedule-ii/) (M), [Redundant Connection](https://leetcode.com/problems/redundant-connection/) (M) |
| 6 | Timed session: 45 min per problem | [Word Ladder](https://leetcode.com/problems/word-ladder/) (H) |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 11 — Graphs II (Weighted) & Greedy

**Goal:** Run Dijkstra / Bellman-Ford / Prim and recognise when greedy is provably correct.

**Concepts:** Dijkstra with heapq O(E log V); Bellman-Ford and k-limited relaxations; MST: Prim vs Kruskal; Eulerian path (Hierholzer); Greedy choice + exchange argument; greedy vs DP

**Visuals to build:** Dijkstra relaxing edges with a priority queue; Kadane's running sum; Jump Game farthest reach

**Python templates:** Dijkstra; Kadane

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Network Delay Time](https://leetcode.com/problems/network-delay-time/) (M), [Min Cost to Connect All Points](https://leetcode.com/problems/min-cost-to-connect-all-points/) (M) |
| 2 | Weekly quiz (30+ MCQs) | [Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) (M), [Maximum Subarray](https://leetcode.com/problems/maximum-subarray/) (M) |
| 3 | Pattern drill (5 min) | [Jump Game](https://leetcode.com/problems/jump-game/) (M), [Jump Game II](https://leetcode.com/problems/jump-game-ii/) (M), [Gas Station](https://leetcode.com/problems/gas-station/) (M) |
| 4 | Pattern drill (5 min) | [Hand of Straights](https://leetcode.com/problems/hand-of-straights/) (M), [Merge Triplets to Form Target Triplet](https://leetcode.com/problems/merge-triplets-to-form-target-triplet/) (M) |
| 5 | Pattern drill (5 min) | [Partition Labels](https://leetcode.com/problems/partition-labels/) (M), [Valid Parenthesis String](https://leetcode.com/problems/valid-parenthesis-string/) (M) |
| 6 | Timed session: 45 min per problem | [Swim in Rising Water](https://leetcode.com/problems/swim-in-rising-water/) (H), [Reconstruct Itinerary](https://leetcode.com/problems/reconstruct-itinerary/) (H) |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 12 — Dynamic Programming I (1D)

**Goal:** Define state, transition and base case; go recursion → memo → table → O(1) space.

**Concepts:** Overlapping subproblems + optimal substructure; Top-down @lru_cache vs bottom-up; State compression; 0/1 knapsack (subset sum); LIS in O(n log n)

**Visuals to build:** Fibonacci recursion tree vs memo; 1D DP table filling for House Robber; Coin Change table

**Python templates:** Memoised recursion; Bottom-up 1D with rolling variables

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Climbing Stairs](https://leetcode.com/problems/climbing-stairs/) (E), [Min Cost Climbing Stairs](https://leetcode.com/problems/min-cost-climbing-stairs/) (E) |
| 2 | Weekly quiz (30+ MCQs) | [House Robber](https://leetcode.com/problems/house-robber/) (M), [House Robber II](https://leetcode.com/problems/house-robber-ii/) (M) |
| 3 | Pattern drill (5 min) | [Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/) (M), [Palindromic Substrings](https://leetcode.com/problems/palindromic-substrings/) (M) |
| 4 | Pattern drill (5 min) | [Decode Ways](https://leetcode.com/problems/decode-ways/) (M), [Coin Change](https://leetcode.com/problems/coin-change/) (M) |
| 5 | Pattern drill (5 min) | [Maximum Product Subarray](https://leetcode.com/problems/maximum-product-subarray/) (M), [Word Break](https://leetcode.com/problems/word-break/) (M) |
| 6 | Timed session: 45 min per problem | [Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/) (M), [Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/) (M) |
| 7 | Review quiz (15 questions from past weeks, weighted to mistakes) | Redo 2–3 problems from your catch-up / 'needed hint' list |

## Week 13 — Dynamic Programming II (2D) + Mock Interviews

**Goal:** Solve grid/two-string/interval DP and perform under interview conditions.

**Concepts:** 2D state tables (grid, two strings); Unbounded knapsack and combinations vs permutations; State machines (cooldown); Interval DP (Burst Balloons); Interview communication: brute force → optimal → complexity → code → test

**Visuals to build:** LCS / Edit Distance table with arrows; Rolling 2D → 1D array

**Python templates:** 2D DP over two strings; Interval DP

| Day | Learn | Code |
|---|---|---|
| 1 | Visuals + Python templates | [Unique Paths](https://leetcode.com/problems/unique-paths/) (M), [Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/) (M) |
| 2 | Weekly quiz (30+ MCQs) | [Coin Change II](https://leetcode.com/problems/coin-change-ii/) (M), [Target Sum](https://leetcode.com/problems/target-sum/) (M) |
| 3 | Pattern drill (5 min) | [Best Time to Buy and Sell Stock with Cooldown](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/) (M), [Edit Distance](https://leetcode.com/problems/edit-distance/) (M) |
| 4 | Pattern drill (5 min) | [Interleaving String](https://leetcode.com/problems/interleaving-string/) (M), [Longest Increasing Path in a Matrix](https://leetcode.com/problems/longest-increasing-path-in-a-matrix/) (H) |
| 5 | Pattern drill (5 min) | [Distinct Subsequences](https://leetcode.com/problems/distinct-subsequences/) (H), [Burst Balloons](https://leetcode.com/problems/burst-balloons/) (H), [Regular Expression Matching](https://leetcode.com/problems/regular-expression-matching/) (H) |
| 6 | Mock interview: 2 random Mediums + 1 Hard from any week, 45 min each | Pick from mock pool |
| 7 | Final review quiz across all weeks | Redo 2–3 problems from your catch-up / 'needed hint' list |
