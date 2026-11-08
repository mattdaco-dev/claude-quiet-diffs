# quiet-diffs

A Claude Code mod that collapses the diff shown after each file edit to a single line.

Stock Claude Code prints every edit in full, so a few edits can fill the screen and push the
conversation out of view. With this mod, an edit looks like this:

```
● Update(scripts/metrics.mjs)
  ⎿  Added 11 lines, removed 1 line (ctrl+o)
```

The file name stays in the tool header, and the counts come from the diff Claude Code already
computed. A new file shows `Created, N lines` (or `Created (empty)`), and an edit that changes
nothing shows `No change`.

Files changed by a shell command (a `sed -i`, a heredoc script) get the same treatment: the
command output stays, and the diff Claude Code appends under it becomes one line per file:

```
● Bash(python3 - <<'EOF' ...)
  ⎿  15:import { ... }
  ⎿  Updated src/components/dashboard/DashboardView.tsx, added 10 lines, removed 125 lines (ctrl+o)
```

Claude Code only shows that diff when the `bashEditDiffEnabled` setting is on (off by default;
set `"bashEditDiffEnabled": true` in `settings.json`, or `CLAUDE_CODE_BASH_EDIT_DIFF=1`) and the
changed file is in a git repository with at least one commit, since the diff comes from git.
Without it, the call stays folded into `Ran N shell commands` and the mod has nothing to do.

The full diff is still one key away: `ctrl+o` (transcript view) shows it unchanged. These keep
the stock rendering:

- failed edits, and edits staged for review;
- results where the diff is missing (it timed out, or the previous file was too large to diff);
- surfaces other than the terminal (desktop app, IDE extensions);
- notebook edits (`NotebookEdit`), which are not covered.

The mod only changes what you see. Claude still reads the full tool result, and nothing is
patched in the Claude Code binary: it uses the public mod API (`ui.render` on `ToolResult`
for the `Edit`, `Write` and `Bash` tools).

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install quiet-diffs --marketplace mattdaco-dev/claude-quiet-diffs
```

Answer `y` to add the marketplace, then pick a scope (user scope applies it to every session).

From a shell:

```
claude plugin install quiet-diffs --marketplace mattdaco-dev/claude-quiet-diffs
```

The mod only acts in the terminal, so installing it from the desktop app changes nothing there.

## Updating

```
claude plugin marketplace update claude-quiet-diffs
claude plugin update quiet-diffs@claude-quiet-diffs
```

Then restart the session.

## Uninstall

```
/plugin uninstall quiet-diffs
```

Add `--scope project` or `--scope local` if you installed it at that scope. To also forget the
marketplace:

```
/plugin marketplace remove claude-quiet-diffs
```

## Requirements

A Claude Code version with mod support (hooks modules). Mods are an early-access API and may
change between releases. Most breakages fall back to the stock rendering, but a release that
renames what the mod listens to would make it silently do nothing: if diffs show in full
again, check for an update of this repository.

## Development

Claude Code writes the API types and a `tsconfig.json` next to the mod when it loads it from a
local folder (`claude --plugin-dir <this folder>`). Both are git-ignored. Then:

```
npx -y -p typescript@5 tsc -p . --noEmit
claude plugin validate .
```

Bump `version` in `.claude-plugin/plugin.json` for every release: `claude plugin update`
compares versions and skips a release that kept the same one.

`.claude/allow-main-commits` is a marker for the author's local git hook; it does nothing for
users.

## License

MIT
