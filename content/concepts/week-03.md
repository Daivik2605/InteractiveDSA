## Opposite-end pointers on sorted input

Put one pointer at each end of a **sorted** array and move them toward each other. Look at `nums[left]` and `nums[right]`: if their sum is too small, the only way to grow it is to move `left` right; if it is too big, move `right` left. Every step throws away one candidate that can no longer be part of an answer, so n elements are examined once: **O(n) time, O(1) space**, instead of the O(n²) of trying every pair. The same shape solves palindrome checks (compare the two ends, step inward), "container with most water" (move the shorter wall) and 3Sum (fix one number, run the pointers on the rest). It needs sorted input, or input where one end's value tells you which pointer to move.

```python
def two_sum_sorted(nums: list[int], target: int) -> list[int]:
    left, right = 0, len(nums) - 1
    while left < right:  # two different elements
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1  # need a bigger sum
        else:
            right -= 1  # need a smaller sum
    return []

print(two_sum_sorted([1, 2, 4, 7, 11, 15], 15))  # [2, 4]  (4 + 11)

def is_palindrome(s: str) -> bool:
    chars = [c.lower() for c in s if c.isalnum()]
    left, right = 0, len(chars) - 1
    while left < right:
        if chars[left] != chars[right]:
            return False
        left, right = left + 1, right - 1
    return True

print(is_palindrome("A man, a plan, a canal: Panama"))  # True
# O(n) time; O(1) extra space for the two-sum, O(n) for the cleaned copy above.
```

## Read/write and fast/slow pointers

Two pointers can also move in the **same direction** at different speeds. With a **read/write** pair, `read` scans every element and `write` marks where the next kept element goes: in-place filtering in one pass (O(n) time, O(1) space). With **fast/slow** pointers, `fast` moves two steps while `slow` moves one. When `fast` reaches the end, `slow` is at the middle. In a linked structure with a loop, `fast` gains one step on `slow` each round, so they must meet inside the loop: that is Floyd's cycle detection, O(n) time and O(1) space with no set of visited nodes.

```python
def move_zeroes(nums: list[int]) -> None:
    write = 0
    for read in range(len(nums)):
        if nums[read] != 0:
            nums[write], nums[read] = nums[read], nums[write]
            write += 1

nums = [0, 1, 0, 3, 12]
move_zeroes(nums)
print(nums)  # [1, 3, 12, 0, 0]

class Node:
    def __init__(self, val: int, next: "Node | None" = None) -> None:
        self.val, self.next = val, next

def middle(head: Node) -> int:
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow.val

def has_cycle(head: "Node | None") -> bool:
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            return True
    return False

chain = Node(1, Node(2, Node(3, Node(4, Node(5)))))
print(middle(chain), has_cycle(chain))  # 3 False
tail = chain.next.next.next.next
tail.next = chain.next  # make 5 point back to 2
print(has_cycle(chain))  # True
```

## Fixed vs variable window

A **window** is a contiguous slice `nums[left..right]` that you update instead of recomputing. A **fixed** window has a set length k: add the new element on the right, drop the one that falls off the left, update a running total or count (O(1) per step, O(n) overall, versus O(n·k) when each window is summed from scratch). A **variable** window grows and shrinks to keep a condition true: expand `right` every step, and while the window is invalid (too many distinct characters, sum too small or too big) move `left` forward. Use a fixed window when the length is given and a variable window for "longest/shortest subarray or substring such that ...".

```python
def max_sum_fixed(nums: list[int], k: int) -> int:
    window = sum(nums[:k])
    best = window
    for right in range(k, len(nums)):
        window += nums[right] - nums[right - k]  # add the new element, drop the old one
        best = max(best, window)
    return best

print(max_sum_fixed([2, 1, 5, 1, 3, 2], 3))  # 9

def shortest_at_least(nums: list[int], target: int) -> int:
    """Shortest subarray of positive numbers with sum >= target (0 if none)."""
    left = total = 0
    best = len(nums) + 1
    for right, x in enumerate(nums):
        total += x
        while total >= target:  # valid: shrink to find the shortest
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return best if best <= len(nums) else 0

print(shortest_at_least([2, 3, 1, 2, 4, 3], 7))  # 2  ([4, 3])
# Both are O(n) time and O(1) space.
```

## Why expand/shrink is O(n) amortized

A variable window has a `while` loop inside a `for` loop, which looks like O(n²). It is not. `right` moves forward exactly n times. `left` only ever moves **forward** and can never pass `right`, so across the **whole run** it moves at most n times. Each element enters the window once and leaves at most once, so the total work is at most 2n steps: O(n). The inner loop may run many times for one `right`, but the total over all `right` values is bounded. This is an **amortized** argument, the same idea that makes `list.append` O(1). The argument breaks if `left` can move backwards or be reset.

```python
def longest_unique(s: str) -> tuple[int, int]:
    """Returns (best length, number of pointer moves) to show the 2n bound."""
    seen: set[str] = set()
    left = best = moves = 0
    for right, ch in enumerate(s):
        while ch in seen:
            seen.remove(s[left])
            left += 1
            moves += 1  # left moves
        seen.add(ch)
        moves += 1  # right moves
        best = max(best, right - left + 1)
    return best, moves

print(longest_unique("abcabcbb"))  # (3, 15)  at most 2 * 8 = 16 moves
# Space O(min(n, alphabet)).
```

## Skipping duplicates (3Sum)

3Sum asks for all **unique** triples that add to zero. Sort the array, then for each first number `nums[i]` run the opposite-end two pointers on `nums[i+1:]` looking for a pair that sums to `-nums[i]`. That gives O(n²) time: n choices for i times an O(n) scan, versus O(n³) for three loops. Duplicates would otherwise produce the same triple repeatedly, so skip them in sorted order: skip `i` when `nums[i] == nums[i-1]`, and after finding a triple move `left` past all equal values. Sorting costs O(n log n) and the extra space is O(1) besides the output (plus the sort's own space).

```python
def three_sum(nums: list[int]) -> list[list[int]]:
    nums = sorted(nums)
    out: list[list[int]] = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue  # same first number as before: same triples again
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
                    left += 1  # skip duplicates of the second number
    return out

print(three_sum([-1, 0, 1, 2, -1, -4]))  # [[-1, -1, 2], [-1, 0, 1]]
# O(n^2) time.
```

## Left-max / right-max (Trapping Rain Water)

The water above a bar is `min(highest bar to its left, highest bar to its right) - its own height` (never below 0). A first solution precomputes `left_max[i]` and `right_max[i]` arrays in two passes: O(n) time, O(n) space. The two-pointer version removes the arrays: keep `left` and `right` pointers with the running `left_max` and `right_max`. Whichever side has the **smaller** current bar is bounded by its own side's maximum (the other side already has something at least as tall), so that side's water can be finalized and its pointer moved. One pass, O(n) time, O(1) space.

```python
def trap(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    left_max = right_max = water = 0
    while left < right:
        if height[left] < height[right]:
            left_max = max(left_max, height[left])
            water += left_max - height[left]  # bounded by left_max
            left += 1
        else:
            right_max = max(right_max, height[right])
            water += right_max - height[right]  # bounded by right_max
            right -= 1
    return water

print(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))  # 6
# O(n) time, O(1) space.
```
