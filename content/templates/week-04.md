## Merge sort

```python
def merge_sort(nums: list[int]) -> list[int]:
    if len(nums) <= 1:
        return nums
    mid = len(nums) // 2
    left, right = merge_sort(nums[:mid]), merge_sort(nums[mid:])
    out: list[int] = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:  # <= on ties keeps the sort stable
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    return out + left[i:] + right[j:]
```

*Use when* you must write a sort yourself, need a guaranteed O(n log n) worst case or a stable sort, or when a counting problem (inversions) can be answered during the merge. Time O(n log n), space O(n).

## Quickselect

```python
import random

def kth_smallest(nums: list[int], k: int) -> int:
    """k is 1-based."""
    pivot = random.choice(nums)
    less = [x for x in nums if x < pivot]
    equal = [x for x in nums if x == pivot]
    if k <= len(less):
        return kth_smallest(less, k)
    if k <= len(less) + len(equal):
        return pivot
    more = [x for x in nums if x > pivot]
    return kth_smallest(more, k - len(less) - len(equal))
```

*Use when* you need only the kth smallest or largest value (or the median) and a full sort is wasteful. For the kth largest ask for `len(nums) - k + 1`. Average O(n), worst O(n²) (rare with a random pivot); a size-k heap is the O(n log k) alternative that also works on streams.

## lower_bound

```python
def lower_bound(nums: list[int], target: int) -> int:
    """First index whose value is >= target, or len(nums) if there is none."""
    lo, hi = 0, len(nums)  # half-open [lo, hi)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
```

*Use when* the input is sorted and you need a position: first occurrence, insertion point, "first element not less than". The upper bound is the same with `<=` in the comparison, and first/last position of x is `lower_bound(x)` and `lower_bound(x + 1) - 1`. Equivalent to `bisect_left`. Time O(log n), space O(1).

## Binary search on answer

```python
def smallest_feasible(lo: int, hi: int, feasible) -> int:
    """Smallest x in [lo, hi] with feasible(x) True; feasible must be monotone and feasible(hi) True."""
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid  # mid works: try smaller, but keep mid as a candidate
        else:
            lo = mid + 1  # mid fails, so everything below it fails too
    return lo
```

*Use when* the question asks for the minimum (or maximum) value of something such that a condition holds, and checking one candidate is easy: speed, capacity, distance, days. Write `feasible` first, confirm it is monotone, and pick bounds where `hi` is surely feasible. Time O(cost of feasible × log(hi - lo)).
