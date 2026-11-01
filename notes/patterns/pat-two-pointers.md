# Two pointers

### Definition

Two indices walk one sequence under a rule, so each move rules out candidates and one pass replaces a nested loop.

### The tell

A pair in sorted data, or scanning in from both ends.

### Structure

- Opposite ends: `left` starts at 0, `right` at the last index, and they move toward each other.
- Same direction: `write` marks where the next kept item goes, `read` scans ahead.
- Each step moves only the pointer that can improve the answer.
- Stop when the pointers meet: `left < right`.

**Why moving one pointer is safe.** In a sorted pair search, if `nums[left] + nums[right]` is too small, `nums[right]` is already the biggest partner `nums[left]` can have, so `nums[left]` is finished.

### Complexity

- The scan is O(n) time and O(1) extra space: each pointer only moves one way, so the total moves are at most n.
- Sorting first adds O(n log n) for `list.sort()`.
- 3Sum is sort plus one scan per element, so O(n²) in total.

### Use when / Avoid when

**Use when:**

- The input is sorted, or you can sort it without losing something you need.
- You want a pair, or a triplet with one element fixed.
- Two ends must be compared, like a palindrome check.
- You must compact or partition a list in place.

**Avoid when:**

- The input is unsorted and you need the original indices: sorting destroys them, so use a dict.
- The condition is about a contiguous range with a size rule: use a window.

### Invariant

Opposite ends: everything outside `left..right` has already been ruled out.

Same direction: `nums[:write]` is the finished answer so far, and `write <= read`.

### Template

Opposite ends, sorted pair with a target sum:

```python
def pair_with_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    left, right = 0, len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return left, right
        if total < target:
            left += 1   # too small: only a bigger left can help
        else:
            right -= 1  # too big: only a smaller right can help
    return None

print(pair_with_sum([1, 2, 4, 6, 8], 14))  # expected: (3, 4)
```

Same direction, compact a sorted list:

```python
def dedupe_sorted(nums: list[int]) -> int:
    if not nums:
        return 0
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[write - 1]:
            nums[write] = nums[read]
            write += 1
    return write

data = [1, 1, 2, 2, 3]
k = dedupe_sorted(data)
print(k, data[:k])  # expected: 3 [1, 2, 3]
```

### Dry run

`pair_with_sum([1, 2, 4, 6, 8], 11)`: no pair exists, so both pointers close in until they meet.

| Step | left | right | Sum | Move |
|---|---|---|---|---|
| 1 | 0 | 4 | 1 + 8 = 9 | `left += 1` |
| 2 | 1 | 4 | 2 + 8 = 10 | `left += 1` |
| 3 | 2 | 4 | 4 + 8 = 12 | `right -= 1` |
| 4 | 2 | 3 | 4 + 6 = 10 | `left += 1` |

Now `left == right == 3`, the loop ends, and the answer is `None`.

### Variants

- 3Sum: fix one element, then run the pair scan on everything to its right.
- Three pointers: partition into three groups in one pass (low, middle, high).
- Two sequences: one pointer per sorted list, to merge them or to check a subsequence.
- Greedy inward: always move the pointer at the weaker side, as in the "shorter wall" and "lower bar" problems.

3Sum in full:

```python
def three_sum(nums: list[int]) -> list[list[int]]:
    nums.sort()
    out: list[list[int]] = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue  # skip a repeated first element
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                out.append([nums[i], nums[left], nums[right]])
                left += 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1  # skip a repeated second element
    return out

print(three_sum([-1, 0, 1, 2, -1, -4]))  # expected: [[-1, -1, 2], [-1, 0, 1]]
```

### Mistakes

- Wrong: `while left <= right:` in a pair search. When the pointers meet, an element pairs with itself. Fix: `while left < right:`.
- Wrong: running `pair_with_sum([5, 1, 9, 4], 10)` on unsorted data. It misses the pair 1 + 9.

  ```python
  # follows the pair_with_sum block in Template
  print(pair_with_sum([5, 1, 9, 4], 10))  # prints (wrong): None
  ```

  Fix: sort the values first, or use a dict.
- Wrong: returning indices from a sorted copy. They no longer point into the original list. Fix: sort `(value, original_index)` pairs and return the stored index.
- Wrong: in 3Sum, appending a match and forgetting `left += 1`. The loop never advances. Fix: move `left` after every match.
- Wrong: in 3Sum, no `if i > 0 and nums[i] == nums[i - 1]: continue`. Repeated first elements produce duplicate triplets. Fix: add that line.

### Related patterns

- `pat-window-variable`: both pointers move forward over a contiguous range, and the window keeps state.
- `pat-monotonic`: also discards candidates as it scans, but with a stack.
- Hash map pair lookup: the unsorted answer to the pair problem, O(n) time and O(n) space.
- Binary search: also halves a sorted search space, but one probe at a time.

### Problems

- w01-d2-p1 — Merge Sorted Array
- w01-d2-p2 — Remove Duplicates from Sorted Array
- w03-d1-p1 — Valid Palindrome
- w03-d1-p2 — Reverse String
- w03-d2-p1 — Two Sum II - Input Array Is Sorted
- w03-d2-p2 — 3Sum
- w03-d2-p3 — Container With Most Water
- w03-d6-p2 — Trapping Rain Water
- w03-pool-01 — Squares of a Sorted Array
- w03-pool-02 — Is Subsequence
- w04-d4-p1 — Sort Colors
- w04-d7-p1 — 3Sum Closest

### Sources

Opened and checked:

- https://www.geeksforgeeks.org/dsa/two-pointers-technique/ — sorted input, pairs, O(n) time and O(1) space against a naive O(n²).
- https://en.wikipedia.org/wiki/3SUM — the sorted two-pointer 3SUM algorithm runs in worst-case O(n²).
- https://docs.python.org/3/builtins/time-complexity.html — `list.sort()` is O(n log n); `x in list` is O(n).
