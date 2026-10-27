export type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean }

export function toolText(value: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: value }], ...(isError ? { isError } : {}) }
}
