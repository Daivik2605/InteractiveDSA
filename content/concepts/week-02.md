## Hash table buckets, collisions, load factor, resizing

A hash table is an array of slots. To store a key, Python computes `hash(key)`, reduces it to a slot number (`hash % number_of_slots`) and puts the key and value there. Two different keys can land on the same slot: that is a **collision**. Textbook tables keep a small list ("chain") in each bucket; CPython's `dict` and `set` probe for the next free slot instead, but the idea is the same. The **load factor** is items ÷ slots. The higher it gets, the more collisions, so when it passes a threshold (about 2/3 in CPython) the table allocates a bigger array and re-inserts every key. That resize costs O(n), but it happens after exponentially more inserts each time, so an insert is O(1) **amortized**, just like `list.append`.

```python
class TinyMap:
    """A chained hash table, small enough to see buckets, collisions and resizing."""

    def __init__(self) -> None:
        self.buckets: list[list[tuple]] = [[] for _ in range(4)]
        self.size = 0

    def _bucket(self, key) -> list[tuple]:
        return self.buckets[hash(key) % len(self.buckets)]

    def put(self, key, value) -> None:
        bucket = self._bucket(key)
        for i, (k, _) in enumerate(bucket):
            if k == key:  # same key: replace the value
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        self.size += 1
        if self.size / len(self.buckets) > 0.75:  # load factor too high
            self._resize()

    def get(self, key, default=None):
        for k, v in self._bucket(key):
            if k == key:
                return v
        return default

    def _resize(self) -> None:
        pairs = [pair for bucket in self.buckets for pair in bucket]
        self.buckets = [[] for _ in range(len(self.buckets) * 2)]  # double the slots
        for k, v in pairs:  # rehash: every key may land in a new bucket
            self._bucket(k).append((k, v))


m = TinyMap()
for i in range(10):
    m.put(i, i * i)
print(len(m.buckets), m.get(7), m.get(99, "missing"))  # 16 49 missing
# Each put is O(1) average; a resize is O(n) but rare, so n puts cost O(n) in total.
```

## dict/set O(1) average vs O(n) worst

`d[k]`, `k in d`, `d[k] = v` and `del d[k]` are **O(1) on average** because a good hash spreads keys evenly, so a lookup checks one or two slots. The **worst case is O(n)**: if many keys share a hash (or a probe sequence), a lookup has to compare against all of them. In an interview say "O(1) average, O(n) worst case, and I treat it as O(1)". Two rules follow. First, `x in some_list` is O(n) while `x in some_set` is O(1), so turning a list into a set before a loop is the standard speed-up. Second, the keys' `__hash__` and `__eq__` must agree: equal keys must have equal hashes.

```python
class SameHash:
    """Every instance hashes to 1, so every key collides with every other key."""
    calls = 0

    def __init__(self, n: int) -> None:
        self.n = n

    def __hash__(self) -> int:
        return 1

    def __eq__(self, other: object) -> bool:
        SameHash.calls += 1
        return isinstance(other, SameHash) and self.n == other.n


d = {}
for i in range(100):
    d[SameHash(i)] = i
print(SameHash.calls >= 100 * 99 // 2)  # True: each insert compared against the earlier keys
# n inserts with one shared hash cost O(n^2); with a good hash they cost O(n).
```

## Hashable keys (tuples, frozenset)

A key must be **hashable**: its hash never changes while it is in the table. Immutable built-ins qualify: `int`, `str`, `bool`, `None`, `tuple` (only if every item is hashable) and `frozenset`. Mutable `list`, `dict` and `set` do not, and using one raises `TypeError: unhashable type`. To use a list or set as a key, convert it: `tuple(lst)` keeps order, `frozenset(s)` ignores order. This is how you key a grid cell `(row, col)`, a pair, or a sorted anagram signature.

