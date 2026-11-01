# Prefix sums

### Definition

`prefix[i]` holds the sum of the first i elements, so any range sum is one subtraction.

### The tell

Many range sums, or counting subarrays with a given sum.

### Structure

- Range queries: build `prefix` with n + 1 entries, `prefix[0] = 0` and `prefix[i + 1] = prefix[i] + nums[i]`.
- Range queries: the sum of `nums[left..right]`, inclusive, is `prefix[right + 1] - prefix[left]`.
- Counting subarrays: keep a dict of the totals seen so far. At each step look up the earlier total that makes a valid range: `total - k` for a sum of k, or the same remainder for divisible by k.
- Counting subarrays: seed the dict with `{0: 1}` so subarrays that start at index 0 are counted. A longest-range version seeds the first index instead, `{0: -1}`.
- Counting subarrays: look up before you insert, so an empty subarray is never counted.

**Why it works.** A range sum is the difference of two prefix totals. That holds for any numbers, including negatives.

```text
index    0   1   2   3   4   5
prefix   0   5   3  10  11  14
nums       5  -2   7   1   3
sum(nums[1..3]) = prefix[4] - prefix[1] = 11 - 5 = 6
```

### Complexity

- Building the prefix array is O(n) time and O(n) space.
- Each range query is O(1).
- Counting subarrays with a dict is O(n) time and O(n) space, against O(n²) for nested loops.

### Use when / Avoid when

**Use when:**

- The array does not change and you answer many range-sum queries.
- You count or find subarrays by their sum, and negatives are allowed.
- A balance question can be turned into a sum, such as equal counts of two values.

**Avoid when:**

- You ask a single query: one loop is enough.
- Values change between queries: rebuilding costs O(n) per change.
- Values are non-negative and you want the longest or shortest range: a window needs only O(1) space.

### Invariant

`prefix[i]` equals `sum(nums[:i])`. In the counting form, the dict holds every prefix total before the current index, with its count.

### Template

Build and query:

```python
from itertools import accumulate

def build_prefix(nums: list[int]) -> list[int]:
    return list(accumulate(nums, initial=0))     # starts with the 0

def range_sum(prefix: list[int], left: int, right: int) -> int:
    return prefix[right + 1] - prefix[left]      # nums[left..right], inclusive

prefix = build_prefix([5, -2, 7, 1, 3])
print(prefix, range_sum(prefix, 1, 3))  # expected: [0, 5, 3, 10, 11, 14] 6
```

Count subarrays with sum `k`:

```python
def count_subarrays(nums: list[int], k: int) -> int:
    seen = {0: 1}                                # the empty prefix
    total = count = 0
    for x in nums:
        total += x
        count += seen.get(total - k, 0)          # look up first
        seen[total] = seen.get(total, 0) + 1     # then insert
    return count

print(count_subarrays([1, 2, -2, 3, 1], 3))  # expected: 3
```

### Dry run

`count_subarrays([1, 2, -2, 3, 1], 3)`: `seen` starts as `{0: 1}`.

| i | x | total | total - 3 | Times seen | count |
|---|---|---|---|---|---|
| 0 | 1 | 1 | -2 | 0 | 0 |
| 1 | 2 | 3 | 0 | 1 | 1 |
| 2 | -2 | 1 | -2 | 0 | 1 |
| 3 | 3 | 4 | 1 | 2 | 3 |
| 4 | 1 | 5 | 2 | 0 | 3 |

At i = 3 the total 1 was seen twice, so two subarrays end there. The three subarrays are `[1, 2]`, `[2, -2, 3]` and `[3]`.

### Variants

- Divisible by k: store the prefix total modulo k, since equal remainders mean the range sum is divisible by k.
- Equal counts of two values: count one as +1 and the other as -1, then look for a repeated total.
- Longest range instead of a count: store the first index of each total.

Subarrays whose sum is divisible by `k`:

```python
def count_divisible(nums: list[int], k: int) -> int:
    seen = {0: 1}
    total = count = 0
    for x in nums:
        total = (total + x) % k                  # remainder of the prefix
        count += seen.get(total, 0)
        seen[total] = seen.get(total, 0) + 1
    return count

print(count_divisible([4, 5, 0, -2, -3, 1], 5))  # expected: 7
```

Longest range with equal 0s and 1s:

```python
def longest_balanced(bits: list[int]) -> int:
    first = {0: -1}                              # total -> first index
    total = best = 0
    for i, b in enumerate(bits):
        total += 1 if b else -1
        if total in first:
            best = max(best, i - first[total])
        else:
            first[total] = i
    return best

print(longest_balanced([0, 1, 1, 0, 1, 1, 1, 0]))  # expected: 4
```

### Mistakes

- Wrong: `prefix[right] - prefix[left]`. It leaves out `nums[right]`.

  ```python
  # follows the Template block that builds prefix
  print(prefix[3] - prefix[1])  # prints (wrong): 5
  ```

  Fix: `prefix[right + 1] - prefix[left]`. The sum of `nums[1..3]` is 6.
- Wrong: building the array without the leading 0, as in `accumulate(nums)`. For `left = 0`, the index `left - 1` is -1 and Python reads the last element.

  ```python
  from itertools import accumulate

  no_zero = list(accumulate([5, -2, 7, 1, 3]))   # missing the leading 0
  print(no_zero[2] - no_zero[-1])  # prints (wrong): -4
  ```

  Fix: `accumulate(nums, initial=0)`. The sum of `nums[0..2]` is 10.
- Wrong: `seen = {}` with no `0: 1`. Subarrays that start at index 0 are missed.

  ```python
  def count_unseeded(nums: list[int], k: int) -> int:
      seen: dict[int, int] = {}                  # should start as {0: 1}
      total = count = 0
      for x in nums:
          total += x
          count += seen.get(total - k, 0)
          seen[total] = seen.get(total, 0) + 1
      return count

  print(count_unseeded([3], 3))  # prints (wrong): 0
  ```

  Fix: seed with `{0: 1}`. The answer is 1.
- Wrong: inserting the current total before the lookup. With `k = 0`, a subarray counts against itself.

  ```python
  def count_insert_first(nums: list[int], k: int) -> int:
      seen = {0: 1}
      total = count = 0
      for x in nums:
          total += x
          seen[total] = seen.get(total, 0) + 1   # should come after the lookup
          count += seen.get(total - k, 0)
      return count

  print(count_insert_first([1, 2], 0))  # prints (wrong): 2
  ```

  Fix: look up first, then insert. The answer is 0.

### Related patterns

- `pat-window-variable`: the non-negative case, in O(1) space.
- `pat-hashing-counting`: the dict half of the counting form.
- `pat-window-fixed`: a window sum of fixed size, without building the array.

### Problems

- w02-d5-p1 — Range Sum Query - Immutable
- w02-d5-p2 — Subarray Sum Equals K
- w02-d5-p3 — Contiguous Array
- w02-d6-p2 — Subarray Sums Divisible by K
- w02-pool-07 — Find Pivot Index
- w03-d4-p3 — Continuous Subarray Sum

### Sources

- https://www.geeksforgeeks.org/dsa/prefix-sum-array-implementation-applications-competitive-programming/ — building a prefix sum array is O(n) time and O(n) auxiliary space.
- https://www.geeksforgeeks.org/dsa/number-subarrays-sum-exactly-equal-k/ — counting subarrays with sum k, with negatives allowed: O(n) time and O(n) space with a hash map and prefix sums, against O(n²) for nested loops.
- https://docs.python.org/3/library/itertools.html — `accumulate(iterable, initial=...)` starts the output with the initial value, giving one more element than the input.
