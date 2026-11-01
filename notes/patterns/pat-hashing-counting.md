# Hashing and counting

### Definition

Remember what you have seen in a dict or set, so each lookup is O(1) on average instead of a scan.

### The tell

Have I seen this before, or how many of these?

### Structure

- Existence: a `set` answers "seen it?" for each item.
- Counting: a `Counter` or dict maps each item to its count.
- Complement: look up `target - x` before inserting `x`, so an item never pairs with itself.
- Grouping: a dict maps a shared key, such as the sorted letters of a word, to the list of items that have it.
- Keys must be hashable: ints, strings, tuples of those, frozensets. Lists, dicts and sets are not.

**Why it works.** A dict or set jumps straight to the bucket for a key, so lookup, insert and delete cost the same whatever the size.

```text
nums  3  8  5  1      target 9
i=0   x=3  need 6  seen {}            -> store 3
i=1   x=8  need 1  seen {3}           -> store 8
i=2   x=5  need 4  seen {3, 8}        -> store 5
i=3   x=1  need 8  seen {3, 8, 5}     -> 8 is there: pair (1, 3)
```

### Complexity

- Lookup, insert and delete are O(1) on average and O(n) in the worst case.
- A single pass that fills a dict is O(n) time and O(n) space.
- Building a key costs its own length: a sorted-letters key for a word of length m is O(m log m).

### Use when / Avoid when

**Use when:**

- You look for duplicates, complements or first repeats.
- You count frequencies, or compare two counts, as in anagram checks.
- You group items by a shared key.

**Avoid when:**

- You need order or ranges: sort the data, or use `bisect`.
- The input is already sorted and memory matters: two pointers use O(1) space.
- You need the smallest or largest seen item: a heap does that.

### Invariant

The structure holds exactly the items before the current index. For grouping, each key's list holds every item seen so far with that key.

### Template

Complement lookup:

```python
def pair_indices(nums: list[int], target: int) -> tuple[int, int] | None:
    seen: dict[int, int] = {}                    # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return seen[target - x], i
        seen[x] = i                              # insert after the lookup
    return None

print(pair_indices([3, 8, 5, 1], 9))  # expected: (1, 3)
```

Counting:

```python
from collections import Counter

def first_unique(s: str) -> int:
    counts = Counter(s)
    for i, ch in enumerate(s):
        if counts[ch] == 1:
            return i
    return -1

print(first_unique("loveleetcode"))  # expected: 2
```

### Dry run

`group_anagrams(["eat", "tea", "tan", "ate"])` from the grouping variant below. The key is the word's letters in sorted order.

| Word | Key | groups after the word |
|---|---|---|
| eat | aet | `aet: [eat]` |
| tea | aet | `aet: [eat, tea]` |
| tan | ant | `aet: [eat, tea]`, `ant: [tan]` |
| ate | aet | `aet: [eat, tea, ate]`, `ant: [tan]` |

### Variants

- Set for existence: duplicates and first repeats.
- Count comparison: two strings are anagrams when their `Counter`s are equal.
- Grouping with a key: below.
- Frequency buckets: below.
- Composite keys: use tuples such as `(row, col)`, or `frozenset` for an unordered group.

Grouping by a shared key:

```python
def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: dict[str, list[str]] = {}
    for w in words:
        groups.setdefault("".join(sorted(w)), []).append(w)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))  # expected: [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
```

Frequency buckets, the k most frequent without a sort:

```python
from collections import Counter

def top_k_frequent(nums: list[int], k: int) -> list[int]:
    buckets: list[list[int]] = [[] for _ in range(len(nums) + 1)]
    for value, count in Counter(nums).items():
        buckets[count].append(value)             # index = how often
    out: list[int] = []
    for count in range(len(buckets) - 1, 0, -1):
        out.extend(buckets[count])
        if len(out) >= k:
            return out[:k]
    return out

print(top_k_frequent([1, 1, 1, 2, 2, 3], 2))  # expected: [1, 2]
```

### Mistakes

- Wrong: `x in seen_list` inside the loop. Each test scans the list, so the whole loop is O(n²). Fix: keep `seen` as a set.
- Wrong: inserting before the complement lookup. An item finds itself.

  ```python
  def pair_insert_first(nums: list[int], target: int) -> tuple[int, int] | None:
      seen: dict[int, int] = {}
      for i, x in enumerate(nums):
          seen[x] = i                            # should come after the lookup
          if target - x in seen:
              return seen[target - x], i
      return None

  print(pair_insert_first([4, 1], 8))  # prints (wrong): (0, 0)
  ```

  Fix: look up first, then insert. The correct answer is `None`.
- Wrong: a list as a set element or dict key.

  ```python
  seen: set[tuple[int, ...]] = set()
  try:
      seen.add([1, 2])                           # type: ignore[arg-type]
  except TypeError as e:
      print(e)  # prints (wrong): unhashable type: 'list'
  ```

  Fix: `seen.add(tuple([1, 2]))`.
- Wrong: `counts[ch] += 1` on a plain dict. A missing key raises an error.

  ```python
  counts: dict[str, int] = {}
  try:
      counts["a"] += 1
  except KeyError as e:
      print(type(e).__name__)  # prints (wrong): KeyError
  ```

  Fix: `counts[ch] = counts.get(ch, 0) + 1`, or use a `Counter`.
- Wrong: adding keys to a dict while looping over it.

  ```python
  d = {"a": 1, "b": 2}
  try:
      for key in d:
          d[key + "x"] = 0
  except RuntimeError as e:
      print(e)  # prints (wrong): dictionary changed size during iteration
  ```

  Fix: loop over `list(d)`.

### Related patterns

- `pat-prefix-sum`: the dict of prefix totals is this pattern with a running sum as the key.
- `pat-window-variable`: a count dict kept inside a moving window.
- `pat-two-pointers`: the sorted alternative for pairs, at O(1) space.
- `pat-fast-slow`: a visited set finds a cycle too, but costs O(n) space.

### Problems

- w02-d1-p1 — Two Sum
- w02-d1-p2 — Valid Anagram
- w02-d2-p1 — Group Anagrams
- w02-d2-p2 — Longest Palindrome
- w02-d3-p1 — Top K Frequent Elements
- w02-d3-p2 — Longest Consecutive Sequence
- w02-d3-p3 — Valid Sudoku
- w02-pool-01 — Contains Duplicate
- w02-pool-04 — Ransom Note
- w05-d4-p3 — Brick Wall

### Sources

- https://docs.python.org/3/builtins/time-complexity.html — dict and set lookups, inserts and deletes are O(1) on average.
- https://docs.python.org/3/library/collections.html — `Counter` is a dict subclass for counting hashable objects.
- https://docs.python.org/3/glossary.html — mutable containers such as lists and dicts are not hashable; tuples and frozensets are, if their elements are.
- https://en.wikipedia.org/wiki/Hash_table — insertions and deletions are amortized constant average cost per operation.
