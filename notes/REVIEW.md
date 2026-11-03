# Review notes for pattern files

Not shown on the site. Disagreements between the private handwritten notes and public sources, and other differences worth knowing when reviewing `notes/patterns/`. Where a correction matters to a reader, it is already in the pattern file's Complexity or Variants.

Private source pages: `Dsa Pattern Notes.pdf` and `Coding Pattern.pdf` in `04 DSA`. Nothing is quoted from them.

## pat-two-pointers

- The notes give "Time O(n), Space O(1)" for the whole pattern and list 3Sum under it. That holds for one scan only. 3Sum is O(n^2) in the worst case (Wikipedia, 3SUM), and sorting adds O(n log n). Corrected in Complexity.
- Pages: Dsa Pattern Notes p.1, Coding Pattern p.1.

## pat-window-variable

- The two sheets disagree on space: one says O(1), the other O(character set). It depends on the state kept: O(1) for a running sum, O(k) for k distinct keys in a count dict. Stated in Complexity.
- The notes list "exactly K" as a cue for this pattern. One shrink loop cannot answer "exactly k". Variants shows two "at most" counts subtracted, checked against brute force.
- Pages: Dsa Pattern Notes p.3, Coding Pattern p.2.

## pat-monotonic

- No disagreement on definitions or complexity.
- One sheet pops on `<` while scanning left to right, the other pops on `<=` while scanning right to left. Both are right. They treat equal values differently. Covered by the Ties variant and a Mistakes demo.
- Pages: Dsa Pattern Notes p.7, Coding Pattern p.10.

## pat-window-fixed

- Source pages: Dsa Pattern Notes p.2 (fixed-size sliding window), Coding Pattern p.2 (sliding window, window types). The dry run and diagram use a different example from the notes (the notes use `[2, 1, 5, 1, 3, 2]`, k = 3).
- No disagreement with public sources. The notes give O(n) time, O(1) space and a brute force of O(n x k); the nested-loop cost is confirmed by the sliding-window-maximum page.
- Only 5 problems are listed, below the usual 6 to 12. Every other curriculum problem that uses a fixed-size window is either a loose fit or belongs to another pattern. Substring with Concatenation of All Words (`w03-pool-07`) was left out because its window steps by word length, not by one.

## pat-fast-slow

- Source pages: Coding Pattern p.3 (fast and slow pointer), Dsa Pattern Notes p.9 (linked-list pointer patterns).
- No disagreement. The notes' best case O(1), worst case O(n) and space O(1) match the public sources.
- The notes list "Circular Array Loop" among the problems. It is not in the curriculum, so it is not listed.
- `w06-d3-p2`, `w06-pool-03` and `w07-d4-p1` need the middle of a list as a step, then use another pattern for the rest. They are listed because the tell, "find the middle", applies to that step.
- The fixed-gap pointer for the n-th node from the end is not a variant here. It does not use different speeds, so the "gap changes by one" claim would not hold. It appears under Related patterns.

## pat-prefix-sum

- Source pages: Dsa Pattern Notes p.4 (prefix sum and hashing).
- No disagreement. The notes' formula `prefix[i + 1] = prefix[i] + a[i]` and range sum `prefix[r + 1] - prefix[l]` match the file. The notes give O(1) range queries and O(n) time and space for subarray counting, which the sources confirm.
- 2D range sums (`w02-pool-08`) and prefix/suffix products (`w01-d5-p1`) are left out. Both need more than a difference of two prefix totals, so the "Why it works" claim would not hold for them.
- Running Sum of 1d Array (`w01-d5-p2`) is left out: it builds the array, but asks no range question.

## pat-hashing-counting

- Source pages: hashing is not a titled section in either PDF. Coverage came from Dsa Pattern Notes p.4 ("Why hashing?"), p.17 (frequency array for anagrams) and p.18 (hash lookup O(1) average in the complexity targets).
- No disagreement. The notes say "O(1) average" for hash lookup and do not mention the O(n) worst case, hashability, or key-building cost. The file states all three.
- Isomorphic Strings, Word Pattern, Majority Element and Insert Delete GetRandom O(1) are left out as loose fits.
