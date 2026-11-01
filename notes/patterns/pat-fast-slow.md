# Fast and slow pointers

### Definition

Two pointers advance at different speeds along a linked structure; their meeting or position reveals a cycle or the middle.

### The tell

Detect a cycle, or find the middle, in one pass.

### Structure

- Each turn, `slow` moves one step and `fast` moves two. On a list, both start at the head.
- On a list, loop while `fast` and `fast.next` exist. If either is missing, the list ends and there is no cycle.
- Cycle check: if `slow` and `fast` meet, there is a cycle. On a list, compare nodes with `is`, not values.
- Middle: when `fast` reaches the end, `slow` is at the middle. On an even length it is the second of the two middles.
- Cycle start: after they meet, send one pointer back to the head and move both one step at a time. They meet at the first node of the cycle.

**Why it works.** In the main loop, fast gains exactly one step on slow each turn. On a straight list, fast reaches the end when slow is halfway. In a cycle the gap changes by one at a time, so it cannot jump over zero.

```text
1 -> 2 -> 3 -> 4
     ^         |
     +---------+      4 points back to 2
turn 1:  S at 2, F at 3
turn 2:  S at 3, F at 2
turn 3:  S and F meet at 4
```

### Complexity

- O(n) time and O(1) space for the cycle check, the middle and the cycle start.
- A visited set also detects a cycle in O(n) time, but costs O(n) space.

### Use when / Avoid when

**Use when:**

- You must detect a cycle without extra memory.
- You need the middle of a linked list in one pass.
- A sequence follows a rule from one state to the next, and you ask if it repeats.

**Avoid when:**

- You need the whole cycle or the path to it: a visited dict keeps that.
- The structure is an array you can index: use `len(nums) // 2`.

### Invariant

Before each turn, `fast` has taken exactly twice as many steps as `slow`.

### Template

Cycle check, with a small list builder:

```python
class ListNode:
    def __init__(self, val: int = 0, next: "ListNode | None" = None) -> None:
        self.val = val
        self.next = next

def build(values: list[int], cycle_to: int | None = None) -> ListNode | None:
    nodes = [ListNode(v) for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if cycle_to is not None:
        nodes[-1].next = nodes[cycle_to]          # last node points back
    return nodes[0] if nodes else None

def has_cycle(head: ListNode | None) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

print(has_cycle(build([1, 2, 3, 4], cycle_to=1)))  # expected: True
```

Middle node:

```python
# uses ListNode and build from the block above
def middle(head: ListNode | None) -> int | None:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow.val if slow else None

print(middle(build([1, 2, 3, 4, 5])))  # expected: 3
```

### Dry run

`has_cycle(build([1, 2, 3, 4], cycle_to=1))`:

| Turn | slow | fast | Same node? |
|---|---|---|---|
| 0 | 1 | 1 | start |
| 1 | 2 | 3 | no |
| 2 | 3 | 2 | no |
| 3 | 4 | 4 | yes, cycle |

### Variants

- Even length: the loop above ends on the second middle. To get the first one, loop while `fast.next and fast.next.next`.
- Cycle start: phase two after the meeting, as below.
- A rule instead of a list: treat "next state" as `next`, for any sequence defined by a function.

Cycle start:

```python
# uses ListNode and build from the Template
def cycle_start(head: ListNode | None) -> int | None:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            slow = head                           # phase two: back to the head
            while slow is not fast:
                slow = slow.next
                fast = fast.next                  # both move one step now
            return slow.val
    return None

print(cycle_start(build([1, 2, 3, 4], cycle_to=1)))  # expected: 2
```

Why phase two lands on the start: if the head is `a` steps from the cycle start and they meet `c` steps past it, slow took `a + c` steps and fast took `2(a + c)`. The extra `a + c` is a whole number of laps, so walking `a` more steps from the meeting point returns to the start.

A sequence that follows a rule:

```python
def reaches_one(n: int) -> bool:
    def step(x: int) -> int:                      # sum of squared digits
        return sum(int(d) ** 2 for d in str(x))

    slow, fast = n, step(n)
    while fast != 1 and slow != fast:
        slow = step(slow)
        fast = step(step(fast))
    return fast == 1

print(reaches_one(19))  # expected: True
```

### Mistakes

- Wrong: `while fast.next:`. When `fast` becomes `None`, the next test crashes.

  ```python
  # uses ListNode and build from the Template
  def has_cycle_crash(head: ListNode | None) -> bool:
      slow = fast = head
      while fast.next:                              # should be: while fast and fast.next
          slow = slow.next
          fast = fast.next.next
          if slow is fast:
              return True
      return False

  try:
      has_cycle_crash(build([1, 2, 3, 4]))
  except AttributeError as e:
      print(e)  # prints (wrong): 'NoneType' object has no attribute 'next'
  ```

  Fix: `while fast and fast.next:`.
- Wrong: `slow.val == fast.val`. Equal values in different nodes look like a meeting.

  ```python
  # uses ListNode and build from the Template
  def has_cycle_by_value(head: ListNode | None) -> bool:
      slow = fast = head
      while fast and fast.next:
          slow = slow.next
          fast = fast.next.next
          if slow.val == fast.val:                  # should be: slow is fast
              return True
      return False

  print(has_cycle_by_value(build([7, 7, 7])))  # prints (wrong): True
  ```

  Fix: compare the nodes with `is`.
- Wrong: moving `fast` one step, `fast = fast.next`. The two pointers are then the same node after the first turn, so every list looks like it has a cycle. Fix: `fast = fast.next.next`.
- Wrong: checking `slow is fast` before moving. They both start at the head, so the answer is always True. Fix: move first, then compare.

### Related patterns

- `pat-two-pointers`: the same two-pointer idea, with equal speeds.
- `pat-hashing-counting`: a visited set finds a cycle too, at O(n) space.
- Lead pointer with a fixed gap: for the n-th node from the end, move one pointer n steps ahead and then move both at the same speed. Different mechanism, same two pointers.

### Problems

- w02-pool-05 — Happy Number
- w06-d3-p1 — Linked List Cycle
- w06-d3-p2 — Reorder List
- w06-pool-02 — Middle of the Linked List
- w06-pool-03 — Palindrome Linked List
- w06-pool-09 — Find the Duplicate Number
- w07-d4-p1 — Sort List

### Sources

- https://www.geeksforgeeks.org/dsa/detect-loop-in-a-linked-list/ — Floyd's cycle-finding with slow and fast pointers: O(n) time and O(1) space; a hash set is O(n) time and O(n) space.
- https://www.geeksforgeeks.org/dsa/write-a-c-function-to-print-the-middle-of-the-linked-list/ — when fast reaches the end, slow is at the middle; for an even count slow ends on the second middle.
- https://en.wikipedia.org/wiki/Cycle_detection — Floyd's tortoise and hare moves two pointers at different speeds through the sequence until they point to equal values.
