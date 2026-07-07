# Repository Instructions

## Model Access

- Do not use `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, or API-key based SDK calls for model queries.
- Use account-auth command-line routes such as `codex exec`, `claude --print`, or other approved CLI exec workflows.

## Generated Assets

- Do not commit large generated image batches directly unless a maintainer asks for archival storage in Git.
- Prefer committing prompt sheets, review metadata, small proof thumbnails, and final accepted illustration references.
- Store large local runs under `tracking/sets/<set-id>/incoming/` until reviewed; this path is ignored.

## Source Texts

- The catalog tracks public source locators, not a vendored copy of every source text.
- Generated chunks should point to source URLs, CTS URNs, chapter refs, line refs, or percentage ranges so workers can refetch authoritative text.

