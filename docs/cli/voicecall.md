---
summary: "CLI reference for `clawbot voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
---

# `clawbot voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:
- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
clawbot voicecall status --call-id <id>
clawbot voicecall call --to "+15555550123" --message "Hello" --mode notify
clawbot voicecall continue --call-id <id> --message "Any questions?"
clawbot voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
clawbot voicecall expose --mode serve
clawbot voicecall expose --mode funnel
clawbot voicecall unexpose
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.

