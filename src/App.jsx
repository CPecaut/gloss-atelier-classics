import {
  BookOpen,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Eye,
  Gauge,
  GitBranch,
  Globe,
  Image as ImageIcon,
  Languages,
  RefreshCcw,
  Rocket,
  Search,
  SlidersHorizontal,
  XCircle
} from "lucide-react";
import catalog from "../data/source-catalog.json";
import sourceStatus from "../data/source-status.json";
import outputsIndex from "../data/outputs-index.json";
import manifest from "../tracking/sets/world-classics-seed/manifest.json";
import sampleTranslation from "../tracking/sets/world-classics-seed/outputs/translation/herodotus-histories-0001.json";
import sampleIllustration from "../tracking/sets/world-classics-seed/outputs/illustration/herodotus-histories-0001.json";
import herodotusIllustration from "../tracking/sets/world-classics-seed/incoming/herodotus-histories-0001-illustration.jpg";
import { useEffect, useMemo, useRef, useState } from "react";

const stages = ["translation", "gloss", "illustration", "review"];

const statusPattern = [
  "open",
  "claimed",
  "running",
  "review",
  "approved",
  "needs-revision",
  "approved",
  "open"
];

function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });
  const update = (next) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      localStorage.setItem(key, JSON.stringify(resolved));
      return resolved;
    });
  };
  return [value, update];
}

function makeSampleQueue(sources, stage) {
  return sources.flatMap((source, sourceIndex) =>
    Array.from({ length: 5 }, (_, index) => {
      const ordinal = sourceIndex * 5 + index;
      return {
        id: `${source.id}-${String(index + 1).padStart(4, "0")}`,
        sourceId: source.id,
        title: source.title,
        originalTitle: source.originalTitle,
        language: source.language,
        stage,
        status: statusPattern[ordinal % statusPattern.length],
        owner: ordinal % 3 === 0 ? "@maya" : ordinal % 3 === 1 ? "@lin" : "@samir",
        coverage: `${(index * 0.1).toFixed(1)}-${((index + 1) * 0.1).toFixed(1)}%`,
        prompt: `${source.starterAesthetic} Focus: ${source.promptFocus.slice(0, 3).join(", ")}.`
      };
    })
  );
}

function getSourceStatus(sourceId) {
  return sourceStatus.sources.find((source) => source.id === sourceId);
}

// ---- Public World Library helpers & components ----

function getCompletedForSet(setId) {
  const set = outputsIndex.sets?.[setId] || { outputs: {} };
  const completed = {};
  for (const [stage, ids] of Object.entries(set.outputs || {})) {
    completed[stage] = new Set(ids);
  }
  return completed;
}

function countBySource(completedSet, stage) {
  const counts = {};
  const ids = Array.from(completedSet[stage] || []);
  for (const id of ids) {
    // chunk ids are like "herodotus-histories-0001"
    const src = id.split("-").slice(0, -1).join("-");
    counts[src] = (counts[src] || 0) + 1;
  }
  return counts;
}

function getChunksForSource(_sourceId) {
  // Deprecated: chunks are loaded via state + fetch in the viewer. Kept for compatibility.
  return [];
}

function formatCoverage(cov) {
  if (!cov) return "";
  if (typeof cov === "string") return cov;
  if (!Number.isFinite(cov.startPercent) || !Number.isFinite(cov.endPercent)) return "";
  return `${cov.startPercent.toFixed(1)}–${cov.endPercent.toFixed(1)}%`;
}

function formatBoundary(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.startRef && value.endRef) return `${value.startRef}-${value.endRef}`;
  if (Number.isFinite(value.startPercent) && Number.isFinite(value.endPercent)) {
    return `${value.startPercent}-${value.endPercent}%`;
  }
  return "";
}

function rowsToText(rows, key) {
  if (!Array.isArray(rows)) return "";
  return rows.map((row) => `${row.ref ? `${row.ref}: ` : ""}${row[key] ?? ""}`).join("\n\n");
}

function modelRouteText(route) {
  if (!route) return "";
  if (typeof route === "string") return route;
  return Object.entries(route)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}

