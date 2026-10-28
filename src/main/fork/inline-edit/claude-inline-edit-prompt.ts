export type InlineEditRequest = {
  instruction: string
  filePath: string
  language: string
  selection: string
  /** Text before and after the selection in the file; trimmed to a window here. */
  before: string
  after: string
}

const CONTEXT_LINES = 60

function lastLines(text: string, count: number): string {
  return text.split('\n').slice(-count).join('\n')
}

function firstLines(text: string, count: number): string {
  return text.split('\n').slice(0, count).join('\n')
}

export function buildInlineEditPrompt(request: InlineEditRequest): string {
  return [
    'You edit code inline in an IDE. Rewrite the code between <selection> tags following the instruction.',
    'Keep the surrounding style and indentation. Do not change code outside the selection.',
    'Reply with ONLY the replacement for the selection inside <replacement></replacement> tags.',
    '',
    `File: ${request.filePath} (${request.language})`,
    `Instruction: ${request.instruction}`,
    '',
    '<before>',
    lastLines(request.before, CONTEXT_LINES),
    '</before>',
    '<selection>',
    request.selection,
    '</selection>',
    '<after>',
    firstLines(request.after, CONTEXT_LINES),
    '</after>'
  ].join('\n')
}

export function parseInlineEditReplacement(output: string): string | null {
  const match = /<replacement>([\s\S]*?)<\/replacement>/.exec(output)
  return match ? match[1].replace(/^\n/, '').replace(/\n$/, '') : null
}
