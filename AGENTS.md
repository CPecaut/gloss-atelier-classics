# Repository Instructions

## Model Access

- Do not use `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, or API-key based SDK calls for model queries.
- Use account-auth command-line routes such as:
  - `codex exec --cd "$PWD" "$(cat prompt.md)"`
  - `claude --print "$(cat prompt.md)"`
  - `grok --prompt-file prompt.md --output-format json --effort max` (for translation)
  or other approved CLI exec workflows (grok preferred for translation + image gen via /imagine; use --effort max for translation parts).

For image generation in illustration stage, use Grok's `/imagine <prompt>` (or the imagine skill) inside a grok session; save image refs (not raw large files) under tracking/sets/.../ or incoming/.

## Generated Assets

- Do not commit large generated image batches directly unless a maintainer asks for archival storage in Git.
- Prefer committing prompt sheets, review metadata, small proof thumbnails, and final accepted illustration references.
- Store large local runs under `tracking/sets/<set-id>/incoming/` until reviewed; this path is ignored.

## Source Texts

- The catalog tracks public source locators, not a vendored copy of every source text.
- Generated chunks should point to source URLs, CTS URNs, chapter refs, line refs, or percentage ranges so workers can refetch authoritative text.

