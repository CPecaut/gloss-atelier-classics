You are working in the Gloss Atelier repo.

Set: world-classics-seed
Stage: illustration
Claimed chunks:
- herodotus-histories-0001: Histories 0-0.1%

For each chunk:
1. Fetch the public source from the chunk sourceLocator.
2. Snap the percentage span to natural boundaries while preserving source order.
3. Produce the requested illustration deliverable without overwriting other chunks.
4. Save JSON output under tracking/sets/world-classics-seed/outputs/illustration/<chunk-id>.json.
5. Include source URL, source refs, model/command route (e.g. "grok --prompt-file ... ; /imagine"), uncertainties, and review notes.


For ILLUSTRATION stage:
- Read the chunk's promptSeed (aesthetic + focus) and any prior outputs/translation/<chunk>.json 's illustrationPromptSeed.
- Produce a refined, production-ready illustration prompt with strong character/style continuity.
- Use Grok's /imagine capability (or the imagine skill) to actually generate the image from the final prompt.
- In the output JSON artifact include: finalPrompt, imageRef (path to generated image or incoming/), continuityNotes, styleNotes, source refs.
- Save generated images under tracking/sets/world-classics-seed/incoming/ (not committed directly).
- Output a complete JSON matching previous stage artifacts.


Use account-auth CLI routes only; do not use API-key SDK calls.
Prefer grok CLI for xAI-native translation and image generation (/imagine).
Read chunk JSONs and prior stage outputs (e.g. translation for illustration) for continuity.

When running the prompt yourself:
- Translation: grok --prompt-file <this-file> --output-format json --effort max
- Illustration: grok --prompt-file <this-file> --output-format json (then use /imagine in session)