You are working in the Gloss Atelier repo.

Set: world-classics-seed
Stage: illustration
Claimed random three-chunk sections:
- herodotus-histories-0146: Histories 14.5-14.6%
- herodotus-histories-0147: Histories 14.6-14.7%
- herodotus-histories-0148: Histories 14.7-14.8%
- shahnameh-0183: Shahnameh 18.2-18.3%
- shahnameh-0184: Shahnameh 18.3-18.4%
- shahnameh-0185: Shahnameh 18.4-18.5%
- ovid-metamorphoses-0290: Metamorphoses 28.9-29%
- ovid-metamorphoses-0291: Metamorphoses 29-29.1%
- ovid-metamorphoses-0292: Metamorphoses 29.1-29.2%
- romance-three-kingdoms-0004: Romance of the Three Kingdoms 0.3-0.4%
- romance-three-kingdoms-0005: Romance of the Three Kingdoms 0.4-0.5%
- romance-three-kingdoms-0006: Romance of the Three Kingdoms 0.5-0.6%

For each chunk:
1. Read the chunk row from tracking/sets/world-classics-seed/chunks.jsonl and fetch the public source from sourceLocator.
2. Preserve source order and do not overwrite other chunks.
3. Save JSON output under tracking/sets/world-classics-seed/outputs/illustration/<chunk-id>.json.
4. Include source URL, source refs, model/command route, uncertainties, and review notes.

For ILLUSTRATION stage:
- Treat these as companion illustration claims for the same random three-chunk sections.
- Prefer running after the translation JSON exists for the chunk; if it does not, use the chunk sourceLocator and promptSeed directly.
- Produce finalPrompt, continuityNotes, styleNotes, source refs, imageRef, uncertainties, review notes, and modelRoute.
- Use Grok /imagine or another account-auth image route; store raw generated images under tracking/sets/world-classics-seed/incoming/ and do not commit large raw batches.

Use account-auth CLI routes only; do not use API-key SDK calls.
Suggested command:
grok --prompt-file <this-file> --output-format json