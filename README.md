# quiet-diffs

A Claude Code mod that collapses the diff shown after each file edit to a single line.

Stock Claude Code prints every edit in full, so a few edits can fill the screen and push the
conversation out of view. With this mod, an edit looks like this:

```
● Update(scripts/metrics.mjs)
  ⎿ Added 11 lines, removed 1 line (ctrl+o)
```

The file name stays in the tool header, and the counts come from the diff Claude Code already
computed. A new file shows `Created, N lines`.

The full diff is still one key away: `ctrl+o` (transcript view) shows it unchanged. Failed edits
and edits staged for review also keep the stock rendering.

The mod only changes what you see. Claude still reads the full tool result, and nothing is
patched in the Claude Code binary: it uses the public mod API (`ui.render` on `ToolResult`
for the `Edit` and `Write` tools).

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

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins,
Add marketplace with `mattdaco-dev/claude-quiet-diffs`, then Add plugin.

## Uninstall

```
/plugin uninstall quiet-diffs
```

## Requirements

A Claude Code version with mod support (hooks modules). Mods are an early-access API and may
change between releases; if a release breaks the mod, Claude Code falls back to its own
rendering.

## License

MIT
