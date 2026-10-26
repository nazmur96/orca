/** The side chat's answer as a quote the user can edit before sending it to the main chat. */
export function formatSideChatHandback(reply: string): string {
  const quoted = reply
    .trim()
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n')
  return `From the side chat:\n\n${quoted}\n\n`
}
