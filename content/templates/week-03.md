## Opposite-end two pointers

```python
def pair_with_sum(nums: list[int], target: int) -> list[int]:
    """nums is sorted ascending. Indices of two different elements adding up to target."""
    left, right = 0, len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1  # sum too small: only a bigger left value can help
        else:
            right -= 1  # sum too big: only a smaller right value can help
    return []
```

*Use when* the input is sorted (or a comparison at the two ends tells you which one to move) and you need a pair, a palindrome check, or the best pair under a size rule. Fix one element and run this on the rest for 3Sum. Time O(n), space O(1).

## Variable window with a count map

```python
def longest_with_at_most_k_distinct(s: str, k: int) -> int:
    counts: dict[str, int] = {}
    left = best = 0
    for right, ch in enumerate(s):
        counts[ch] = counts.get(ch, 0) + 1  # expand: take s[right]
        while len(counts) > k:  # invalid: shrink from the left until valid again
            out = s[left]
            counts[out] -= 1
            if counts[out] == 0:
                del counts[out]
            left += 1
        best = max(best, right - left + 1)  # the window s[left..right] is valid here
    return best
```

*Use when* the question asks for the longest (or shortest, or the count of) contiguous subarray or substring that satisfies a condition you can maintain with counts, and shrinking from the left restores it (all numbers non-negative for sums). `left` never moves backwards, so the loop is O(n) time; space O(k) or O(alphabet).
