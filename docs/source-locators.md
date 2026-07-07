# Source Locators

Last checked: see `data/source-status.json`.

## Herodotus, Histories

- Source page: `https://scaife.perseus.org/library/urn:cts:greekLit:tlg0016/`
- Raw TEI: `https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0016/tlg001/tlg0016.tlg001.perseus-grc2.xml`
- CTS URN: `urn:cts:greekLit:tlg0016.tlg001.perseus-grc2`
- Unit pattern: `book.chapter.section`
- Rights note: ancient original is public domain; Perseus canonical repository is CC BY-SA 4.0.

## Ferdowsi, Shahnameh

- Source page: `https://ganjoor.net/ferdousi/shahname`
- Project repository root: `https://github.com/ganjoor`
- Unit pattern: `king/reign/story/couplet`
- Rights note: Persian original is public domain; Ganjoor describes its database as public domain/open source.

## Ovid, Metamorphoses

- Source page: `https://scaife.perseus.org/library/urn:cts:latinLit:phi0959.phi006/`
- Raw TEI: `https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0959/phi006/phi0959.phi006.perseus-lat2.xml`
- CTS URN: `urn:cts:latinLit:phi0959.phi006.perseus-lat2`
- Unit pattern: `book.line`
- Rights note: Latin original is public domain; Perseus canonical repository is CC BY-SA 4.0.

## Luo Guanzhong, Romance of the Three Kingdoms

- Project Gutenberg record: `https://www.gutenberg.org/ebooks/23950`
- Raw text: `https://www.gutenberg.org/files/23950/23950-0.txt`
- CText reference: `https://ctext.org/sanguo-yanyi`
- Unit pattern: `chapter/paragraph`
- Rights note: Project Gutenberg identifies the text as public domain in the USA; CText is used as an open-access reference surface.

## Adding a Source

1. Add an entry to `data/source-catalog.json`.
2. Include a browse URL, a raw URL when available, source reference pattern, and rights note.
3. Run `npm run sources:check`.
4. Create a set with `npm run set:new -- --source <source-id> --chunk-percent 0.1`.
5. Open a pull request.

