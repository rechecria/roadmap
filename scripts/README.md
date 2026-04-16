# roadMap scripts

## codex-bridge.mjs (AI bridge)

Local HTTP bridge that lets the roadMap webapp talk to **CLI-based AI agents** installed on your machine. Supports:

- **OpenAI Codex CLI** (`codex exec <prompt>`)
- **Claude Code CLI** (`claude -p <prompt>`)

### Why a bridge?

roadMap runs on Vercel. Vercel's serverless environment cannot access your local CLIs. This bridge runs on your machine, listens on `localhost:4567`, and the webapp in your browser calls it directly via CORS.

### Prerequisites

At least one of:

- OpenAI Codex CLI authenticated: `codex --version`
- Claude Code CLI authenticated: `claude --version`

Plus Node.js 20+ (the project already requires it).

### Start the bridge

From the `roadmap/` directory:

```bash
node scripts/codex-bridge.mjs
```

You'll see which CLIs were detected:

```
╔════════════════════════════════════════════════════════╗
║  roadMap AI bridge is running                          ║
║  Listening:   http://localhost:4567                    ║
║  Providers detected:                                   ║
║    ✓ codex          (codex)                            ║
║    ✓ claude-code    (claude)                           ║
╚════════════════════════════════════════════════════════╝
```

### How the webapp uses it

Open any task in roadMap. The `Execução com IA` panel header has a provider selector with three options:

| Button | When it works |
|--------|---------------|
| **Codex** (green) | Bridge running + `codex` CLI installed |
| **Claude Code** (orange) | Bridge running + `claude` CLI installed |
| **Claude ☁** (blue) | Always — uses Anthropic API via Vercel route (needs `ANTHROPIC_API_KEY` in Vercel) |

The panel auto-selects the best available provider on load and re-checks bridge health every 15 seconds. Messages include the provider in their `metadata` for audit.

### Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4567` | HTTP port |
| `CODEX_BIN` | `codex` | Path to OpenAI Codex binary |
| `CODEX_ARGS` | `exec` | Subcommand before prompt |
| `CLAUDE_BIN` | `claude` | Path to Claude Code binary |
| `CLAUDE_ARGS` | `-p` | Flags before prompt (use `-p` for print mode) |
| `ALLOWED_ORIGINS` | `https://roadmap-found-ctx.vercel.app,http://localhost:3000,http://localhost:3001` | CORS whitelist |
| `TIMEOUT_MS` | `180000` | Max time waiting for CLI output (3 min) |

Examples:

```bash
# Absolute paths
CODEX_BIN=/usr/local/bin/codex CLAUDE_BIN=/opt/homebrew/bin/claude node scripts/codex-bridge.mjs

# Increase timeout for long generations
TIMEOUT_MS=600000 node scripts/codex-bridge.mjs

# Allow any origin (not recommended)
ALLOWED_ORIGINS="*" node scripts/codex-bridge.mjs
```

### Security

- Binds to `127.0.0.1` only — not reachable from the network
- CORS-restricted to the Vercel domain + localhost
- Only accepts `POST /execute` and `GET /health`
- Spawns CLIs directly (no shell interpolation)

### Troubleshooting

- **Provider button greyed out** → CLI not on PATH; install or set env var
- **Bridge not detected in browser** → curl `http://localhost:4567/health` to verify; check origin in `ALLOWED_ORIGINS`
- **CLI hangs** → increase `TIMEOUT_MS`; verify CLI is in non-interactive mode (`codex exec` or `claude -p`)
- **CORS blocked** → browser blocks HTTP to localhost when on HTTPS; most modern browsers allow it by default, but if blocked, run bridge on https or use a browser flag
