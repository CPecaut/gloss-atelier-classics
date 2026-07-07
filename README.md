# Gloss Atelier

**🌍 Public site:** [https://speakreading.com/library](https://speakreading.com/library)

GitHub-native tracking for collaborative generation of gloss-annotated translations and illustrations from public classical source texts.

The public viewer features a horizontal gallery of recent illustrations and interactive bilingual reader modules (with auto-play).

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

The default view when running locally (`npm run dev`) is the **public Library viewer**. It shows a gallery of recent illustrations, published outputs (source + literal/reader translations + glosses), and interactive bilingual modules (images + auto-play).

The original production controls ("Atelier" mode) are available via the link in the header.

Open the local URL printed by Vite.

Live site: https://speakreading.com/library/

Validate data and source locators:

```bash
npm run sources:check
npm run validate
```

Claim work (Grok is recommended):

```bash
npm run claim -- --set world-classics-seed --stage translation --count 1 --owner @you

# Run with max effort for translation:
grok --prompt-file tracking/sets/world-classics-seed/claims/translation/<claim>.prompt.md --output-format json --effort max

# For illustration (after claiming the stage):
grok --prompt-file tracking/sets/world-classics-seed/claims/illustration/<claim>.prompt.md --output-format json
# Inside Grok, use `/imagine <prompt>` to generate the image.
```

Use `--effort max` for translation work. Images go into `tracking/sets/.../incoming/` (gitignored).

Scale a stable run:

```bash
npm run concurrency -- --set world-classics-seed --multiply 10
npm run concurrency -- --set world-classics-seed --reset
```

## Current Seed

`tracking/sets/world-classics-seed` contains 4,000 planned chunks: 1,000 chunks per source, each covering 0.1% of its work.

The public site displays completed translations, glosses, and generated illustrations (horizontal gallery + bilingual viewer modules with auto-play).

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
