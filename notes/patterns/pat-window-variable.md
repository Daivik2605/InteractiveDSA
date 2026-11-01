# Variable-size sliding window

### Definition

A window over a contiguous range grows on the right and shrinks from the left to stay valid.

### The tell

Longest or shortest contiguous range meeting a condition.

### Structure

- `right` moves forward once per step and adds one element.
- While the window is invalid, `left` moves forward and removes one element.
- After the shrink, the window is valid: update the answer.
- Keep only the state needed to answer "is it valid?": a count dict, a running sum, a distinct count.

**Why it works.** Validity must move one way. For longest windows, growing never fixes an invalid window. For shortest windows, growing never breaks a valid one. A sum with negative numbers breaks both.

### Complexity

- O(n) time: `right` moves n times and `left` at most n times, so at most 2n steps.
- O(1) space for a running sum.
- O(k) space for a count dict with k distinct keys, since dict lookups and updates are O(1) on average.
- The nested-loop version is O(n²).

### Use when / Avoid when

**Use when:**

- You want the longest or shortest contiguous range.
- The rule is "at most k" of something: distinct values, zeros, replacements.
- Validity depends on counts or a sum of non-negative values.

**Avoid when:**

- The size is fixed: use a fixed window, with no shrink loop.
- Values can be negative and the rule is a sum: use prefix sums with a dict.
- The rule is "exactly k": run an "at most" window twice and subtract (see Variants).
- The items are not contiguous, as in a subsequence.

### Invariant

After the shrink loop, `s[left..right]` is valid, and `left` is as far left as it can be for this `right`.

### Template

Longest window with at most `k` distinct values:

```python
from collections import Counter

def longest_at_most_k_distinct(s: str, k: int) -> int:
    counts: Counter[str] = Counter()
    left = best = 0
    for right, ch in enumerate(s):
        counts[ch] += 1                     # grow
        while len(counts) > k:              # invalid: shrink
            counts[s[left]] -= 1
            if counts[s[left]] == 0:
                del counts[s[left]]
            left += 1
        best = max(best, right - left + 1)  # valid here
    return best

print(longest_at_most_k_distinct("eceba", 2))  # expected: 3
```

### Dry run

`longest_at_most_k_distinct("eceba", 2)`:

| right | Added | Counts after adding | Removed from left | Window | best |
|---|---|---|---|---|---|
| 0 | e | e:1 | - | e | 1 |
| 1 | c | e:1, c:1 | - | ec | 2 |
| 2 | e | e:2, c:1 | - | ece | 3 |
| 3 | b | e:2, c:1, b:1 | e, c | eb | 3 |
| 4 | a | e:1, b:1, a:1 | e | ba | 3 |

At `right = 3` three distinct letters is one too many, so two removals are needed before `c` is gone. The answer is 3.

### Variants

- Shortest window: the shrink loop runs while the window is valid, and the answer updates inside it.
- Budget windows: "at most k zeros" or "at most k replacements" use the same loop, with the budget as the validity test.
- Left jumps: when a new element invalidates everything before it, set `left = right` instead of stepping.
- Exactly k: count windows with at most k, minus windows with at most k - 1.

Shortest window with sum at least `target` (non-negative numbers):

```python
def min_len_at_least(nums: list[int], target: int) -> int:
    left = total = 0
    best = len(nums) + 1
    for right, x in enumerate(nums):
        total += x
        while total >= target:                # valid: shrink and record
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return best if best <= len(nums) else 0

print(min_len_at_least([2, 3, 1, 2, 4, 3], 7))  # expected: 2
```

Exactly `k` distinct, as two "at most" counts:

```python
def count_at_most(nums: list[int], k: int) -> int:
    counts: dict[int, int] = {}
    left = total = 0
    for right, x in enumerate(nums):
        counts[x] = counts.get(x, 0) + 1
        while len(counts) > k:
            counts[nums[left]] -= 1
            if counts[nums[left]] == 0:
                del counts[nums[left]]
            left += 1
        total += right - left + 1   # every window ending at right is valid
    return total

data = [1, 2, 1, 2, 3]
print(count_at_most(data, 2) - count_at_most(data, 1))  # expected: 7
```

### Mistakes

- Wrong: `if total >= target:` instead of `while`. A shrink step can leave the window still valid, so the shortest one is missed.

  ```python
  def min_len_if(nums: list[int], target: int) -> int:
      left = total = 0
      best = len(nums) + 1
      for right, x in enumerate(nums):
          total += x
          if total >= target:               # should be while
              best = min(best, right - left + 1)
              total -= nums[left]
              left += 1
      return best if best <= len(nums) else 0

  print(min_len_if([2, 3, 1, 2, 4, 3], 7))  # prints (wrong): 4
  ```

  Fix: use `while`. The correct version prints 2.
- Wrong: updating `best` before the shrink loop. The window may be invalid at that moment. Fix: update after the loop, or inside it for the shortest window.
- Wrong: leaving out `del counts[s[left]]` when a count hits zero. `len(counts)` then counts letters that are gone, the loop never ends the shrink, and `left` runs off the string with an `IndexError`. Fix: delete zero counts.
- Wrong: a sum window on data with negatives, such as `min_len_at_least([-4, 0, 3, 5], 6)`.

  ```python
  # follows the min_len_at_least block in Variants
  print(min_len_at_least([-4, 0, 3, 5], 6))  # prints (wrong): 0
  ```

  The real answer is 2 (the window 3, 5). Fix: prefix sums with a dict.
- Wrong: `right - left` for the size. Fix: `right - left + 1`.

### Related patterns

- `pat-two-pointers`: the same-direction form, without window state.
- `pat-monotonic`: a window maximum or minimum needs a deque, since a count dict cannot give it.
- Fixed-size window: the same add and remove step with no shrink loop.
- Prefix sums with a hash map: the answer when the sum window breaks on negatives.

### Problems

- w03-d3-p1 — Longest Substring Without Repeating Characters
- w03-d6-p1 — Minimum Window Substring
- w03-d7-p2 — Fruit Into Baskets
- w03-pool-05 — Minimum Size Subarray Sum
- w03-pool-06 — Max Consecutive Ones III

### Sources

Opened and checked:

- https://www.geeksforgeeks.org/dsa/window-sliding-technique/ — fixed and variable windows, O(n) against O(n²) for nested loops.
- https://docs.python.org/3/builtins/time-complexity.html — dict lookups and updates are O(1) on average.
- https://docs.python.org/3/library/collections.html — `Counter` is a dict subclass for counting hashable objects.
