## Complement lookup

```python
def two_sum(nums: list[int], target: int) -> list[int]:
    """Indices of two different elements that add up to target."""
    seen: dict[int, int] = {}  # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:  # look up BEFORE storing x, so an element cannot pair with itself
            return [seen[need], i]
        seen[x] = i
    return []
```

*Use when* you need a pair (or a partner) with a known relationship and the input is unsorted: store what you have seen, look up what you need. Time O(n), space O(n).

## Prefix sum + count map

```python
def count_subarrays_with_sum(nums: list[int], k: int) -> int:
    seen = {0: 1}  # prefix total -> how many times it occurred; the empty prefix counts once
    total = result = 0
    for x in nums:
        total += x
        result += seen.get(total - k, 0)
        seen[total] = seen.get(total, 0) + 1
    return result
```

*Use when* the question asks for the number (or the longest/shortest) of contiguous subarrays with a given sum, especially with negatives or zeros. For the longest, store the first index of each total instead of a count. Time O(n), space O(n).

## Frequency buckets

```python
from collections import Counter

def top_k_frequent(nums: list[int], k: int) -> list[int]:
    buckets: list[list[int]] = [[] for _ in range(len(nums) + 1)]  # index = frequency
    for value, freq in Counter(nums).items():
        buckets[freq].append(value)
    out: list[int] = []
    for freq in range(len(buckets) - 1, 0, -1):
        for value in buckets[freq]:
            out.append(value)
            if len(out) == k:
                return out
    return out
```

*Use when* you need the k most (or least) frequent items and a sort is too slow: counts are bounded by n, so bucket by count. Time O(n), space O(n).
