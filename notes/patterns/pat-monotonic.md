# Monotonic stack and deque

### Definition

A stack kept in sorted order: each new value pops entries it makes useless, so every element moves in and out once.

### The tell

Nearest greater or smaller element, or window maximum.

### Structure

- The stack holds indices, not values, so you can read the value and also measure distance.
- Before pushing `i`, pop while the top is worse than `nums[i]`. Each popped entry has just found its answer: `nums[i]`.
- A stack that decreases bottom to top finds the next greater element. One that increases finds the next smaller.
- Whatever is still on the stack at the end has no answer.
- Window maximum uses a deque: pop from the back like a stack, and pop from the front when an index leaves the window.

### Complexity

- O(n) time: each index is pushed once and popped once.
- O(n) space for the stack.
- Window maximum with a deque: O(n) time and O(k) space, against O(n log n) with a heap.

### Use when / Avoid when

**Use when:**

- You want the next or previous greater or smaller element for every position.
- The answer is a distance or a span (days until warmer, stock span).
- A histogram or area question needs the nearest lower bar on each side.
- You want a window maximum or minimum.

**Avoid when:**

- You need every greater element, not just the nearest: nothing is discarded, so the stack is no use.
- Plain nesting is enough, as in matching brackets: an ordinary stack does it and order does not matter.

### Invariant

The stack is sorted from bottom to top, and every index on it is still waiting for its answer.

Deque version: every index is inside the window, values fall from front to back, and the front is the window maximum.

### Template

Next greater element to the right, or -1:

```python
def next_greater(nums: list[int]) -> list[int]:
    answer = [-1] * len(nums)
    stack: list[int] = []                      # indices; values fall bottom to top
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:   # x is the answer for each of these
            answer[stack.pop()] = x
        stack.append(i)
    return answer

print(next_greater([2, 1, 2, 4, 3]))  # expected: [4, 2, 4, -1, -1]
```

### Dry run

`next_greater([2, 1, 2, 4, 3])`:

| i | x | Stack before (values) | Popped, with answer | Stack after (values) |
|---|---|---|---|---|
| 0 | 2 | [] | - | [2] |
| 1 | 1 | [2] | - | [2, 1] |
| 2 | 2 | [2, 1] | 1→2 | [2, 2] |
| 3 | 4 | [2, 2] | 2→4, 2→4 | [4] |
| 4 | 3 | [4] | - | [4, 3] |

The 4 and the 3 are left on the stack, so their answer is -1.

### Variants

- Distance: store `i - j` instead of the value, as in "days until warmer".
- Previous smaller: scan left to right, pop while the top is not smaller, and the top that remains is the answer.
- Circular array: loop `2 * n` times with `i % n`.
- Ties: pop on `<` for a strictly greater answer, or on `<=` if equal values should also count.
- Histogram: a popped bar's left edge is the new top and its right edge is `i`, so its width is `i - left - 1`.
- Window maximum: a deque of indices.

Days until a warmer day:

```python
def days_until_warmer(temps: list[int]) -> list[int]:
    answer = [0] * len(temps)
    stack: list[int] = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer

print(days_until_warmer([73, 74, 75, 71, 69, 72, 76, 73]))  # expected: [1, 1, 4, 2, 1, 1, 0, 0]
```

Previous smaller element:

```python
def previous_smaller(nums: list[int]) -> list[int]:
    answer: list[int] = []
    stack: list[int] = []
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] >= x:
            stack.pop()
        answer.append(nums[stack[-1]] if stack else -1)
        stack.append(i)
    return answer

print(previous_smaller([4, 5, 2, 10, 8]))  # expected: [-1, 4, -1, 2, 2]
```

Largest rectangle in a histogram:

```python
def largest_rectangle(heights: list[int]) -> int:
    best = 0
    stack: list[int] = []                        # indices of rising bars
    for i, h in enumerate(heights + [0]):        # a final 0 pops everything
        while stack and heights[stack[-1]] >= h:
            height = heights[stack.pop()]
            left = stack[-1] if stack else -1
            best = max(best, height * (i - left - 1))
        stack.append(i)
    return best

print(largest_rectangle([2, 1, 5, 6, 2, 3]))  # expected: 10
```

Window maximum with a deque:

