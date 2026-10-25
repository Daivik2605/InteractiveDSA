## Prefix/suffix pass

```python
def product_except_self(nums: list[int]) -> list[int]:
    n = len(nums)
    out = [1] * n
    prefix = 1
    for i in range(n):  # out[i] = product of everything left of i
        out[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):  # multiply in everything right of i
        out[i] *= suffix
        suffix *= nums[i]
    return out
```

*Use when* each answer depends on everything to its left and everything to its right, and you can't (or shouldn't) divide. Time O(n), extra space O(1) besides the output.

## Read/write pointer

```python
def remove_duplicates(nums: list[int]) -> int:
    """Keep the first copy of each value in a sorted list, in place. Returns the new length."""
    write = 0
    for read in range(len(nums)):
        if write == 0 or nums[read] != nums[write - 1]:
            nums[write] = nums[read]
            write += 1
    return write
```

*Use when* you must filter or compact a list in place, in one pass, keeping the order: `read` scans every element, `write` marks where the next kept one goes. Time O(n), space O(1).

## Transpose + reverse

```python
def rotate(matrix: list[list[int]]) -> None:
    """Rotate an n x n matrix 90 degrees clockwise, in place."""
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):  # swap across the diagonal
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:  # then mirror each row
        row.reverse()
```

*Use when* a square matrix must be rotated or reflected in place: a rotation is a transpose followed by a row reverse (counter-clockwise: reverse the rows first). Time O(n²), space O(1).

## Boundary-shrinking spiral

```python
def spiral_order(matrix: list[list[int]]) -> list[int]:
    if not matrix or not matrix[0]:
        return []
    top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1
    out: list[int] = []
    while top <= bottom and left <= right:
        out.extend(matrix[top][left : right + 1])  # top row, left to right
        top += 1
        for r in range(top, bottom + 1):  # right column, downwards
            out.append(matrix[r][right])
        right -= 1
        if top <= bottom:  # bottom row, right to left (only if a row is left)
            out.extend(reversed(matrix[bottom][left : right + 1]))
            bottom -= 1
        if left <= right:  # left column, upwards (only if a column is left)
            for r in range(bottom, top - 1, -1):
                out.append(matrix[r][left])
            left += 1
    return out
```

*Use when* you walk a grid layer by layer (spiral, layer-by-layer rotation): four boundaries move inwards, and the two `if` guards stop a single leftover row or column being visited twice. Time O(m·n), space O(1) besides the output.
