# Gloss Atelier

GitHub-native tracking for collaborative generation of gloss-annotated translations and illustration prompts from public classical source texts.

The seed set starts with:

- Herodotus, `Histories`
- Ferdowsi, `Shahnameh`
- Ovid, `Metamorphoses`
- Luo Guanzhong, `Romance of the Three Kingdoms`

The repository does not depend on a central job server. It uses source locators, chunk ledgers, claim files, output files, review notes, and pull requests.

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Validate data and source locators:

```bash
npm run sources:check
npm run validate
```

Claim work:

```bash
npm run claim -- --set world-classics-seed --stage illustration --count 4 --owner @you
```

Scale a stable run:

```bash
npm run concurrency -- --set world-classics-seed --multiply 10
npm run concurrency -- --set world-classics-seed --reset
```

## Current Seed

`tracking/sets/world-classics-seed` contains 4,000 planned chunks: 1,000 chunks per source, each covering 0.1% of its work.

For smaller chunks, create a new set:

```bash
npm run set:new -- \
  --id ovid-linework-005 \
  --source ovid-metamorphoses \
  --chunk-percent 0.05 \
  --owner @you \
  --concurrency 4
```

## Repo Shape

- `data/source-catalog.json` tracks public source URLs, raw source URLs, rights notes, and starter illustration aesthetics.
- `data/source-status.json` records the latest source probe.
- `tracking/sets/<set-id>/manifest.json` describes a run.
- `tracking/sets/<set-id>/chunks.jsonl` tracks chunk coverage.
- `tracking/sets/<set-id>/claims/<stage>/` reserves work.
- `tracking/sets/<set-id>/outputs/<stage>/` stores submitted artifacts.
- `tracking/sets/<set-id>/reviews/` stores human review notes.

## Collaboration Rule

Claim before generating. Submit one chunk output file per stage. Pull requests that touch the same output file will conflict visibly, and CI rejects duplicate active claims.

