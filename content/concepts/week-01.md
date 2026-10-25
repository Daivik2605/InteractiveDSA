## Big-O, Big-Θ, Big-Ω; dropping constants

Big-O is an **upper bound** on how the work grows with the input size n, Big-Ω a **lower bound**, and Big-Θ means both bounds match. In interviews "O(n)" almost always means the tight, worst-case bound. Drop constants and lower-order terms: `3n + 10` and `n + n/2` are both O(n); `n² + n` is O(n²). Sequential loops add, nested loops multiply, and a loop that halves its range each step is O(log n). Say space the same way: the extra memory you allocate, not counting the input.

```python
def has_pair_sum(nums: list[int], target: int) -> bool:
    for i in range(len(nums)):          # n iterations
        for j in range(i + 1, len(nums)):  # up to n - 1, then n - 2, ...
            if nums[i] + nums[j] == target:
                return True
    return False

print(has_pair_sum([2, 7, 11], 9))  # True
# n + (n-1) + ... + 1 = n(n+1)/2 comparisons -> O(n^2) time, O(1) space.
```

## Cost of list, str, dict and set operations in CPython

Know these before you pick a data structure: most "too slow" answers use an O(n) operation inside a loop.

```
list   index lst[i]            O(1)        str   len(s), s[i]          O(1)
       append / pop()          O(1) amort.       s[a:b] (k chars)       O(k)
       pop(0), insert(0, x)    O(n)              s + t                  O(len(s)+len(t))
       x in lst, lst.index(x)  O(n)              x in s                 O(n) typical
       lst[a:b] (k items)      O(k)              "".join(parts)         O(total length)
       lst.sort()              O(n log n)        s.split()              O(n)

dict   d[k], d[k] = v, k in d, del d[k]    O(1) average, O(n) worst case
set    s.add(x), x in s, s.remove(x)       O(1) average, O(n) worst case
       a | b   O(len(a)+len(b))      a & b   O(min(len(a), len(b)))
both   iterate / copy O(n); keys and elements must be hashable (no list or dict keys)
```

```python
def contains_duplicate(nums: list[int]) -> bool:
    seen: set[int] = set()
    for x in nums:
        if x in seen:  # O(1) on a set; on a list this check alone would be O(n)
            return True
        seen.add(x)
    return False

print(contains_duplicate([1, 2, 3, 1]))  # True
# O(n) time and O(n) space, instead of O(n^2) with a list.
```

## list as a dynamic array; amortized append

A Python list is an array of references with spare capacity. `append` is a plain write while there is room; when the array is full CPython allocates a bigger one (growing by a constant factor) and copies everything over. That copy is O(n), but it happens so rarely that the average cost per append is O(1): **amortized O(1)**. Inserting or deleting at the front shifts every element, so it stays O(n). For a queue use `collections.deque`.

```python
def copies_when_appending(n: int) -> int:
    """Simulate a doubling array; count element copies made by n appends."""
    capacity, size, copies = 1, 0, 0
    for _ in range(n):
        if size == capacity:
            copies += size  # copy into a new array twice as big
            capacity *= 2
        size += 1
    return copies

print(copies_when_appending(1000))  # 1023
# Fewer than 2n copies in total, so O(1) per append on average.
```

## str is immutable; join vs +=

A `str` cannot be changed after it is created. `s += "x"` builds a brand new string and copies the old one, so doing it in a loop costs O(n²) in the worst case. Collect the pieces in a list and join once: O(total length). To "edit" a string, work on `list(s)` and join at the end.

```python
s = "abc"
try:
    s[0] = "x"
except TypeError as e:
    print(e)  # 'str' object does not support item assignment

def shout(words: list[str]) -> str:
    parts = []
    for w in words:
        parts.append(w.upper())  # amortized O(1)
    return " ".join(parts)  # one pass over the pieces

print(shout(["big", "o"]))  # BIG O
```

## In-place edits and read/write pointers

An in-place algorithm changes the input with O(1) extra space. The workhorse is two indices that both move forward: `read` looks at every element, `write` marks where the next kept element goes. Because `write <= read`, you never overwrite something you still need. Return `write` as the new length, or fill the rest afterwards.

```python
def remove_value(nums: list[int], val: int) -> int:
    write = 0
    for read in range(len(nums)):
        if nums[read] != val:
            nums[write] = nums[read]
            write += 1
    return write

nums = [3, 2, 2, 3, 4]
k = remove_value(nums, 3)
print(k, nums[:k])  # 3 [2, 2, 4]
# O(n) time, O(1) space.
```

## Matrix traversal: rows, columns, layers

A matrix is a list of rows, so `m[r][c]` is row r, column c. Rows are easy (`for row in m`). Columns need an index loop or `zip(*m)`. Layers (rings) are walked with four shrinking boundaries: top, bottom, left, right. Before writing code, say the sizes: m rows and n columns means m·n cells to visit. Never build a grid with `[[0] * n] * m`: that repeats one row m times.

```python
m = [[1, 2, 3], [4, 5, 6]]

for row in m:
    print(row)  # [1, 2, 3] then [4, 5, 6]

print([list(col) for col in zip(*m)])  # [[1, 4], [2, 5], [3, 6]]

grid = [[0] * 3 for _ in range(2)]  # correct: a fresh row per iteration
grid[0][0] = 9
print(grid)  # [[9, 0, 0], [0, 0, 0]]
# Visiting every cell is O(m * n) time.
```
