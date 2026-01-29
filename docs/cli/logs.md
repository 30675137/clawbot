---
summary: "CLI reference for `clawbot logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
---

# `clawbot logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:
- Logging overview: [Logging](/logging)

## Examples

```bash
clawbot logs
clawbot logs --follow
clawbot logs --json
clawbot logs --limit 500
```

