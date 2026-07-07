import {
  CheckCircle2,
  Clipboard,
  Eye,
  Gauge,
  GitBranch,
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
import { useMemo, useState } from "react";

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

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="eyebrow">Gloss Atelier</p>
          <h1>Classical Translation and Illustration Queue</h1>
        </div>
        <img className="script-mosaic" src="/assets/script-mosaic.svg" alt="" />
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
