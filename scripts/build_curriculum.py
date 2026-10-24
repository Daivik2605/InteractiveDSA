"""Builds curriculum.json (schema v2) for the 90-day Python DSA plan and validates it."""
import json
import re
import sys
from pathlib import Path

OUT = Path(sys.argv[1])

LC = "https://leetcode.com/problems/{}/"
HR = "https://www.hackerrank.com/challenges/{}/problem"
DIFF = {"E": "Easy", "M": "Medium", "H": "Hard"}


def slug(title: str) -> str:
    s = title.lower()
    s = s.replace("(x, n)", "x-n").replace("o(1)", "o1")
    s = re.sub(r"[()'?,]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


# LeetCode slugs that don't follow the simple rule.
SLUG_OVERRIDES = {
    50: "powx-n",
    208: "implement-trie-prefix-tree",
    235: "lowest-common-ancestor-of-a-binary-search-tree",
    236: "lowest-common-ancestor-of-a-binary-tree",
    105: "construct-binary-tree-from-preorder-and-inorder-traversal",
    380: "insert-delete-getrandom-o1",
    785: "is-graph-bipartite",
    118: "pascals-triangle",
    1047: "remove-all-adjacent-duplicates-in-string",
    303: "range-sum-query-immutable",
    304: "range-sum-query-2d-immutable",
    167: "two-sum-ii-input-array-is-sorted",
    34: "find-first-and-last-position-of-element-in-sorted-array",
    779: "k-th-symbol-in-grammar",
    1137: "n-th-tribonacci-number",
    542: "01-matrix",
    15: "3sum",
    16: "3sum-closest",
    18: "4sum",
}


def lc(num, title, d):
    return {"platform": "LeetCode", "lcNumber": num, "title": title,
            "difficulty": DIFF[d], "url": LC.format(SLUG_OVERRIDES.get(num, slug(title)))}


def hr(slug_, title, d):
    return {"platform": "HackerRank", "title": title, "difficulty": DIFF[d], "url": HR.format(slug_)}


# ---------- problem catalogue (number -> problem) ----------
P = {}
def add(num, title, d):
    P[num] = lc(num, title, d)

for n, t, d in [
    # week 1
    (66, "Plus One", "E"), (88, "Merge Sorted Array", "E"), (26, "Remove Duplicates from Sorted Array", "E"),
    (14, "Longest Common Prefix", "E"), (121, "Best Time to Buy and Sell Stock", "E"),
    (238, "Product of Array Except Self", "M"), (48, "Rotate Image", "M"), (54, "Spiral Matrix", "M"),
    (73, "Set Matrix Zeroes", "M"), (283, "Move Zeroes", "E"), (118, "Pascal's Triangle", "E"),
    (228, "Summary Ranges", "E"), (189, "Rotate Array", "M"), (151, "Reverse Words in a String", "M"),
    (443, "String Compression", "M"), (289, "Game of Life", "M"), (6, "Zigzag Conversion", "M"),
    (13, "Roman to Integer", "E"), (12, "Integer to Roman", "M"), (68, "Text Justification", "H"),
    # week 2
    (1, "Two Sum", "E"), (242, "Valid Anagram", "E"), (49, "Group Anagrams", "M"),
    (347, "Top K Frequent Elements", "M"), (128, "Longest Consecutive Sequence", "M"), (36, "Valid Sudoku", "M"),
    (303, "Range Sum Query - Immutable", "E"), (560, "Subarray Sum Equals K", "M"), (525, "Contiguous Array", "M"),
    (41, "First Missing Positive", "H"), (217, "Contains Duplicate", "E"), (205, "Isomorphic Strings", "E"),
    (290, "Word Pattern", "E"), (383, "Ransom Note", "E"), (202, "Happy Number", "E"), (169, "Majority Element", "E"),
    (724, "Find Pivot Index", "E"), (451, "Sort Characters By Frequency", "M"),
    (380, "Insert Delete GetRandom O(1)", "M"), (554, "Brick Wall", "M"), (523, "Continuous Subarray Sum", "M"),
    (304, "Range Sum Query 2D - Immutable", "M"), (229, "Majority Element II", "M"),
    (442, "Find All Duplicates in an Array", "M"),
    # week 3
    (125, "Valid Palindrome", "E"), (167, "Two Sum II - Input Array Is Sorted", "M"), (15, "3Sum", "M"),
    (11, "Container With Most Water", "M"), (3, "Longest Substring Without Repeating Characters", "M"),
    (567, "Permutation in String", "M"), (76, "Minimum Window Substring", "H"), (42, "Trapping Rain Water", "H"),
    (424, "Longest Repeating Character Replacement", "M"), (977, "Squares of a Sorted Array", "E"),
    (392, "Is Subsequence", "E"), (643, "Maximum Average Subarray I", "E"), (75, "Sort Colors", "M"),
    (16, "3Sum Closest", "M"), (18, "4Sum", "M"), (438, "Find All Anagrams in a String", "M"),
    (209, "Minimum Size Subarray Sum", "M"), (1004, "Max Consecutive Ones III", "M"),
    (30, "Substring with Concatenation of All Words", "H"),
    # week 4
    (912, "Sort an Array", "M"), (704, "Binary Search", "E"),
    (34, "Find First and Last Position of Element in Sorted Array", "M"), (74, "Search a 2D Matrix", "M"),
    (875, "Koko Eating Bananas", "M"), (153, "Find Minimum in Rotated Sorted Array", "M"),
    (33, "Search in Rotated Sorted Array", "M"), (215, "Kth Largest Element in an Array", "M"),
    (4, "Median of Two Sorted Arrays", "H"), (35, "Search Insert Position", "E"),
    (852, "Peak Index in a Mountain Array", "M"), (162, "Find Peak Element", "M"),
    (540, "Single Element in a Sorted Array", "M"), (1011, "Capacity To Ship Packages Within D Days", "M"),
    (981, "Time Based Key-Value Store", "M"), (179, "Largest Number", "M"), (274, "H-Index", "M"),
    (410, "Split Array Largest Sum", "H"),
    # week 5
    (20, "Valid Parentheses", "E"), (155, "Min Stack", "M"), (150, "Evaluate Reverse Polish Notation", "M"),
    (232, "Implement Queue using Stacks", "E"), (739, "Daily Temperatures", "M"), (853, "Car Fleet", "M"),
    (84, "Largest Rectangle in Histogram", "H"), (239, "Sliding Window Maximum", "H"),
    (735, "Asteroid Collision", "M"), (1047, "Remove All Adjacent Duplicates In String", "E"),
    (496, "Next Greater Element I", "E"), (933, "Number of Recent Calls", "E"),
    (503, "Next Greater Element II", "M"), (901, "Online Stock Span", "M"), (394, "Decode String", "M"),
    (71, "Simplify Path", "M"), (402, "Remove K Digits", "M"), (227, "Basic Calculator II", "M"),
    (224, "Basic Calculator", "H"),
    # week 6
    (50, "Pow(x, n)", "M"), (206, "Reverse Linked List", "E"), (21, "Merge Two Sorted Lists", "E"),
    (19, "Remove Nth Node From End of List", "M"), (141, "Linked List Cycle", "E"), (143, "Reorder List", "M"),
    (2, "Add Two Numbers", "M"), (138, "Copy List with Random Pointer", "M"), (146, "LRU Cache", "M"),
    (23, "Merge k Sorted Lists", "H"), (509, "Fibonacci Number", "E"), (876, "Middle of the Linked List", "E"),
    (234, "Palindrome Linked List", "E"), (160, "Intersection of Two Linked Lists", "E"),
    (779, "K-th Symbol in Grammar", "M"), (24, "Swap Nodes in Pairs", "M"), (61, "Rotate List", "M"),
    (86, "Partition List", "M"), (148, "Sort List", "M"), (92, "Reverse Linked List II", "M"),
    (287, "Find the Duplicate Number", "M"), (25, "Reverse Nodes in k-Group", "H"),
    # week 7
    (226, "Invert Binary Tree", "E"), (104, "Maximum Depth of Binary Tree", "E"),
    (543, "Diameter of Binary Tree", "E"), (110, "Balanced Binary Tree", "E"),
    (102, "Binary Tree Level Order Traversal", "M"), (98, "Validate Binary Search Tree", "M"),
    (236, "Lowest Common Ancestor of a Binary Tree", "M"), (124, "Binary Tree Maximum Path Sum", "H"),
    (230, "Kth Smallest Element in a BST", "M"), (100, "Same Tree", "E"), (572, "Subtree of Another Tree", "E"),
    (235, "Lowest Common Ancestor of a Binary Search Tree", "M"), (199, "Binary Tree Right Side View", "M"),
    (1448, "Count Good Nodes in Binary Tree", "M"),
    (105, "Construct Binary Tree from Preorder and Inorder Traversal", "M"),
    (103, "Binary Tree Zigzag Level Order Traversal", "M"), (113, "Path Sum II", "M"),
    (114, "Flatten Binary Tree to Linked List", "M"), (129, "Sum Root to Leaf Numbers", "M"),
    (450, "Delete Node in a BST", "M"), (297, "Serialize and Deserialize Binary Tree", "H"),
    # week 8
    (703, "Kth Largest Element in a Stream", "E"), (1046, "Last Stone Weight", "E"),
    (973, "K Closest Points to Origin", "M"), (56, "Merge Intervals", "M"), (57, "Insert Interval", "M"),
    (435, "Non-overlapping Intervals", "M"), (621, "Task Scheduler", "M"), (55, "Jump Game", "M"),
    (134, "Gas Station", "M"), (295, "Find Median from Data Stream", "H"), (692, "Top K Frequent Words", "M"),
    (767, "Reorganize String", "M"), (355, "Design Twitter", "M"), (1094, "Car Pooling", "M"),
    (763, "Partition Labels", "M"), (846, "Hand of Straights", "M"),
    (452, "Minimum Number of Arrows to Burst Balloons", "M"), (45, "Jump Game II", "M"),
    (1899, "Merge Triplets to Form Target Triplet", "M"), (678, "Valid Parenthesis String", "M"),
    (502, "IPO", "H"), (1851, "Minimum Interval to Include Each Query", "H"),
    # week 9
    (78, "Subsets", "M"), (39, "Combination Sum", "M"), (46, "Permutations", "M"), (90, "Subsets II", "M"),
    (79, "Word Search", "M"), (208, "Implement Trie (Prefix Tree)", "M"),
    (211, "Design Add and Search Words Data Structure", "M"), (51, "N-Queens", "H"),
    (17, "Letter Combinations of a Phone Number", "M"), (77, "Combinations", "M"),
    (40, "Combination Sum II", "M"), (216, "Combination Sum III", "M"), (47, "Permutations II", "M"),
    (22, "Generate Parentheses", "M"), (131, "Palindrome Partitioning", "M"), (93, "Restore IP Addresses", "M"),
    (1268, "Search Suggestions System", "M"), (648, "Replace Words", "M"), (212, "Word Search II", "H"),
    (37, "Sudoku Solver", "H"),
    # week 10
    (200, "Number of Islands", "M"), (733, "Flood Fill", "E"), (695, "Max Area of Island", "M"),
    (133, "Clone Graph", "M"), (994, "Rotting Oranges", "M"), (417, "Pacific Atlantic Water Flow", "M"),
    (207, "Course Schedule", "M"), (210, "Course Schedule II", "M"), (684, "Redundant Connection", "M"),
    (127, "Word Ladder", "H"), (997, "Find the Town Judge", "E"), (1971, "Find if Path Exists in Graph", "E"),
    (547, "Number of Provinces", "M"), (841, "Keys and Rooms", "M"), (130, "Surrounded Regions", "M"),
    (542, "01 Matrix", "M"), (1091, "Shortest Path in Binary Matrix", "M"), (785, "Is Graph Bipartite?", "M"),
    (721, "Accounts Merge", "M"), (399, "Evaluate Division", "M"),
    (1376, "Time Needed to Inform All Employees", "M"),
    # week 11
    (70, "Climbing Stairs", "E"), (198, "House Robber", "M"), (213, "House Robber II", "M"),
    (746, "Min Cost Climbing Stairs", "E"), (322, "Coin Change", "M"), (53, "Maximum Subarray", "M"),
    (139, "Word Break", "M"), (300, "Longest Increasing Subsequence", "M"), (91, "Decode Ways", "M"),
    (1137, "N-th Tribonacci Number", "E"), (152, "Maximum Product Subarray", "M"),
    (5, "Longest Palindromic Substring", "M"), (647, "Palindromic Substrings", "M"),
    (918, "Maximum Sum Circular Subarray", "M"), (740, "Delete and Earn", "M"), (279, "Perfect Squares", "M"),
    (377, "Combination Sum IV", "M"), (343, "Integer Break", "M"),
    (673, "Number of Longest Increasing Subsequence", "M"),
    # week 12
    (62, "Unique Paths", "M"), (1143, "Longest Common Subsequence", "M"), (72, "Edit Distance", "M"),
    (518, "Coin Change II", "M"), (494, "Target Sum", "M"), (416, "Partition Equal Subset Sum", "M"),
    (743, "Network Delay Time", "M"), (1584, "Min Cost to Connect All Points", "M"),
    (787, "Cheapest Flights Within K Stops", "M"), (329, "Longest Increasing Path in a Matrix", "H"),
    (63, "Unique Paths II", "M"), (64, "Minimum Path Sum", "M"), (221, "Maximal Square", "M"),
    (97, "Interleaving String", "M"), (309, "Best Time to Buy and Sell Stock with Cooldown", "M"),
    (1631, "Path With Minimum Effort", "M"), (778, "Swim in Rising Water", "H"),
    (332, "Reconstruct Itinerary", "H"), (115, "Distinct Subsequences", "H"), (312, "Burst Balloons", "H"),
    (10, "Regular Expression Matching", "H"),
    # week 13
    (136, "Single Number", "E"), (268, "Missing Number", "E"), (1472, "Design Browser History", "M"),
    (1396, "Design Underground System", "M"), (1146, "Snapshot Array", "M"),
    (2034, "Stock Price Fluctuation", "M"), (43, "Multiply Strings", "M"), (191, "Number of 1 Bits", "E"),
    (338, "Counting Bits", "E"), (190, "Reverse Bits", "E"), (371, "Sum of Two Integers", "M"),
    (1603, "Design Parking System", "E"), (2353, "Design a Food Rating System", "M"),
    (341, "Flatten Nested List Iterator", "M"), (284, "Peeking Iterator", "M"), (460, "LFU Cache", "H"),
]:
    add(n, t, d)

HR_W1 = [hr("nested-list", "Nested Lists", "E"),
         hr("find-second-maximum-number-in-a-list", "Find the Runner-Up Score!", "E"),
         hr("collections-counter", "collections.Counter()", "E"),
         hr("word-order", "Word Order", "M")]

# ---------- weeks ----------
# Day spec: (problems, fallback, note). Problems: int (core), ("o", week, num) old-topic.
WEEKS = [
    dict(title="Python toolkit, Big-O, arrays & strings",
         goal="Analyse time and space of any loop or recursion; know what every list, str, dict and set operation costs; edit arrays and matrices in place.",
         concepts=["Big-O, Big-Θ, Big-Ω; dropping constants", "Cost of list, str, dict and set operations in CPython",
                   "list as a dynamic array; amortized append", "str is immutable; join vs +=",
                   "In-place edits and read/write pointers", "Matrix traversal: rows, columns, layers"],
         visuals=["Growth-rate race: O(1) … O(n!)", "Dynamic array append and resize", "Matrix rotate = transpose + reverse rows", "Spiral traversal shrinking boundaries"],
         templates=["Prefix/suffix pass", "Read/write pointer", "Transpose + reverse", "Boundary-shrinking spiral"],
         days=[([66], None, None), ([88, 26, 14], None, None), ([121], None, None),
               ("HR", None, "Python fluency on HackerRank"), ([238], None, None), ([48, 54], None, None),
               ([], 73, None)],
         pool=[283, 118, 228, 189, 151, 443, 289, 6, 13, 12, 68]),
    dict(title="Hashing, counting, prefix sums",
         goal="Turn O(n²) searches into O(n) with dict and set; count with Counter; answer subarray-sum questions with prefix sums.",
         concepts=["Hash table buckets, collisions, load factor, resizing", "dict/set O(1) average vs O(n) worst",
                   "Hashable keys (tuples, frozenset)", "Counter and defaultdict", "Prefix sums + count map", "Frequency bucket sort"],
         visuals=["Hash table buckets with a resize", "Prefix-sum array and the prefix − k lookup"],
         templates=["Complement lookup", "Prefix sum + count map", "Frequency buckets"],
         days=[([1, 242], None, None), ([49], None, None), ([347, 128, 36], None, None),
               ([("o", 1, 151)], None, None), ([303, 560, 525], None, None), ([41], None, None),
               ([("o", 1, 289), ("o", 1, 443)], None, None)],
         pool=[217, 205, 290, 383, 202, 169, 724, 451, 380, 554, 523, 304, 229, 442]),
    dict(title="Two pointers & sliding window",
         goal="Recognise sorted-pair and contiguous-subarray/substring problems instantly and solve them in O(n).",
         concepts=["Opposite-end pointers on sorted input", "Read/write and fast/slow pointers", "Fixed vs variable window",
                   "Why expand/shrink is O(n) amortized", "Skipping duplicates (3Sum)", "Left-max / right-max (Trapping Rain Water)"],
         visuals=["Two pointers closing in on a target", "Variable window expanding and shrinking", "Trapping rain water left/right max"],
         templates=["Opposite-end two pointers", "Variable window with a count map"],
         days=[([125], None, None), ([167, 15, 11], None, None), ([3], None, None),
               ([("o", 1, 12), ("o", 2, 451), ("o", 2, 523)], None, None), ([567], None, None),
               ([76, 42], None, None), ([], 424, None)],
         pool=[977, 392, 643, 75, 16, 18, 438, 209, 1004, 30]),
    dict(title="Sorting & binary search",
         goal="Write merge sort and quickselect from memory; write bug-free binary search, including search on the answer.",
         concepts=["Merge sort and quicksort: O(n log n), stability, worst cases", "Quickselect: kth element in average O(n)",
                   "Python sort (Timsort): stable, key=", "Closed vs half-open binary search; off-by-one",
                   "Lower/upper bound with bisect", "Rotated arrays: one half is always sorted", "Binary search on the answer with feasible()"],
         visuals=["Merge sort split and merge", "lo/mid/hi narrowing", "Answer-space feasible/infeasible line"],
         templates=["Merge sort", "Quickselect", "lower_bound", "Binary search on answer"],
         days=[([912, 704], None, None), ([34], None, None), ([74, 875, 153], None, None),
               ([("o", 3, 75)], None, None), ([33, 215], None, None), ([4], None, None),
               ([("o", 3, 16), ("o", 2, 380)], None, None)],
         pool=[35, 852, 162, 540, 1011, 981, 179, 274, 410]),
    dict(title="Stacks, queues, monotonic stack & deque",
         goal="Use LIFO/FIFO structures and monotonic stacks/deques for next-greater, span and window-max problems.",
         concepts=["list as a stack; deque as a queue; why list.pop(0) is O(n)", "Queue from two stacks (amortized O(1))",
                   "Min-stack with pairs", "Monotonic increasing/decreasing stacks", "Monotonic deque for window max", "Expression evaluation"],
         visuals=["Bracket matching push/pop", "Monotonic stack for Daily Temperatures", "Largest rectangle: each pop computes an area"],
         templates=["Monotonic stack of indices", "Monotonic deque", "Stack parser"],
         days=[([20], None, None), ([155, 150, 232], None, None), ([739], None, None),
               ([("o", 4, 1011), ("o", 3, 438), ("o", 2, 554)], None, None), ([853], None, None),
               ([84, 239], None, None), ([], 735, None)],
         pool=[1047, 496, 933, 503, 901, 394, 71, 402, 227, 224]),
    dict(title="Recursion & linked lists",
         goal="Think recursively (base case + smaller subproblem) and manipulate pointers confidently: reverse, merge, detect cycles, build an LRU cache.",
         concepts=["Base case + smaller subproblem; the call stack", "Python recursion limit", "Divide and conquer (fast power)",
                   "Dummy head node", "Reversal in place, iterative and recursive", "Fast/slow pointers (Floyd)", "Hash map + doubly linked list (LRU)"],
         visuals=["Call stack growing and unwinding", "Reversal: prev/curr/next flip", "Floyd cycle detection", "LRU move-to-front and evict"],
         templates=["Recursive skeleton", "Iterative reverse", "Slow/fast middle", "Dummy-node merge"],
         days=[([50, 206, 21], None, None), ([19], None, None), ([141, 143, 2], None, None),
               ([("o", 5, 394)], None, None), ([138, 146], None, None),
               ([23], None, "Divide and conquer now; heap version in Week 8"),
               ([("o", 4, 162), ("o", 5, 71)], None, None)],
         pool=[509, 876, 234, 160, 779, 24, 61, 86, 148, 92, 287, 25]),
    dict(title="Trees & BST",
         goal="Solve tree problems with DFS that returns values and BFS by level; validate and search BSTs.",
         concepts=["Binary tree vs BST; height O(log n) vs O(n)", "Pre/in/post-order and level order",
                   "DFS returning a value + global answer", "Iterative traversal with a stack", "BST validation with bounds", "Lowest common ancestor"],
         visuals=["DFS order animation (pre/in/post)", "BFS level by level", "Max path sum: returned vs answer"],
         templates=["Recursive DFS returning height", "BFS by level", "Iterative inorder"],
         days=[([226], None, None), ([104, 543, 110], None, None), ([102], None, None),
               ([("o", 6, 148), ("o", 5, 402), ("o", 4, 981)], None, None), ([98], None, None),
               ([236, 124], None, None), ([], 230, None)],
         pool=[100, 572, 235, 199, 1448, 105, 103, 113, 114, 129, 450, 297]),
    dict(title="Heaps, intervals & greedy",
         goal="Use heapq for top-k, k-way merge and running medians; solve interval problems by sorting; know when greedy is safe.",
         concepts=["Binary heap as an array; sift up/down", "heapq is a min-heap: negate for max, tuples for ties",
                   "heapify O(n); push/pop O(log n)", "Size-k heap for top-k", "Two heaps for the median",
                   "Intervals: sort by start (merge) vs by end (scheduling)", "Greedy choice and the exchange argument"],
         visuals=["Heap push/pop in tree + array views", "Two-heap median balancing", "Merging intervals on a timeline", "Jump Game farthest reach"],
         templates=["Size-k heap", "Two heaps", "Merge intervals", "Greedy farthest reach"],
         days=[([703, 1046], None, None), ([973], None, None), ([56, 57, 435], None, None),
               ([("o", 7, 105)], None, None), ([621, 55, 134], None, None), ([295], None, None),
               ([("o", 7, 199), ("o", 6, 61)], None, None)],
         pool=[692, 767, 355, 1094, 763, 846, 452, 45, 1899, 678, 502, 1851]),
    dict(title="Backtracking & tries",
         goal="Apply one choose/explore/un-choose template to subsets, permutations and grid search; build and use a trie.",
         concepts=["Recursion trees and their size (2ⁿ, n!)", "Choose → explore → un-choose", "Skipping duplicates after sorting",
                   "Pruning", "Marking and restoring grid cells", "Trie node: children dict + end flag"],
         visuals=["Recursion tree for subsets of [1,2,3]", "Word Search marking and restoring cells", "Trie insert/search path"],
         templates=["Backtracking skeleton", "Grid DFS with restore", "Trie class"],
         days=[([78], None, None), ([39, 46, 90], None, None), ([79], None, None),
               ([("o", 8, 763), ("o", 7, 1448), ("o", 5, 901)], None, None), ([208], None, None),
               ([211, 51], None, None), ([], 17, None)],
         pool=[77, 40, 216, 47, 22, 131, 93, 1268, 648, 212, 37]),
    dict(title="Graphs I: BFS, DFS, grids, topological sort, union-find",
         goal="Model problems as graphs and traverse them in O(V + E).",
         concepts=["Adjacency list vs matrix; building with defaultdict(list)", "BFS (unweighted shortest path) vs DFS",
                   "Grids as graphs; when to mark visited", "Multi-source BFS", "Topological sort (Kahn) and cycle detection",
                   "Union-find with path compression + rank"],
         visuals=["BFS wave across a grid", "Kahn's algorithm removing zero in-degree nodes", "Union-find merging components"],
         templates=["Grid BFS/DFS", "Kahn's algorithm", "UnionFind class"],
         days=[([200, 733], None, None), ([695], None, None), ([133, 994, 417], None, None),
               ([("o", 9, 22)], None, None), ([207, 210, 684], None, None), ([127], None, None),
               ([("o", 8, 846), ("o", 9, 131)], None, None)],
         pool=[997, 1971, 547, 841, 130, 542, 1091, 785, 721, 399, 1376]),
    dict(title="DP I (1D) + Kadane",
         goal="Define state, transition and base case; go recursion → memo → table → O(1) space.",
         concepts=["Overlapping subproblems + optimal substructure", "State, transition, base case",
                   "Top-down @cache vs bottom-up", "Rolling variables for O(1) space", "Kadane's running best",
                   "LIS in O(n²) and O(n log n) with bisect"],
         visuals=["Fibonacci recursion tree vs memo", "1D table filling for House Robber", "Kadane's running sum"],
         templates=["Memoised recursion", "Bottom-up 1D with rolling variables", "Kadane"],
         days=[([70], None, None), ([198, 213, 746], None, None), ([322], None, None),
               ([("o", 10, 721), ("o", 8, 692), ("o", 9, 40)], None, None), ([53], None, None),
               ([139, 300], None, None), ([], 91, None)],
         pool=[1137, 152, 5, 647, 918, 740, 279, 377, 343, 673]),
    dict(title="DP II (2D) + weighted graphs",
         goal="Solve grid, two-string and knapsack DP; run Dijkstra, Bellman-Ford (k stops) and Prim.",
         concepts=["2D tables: grids and two strings", "Rolling 2D → 1D", "0/1 vs unbounded knapsack",
                   "Counting combinations vs permutations", "Dijkstra with heapq O(E log V)",
                   "Bellman-Ford with k-limited relaxations", "Prim's MST"],
         visuals=["LCS / Edit Distance table with arrows", "Dijkstra relaxing edges with a priority queue"],
         templates=["Two-string DP", "Knapsack", "Dijkstra"],
         days=[([62, 1143], None, None), ([72], None, None), ([518, 494, 416], None, None),
               ([("o", 11, 152)], None, None), ([743, 1584, 787], None, None), ([329], None, None),
               ([("o", 11, 5), ("o", 10, 399)], None, None)],
         pool=[63, 64, 221, 97, 309, 1631, 778, 332, 115, 312, 10]),
    dict(title="Bit tricks, practical class design, final mocks",
         goal="Use XOR and bit masks; design small classes the way pairing rounds expect; perform under interview conditions.",
         concepts=["Binary; & | ^ << >> ~", "x & (x - 1); XOR cancelling pairs", "Python's unbounded ints and 32-bit masking",
                   "Designing a class: state, methods, cost of each method"],
         visuals=["XOR cancelling pairs bit by bit"],
         templates=["Bit mask helpers", "Class design checklist"],
         days=[([136, 268], None, None), ([1472, 1396, 1146], None, "Class design"), ([2034], None, None),
               ([("o", 9, 1268), ("o", 10, 547), ("o", 7, 297)], None, "Interview simulation: 45 min each, unlabelled"),
               ([43], None, None),
               ([], None, "Wrap-up: redo the 5 lowest-confidence problems in your journal, then write a one-page sheet of every pattern and its trigger")],
         pool=[191, 338, 190, 371, 1603, 2353, 341, 284, 460]),
]

PY_THEMES = [
    "Types, mutability, identity (is vs ==), truthiness",
    "Lists: slicing, shallow vs deep copy, the [[0]*n]*m trap, cost of common operations",
    "Strings: immutability, join vs +=, slicing, common methods, f-strings",
    "Dicts and sets: hashability, insertion order, get/setdefault, defaultdict, Counter",
    "Comprehensions, generator expressions, any/all, zip, enumerate",
    "Functions: mutable default arguments, *args/**kwargs, keyword-only parameters, LEGB scope, global/nonlocal",
    "Sorting: key functions, stability, sort vs sorted, tuple comparison, cmp_to_key",
    "collections, heapq, bisect: deque, max-heap and tuple tricks, bisect_left vs bisect_right",
    "Numbers: // and % with negatives, big ints, float precision, bit operators, ~x",
    "Recursion: call stack, recursion limit, functools.cache/lru_cache, recursion to iteration",
    "Closures, late binding in loops, lambdas, decorators with functools.wraps",
    "Iterators and generators: yield, yield from, StopIteration, itertools",
    "OOP: __repr__, __eq__/__hash__, __lt__ for heaps, @dataclass, classmethod/staticmethod, super(), MRO",
    "Exceptions and context managers: try/except/else/finally order, custom exceptions, with",
    "Runtime: the GIL, threads vs processes, asyncio basics, generator vs list memory",
]
EXTRAS = ["debug", "explain-aloud", "complexity-check"]

PRACTICAL = [
    ("Word stats", ["Count words in a text", "Top k words ignoring stopwords", "Most common bigrams"], 2),
    ("Bank ledger", ["Apply transactions to balances", "Reject overdrafts with a reason", "Monthly statement per account"], 2),
    ("Group-by report", ["Sum a list of dicts by key", "Join two lists of dicts on id", "Top 3 per group, sorted"], 2),
    ("Log analyzer", ["Parse request log lines", "Requests and average latency per endpoint", "Sessionize users with a 30-minute gap"], 4),
    ("Rover on a grid", ["Run L/R/F commands", "Obstacles stop the rover", "Several rovers that can't collide"], 3),
    ("Rate limiter", ["Fixed window per user", "Sliding window log", "Token bucket with refill"], 5),
    ("Key-value store", ["get/set/delete", "Keys with TTL", "begin/rollback/commit transactions"], 5),
    ("Inventory system", ["Add and remove stock in a class", "Orders that partly fill", "Low-stock alerts in priority order"], 6),
    ("LRU cache with stats", ["OrderedDict version", "Own linked list + dict", "Hit/miss rate and a size limit in bytes"], 6),
    ("Org chart", ["Build a tree from (employee, manager) rows", "Depth and team size per manager", "Lowest common manager of two people"], 7),
    ("Leaderboard", ["add_score and top(k)", "Rank of a player", "Reset, with ties broken by time"], 8),
    ("Meeting booker", ["Book a room if free", "Several rooms: pick the first free one", "Fewest rooms needed for a day's requests"], 8),
    ("Autocomplete", ["Insert words with counts", "Top 3 by prefix", "Update counts as words are typed"], 9),
    ("Dependency resolver", ["Install order for packages", "Detect cycles and name them", "Parallel install batches"], 10),
    ("Delivery routes", ["Fewest stops between cities (BFS)", "Cheapest route with costs (Dijkstra)", "Cheapest within k stops"], 12),
    ("Embedding search", ["Cosine similarity of two vectors", "Top k nearest from a list", "Cache repeated queries"], 8),
]


def mock_for(plan_day: int):
    if plan_day % 2 == 0:
        return None
    n = (plan_day + 1) // 2
    return {"number": n, "pythonTheme": (n - 1) % 15 + 1, "extra": EXTRAS[(n - 1) % 3],
            "program2": n % 2 == 0 or n == 45, "diagnostic": n == 1, "final": n == 45,
            "mcqCount": 20 if n == 45 else 18}


def kind_for(week: int, day: int) -> str:
    if week == 13:
        return ["new-topic", "topic", "topic", "old-topics", "topic", "wrap-up"][day - 1]
    if day == 1:
        return "new-topic"
    if day == 4 and week == 1:
        return "python-fluency"
    if day == 4:
        return "old-topics"
    if day == 6:
        return "timed"
    if day == 7:
        return "redo" if week % 2 == 1 else "old-topics"
    return "topic"


def learn_label(kind: str, mock) -> str | None:
    parts = []
    if mock:
        tag = f"Mock {mock['number']}"
        if mock["diagnostic"]:
            tag += " (diagnostic)"
        if mock["final"]:
            tag += " (final: 20 MCQs + 2 programs)"
        parts.append(tag)
    if kind == "new-topic":
        parts.append(("new" if parts else "New") + " topic: cold try, then concepts and templates")
    return " + ".join(parts) if parts else None


CODING_NOTES = {
    "old-topics": "Earlier-topic problems: the app hides which week they come from.",
    "timed": "Timed: 45 minutes per problem.",
    "redo": "Redos from the queue first; do the fallback only if the queue is empty.",
}


def build():
    weeks_out, used = [], set()
    plan_day = 0
    for wi, w in enumerate(WEEKS, start=1):
        days_out = []
        for di, (probs, fb, note) in enumerate(w["days"], start=1):
            plan_day += 1
            kind = kind_for(wi, di)
            mock = mock_for(plan_day)
            items = []
            src = HR_W1 if probs == "HR" else probs
            for pi, p in enumerate(src, start=1):
                pid = f"w{wi:02d}-d{di}-p{pi}"
                if isinstance(p, dict):
                    prob = dict(p, id=pid, role="core")
                elif isinstance(p, tuple):
                    _, from_week, num = p
                    prob = dict(P[num], id=pid, role="old-topic", fromWeek=from_week)
                    used.add(num)
                else:
                    prob = dict(P[p], id=pid, role="core")
                    used.add(p)
                items.append(prob)
            fallback = None
            if fb is not None:
                fallback = dict(P[fb], id=f"w{wi:02d}-d{di}-fb", role="fallback")
                used.add(fb)
            day_note = note or CODING_NOTES.get(kind)
            if kind == "redo" and wi == 1:
                day_note = CODING_NOTES["redo"]
            timed = 45 if kind == "timed" or (wi == 13 and di == 4) else None
            days_out.append({
                "day": di, "planDay": plan_day, "kind": kind, "mock": mock,
                "learn": learn_label(kind, mock), "problems": items, "fallback": fallback,
                "timedMinutes": timed, "codingNote": day_note,
            })
        weeks_out.append({"week": wi, "title": w["title"], "goal": w["goal"], "concepts": w["concepts"],
                          "visuals": w["visuals"], "templates": w["templates"], "days": days_out,
                          "_pool": w["pool"]})
    # pools: listed spares minus anything scheduled anywhere
    for w in weeks_out:
        nums = [n for n in w.pop("_pool") if n not in used]
        w["pool"] = [dict(P[n], id=f"w{w['week']:02d}-pool-{i:02d}", role="pool") for i, n in enumerate(nums, 1)]
        core = [p for d in w["days"] for p in d["problems"] if p["role"] == "core"]
        w["problemCount"] = len(core)
        w["oldTopicCount"] = sum(1 for d in w["days"] for p in d["problems"] if p["role"] == "old-topic")
        w["mockCount"] = sum(1 for d in w["days"] if d["mock"])
    return {
        "version": 2,
        "defaultStartDate": "2026-10-26",
        "totalPlanDays": plan_day,
        "mockSpec": {
            "rule": "A plan day is a mock day when its planDay number is odd. Extension days never have a mock.",
            "parts": [
                {"part": "A", "name": "MCQs", "minutes": 20, "mix": {"python": 7, "currentAndLastWeek": 6, "spacedReview": 5}},
                {"part": "B", "name": "Program 1", "minutes": 25, "source": "Unlabelled problem from an earlier week's pool not yet attempted (Weeks 1-2: HackerRank Python domain or the Week 1 pool)"},
                {"part": "C", "name": "Program 2", "minutes": 30, "when": "program2 = true", "source": "practicalTasks unlocked by this week, else a CodeSignal-style implementation problem"},
                {"part": "D", "name": "Extra", "minutes": 10, "rotation": EXTRAS},
            ],
            "pythonThemes": [{"id": i, "title": t} for i, t in enumerate(PY_THEMES, 1)],
        },
        "practicalTasks": [{"id": f"pt-{i:02d}", "title": t, "levels": lv, "unlockWeek": wk}
                           for i, (t, lv, wk) in enumerate(PRACTICAL, 1)],
        "weeks": weeks_out,
    }


def validate(c):
    errs = []
    assert c["totalPlanDays"] == 90, c["totalPlanDays"]
    ids, urls = set(), {}
    mocks = []
    for w in c["weeks"]:
        exp_days = 6 if w["week"] == 13 else 7
        if len(w["days"]) != exp_days:
            errs.append(f"week {w['week']} has {len(w['days'])} days")
        for d in w["days"]:
            if d["mock"]:
                mocks.append(d["mock"]["number"])
            if d["kind"] != "wrap-up" and not d["problems"] and not d["fallback"]:
                errs.append(f"{w['week']}/{d['day']} has no coding")
            for p in d["problems"] + ([d["fallback"]] if d["fallback"] else []):
                if p["role"] == "old-topic" and p["fromWeek"] >= w["week"]:
                    errs.append(f"old-topic from same/later week: {p['id']}")
        for p in [p for d in w["days"] for p in d["problems"]] + [d["fallback"] for d in w["days"] if d["fallback"]] + w["pool"]:
            if p["id"] in ids:
                errs.append("dup id " + p["id"])
            ids.add(p["id"])
            if p["url"] in urls:
                errs.append(f"dup problem {p['title']} ({urls[p['url']]} and {p['id']})")
            urls[p["url"]] = p["id"]
            if not re.fullmatch(r"https://(leetcode\.com/problems|www\.hackerrank\.com/challenges)/[a-z0-9-]+/(problem)?", p["url"]):
                errs.append("bad url " + p["url"])
    if mocks != list(range(1, 46)):
        errs.append(f"mocks wrong: {mocks}")
    return errs, len(urls)


c = build()
errs, n_unique = validate(c)
if errs:
    print("\n".join(errs))
    sys.exit(1)
OUT.write_text(json.dumps(c, indent=2, ensure_ascii=False) + "\n")
print("ok", OUT, "unique problems:", n_unique)
for w in c["weeks"]:
    print(w["week"], "core", w["problemCount"], "old", w["oldTopicCount"], "mocks", w["mockCount"], "pool", len(w["pool"]))
