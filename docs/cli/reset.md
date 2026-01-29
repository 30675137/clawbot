---
summary: "CLI reference for `clawbot reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
---

# `clawbot reset`

Reset local config/state (keeps the CLI installed).

```bash
clawbot reset
clawbot reset --dry-run
clawbot reset --scope config+creds+sessions --yes --non-interactive
```

