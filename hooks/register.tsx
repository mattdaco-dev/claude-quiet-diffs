import type { Register } from 'claude-code'

type Hunk = { lines: string[] }
type FileResult = {
  type?: 'create' | 'update'
  content?: string
  originalFile?: string | null
  oldString?: string
  newString?: string
  structuredPatch?: Hunk[]
  gitDiff?: { additions?: number; deletions?: number }
  staged?: boolean
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const counts = (added: number, removed: number) =>
  `Added ${plural(added, 'line')}, removed ${plural(removed, 'line')}`

// Counts added and removed lines from the hunks the engine already computed.
const countHunks = (hunks: Hunk[]) => {
  let added = 0
  let removed = 0
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.startsWith('+')) added += 1
      else if (line.startsWith('-')) removed += 1
    }
  }
  return { added, removed }
}

// The one-line summary, or null when the result does not prove what changed:
// the caller then keeps the stock rendering.
const summary = (out: FileResult): string | null => {
  if (out.type === 'create' && typeof out.content === 'string') {
    if (out.content === '') return 'Created (empty)'
    return `Created, ${plural(out.content.replace(/\n$/, '').split('\n').length, 'line')}`
  }
  if (!Array.isArray(out.structuredPatch)) return null

  if (out.structuredPatch.length > 0) {
    const { added, removed } = countHunks(out.structuredPatch)
    return counts(added, removed)
  }

  // An empty patch also means the diff timed out or the old file was too large:
  // only call it unchanged when the content proves it.
  const unchanged =
    (typeof out.content === 'string' && out.originalFile === out.content) ||
    (typeof out.oldString === 'string' && out.oldString === out.newString)
  if (unchanged) return 'No change'

  const git = out.gitDiff
  if (git && typeof git.additions === 'number' && typeof git.deletions === 'number') {
    return counts(git.additions, git.deletions)
  }
  return null
}

export const register: Register = on => {
  on(
    'ui.render',
    { component: 'ToolResult', props: { tool: ['Edit', 'Write'] } },
    ($, e, next) => {
      // Only the terminal is known to offer ctrl+o to expand the full diff.
      if (e.surface !== 'terminal') return next(e)

      const out = e.props.output as FileResult | undefined

      // Errors, staged edits and the ctrl+o transcript keep the engine's own rendering.
      if (e.props.isErrored || e.props.isExpanded || !out || out.staged) {
        return next(e)
      }

      const text = summary(out)
      if (text === null) return next(e)

      const { Text } = $.ui.resolve(e)
      return <Text dimColor>{text} (ctrl+o)</Text>
    },
  )
}