```python
grid_values = {(0, 0): "a", (0, 1): "b"}  # a tuple of ints is a fine key
print(grid_values[(0, 1)])  # b

group = {frozenset({1, 2}): "pair"}
print(group[frozenset({2, 1})])  # pair (order does not matter in a set)

try:
    {[1, 2]: "x"}
except TypeError as e:
    print(e)  # unhashable type: 'list'

key = tuple(sorted("tea"))
print(key)  # ('a', 'e', 't')
# Building a tuple key of length k costs O(k).
```

## Counter and defaultdict

Both live in `collections` and remove the "if key not in d" boilerplate. `Counter(iterable)` counts items; a missing key reads as 0 **without being inserted**. `most_common(k)` returns the k largest counts, and two Counters can be added and subtracted (subtraction drops zero and negative counts). `defaultdict(factory)` creates a value with `factory()` the first time a missing key is read, and **inserts it**, so reading a missing key grows the dict. Use `defaultdict(list)` to group items and `defaultdict(int)` or `Counter` to count.

```python
from collections import Counter, defaultdict

counts = Counter("abracadabra")
print(counts["a"], counts["z"], len(counts))  # 5 0 5 (reading "z" did not add it)
print(counts.most_common(2))  # [('a', 5), ('b', 2)]

groups = defaultdict(list)
for word in ["tea", "eat", "bat", "ate"]:
    groups["".join(sorted(word))].append(word)
print(dict(groups))  # {'aet': ['tea', 'eat', 'ate'], 'abt': ['bat']}
# Counting n items is O(n) time and O(k) space for k distinct items.
```

## Prefix sums + count map

A **prefix sum** array stores `pre[i] = nums[0] + ... + nums[i-1]` (with `pre[0] = 0`), so the sum of any slice is `pre[j + 1] - pre[i]` in O(1) after one O(n) pass. To **count** subarrays with sum k, scan once keeping a running total and a map from "prefix total seen so far" to "how many times". A subarray ending here sums to k exactly when an earlier prefix equals `total - k`, so add that count. Seed the map with `{0: 1}` so subarrays that start at index 0 are counted. Unlike a sliding window, this works with negative numbers.

```python
from itertools import accumulate

nums = [1, 2, 3, -2, 5]
pre = [0, *accumulate(nums)]
print(pre)  # [0, 1, 3, 6, 4, 9]
print(pre[4] - pre[1])  # 3  (sum of nums[1:4] = 2 + 3 - 2)

def subarray_sum(nums: list[int], k: int) -> int:
    seen = {0: 1}  # the empty prefix
    total = result = 0
    for x in nums:
        total += x
        result += seen.get(total - k, 0)  # earlier prefixes that make this slice sum to k
        seen[total] = seen.get(total, 0) + 1
    return result

print(subarray_sum([1, 2, 3, -2, 5], 3))  # 4: [1,2], [3], [2,3,-2], [-2,5]
# O(n) time, O(n) space.
```

## Frequency bucket sort

"Top k frequent" with a sort or heap costs O(n log n) or O(n log k). A **frequency bucket sort** does it in O(n): count the items, then make a list of buckets where index `f` holds every item that appears exactly `f` times. A count can be at most n, so `n + 1` buckets are enough. Read the buckets from the highest index down until you have k items. Create the buckets with a comprehension, never `[[]] * (n + 1)`, which would share one list.

```python
from collections import Counter

def top_k_frequent(nums: list[int], k: int) -> list[int]:
    counts = Counter(nums)
    buckets: list[list[int]] = [[] for _ in range(len(nums) + 1)]
    for value, freq in counts.items():
        buckets[freq].append(value)
    out: list[int] = []
    for freq in range(len(buckets) - 1, 0, -1):  # highest frequency first
        for value in buckets[freq]:
            out.append(value)
            if len(out) == k:
                return out
    return out

print(top_k_frequent([1, 1, 1, 2, 2, 3], 2))  # [1, 2]
# O(n) time, O(n) space.
```
