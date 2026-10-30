const MAX_CELLS = 4_000_000

function linesOf(text: string | null): string[] {
  return text === null || text === '' ? [] : text.replace(/\n$/, '').split('\n')
}

/** Lines Claude added or changed (1-based, current file) and the lines after which it removed some. */
export function claudeChangedLines(
  before: string | null,
  current: string
): { added: number[]; removedAfter: number[] } | null {
  const a = linesOf(before)
  const b = linesOf(current)
  if (a.length * b.length > MAX_CELLS) {
    return null
  }
  // Longest-common-subsequence table, filled from the end so the walk below goes forwards.
  const width = b.length + 1
  const table = new Uint32Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i] === b[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1])
    }
  }
  const added: number[] = []
  const removedAfter: number[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i += 1
      j += 1
    } else if (
      j < b.length &&
      (i >= a.length || table[i * width + j + 1] > table[(i + 1) * width + j])
    ) {
      added.push(j + 1)
      j += 1
    } else {
      if (removedAfter.at(-1) !== j) {
        removedAfter.push(j)
      }
      i += 1
    }
  }
  return { added, removedAfter }
}
