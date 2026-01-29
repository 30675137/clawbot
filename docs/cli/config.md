---
summary: "CLI reference for `clawbot config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
---

# `clawbot config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `clawbot configure`).

## Examples

```bash
clawbot config get browser.executablePath
clawbot config set browser.executablePath "/usr/bin/google-chrome"
clawbot config set agents.defaults.heartbeat.every "2h"
clawbot config set agents.list[0].tools.exec.node "node-id-or-name"
clawbot config unset tools.web.search.apiKey
```

## Paths

Paths use dot or bracket notation:

```bash
clawbot config get agents.defaults.workspace
clawbot config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
clawbot config get agents.list
clawbot config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--json` to require JSON5 parsing.

```bash
clawbot config set agents.defaults.heartbeat.every "0m"
clawbot config set gateway.port 19001 --json
clawbot config set channels.whatsapp.groups '["*"]' --json
```

Restart the gateway after edits.
