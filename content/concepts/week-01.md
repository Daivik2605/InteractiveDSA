## How cost grows

**Definition.** Big-O is the ceiling on how the work grows as the input
grows. In an interview it means the tight worst case.

**The rules.**

- Loops side by side add: O(n) + O(n) is O(n).
- Nested loops multiply: O(n) x O(n) is O(n^2).
- A range that halves each step is O(log n).
- Drop constants and smaller terms: 3n + 10 is O(n), n^2 + n is O(n^2).

**Space is the same question** — count only the memory you allocate,
not the input.

```python
def has_pair_sum(nums: list[int], target: int) -> bool:
    for i in range(len(nums)):             # n iterations
        for j in range(i + 1, len(nums)):  # n-1, then n-2, ... 1
            if nums[i] + nums[j] == target:
                return True
    return False
print(has_pair_sum([2, 7, 11], 100))  # False, after n(n-1)/2 = 3 comparisons
# Nested loops multiply: O(n^2) time, O(1) space.
```

**Watch out.** An O(n) operation inside a loop is the usual cause of a
"too slow" verdict. `x in my_list` is O(n); `x in my_set` is O(1).

**Skip this.** Big-Theta means both bounds match, Big-Omega is the lower
bound. You will not be asked. Know the words and move on.

## What every operation costs

**Definition.** Every built-in operation has a cost, and the structure you pick decides which one you pay.

**The costs.**

- Reaching one item by index or by key is O(1).
- Searching a list or string with `in` is O(n); a set or dict does it in O(1) on average.
- Sorting is O(n log n).
- Dict keys and set elements must be hashable: a list or dict as a key raises `TypeError`.

**Worst case exists.** Dict and set operations are O(n) in the worst case; quote the O(1) average.

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
```

**Watch out.** A membership test on a list inside a loop makes the whole loop O(n^2). Move the items into a set first: O(n) time, O(n) space.

## Why append is cheap

**Definition.** A Python list is an array of references with spare capacity, so adding to the end is cheap.

**The rules.**

- `append` is a plain write while there is room.
- When the array is full, CPython allocates a bigger one (growing by a constant factor) and copies everything over: O(n).
- That copy is so rare that the average cost per append is O(1): amortized O(1).
- Inserting or deleting at the front shifts every element, so it stays O(n).

```python
def copies_when_appending(n: int) -> int:
    capacity, size, copies = 1, 0, 0  # a doubling array, to show the idea
    for _ in range(n):
        if size == capacity:
            copies, capacity = copies + size, capacity * 2  # copy into a bigger array
        size += 1
    return copies
print(copies_when_appending(1000))  # 1023
```

**Watch out.** Using a list as a queue with `pop(0)` or `insert(0, x)` is O(n) per call. Use `collections.deque`.

**Skip this.** The exact growth factor. Only that it is a constant factor matters.

## Why building strings is expensive

**Definition.** A `str` is immutable: it cannot be changed after it is created.

**The rules.**

- `s += "x"` builds a brand new string and copies the old one.
- Doing that in a loop costs O(n^2) in the worst case.
- Collect the pieces in a list and join once: O(total length).

**To edit characters,** work on `list(s)` and join at the end: `s[0] = "x"` raises `TypeError`.

```python
words = ["big", "o"]
slow = ""
for w in words:
    slow += w.upper()  # O(n^2): builds a new string and copies the old one each time
parts: list[str] = []
for w in words:
    parts.append(w.upper())  # amortized O(1)
print(slow, " ".join(parts))  # BIGO BIG O (join: one pass over the pieces)
```

**Watch out.** `result += piece` inside a loop looks harmless and is the classic hidden O(n^2).

## Editing a list in place

**Definition.** An in-place algorithm changes the input using O(1) extra space, usually with a read index and a write index.

**The rules.**

- `read` looks at every element once, moving forward: O(n) time.
- `write` marks where the next kept element goes, and also only moves forward.
- Because `write <= read`, you never overwrite something you still need.
- Return `write` as the new length, or fill the rest afterwards.

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
print(k, nums)  # 3 [2, 2, 4, 3, 4]
```

**Watch out.** The list keeps its old length: the tail is leftovers (see the printed list), so return `write` and read only `nums[:write]`.

## Walking a matrix

**Definition.** A matrix is a list of rows, so `m[r][c]` is row r, column c.

**The rules.**

- Rows are easy: `for row in m`.
- Columns need an index loop or `zip(*m)`.
- Layers (rings) use four shrinking boundaries: top, bottom, left, right.
- Before writing code, say the sizes: m rows and n columns means m·n cells to visit, so O(m * n) time.

```python
m = [[1, 2, 3], [4, 5, 6]]
for row in m:
    print(row)  # [1, 2, 3] then [4, 5, 6]
print([list(col) for col in zip(*m)])  # [[1, 4], [2, 5], [3, 6]]
grid = [[0] * 3 for _ in range(2)]  # correct: a fresh row per iteration
grid[0][0] = 9
print(grid)  # [[9, 0, 0], [0, 0, 0]]
```

**Watch out.** Never build a grid with `[[0] * n] * m`: it repeats one row m times, so a write to one cell shows up in every row.

### Patterns this week

| Pattern | The tell | Structure | Typical cost |
|---|---|---|---|
| Read/write pointer | Remove, dedupe or compact a list without extra space | Two indices moving forward, `write <= read` | O(n) time, O(1) space |
| Prefix/suffix pass | Each answer depends on everything left or right of it | Two passes, left-to-right then right-to-left, each keeping a running value | O(n) time, O(1) extra space besides the output |
| Transpose + reverse | Rotate or flip a square grid in place | Swap `m[r][c]` with `m[c][r]`, then reverse each row | O(n^2) time, O(1) space |
| Boundary-shrinking spiral | Visit cells in spiral or ring order | Four boundaries (top, bottom, left, right) moving inward | O(m * n) time, O(1) extra space |

### Read more

- [List operation costs](https://docs.python.org/3/builtins/time-complexity.html#list)
- [Dict operation costs](https://docs.python.org/3/builtins/time-complexity.html#dict-frozendict)
- [Set operation costs](https://docs.python.org/3/builtins/time-complexity.html#set-frozenset)
