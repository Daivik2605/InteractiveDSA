# Fixed-size sliding window

### Definition

A window of exactly k elements slides one step at a time: add the entering element, drop the leaving one.

### The tell

A contiguous range of a given size k.

### Structure

- The window always covers k elements, so its first answer is ready when `right = k - 1`.
- Each step adds `nums[right]` and drops `nums[right - k]`, once `right >= k`.
- Every step after that reports one answer for the window ending at `right`.
- Keep a state you can update from just those two elements: a sum, a count dict, a distinct count.

**Why it works.** Neighbouring windows share k - 1 elements, so each step has only one element that enters and one that leaves.

```text
nums   4  1  3  8  2  5        k = 3
      [4  1  3] 8  2  5        sum 8
       4 [1  3  8] 2  5        sum 12   (+8, -4)
       4  1 [3  8  2] 5        sum 13   (+2, -1)
       4  1  3 [8  2  5]       sum 15   (+5, -3)
```

### Complexity

- O(n) time: each element enters once and leaves once.
- O(1) space for a running sum, or O(k) for a count dict.
- The nested-loop version is O(n * k).

### Use when / Avoid when

**Use when:**

- The size k is given and the range must be contiguous.
- You want a sum, average, count or distinct count for every window.

**Avoid when:**

- The size depends on a condition: use a variable window.
- You need the maximum or minimum of each window: a running sum cannot give it, so use a deque.
- The items are not contiguous.

### Invariant

The state always describes exactly the k elements ending at `right`.

### Template

Largest sum of any k consecutive numbers:

```python
def max_window_sum(nums: list[int], k: int) -> int:
    if not 0 < k <= len(nums):
        raise ValueError("need 0 < k <= len(nums)")
    window = sum(nums[:k])                       # the first window
    best = window
    for right in range(k, len(nums)):
        window += nums[right] - nums[right - k]  # add entering, drop leaving
        best = max(best, window)
    return best

print(max_window_sum([4, 1, 3, 8, 2, 5], 3))  # expected: 15
```

### Dry run

`max_window_sum([4, 1, 3, 8, 2, 5], 3)`: the first window `4 + 1 + 3` is 8, so `window = 8` and `best = 8`.

| right | Entering | Leaving | window | best |
|---|---|---|---|---|
| 3 | +8 | -4 | 12 | 12 |
| 4 | +2 | -1 | 13 | 13 |
| 5 | +5 | -3 | 15 | 15 |

### Variants

- Average: compare sums, and divide by k only at the end.
- Count windows that meet a rule: add one to a counter when the rule holds.
- Distinct count per window: a dict updates in O(1) on average.
- Window maximum or minimum: a deque that also pops smaller entries, see `pat-monotonic`.

Distinct values in every window:

```python
def distinct_per_window(nums: list[int], k: int) -> list[int]:
    counts: dict[int, int] = {}
    out: list[int] = []
    for right, x in enumerate(nums):
        counts[x] = counts.get(x, 0) + 1         # add entering
        if right >= k:
            leaving = nums[right - k]            # drop leaving
            counts[leaving] -= 1
            if counts[leaving] == 0:
                del counts[leaving]
        if right >= k - 1:
            out.append(len(counts))
    return out

print(distinct_per_window([1, 2, 1, 3, 4, 2, 3], 4))  # expected: [3, 4, 4, 3]
```

### Mistakes

- Wrong: adding the entering element and never dropping the leaving one. The window grows past k.

  ```python
  def window_sum_no_drop(nums: list[int], k: int) -> int:
      window = sum(nums[:k])
      best = window
      for right in range(k, len(nums)):
          window += nums[right]              # should also subtract nums[right - k]
          best = max(best, window)
      return best

  print(window_sum_no_drop([4, 1, 3, 8, 2, 5], 3))  # prints (wrong): 23
  ```

  Fix: `window += nums[right] - nums[right - k]`.
- Wrong: starting the loop at `k - 1`, after the first window is already built. The window is updated once too often, and `nums[right - k]` reads index -1.

  ```python
  def window_sum_early(nums: list[int], k: int) -> int:
      window = sum(nums[:k])
      best = window
      for right in range(k - 1, len(nums)):    # should start at k
          window += nums[right] - nums[right - k]
          best = max(best, window)
      return best

  print(window_sum_early([4, 1, 3, 8, 2, 5], 3))  # prints (wrong): 13
  ```

  Fix: `range(k, len(nums))`.
- Wrong: no check that `k <= len(nums)`. The loop never runs and the sum of a shorter list comes back as if it were a window.

  ```python
  def window_sum_no_check(nums: list[int], k: int) -> int:
      window = sum(nums[:k])
      best = window
      for right in range(k, len(nums)):
          window += nums[right] - nums[right - k]
          best = max(best, window)
      return best

  print(window_sum_no_check([1, 2], 5))  # prints (wrong): 3
  ```

  Fix: reject `k > len(nums)` first, as the Template does.
- Wrong: `sum(nums[right - k + 1:right + 1])` on every step. The answer is right, but it costs O(n * k). Fix: update the running state.

### Related patterns

- `pat-window-variable`: the size changes with a condition, so a shrink loop is needed.
- `pat-monotonic`: a window maximum or minimum.
- `pat-prefix-sum`: any range sum in O(1), including windows whose size varies per query.
- `pat-hashing-counting`: the count dict inside a window.

### Problems

- w03-d3-p2 — Maximum Number of Vowels in a Substring of Given Length
- w03-d5-p1 — Permutation in String
- w03-pool-03 — Maximum Average Subarray I
- w05-d4-p2 — Find All Anagrams in a String
- w05-d6-p2 — Sliding Window Maximum

### Sources

- https://www.geeksforgeeks.org/dsa/window-sliding-technique/ — compute the first k elements, then slide by adding the next and subtracting the first; O(n) time and O(1) space.
- https://www.geeksforgeeks.org/dsa/sliding-window-maximum-maximum-of-all-subarrays-of-size-k/ — the nested-loop version is O(n * k).
- https://docs.python.org/3/builtins/time-complexity.html — dict lookups and updates are O(1) on average.
