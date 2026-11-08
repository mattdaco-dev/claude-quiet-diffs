import type { Register } from 'claude-code'

type Hunk = { lines: string[] }
type FileResult = {
  type?: 'create' | 'update'
  content?: string
  originalFile?: string | null
  oldString?: string
  newString?: string
  structuredPatch?: Hunk[]
  staged?: boolean
}

type BashEditFile = { filePath: string; hunks: Hunk[]; created?: true; deleted?: true }
type BashResult = {
  stdout?: string
  stderr?: string
  interrupted?: boolean
  bashEditDiff?: { files: BashEditFile[]; moreFiles: number }
  [key: string]: unknown
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
  return unchanged ? 'No change' : null
}

// Shows a path relative to the session directory when it lies inside it, like the stock row.
const shortPath = (filePath: string, cwd: string) =>
  filePath.startsWith(`${cwd}/`) ? filePath.slice(cwd.length + 1) : filePath

// One summary line per file a shell command changed.
const bashLines = (diff: NonNullable<BashResult['bashEditDiff']>, cwd: string) => {
  const lines = diff.files.map(file => {
    const path = shortPath(file.filePath, cwd)
    const { added, removed } = countHunks(file.hunks)
    if (file.deleted) return `Deleted ${path}`
    if (file.created) return `Created ${path}, ${plural(added, 'line')}`
    return `Updated ${path}, ${counts(added, removed).toLowerCase()}`
  })
  if (diff.moreFiles > 0) lines.push(`and ${plural(diff.moreFiles, 'more file')}`)
  return lines
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
      // The stock block draws its own corner and indent, so the replacement does too.
      return <Text dimColor>{`  ⎿  ${text} (ctrl+o)`}</Text>
    },
  )

  on(
    'ui.render',
    { component: 'ToolResult', props: { tool: 'Bash' } },
    async ($, e, next) => {
      if (e.surface !== 'terminal') return next(e)

      const out = e.props.output as BashResult | undefined
      const diff = out?.bashEditDiff
      if (e.props.isErrored || e.props.isExpanded || !out || !diff || !Array.isArray(diff.files)) {
        return next(e)
      }
      if (diff.files.length === 0) return next(e)

      const { bashEditDiff: _dropped, ...rest } = out
      const lines = bashLines(diff, await $.session.cwd())
      const { Box, Text } = $.ui.resolve(e)
      const summaryRows = lines.map((line, i) => (
        <Text key={String(i)} dimColor>{`  ⎿  ${line}${i === 0 ? ' (ctrl+o)' : ''}`}</Text>
      ))

      // A command whose only effect was the edit: the summary alone, no "(No output)" row.
      const silent = !rest.stdout?.trim() && !rest.stderr?.trim() && !rest.interrupted
      if (silent) return <Box flexDirection="column">{summaryRows}</Box>

      // The engine still draws the command output; only the diff is left out.
      const stock = await next({ ...e, props: { ...e.props, output: rest } })
      return (
        <Box flexDirection="column">
          {stock}
          {summaryRows}
        </Box>
      )
    },
  )
}
