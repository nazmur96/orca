export type SuggestionPlace = { uri: string; version: number; line: number; column: number }

export type ClaudeSuggestion = SuggestionPlace & { text: string }

export function samePlace(a: SuggestionPlace, b: SuggestionPlace): boolean {
  return a.uri === b.uri && a.version === b.version && a.line === b.line && a.column === b.column
}

/** A suggestion fits only the unchanged file at the cursor it was asked for. */
export function suggestionAt(
  suggestion: ClaudeSuggestion | null,
  place: SuggestionPlace
): ClaudeSuggestion | null {
  return suggestion && samePlace(suggestion, place) ? suggestion : null
}

/** Claude often repeats the indentation already left of the cursor; ghost text must start after it. */
export function fitSuggestionToCursor(replacement: string, linePrefix: string): string {
  if (linePrefix.trim() !== '') {
    return replacement
  }
  return replacement.replace(/^[ \t]+/, '')
}