function ArtifactViewer({ output }) {
  if (!output || !output.artifact) return <div className="artifact-empty">No artifact loaded.</div>;
  const art = output.artifact;
  const src = art.source || {};
  const ill = art.illustrationPromptSeed || {};
  const boundary = formatBoundary(src.actualBoundary) || formatBoundary(src.plannedCoverage);
  const sourceExcerpt = art.sourceExcerpt || rowsToText(art.sourceExcerptReferences, "greek");
  const readerTranslation =
    art.readerTranslation || art.combinedReaderTranslation || rowsToText(art.readerTranslations, "translation");
  const literalTranslation =
    art.literalTranslation || rowsToText(art.literalTranslations, "translation");

  return (
    <div className="artifact-viewer">
      <div className="art-meta">
        <span className="art-chip">{output.chunkId}</span>
        {boundary && <span className="art-chip">{boundary}</span>}
        <a href={src.browseUrl} target="_blank" rel="noreferrer" className="art-link">
          source <ExternalLink size={14} />
        </a>
      </div>

      <section className="art-section source-excerpt">
        <h4>Source</h4>
        <p className="greek-text">{sourceExcerpt}</p>
        <div className="cite">
          {src.work} · {src.ctsUrn} · <span className="muted">{boundary}</span>
        </div>
      </section>

      <section className="art-section reader">
        <h4>Reader translation</h4>
        <p className="reader-text">{readerTranslation}</p>
      </section>

      <section className="art-section literal">
        <h4>Literal translation</h4>
        <p className="literal-text">{literalTranslation}</p>
      </section>

      <section className="art-section gloss">
        <h4>Gloss</h4>
        <div className="gloss-grid">
          {art.glosses?.map((g, i) => (
            <div key={i} className="gloss-entry">
              <div className="greek">{g.greek}</div>
              <div className="lemma">{g.lemma}</div>
              <div className="gloss">{g.gloss}</div>
              <div className="morph">{g.morphology}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="art-section prompt">
        <h4>Illustration prompt seed</h4>
        <div className="prompt-box">
          <p><strong>Style:</strong> {ill.style}</p>
          <p>{ill.prompt}</p>
          {ill.continuityNotes?.length > 0 && (
            <ul>
              {ill.continuityNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {art.uncertainties && art.uncertainties.length > 0 && (
        <section className="art-section notes">
          <h4>Notes &amp; uncertainties</h4>
          <ul>
            {art.uncertainties.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="art-footer">
        <span>Submitted {new Date(output.submittedAt).toLocaleDateString()}</span>
        <span>by {output.owner}</span>
        <span className="muted">{modelRouteText(art.modelRoute)}</span>
      </div>
    </div>
  );
}

function WorkCard({ source, completed, onExplore }) {
  const perSource = countBySource(completed, "translation");
  const transDone = perSource[source.id] || 0;
  const totalPlanned = 1000; // from manifest for seed (4000/4)
  const pct = Math.round((transDone / totalPlanned) * 1000) / 10; // show as 0.x %

  return (
    <article className="work-card">
      <div className="work-head">
        <div>
          <h3>{source.title}</h3>
          <div className="orig">{source.originalTitle}</div>
        </div>
        <span className="lang">{source.language}</span>
      </div>
      <p className="work-author">{source.author} · {source.period}</p>

      <div className="progress-row">
        <div className="progress-label">Translation</div>
        <div className="progress-bar"><div style={{ width: `${Math.min(100, (transDone / totalPlanned) * 100)}%` }} /></div>
        <div className="progress-num">{transDone} / {totalPlanned} chunks</div>
      </div>

      <div className="work-meta">
        <span>{source.sourceFamily}</span>
      </div>

      <div className="work-actions">
        <button onClick={() => onExplore(source)} className="primary">
          <BookOpen size={16} /> Browse outputs
        </button>
        <a href={source.primaryUrl} target="_blank" rel="noreferrer">
          View source <ExternalLink size={14} />
        </a>
      </div>
    </article>
  );
}

function ChunkList({ chunks, completed, onSelectChunk, selectedId }) {
  const [filter, setFilter] = useState("");
  const filtered = chunks.filter((c) =>
    !filter || c.id.toLowerCase().includes(filter.toLowerCase()) || formatCoverage(c.coverage).includes(filter)
  ).slice(0, 60); // limit for perf

  return (
    <div className="chunk-browser">
      <div className="browser-head">
        <div className="panel-title"><Search size={17} /><h3>Chunks</h3></div>
        <input
          className="filter-input"
          placeholder="Filter by id or range…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="chunk-list">
        {filtered.map((c) => {
          const hasTrans = completed.translation?.has(c.id);
          const hasIllus = completed.illustration?.has(c.id);
          const isDone = hasTrans || hasIllus;
          const statusText = hasTrans && hasIllus ? "ready" : hasIllus ? "illust." : hasTrans ? "ready" : "open";
          return (
            <button
              key={c.id}
              className={`chunk-row ${c.id === selectedId ? "active" : ""} ${isDone ? "done" : ""}`}
              onClick={() => onSelectChunk(c)}
            >
              <span className="cid">{c.id}</span>
              <span className="cov">{formatCoverage(c.coverage)}</span>
              <span className={`cstatus ${isDone ? "done" : "open"}`}>{statusText}</span>
            </button>
          );
        })}
        {chunks.length > 60 && <div className="more-note">Showing first 60 matches. Use filter to narrow.</div>}
      </div>
    </div>
  );
}

function statusLabel(status) {
  return status.replace("-", " ");
}

function commandFor({ selectedSources, chunkPercent, concurrency, stage }) {
  const sourceArg = selectedSources.join(",");
  return [
    `npm run set:new -- --id world-classics-seed --source ${sourceArg} --chunk-percent ${chunkPercent} --owner @you --concurrency ${concurrency}`,
    `npm run claim -- --set world-classics-seed --stage ${stage} --count ${concurrency} --owner @you`,
    `codex exec --cd "$PWD" "$(cat tracking/sets/world-classics-seed/claims/${stage}/<claim>.prompt.md)"`,
    `npm run concurrency -- --set world-classics-seed --multiply 10`,
    `npm run concurrency -- --set world-classics-seed --reset`
  ].join("\n");
}

function SourceCard({ source, selected, onToggle }) {
  const status = getSourceStatus(source.id);
  return (
    <article className={`source-card ${selected ? "selected" : ""}`}>
      <div className="source-card__head">
        <button className="select-button" type="button" onClick={() => onToggle(source.id)}>
          {selected ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>{selected ? "Selected" : "Skip"}</span>
        </button>
        <span className={`probe ${status?.ok ? "ok" : "warn"}`}>{status?.ok ? "online" : "check"}</span>
      </div>
      <h3>{source.title}</h3>
      <p className="original">{source.originalTitle}</p>
      <dl>
        <div>
          <dt>Language</dt>
          <dd>{source.language}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{source.sourceFamily}</dd>
        </div>
      </dl>
      <div className="link-row">
        <a href={source.primaryUrl} target="_blank" rel="noreferrer">
          browse
        </a>
        <a href={source.rawUrl} target="_blank" rel="noreferrer">
          raw
        </a>
      </div>
    </article>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="metric">
      <Icon size={18} />
      <div>
        <span>{value}</span>
        <p>{label}</p>
      </div>
    </div>
  );
}

function QueueTable({ queue, onSelect, activeId }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Chunk</th>
            <th>Source</th>
            <th>Coverage</th>
            <th>Owner</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((item) => (
            <tr
              key={item.id}
              className={item.id === activeId ? "active-row" : ""}
              onClick={() => onSelect(item)}
            >
              <td>{item.id}</td>
              <td>{item.title}</td>
              <td>{item.coverage}</td>
              <td>{item.owner}</td>
              <td>
                <span className={`status ${item.status}`}>{statusLabel(item.status)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewPanel({ chunk, decisions, setDecisions }) {
  const decision = decisions[chunk.id] ?? "pending";
  const setDecision = (next) =>
    setDecisions((current) => ({
      ...current,
      [chunk.id]: next
    }));

  return (
    <section className="review-panel">
      <div className="panel-title">
        <Eye size={19} />
        <h2>Review</h2>
      </div>
      <div className="image-proof">
        <div className="proof-script">{chunk.originalTitle}</div>
        <div className="proof-mark">{chunk.coverage}</div>
      </div>
      <div className="review-meta">
        <span>{chunk.id}</span>
        <span>{chunk.language}</span>
        <span className={`decision ${decision}`}>{statusLabel(decision)}</span>
      </div>
      <p className="prompt-text">{chunk.prompt}</p>
      <div className="button-row">
        <button type="button" onClick={() => setDecision("approved")}>
          <CheckCircle2 size={17} />
          Approve
        </button>
        <button type="button" onClick={() => setDecision("needs-revision")}>
          <SlidersHorizontal size={17} />
          Revise aesthetic
        </button>
        <button type="button" onClick={() => setDecision("blocked")}>
          <XCircle size={17} />
          Stop
        </button>
      </div>
    </section>
  );
}

function App() {
  const [mode, setMode] = useState("viewer"); // "viewer" | "atelier"

  // Atelier state (preserved)
  const [selectedSources, setSelectedSources] = useStoredState(
    "gloss-atelier:selected-sources",
    catalog.sources.map((source) => source.id)
  );
  const [stage, setStage] = useStoredState("gloss-atelier:stage", "illustration");
  const [chunkPercent, setChunkPercent] = useStoredState("gloss-atelier:chunk-percent", "0.1");
  const [concurrency, setConcurrency] = useStoredState("gloss-atelier:concurrency", 4);
  const [decisions, setDecisions] = useStoredState("gloss-atelier:decisions", {});

  const selectedSourceObjects = catalog.sources.filter((source) => selectedSources.includes(source.id));
  const queue = useMemo(() => makeSampleQueue(selectedSourceObjects, stage), [selectedSourceObjects, stage]);
  const [activeChunk, setActiveChunk] = useState(queue[0]);
  const displayedChunk = queue.find((item) => item.id === activeChunk?.id) ?? queue[0];
  const displayedSource = catalog.sources.find((source) => source.id === displayedChunk?.sourceId);

  const metrics = useMemo(() => {
    const counts = Object.fromEntries(statusPattern.map((status) => [status, 0]));
    for (const item of queue) counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, [queue]);

  const command = commandFor({ selectedSources, chunkPercent, concurrency, stage });

  const toggleSource = (id) => {
    setSelectedSources((current) =>
      current.includes(id) ? current.filter((sourceId) => sourceId !== id) : [...current, id]
    );
  };

  const copyCommand = async () => {
    await navigator.clipboard.writeText(command);
  };

  // ---- World Library public viewer state ----
  const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
  const asset = (p) => `${BASE_URL}${p}`.replace(/\/+/g, '/');
  const completed = useMemo(() => getCompletedForSet(manifest.id), []);
  const recentIllustrations = useMemo(() => {
    const items = [];
    if (completed.illustration?.has("herodotus-histories-0001")) {
      items.push({
        id: "herodotus-histories-0001",
        title: "Herodotus • Histories 1.1",
        image: herodotusIllustration,
      });
    }
    // TODO: dynamically discover more from outputs-index + illustration outputs
    return items;
  }, [completed]);
  const [selectedWork, setSelectedWork] = useState(null);
  const [viewedChunk, setViewedChunk] = useState(null);
  const [viewedOutput, setViewedOutput] = useState(null);
  const [viewedIllustration, setViewedIllustration] = useState(null);
  const illustrationRef = useRef(null);
  const [shouldScrollToIllustration, setShouldScrollToIllustration] = useState(false);

  // Bilingual viewer state for illustration click view
  const [bilingualIndex, setBilingualIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const [loadedChunks, setLoadedChunks] = useState([
    // Minimal seeds so lists are usable immediately; full file loads async
    {"id":"herodotus-histories-0001","setId":"world-classics-seed","sourceId":"herodotus-histories","coverage":{"startPercent":0,"endPercent":0.1,"chunkPercent":0.1}},
    {"id":"shahnameh-0001","setId":"world-classics-seed","sourceId":"shahnameh","coverage":{"startPercent":0,"endPercent":0.1,"chunkPercent":0.1}},
    {"id":"ovid-metamorphoses-0001","setId":"world-classics-seed","sourceId":"ovid-metamorphoses","coverage":{"startPercent":0,"endPercent":0.1,"chunkPercent":0.1}},
    {"id":"romance-three-kingdoms-0001","setId":"world-classics-seed","sourceId":"romance-three-kingdoms","coverage":{"startPercent":0,"endPercent":0.1,"chunkPercent":0.1}}
  ]);

  // Lazy load chunks.jsonl only when viewer uses it (keeps main bundle small)
  useEffect(() => {
    if (mode !== "viewer") return;
    let cancelled = false;
    // Try public copy first, fall back to direct (works in some deploys)
    const urls = [
      asset("data/world-classics-seed/chunks.jsonl"),
      "/tracking/sets/world-classics-seed/chunks.jsonl" // fallback only for local dev from root
    ];
    (async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const text = await res.text();
          const parsed = text
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => { try { return JSON.parse(line); } catch { return null; } })
            .filter(Boolean);
          if (!cancelled && parsed.length > 0) {
            setLoadedChunks(parsed);
            return;
          }
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    if (shouldScrollToIllustration && illustrationRef.current) {
      illustrationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShouldScrollToIllustration(false);
    }
  }, [shouldScrollToIllustration, viewedIllustration]);

  const sourceChunks = useMemo(() => {
    if (!selectedWork) return [];
    return loadedChunks.filter((c) => c.sourceId === selectedWork.id);
  }, [selectedWork, loadedChunks]);

  // Bilingual pairs from the translation data (Greek + literal) for the illustration module
  const bilingualPairs = useMemo(() => {
    if (!viewedIllustration || viewedChunk?.id !== "herodotus-histories-0001") return [];
    const art = sampleTranslation.artifact || {};
    const sources = art.sourceExcerptReferences || [];
    const literals = art.literalTranslations || [];
    return sources.map((src, i) => ({
      ref: src.ref,
      greek: src.greek,
      literal: literals[i]?.translation || ''
    }));
  }, [viewedIllustration, viewedChunk]);

  // Auto-play for the bilingual viewer
  useEffect(() => {
    let timer;
    if (isAutoPlaying && bilingualPairs.length > 0) {
      timer = setInterval(() => {
        setBilingualIndex(prev => (prev + 1) % bilingualPairs.length);
      }, 2200); // ~2.2s per section
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, bilingualPairs.length]);

  const openWork = (source, scrollToIllustration = false) => {
    setSelectedWork(source);
    setViewedChunk(null);
    setViewedOutput(null);
    // auto-open the sample if available for herodotus
    if (source.id === "herodotus-histories" && (completed.translation?.has("herodotus-histories-0001") || completed.illustration?.has("herodotus-histories-0001"))) {
      // The chunk metadata will come from loadedChunks on next render; seed a minimal one for immediate view
      const minimalChunk = {
        id: "herodotus-histories-0001",
        sourceId: "herodotus-histories",
        coverage: { startPercent: 0, endPercent: 0.1, chunkPercent: 0.1 }
      };
      setViewedChunk(minimalChunk);
      setViewedOutput(sampleTranslation);
      setViewedIllustration(sampleIllustration);
      setBilingualIndex(0);
      setIsAutoPlaying(false);
      if (scrollToIllustration) {
        setShouldScrollToIllustration(true);
      }
    }
  };

  const selectChunkForView = (chunk) => {
    setViewedChunk(chunk);
    // For now only the known sample has real output; future: dynamic load or pre-bundled
    if (chunk.id === "herodotus-histories-0001") {
      setViewedOutput(sampleTranslation);
      setViewedIllustration(sampleIllustration);
      setBilingualIndex(0);
      setIsAutoPlaying(false);
    } else {
      setViewedOutput(null);
      setViewedIllustration(null);
      setBilingualIndex(0);
      setIsAutoPlaying(false);
    }
  };

  const closeWork = () => {
    setSelectedWork(null);
    setViewedChunk(null);
    setViewedOutput(null);
    setViewedIllustration(null);
    setBilingualIndex(0);
    setIsAutoPlaying(false);
  };

  const totalCompleted = Object.values(completed).reduce((sum, set) => sum + set.size, 0);

  // ---- Render ----
  if (mode === "viewer") {
    return (
      <main className="wl-main">
        <nav className="wl-nav">
          <div className="nav-left">
            <span className="brand">speak, reading</span>
            <span className="sep">·</span>
            <span className="section">World Library</span>
          </div>
          <div className="nav-actions">
            <button onClick={() => setMode("atelier")} className="nav-link">Production Atelier</button>
            <a href="https://speakreading.com" target="_blank" rel="noreferrer">speakreading.com <ExternalLink size={13} /></a>
          </div>
        </nav>

        {recentIllustrations.length > 0 && (
          <section className="recent-gallery">
            <div className="gallery-head">
              <h3>Recent Illustrations</h3>
              <span className="muted">scroll horizontally →</span>
            </div>
            <div className="gallery-scroll">
              {recentIllustrations.map((ill) => (
                <div
                  key={ill.id}
                  className="gallery-item"
                  onClick={() => {
                    const her = catalog.sources.find((s) => s.id === "herodotus-histories");
                    if (her) {
                      openWork(her, true); // open and scroll to illustration
                    }
                  }}
                >
                  <img src={ill.image} alt={ill.title} />
                  <div className="gallery-label">{ill.title}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <header className="wl-hero">
          <div className="hero-content">
            <p className="eyebrow">Public editions</p>
            <h1>World Library</h1>
            <p className="lead">
              Annotated translations of classical texts. Each passage includes the original, a literal rendering,
              a fluent reader translation, a detailed gloss, and seeds for consistent illustration.
            </p>
            <div className="hero-stats">
              <div><strong>{catalog.sources.length}</strong> works</div>
              <div><strong>{manifest.chunkCount}</strong> planned chunks</div>
              <div><strong>{totalCompleted}</strong> outputs published</div>
            </div>
          </div>
          <div className="hero-visual">
            <img src={asset("assets/script-mosaic.svg")} alt="" />
          </div>
        </header>

        <section className="wl-collection">
          <div className="section-head">
            <h2>The Collection</h2>
            <p>Seed set · {manifest.id}</p>
          </div>

          <div className="works-grid">
            {catalog.sources.map((source) => (
              <WorkCard
                key={source.id}
                source={source}
                completed={completed}
                onExplore={openWork}
              />
            ))}
          </div>
        </section>

        {selectedWork && (
          <section className="wl-work-detail">
            <div className="detail-head">
              <div>
                <button className="close-btn" onClick={closeWork}>← Back to collection</button>
                <h2>{selectedWork.title} <span className="orig-inline">{selectedWork.originalTitle}</span></h2>
                <p className="detail-sub">{selectedWork.author} · {selectedWork.period} · {selectedWork.language}</p>
              </div>
              <div className="detail-links">
                <a href={selectedWork.primaryUrl} target="_blank" rel="noreferrer">Primary source <ExternalLink size={14}/></a>
                <a href={selectedWork.rawUrl} target="_blank" rel="noreferrer">Raw text <ExternalLink size={14}/></a>
              </div>
            </div>

            <div className="detail-body">
              <div className="detail-sidebar">
                <div className="progress-panel">
                  <h4>Progress in seed set</h4>
                  {stages.map((st) => {
                    const done = (completed[st] && completed[st].size) || 0;
                    const pct = Math.round((done / manifest.chunkCount) * 100);
                    return (
                      <div key={st} className="mini-progress">
                        <div className="mini-label">{st} <span>{done}</span></div>
                        <div className="mini-bar"><div style={{width: `${pct}%`}} /></div>
                      </div>
                    );
                  })}
                </div>

                <div className="rights-note">
                  {selectedWork.rightsNote}
                </div>
              </div>

              <div className="detail-main">
                <ChunkList
                  chunks={sourceChunks}
                  completed={completed}
                  onSelectChunk={selectChunkForView}
                  selectedId={viewedChunk?.id}
                />

                {viewedChunk && (
                  <div className="viewed-chunk">
                    <div className="viewed-head">
                      <div>
                        <strong>{viewedChunk.id}</strong> · {formatCoverage(viewedChunk.coverage)}
                      </div>
                      <div className="viewed-actions">
                        {viewedOutput || viewedIllustration ? <span className="ready-pill">output ready</span> : <span className="open-pill">in production</span>}
                      </div>
                    </div>

                    {viewedOutput ? (
                      <ArtifactViewer output={viewedOutput} />
                    ) : (
                      <div className="no-output">
                        <p>This chunk has not been published yet.</p>
                        <p className="muted">Outputs appear here once submitted and accepted into the set.</p>
                      </div>
                    )}

                    {viewedIllustration && (
                      <div className="illustration-section bilingual-module" ref={illustrationRef} id="illustration">
                        {/* Image at top */}
                        <div className="module-image">
                          <img
                            src={herodotusIllustration}
                            alt="Generated illustration for Herodotus Histories 1.1"
                          />
                        </div>

                        {/* Bilingual viewer module: Greek + Literal under the picture */}
                        <div className="bilingual-viewer">
                          {/* Controls at top of the module */}
                          <div className="bilingual-header">
                            <h4>Bilingual Viewer</h4>
                            <div className="play-controls">
                              <button
                                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                                className="play-btn"
                              >
                                {isAutoPlaying ? '⏸ Pause' : '▶ Play'}
                              </button>
                              <button
                                onClick={() => {
                                  setBilingualIndex(Math.max(0, bilingualIndex - 1));
                                  setIsAutoPlaying(false);
                                }}
                              >
                                ← Prev
                              </button>
                              <span className="progress">{bilingualIndex + 1} / {bilingualPairs.length}</span>
                              <button
                                onClick={() => {
                                  setBilingualIndex(Math.min(bilingualPairs.length - 1, bilingualIndex + 1));
                                  setIsAutoPlaying(false);
                                }}
                              >
                                Next →
                              </button>
                              <button onClick={() => { setBilingualIndex(0); setIsAutoPlaying(false); }}>
                                Reset
                              </button>
                            </div>
                          </div>

                          {/* The picture is above; here is the prominent current bilingual under it */}
                          {bilingualPairs[bilingualIndex] && (
                            <div className="current-bilingual">
                              <div className="greek">{bilingualPairs[bilingualIndex].greek}</div>
                              <div className="literal">{bilingualPairs[bilingualIndex].literal}</div>
                            </div>
                          )}

                          {/* Scrollable list of all pairs to follow along */}
                          <div className="bilingual-pairs">
                            {bilingualPairs.map((pair, idx) => (
                              <div
                                key={idx}
                                className={`bilingual-pair ${idx === bilingualIndex ? 'current' : ''}`}
                                onClick={() => {
                                  setBilingualIndex(idx);
                                  setIsAutoPlaying(false);
                                }}
                              >
                                <div className="greek">{pair.greek}</div>
                                <div className="literal">{pair.literal}</div>
                              </div>
                            ))}
                          </div>

                          <div className="module-meta">
                            <span>Illustration • Greek + Literal (bilingual)</span>
                            <span className="muted">Play auto-advances • Click any line to jump</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!viewedChunk && (
                  <div className="empty-hint">
                    Select a chunk from the list above to view its translation, gloss, illustration prompt, and generated image (when available).
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {!selectedWork && totalCompleted > 0 && (
          <section className="quick-sample">
            <div className="sample-card" onClick={() => {
              const her = catalog.sources.find(s => s.id === "herodotus-histories");
              if (her) openWork(her);
            }}>
              <div>Featured sample</div>
              <strong>Herodotus Histories 1.1 — opening of the inquiry</strong>
              <span>Tap to read the first published chunk →</span>
            </div>
          </section>
        )}

        <footer className="wl-footer">
          <p>
            Outputs are generated from public domain sources. Glosses, reader translations, and illustration seeds are contributed under open terms.
            Track progress and contribute via the <button className="inline-btn" onClick={() => setMode("atelier")}>Atelier</button>.
          </p>
          <p className="small">Data served from this repository. speakreading.com/worldlibrary</p>
        </footer>
      </main>
    );
  }

  // ATELIER MODE (original internal tool)
  return (
    <main>
      <header className="app-header">
        <div>
          <p className="eyebrow">Gloss Atelier · internal</p>
          <h1>Classical Translation and Illustration Queue</h1>
        </div>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <button onClick={() => setMode("viewer")} style={{background:'transparent', border:'1px solid var(--border)', padding:'6px 12px'}}>← World Library</button>
          <img className="script-mosaic" src={asset("assets/script-mosaic.svg")} alt="" />
        </div>
      </header>

      <section className="metrics-row">
        <Metric icon={Languages} label="sources" value={selectedSources.length} />
        <Metric icon={GitBranch} label="claimed" value={metrics.claimed ?? 0} />
        <Metric icon={Eye} label="review" value={metrics.review ?? 0} />
        <Metric icon={CheckCircle2} label="approved" value={metrics.approved ?? 0} />
        <Metric icon={Gauge} label="limit" value={concurrency} />
      </section>

      <section className="controls-band">
        <div className="field">
          <label htmlFor="stage">Stage</label>
          <select id="stage" value={stage} onChange={(event) => setStage(event.target.value)}>
            {stages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="chunkPercent">Chunk</label>
          <select
            id="chunkPercent"
            value={chunkPercent}
            onChange={(event) => setChunkPercent(event.target.value)}
          >
            <option value="0.1">0.1%</option>
            <option value="0.05">0.05%</option>
            <option value="0.025">0.025%</option>
            <option value="0.01">0.01%</option>
          </select>
        </div>
        <div className="field wide">
          <label htmlFor="concurrency">Concurrency</label>
          <input
            id="concurrency"
            type="range"
            min="1"
            max="80"
            value={concurrency}
            onChange={(event) => setConcurrency(Number(event.target.value))}
          />
        </div>
        <button type="button" onClick={() => setConcurrency((value) => Math.max(1, value * 10))}>
          <Rocket size={17} />
          10x
        </button>
        <button type="button" onClick={() => setConcurrency(4)}>
          <RefreshCcw size={17} />
          Reset
        </button>
      </section>

      <section className="source-grid">
        {catalog.sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            selected={selectedSources.includes(source.id)}
            onToggle={toggleSource}
          />
        ))}
      </section>

      <section className="workspace-grid">
        <div className="queue-panel">
          <div className="panel-title">
            <Search size={19} />
            <h2>Queue</h2>
          </div>
          <QueueTable queue={queue} activeId={displayedChunk?.id} onSelect={setActiveChunk} />
        </div>
        {displayedChunk ? (
          <ReviewPanel chunk={displayedChunk} decisions={decisions} setDecisions={setDecisions} />
        ) : null}
      </section>

      <section className="command-panel">
        <div className="panel-title">
          <Clipboard size={19} />
          <h2>Command</h2>
        </div>
        <pre>{command}</pre>
        <div className="button-row">
          <button type="button" onClick={copyCommand}>
            <Clipboard size={17} />
            Copy
          </button>
          <a className="button-link" href="https://github.com/new" target="_blank" rel="noreferrer">
            <GitBranch size={17} />
            New GitHub repo
          </a>
          <a className="button-link" href={displayedSource?.primaryUrl ?? "#"} target="_blank" rel="noreferrer">
            <ImageIcon size={17} />
            Source view
          </a>
        </div>
      </section>
    </main>
  );
}

export default App;
