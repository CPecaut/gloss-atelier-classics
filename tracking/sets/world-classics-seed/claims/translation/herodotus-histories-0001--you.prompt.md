You are working in the Gloss Atelier repo.

Set: world-classics-seed
Stage: translation
Claimed chunks:
- herodotus-histories-0001: Histories 0-0.1%

For each chunk:
1. Fetch the public source from the chunk sourceLocator.
2. Snap the percentage span to natural boundaries while preserving source order.
3. Produce the requested translation deliverable without overwriting other chunks.
4. Save JSON output under tracking/sets/world-classics-seed/outputs/translation/<chunk-id>.json.
5. Include source URL, source refs, model/command route, uncertainties, and review notes.

Use account-auth CLI routes only; do not use API-key SDK calls.