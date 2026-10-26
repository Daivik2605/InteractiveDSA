## Merge sort and quicksort: O(n log n), stability, worst cases

**Merge sort** splits the list in half, sorts each half recursively and merges the two sorted halves. The recursion is log₂ n levels deep and each level does O(n) merging work, so it is **O(n log n) in every case**, with O(n) extra space for the merge. It is **stable** if the merge takes the left item on ties (`<=`). **Quicksort** picks a pivot, partitions the list into smaller and larger parts and recurses. It is O(n log n) on average and O(1) extra space for the partition (plus O(log n) recursion), but a bad pivot (first element of an already sorted list) splits it into sizes 0 and n - 1, giving an **O(n²) worst case**; a random pivot makes that vanishingly unlikely. Plain quicksort is **not stable**. No comparison sort can beat O(n log n) in the worst case.

```python
def merge_sort(nums: list[int]) -> list[int]:
    if len(nums) <= 1:
        return nums
    mid = len(nums) // 2
    left, right = merge_sort(nums[:mid]), merge_sort(nums[mid:])
    out: list[int] = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:  # <= takes the left item on ties: that is what makes it stable
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    out.extend(left[i:])
    out.extend(right[j:])
    return out

print(merge_sort([5, 2, 4, 7, 1, 3, 2, 6]))  # [1, 2, 2, 3, 4, 5, 6, 7]
# O(n log n) time, O(n) extra space.

import random

def quicksort(nums: list[int]) -> list[int]:
    if len(nums) <= 1:
        return nums
    pivot = random.choice(nums)  # a random pivot avoids the sorted-input worst case
    less = [x for x in nums if x < pivot]
    equal = [x for x in nums if x == pivot]
    more = [x for x in nums if x > pivot]
    return quicksort(less) + equal + quicksort(more)

print(quicksort([3, 6, 1, 8, 2, 9, 2]))  # [1, 2, 2, 3, 6, 8, 9]
# Average O(n log n); worst case O(n^2) with a terrible pivot.
```

## Quickselect: kth element in average O(n)

To find the kth smallest element you do not need the whole list sorted. **Quickselect** partitions around a pivot like quicksort, then recurses into **only the side that contains position k**, throwing the other side away. The sizes shrink geometrically on average (n + n/2 + n/4 + ... = 2n), so the **average time is O(n)**; with bad pivots it degrades to O(n²), which a random pivot makes unlikely. Space is O(1) with in-place partitioning (the version below uses O(n) for clarity). It beats sorting (O(n log n)) and a heap (O(n log k)) when you need one order statistic, such as the median or the kth largest.

```python
import random

def kth_smallest(nums: list[int], k: int) -> int:
    """k is 1-based: k = 1 is the minimum."""
    pivot = random.choice(nums)
    less = [x for x in nums if x < pivot]
    equal = [x for x in nums if x == pivot]
    more = [x for x in nums if x > pivot]
    if k <= len(less):
        return kth_smallest(less, k)  # the answer is among the smaller values
    if k <= len(less) + len(equal):
        return pivot
    return kth_smallest(more, k - len(less) - len(equal))  # skip the ones we discarded

print(kth_smallest([3, 2, 1, 5, 6, 4], 2))  # 2
print(kth_smallest([3, 2, 3, 1, 2, 4, 5, 5, 6], 3))  # 2  (sorted: 1 2 2 3 3 ...)
# Average O(n) time; worst O(n^2).
```

## Python sort (Timsort): stable, key=

`list.sort()` (in place) and `sorted()` (new list) use **Timsort**: O(n log n) worst case, O(n) on input that is already mostly ordered, and **stable**: items with equal keys keep their original order. Pass `key=` a function that returns the value to compare (called once per item, then the keys are compared). `reverse=True` keeps stability. Because it is stable you can sort by several criteria in passes: sort by the secondary key first, then by the primary. Use `functools.cmp_to_key` only when the order cannot be written as a key. Tuples as keys compare element by element.

```python
words = ["banana", "fig", "apple", "kiwi", "date"]
print(sorted(words, key=len))  # ['fig', 'kiwi', 'date', 'apple', 'banana']  (ties keep input order)

people = [("al", 30), ("bo", 25), ("cy", 30)]
print(sorted(people, key=lambda p: (-p[1], p[0])))  # [('al', 30), ('cy', 30), ('bo', 25)]

nums = [3, 1, 2]
result = nums.sort()  # sorts in place and returns None
print(result, nums)  # None [1, 2, 3]
# sort/sorted: O(n log n) time; sorted() uses O(n) extra space.
```

## Closed vs half-open binary search; off-by-one

