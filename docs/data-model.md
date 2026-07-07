# Data Model

## Source

Stored in `data/source-catalog.json`.

Required fields:

- `id`
- `title`
- `originalTitle`
- `author`
- `language`
- `primaryUrl`
- `rawUrl`
- `rightsNote`
- `sourceRefs.unitPattern`
- `starterAesthetic`

## Set Manifest

Stored in `tracking/sets/<set-id>/manifest.json`.

Important fields:

- `id`
- `sourceIds`
- `chunkPercent`
- `chunkCount`
- `stages`
- `concurrency`

## Chunk

Stored as one JSON object per line in `chunks.jsonl`.

Important fields:

- `id`
- `sourceId`
- `coverage.startPercent`
- `coverage.endPercent`
- `sourceLocator`
- `deliverables`
- `promptSeed`

Chunks use percentage coverage so very large works can be planned before exact text-boundary parsing. Workers must snap to natural boundaries in source order and record the exact refs they used in the output artifact.

## Claim

Stored in `claims/<stage>/<chunk-id>--<owner>.json`.

Important fields:

- `chunkId`
- `stage`
- `owner`
- `status`
- `claimedAt`
- `expiresAt`
- `branchHint`

Only one non-expired active claim per `stage:chunkId` is valid.

## Output

Stored in `outputs/<stage>/<chunk-id>.json`.

Required fields:

- `setId`
- `chunkId`
- `stage`
- `owner`
- `status`
- `submittedAt`
- `artifact`

Artifacts may be translations, gloss tables, image prompts, review notes, or references to generated image files.