```python
from collections import deque

def window_max(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()                     # indices; values fall front to back
    out: list[int] = []
    for i, x in enumerate(nums):
        if dq and dq[0] <= i - k:                # front left the window
            dq.popleft()
        while dq and nums[dq[-1]] <= x:          # back can never be a maximum again
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out

print(window_max([1, 3, -1, -3, 5, 3, 6, 7], 3))  # expected: [3, 3, 5, 5, 6, 7]
```

### Mistakes

- Wrong: pushing the value, `stack.append(x)`. You lose the position, so a distance or a width is impossible. Fix: push `i`.
- Wrong: pushing before the pop loop. The new index is then compared against itself.

  ```python
  def next_greater_push_first(nums: list[int]) -> list[int]:
      answer = [-1] * len(nums)
      stack: list[int] = []
      for i, x in enumerate(nums):
          stack.append(i)                           # should come after the loop
          while stack and nums[stack[-1]] < x:
              answer[stack.pop()] = x
      return answer

  print(next_greater_push_first([2, 1, 2, 4, 3]))  # prints (wrong): [-1, -1, -1, -1, -1]
  ```

  Fix: push after the `while` loop.
- Wrong: `<=` in the pop test when the question wants a strictly greater element. Equal values then count as greater.

  ```python
  def next_greater_ties(nums: list[int]) -> list[int]:
      answer = [-1] * len(nums)
      stack: list[int] = []
      for i, x in enumerate(nums):
          while stack and nums[stack[-1]] <= x:
              answer[stack.pop()] = x
          stack.append(i)
      return answer

  print(next_greater_ties([2, 2]))  # prints (wrong): [2, -1]
  ```

  Fix: use `<`, which gives `[-1, -1]`.
- Wrong: skipping the `dq[0] <= i - k` check in the window maximum. An index outside the window can stay at the front.

  ```python
  from collections import deque

  def window_max_no_expiry(nums: list[int], k: int) -> list[int]:
      dq: deque[int] = deque()
      out: list[int] = []
      for i, x in enumerate(nums):
          while dq and nums[dq[-1]] <= x:
              dq.pop()
          dq.append(i)
          if i >= k - 1:
              out.append(nums[dq[0]])
      return out

  print(window_max_no_expiry([9, 1, 2, 3], 2))  # prints (wrong): [9, 9, 9]
  ```

  Fix: pop the front when `dq[0] <= i - k`. The correct result is `[9, 2, 3]`.
- Wrong: a list as the queue, with `pop(0)`. It shifts every element, so each call is O(n). Fix: `collections.deque` and `popleft()`.

### Related patterns

- `pat-window-variable`: a window maximum is the deque variant of a window that slides.
- `pat-two-pointers`: also discards candidates in one pass, with indices instead of a stack.
- Heap: gives a window maximum in O(n log n), against O(n) for the deque.
- Plain stack: matching and nesting, where no ordering is kept.

### Problems

- w05-d3-p1 — Daily Temperatures
- w05-d5-p1 — Car Fleet
- w05-d6-p1 — Largest Rectangle in Histogram
- w05-d6-p2 — Sliding Window Maximum
- w05-d7-p2 — Final Prices With a Special Discount in a Shop
- w05-pool-02 — Next Greater Element I
- w05-pool-04 — Next Greater Element II
- w07-d4-p2 — Remove K Digits
- w09-d4-p3 — Online Stock Span

### Sources

Opened and checked:

- https://en.wikipedia.org/wiki/All_nearest_smaller_values — solved in linear time with a stack, processing values in order and keeping a sorted subsequence.
- https://www.geeksforgeeks.org/dsa/next-greater-element/ — monotonic decreasing stack, O(n) time and O(n) space, against O(n²) with nested loops.
- https://www.geeksforgeeks.org/dsa/sliding-window-maximum-maximum-of-all-subarrays-of-size-k/ — deque version in O(n) time and O(k) space; heap version O(n log n).
- https://docs.python.org/3/library/collections.html — deques have O(1) appends and pops at both ends, while list `pop(0)` and `insert(0, v)` cost O(n).
- https://docs.python.org/3/tutorial/datastructures.html — a list works as a stack with `append()` and `pop()`; as a queue it is slow.