Binary search halves a search range each step, so a sorted list of n items takes O(log n) steps. Almost every bug is an off-by-one, and the cure is to pick **one invariant and keep it**. In the **closed** form the answer is somewhere in `[lo, hi]` (both ends possible): loop `while lo <= hi`, set `mid`, and move with `lo = mid + 1` or `hi = mid - 1`. In the **half-open** form the answer is in `[lo, hi)` with `hi` one past the end: loop `while lo < hi` and move with `lo = mid + 1` or `hi = mid`. Pick one and use only its pairs of conditions. Compute `mid = lo + (hi - lo) // 2` (Python ints do not overflow, but the habit is free).

```python
def search_closed(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1  # target, if present, is in nums[lo..hi]
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

def first_at_least(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums)  # half-open: the answer is in [lo, hi]; hi == len(nums) means "none"
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid  # nums[mid] might be the answer, so keep it
    return lo

nums = [1, 3, 5, 5, 9]
print(search_closed(nums, 9), search_closed(nums, 4))  # 4 -1
print(first_at_least(nums, 5), first_at_least(nums, 10))  # 2 5
# Both are O(log n) time, O(1) space.
```

## Lower/upper bound with bisect

The **lower bound** of x is the first index whose value is **at least x** (`bisect_left`); the **upper bound** is the first index whose value is **greater than x** (`bisect_right`). Together they give everything about a value in a sorted list in O(log n): `bisect_right(a, x) - bisect_left(a, x)` is the count of x, `a[bisect_left(a, x)] == x` (after checking the index is in range) tests membership, and the first and last position of x are `lo` and `hi - 1`. `bisect.insort` inserts while keeping the list sorted (the search is O(log n) but the insert shifts elements, O(n)).

```python
from bisect import bisect_left, bisect_right, insort

a = [1, 2, 2, 2, 5, 8]
lo, hi = bisect_left(a, 2), bisect_right(a, 2)
print(lo, hi, hi - lo)  # 1 4 3
print(bisect_left(a, 6), bisect_right(a, 9))  # 5 6

def first_last(a: list[int], x: int) -> list[int]:
    lo = bisect_left(a, x)
    if lo == len(a) or a[lo] != x:  # guard: lo can be len(a)
        return [-1, -1]
    return [lo, bisect_right(a, x) - 1]

print(first_last(a, 2), first_last(a, 3))  # [1, 3] [-1, -1]
insort(a, 4)
print(a)  # [1, 2, 2, 2, 4, 5, 8]
# Each search O(log n); insort is O(n) because of the shift.
```

## Rotated arrays: one half is always sorted

A sorted list rotated at some pivot, like `[4, 5, 6, 7, 0, 1, 2]`, is no longer globally sorted, but at any `mid` **at least one of the two halves `[lo..mid]` and `[mid..hi]` is sorted**. Find which one by comparing `nums[lo]` with `nums[mid]`. Then check whether the target lies inside the sorted half's range: if so search there, otherwise search the other half. That still discards half the range each step: O(log n) time, O(1) space. To find the minimum, compare `nums[mid]` with `nums[hi]`: if mid is bigger, the minimum is to the right. (With duplicates the comparisons can tie and the worst case becomes O(n).)

```python
def search_rotated(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:  # the left half is sorted (<= because lo can equal mid)
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:  # the right half is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1

def find_min(nums: list[int]) -> int:
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1  # the minimum is right of mid
        else:
            hi = mid
    return nums[lo]

arr = [4, 5, 6, 7, 0, 1, 2]
print(search_rotated(arr, 0), search_rotated(arr, 3), find_min(arr))  # 4 -1 0
# O(log n) time, O(1) space.
```

## Binary search on the answer with feasible()

Sometimes the thing you search is not a position in a list but a **number**: "the smallest speed that finishes in h hours", "the largest minimum distance", "the smallest capacity that ships in D days". If you can write `feasible(x)` that answers "does x work?" and it is **monotone** (once true, it stays true for every larger x), then the answers form a line `False False ... True True`, and binary search finds the first True in O(log range) calls. The total cost is O(cost of feasible × log(range)). Choose the bounds so that `lo` is infeasible or the smallest candidate and `hi` is surely feasible.

```python
from math import ceil

def min_eating_speed(piles: list[int], hours: int) -> int:
    def feasible(speed: int) -> bool:
        return sum(ceil(p / speed) for p in piles) <= hours  # monotone: faster never hurts

    lo, hi = 1, max(piles)  # speed max(piles) always works (one pile per hour)
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid  # mid works: look for something smaller, but keep mid
        else:
            lo = mid + 1
    return lo

print(min_eating_speed([3, 6, 7, 11], 8))  # 4
# O(n log(max(piles))) time, O(1) space.
```
