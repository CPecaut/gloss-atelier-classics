# Codex Workflow

## Start a Set

```bash
npm run set:new -- \
  --id world-classics-seed \
  --source herodotus-histories,shahnameh,ovid-metamorphoses,romance-three-kingdoms \
  --chunk-percent 0.1 \
  --owner @you \
  --concurrency 4
```

The chunk percentage must be between `0.01` and `0.1`.

## Claim Work

```bash
npm run claim -- --set world-classics-seed --stage translation --count 8 --owner @you
```

The claim command writes:

- `claims/<stage>/<chunk-id>--<owner>.json`
- `claims/<stage>/<chunk-id>--<owner>.prompt.md`

Use the prompt file with Codex:

```bash
codex exec --cd "$PWD" "$(cat tracking/sets/world-classics-seed/claims/translation/<claim>.prompt.md)"
```

## Submit Output

```bash
npm run complete -- \
  --set world-classics-seed \
  --stage translation \
  --chunk herodotus-histories-0001 \
  --owner @you \
  --artifact /path/to/output.json
```

Generated output files belong under `outputs/<stage>/<chunk-id>.json`.

## Illustration Review

For each illustration chunk, submit:

- source boundary used
- character continuity notes
- final prompt
- negative prompt or exclusions
- model and command route
- image references or accepted asset paths
- reviewer status: `submitted`, `approved`, or `needs-revision`

If a reviewer dislikes the aesthetic, mark the output `needs-revision`, add a review note, and claim the same chunk in `review` or `illustration` stage.

## Scale

Start at a small limit. When reviewer decisions are mostly `approved`, scale:

```bash
npm run concurrency -- --set world-classics-seed --multiply 10
```

When an account limit is exhausted, quality drops, or source-boundary drift appears:

```bash
npm run concurrency -- --set world-classics-seed --reset
```

## Branch and PR Pattern

```bash
git checkout -b work/world-classics-seed/translation/herodotus-0001-you
npm run claim -- --set world-classics-seed --stage translation --count 1 --owner @you
# run Codex, submit output
npm run validate
git add tracking/sets/world-classics-seed
git commit -m "Add Herodotus translation chunk 0001"
git push -u origin HEAD
```

Open a pull request. CI validates catalog URLs, chunk structure, claims, and outputs.

