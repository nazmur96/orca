# Phase 2 — Side chat

Fork: `nazmur96/orca`, branch `claude-first`. Date: 2026-10-26. Status: approved in chat.

## Goal

Ask questions about the current Claude chat without touching it: a side chat
opens in a split to the right, already knows the whole conversation, takes any
number of follow-ups, and can hand its answer back to the main chat.

## Behaviour

- **Open**: `Ctrl+;` while a Claude chat pane is focused, or the **Side chat**
  button in that chat's pane header.
- **What it is**: an unowned copy of the current conversation, resumed as a new structured Claude chat in a new
  split group to the right of the source chat (`createEmptySplitGroup`). The
  main thread never sees side-chat messages.
- **Label**: the tab is named `Side chat · <main chat name>`.
- **Starts in Ask for approval**: local launches ignore seed options, so the
  side chat's composer switches its own mode to `ask` once its options load
  (`useSideChatAskMode`). Hard read-only is deferred.
- **Hand to main agent**: a header button on side chats. It quotes the side
  chat's last assistant reply into the main chat's composer draft
  (`appendToNativeChatComposerDraft`) and activates the main chat tab. The user
  sends it.
- **Close**: an ordinary tab; closing it removes the split.
- Editor-context chip (Phase 1) works in side chats unchanged.

## Out of scope

- Right-click on a file → side chat (a side chat forks a chat; select code and
  press `Ctrl+;` instead).
- Hard read-only mode; persisting the side→main link across restarts (after a
  restart a side chat is a normal chat without the hand-back button).

## Code

New module `src/renderer/src/fork/side-chat/`:

- `side-chat-registry.ts` — in-memory link: side session id → main tab/session.
- `side-chat-handback.ts` — pure quote formatter + hand-back action.
- `open-side-chat.ts` — fork, split, launch, label, link; cleans up on failure.
- `SideChatHeaderButtons.tsx` — the two header buttons + `Ctrl+;` while the
  pane is focused.

Main process (implementation finding): upstream has no chat-to-chat fork for
Claude. `copyConversation` is added to the Claude adapter
(`claude-conversation-copy.ts`, SDK `forkSession` via the rewind code's
`forkClaudeTranscript`), and `aiVault:copyChatForSideChat`
(`src/main/fork/side-chat-conversation-copy.ts`) copies a local Claude chat
through `copyStructuredChatRecordConversation`. The upstream
`agentForksThroughChat` list is untouched, so "Resume in New Terminal" is
unchanged.

Upstream call sites: `NativeChatPaneHeader.tsx` (render the buttons), keybinding
`chat.openSideChat` (`Mod+;`, scope chat) in `definitions-core-4.ts` + `types.ts`.

## Testing

Unit: registry link/unlink, hand-back quote format, side-chat label.
Prove it (dev app): ask the main chat something; open a side chat; ask "what
did we just discuss?" → it knows; main transcript unchanged; side chat mode
pill = Ask for approval; Hand to main agent → quote in main composer.
