# Tracking Store

Each set lives under `tracking/sets/<set-id>/`.

- `manifest.json` describes the run, source list, chunk percent, owners, and concurrency policy.
- `chunks.jsonl` is the append-friendly chunk ledger. One JSON object per line.
- `claims/<stage>/` contains active work reservations. The validator rejects duplicate non-expired claims for the same chunk and stage.
- `outputs/<stage>/` contains reviewed or submitted generated artifacts. PRs changing the same output file naturally conflict.
- `reviews/` contains human review decisions and aesthetic revision notes.

The store is intentionally Git-native: people claim work on branches, run Codex locally, commit outputs, and open pull requests.

