import type { Register } from 'claude-code'

type Hunk = { lines: string[] }
type FileResult = {
  filePath?: string
  type?: 'create' | 'update'
  content?: string
  structuredPatch?: Hunk[]
  staged?: boolean
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// Counts added and removed lines from the hunks the engine already computed.
const count = (hunks: Hunk[]) => {
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

const summary = (out: FileResult): string | null => {
  if (out.type === 'create' && typeof out.content === 'string') {
    const lines = out.content === '' ? 0 : out.content.replace(/\n$/, '').split('\n').length
    return `Created, ${plural(lines, 'line')}`
  }
  if (!Array.isArray(out.structuredPatch)) return null
  const { added, removed } = count(out.structuredPatch)
  if (added === 0 && removed === 0) return 'No change'
  return `Added ${plural(added, 'line')}, removed ${plural(removed, 'line')}`
}

export const register: Register = on => {
  for (const tool of ['Edit', 'Write']) {
    on('ui.render', { component: 'ToolResult', tool }, ($, e, next) => {
      const out = e.props.output as FileResult | undefined

      // Errors, staged edits and the ctrl+o transcript keep the engine's own rendering.
      if (e.props.isErrored || e.props.isExpanded || !out || out.staged) {
        return next(e)
      }

      const text = summary(out)
      if (text === null) return next(e)

      const { Text } = $.ui.resolve(e)
      return <Text dimColor>{text} (ctrl+o)</Text>
    })
  }
}
