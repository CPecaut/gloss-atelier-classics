const state = {
  data: null,
  search: "",
  source: "all",
  stage: "all",
  selectedOutputId: null
};

const $ = (selector) => document.querySelector(selector);
const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => escapeMap[char]);
}

function safeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "#";
  } catch {
    return "#";
  }
}

function cssName(value) {
  return String(value || "open")
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();
}

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function chip(value) {
  const label = String(value || "open");
  return `<span class="chip ${cssName(label)}">${esc(label.replace("-", " "))}</span>`;
}

function truncate(value, limit = 230) {
  const text = String(value ?? "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trim()}...`;
}

function matchesSearch(item) {
  if (!state.search) return true;
  return normalize(JSON.stringify(item)).includes(normalize(state.search));
}

function filteredOutputs() {
  return state.data.outputs.filter((output) => {
    if (state.source !== "all" && output.sourceId !== state.source) return false;
    if (state.stage !== "all" && output.stage !== state.stage) return false;
    return matchesSearch(output);
  });
}

function filteredChunks() {
  return state.data.chunks.filter((chunk) => {
    if (state.source !== "all" && chunk.sourceId !== state.source) return false;
    return matchesSearch(chunk);
  });
}

function renderMetrics() {
  const activeClaims = state.data.claims.filter((claim) => claim.status === "active").length;
  const metrics = [
    ["Sources", state.data.sources.length],
    ["Sets", state.data.sets.length],
    ["Chunks", state.data.chunks.length],
    ["Submitted outputs", state.data.outputs.length],
    ["Active claims", activeClaims]
  ];
  $("#metrics").innerHTML = metrics
    .map(([label, value]) => `<div class="metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`)
    .join("");
}

function renderFilters() {
  $("#source-filter").innerHTML = [
    `<option value="all">All sources</option>`,
    ...state.data.sources.map((source) => `<option value="${esc(source.id)}">${esc(source.title)}</option>`)
  ].join("");
}

function renderSources() {
  $("#generated-at").textContent = `Updated ${new Date(state.data.generatedAt).toLocaleString()}`;
  $("#source-list").innerHTML = state.data.sources
    .map((source) => {
      const stats = state.data.sourceStats[source.id] ?? {};
      return `
        <article class="source-card ${state.source === source.id ? "active" : ""}" data-source-id="${esc(source.id)}">
          <h3>${esc(source.title)}</h3>
          <div class="original">${esc(source.originalTitle)}</div>
          <div class="meta-row">
            ${chip(source.statusOk ? "online" : "warn")}
            ${chip(source.language)}
          </div>
          <p class="small">${esc(source.author)} · ${esc(source.period)}</p>
          <p class="small">${esc(source.rightsNote)}</p>
          <div class="meta-row">
            <span class="chip">${esc(stats.chunks ?? 0)} chunks</span>
            <span class="chip submitted">${esc(stats.outputs ?? 0)} outputs</span>
            <span class="chip active">${esc(stats.activeClaims ?? 0)} active claims</span>
          </div>
          <div class="meta-row">
            <a href="${safeUrl(source.primaryUrl)}">source</a>
            <a href="${safeUrl(source.rawUrl)}">raw</a>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-source-id]").forEach((node) => {
    node.addEventListener("click", (event) => {
      if (event.target.tagName === "A") return;
      state.source = node.dataset.sourceId;
      $("#source-filter").value = state.source;
      state.selectedOutputId = null;
      render();
    });
  });
}

function outputTitle(output) {
  const source = state.data.sourcesById[output.sourceId];
  return `${source?.title ?? output.sourceId} · ${output.chunkId}`;
}

function renderOutputs() {
  const outputs = filteredOutputs();
  $("#output-count").textContent = `${outputs.length} shown`;
  if (!outputs.length) {
    $("#output-list").innerHTML = `<div class="empty">No outputs match the current filters.</div>`;
    renderOutputDetail(null);
    return;
  }
  if (!state.selectedOutputId || !outputs.some((output) => output.id === state.selectedOutputId)) {
    state.selectedOutputId = outputs[0].id;
  }
  $("#output-list").innerHTML = outputs
    .map(
      (output) => `
        <article class="output-card ${output.id === state.selectedOutputId ? "active" : ""}" data-output-id="${esc(output.id)}">
          <h3>${esc(outputTitle(output))}</h3>
          <div class="meta-row">
            ${chip(output.stage)}
            ${chip(output.status)}
            <span class="chip">${esc(output.owner)}</span>
          </div>
          <p class="small">${esc(truncate(output.summary || output.notes || "Submitted output"))}</p>
        </article>
      `
    )
    .join("");
  document.querySelectorAll("[data-output-id]").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedOutputId = node.dataset.outputId;
      renderOutputs();
    });
  });
  renderOutputDetail(outputs.find((output) => output.id === state.selectedOutputId));
}

function boundaryLabel(source = {}) {
  const boundary = source.actualBoundary;
  if (typeof boundary === "string") return boundary;
  if (boundary?.startRef && boundary?.endRef) return `${boundary.startRef}-${boundary.endRef}`;
  const planned = source.plannedCoverage;
  if (typeof planned === "string") return planned;
  if (planned?.startPercent !== undefined && planned?.endPercent !== undefined) {
    return `${planned.startPercent}-${planned.endPercent}%`;
  }
  return "";
}

function renderSourceExcerpt(artifact) {
  const rows = artifact.sourceExcerptReferences ?? [];
  if (rows.length) {
    return `
      <div class="excerpt">
        ${rows
          .map(
            (row) => `
              <div class="source-ref">
                <span class="ref-label">${esc(row.ref)}</span>
                <div>${esc(row.greek)}</div>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }
  if (artifact.sourceExcerpt) {
    return `<div class="excerpt">${esc(artifact.sourceExcerpt)}</div>`;
  }
  return `<div class="empty">No source excerpt submitted.</div>`;
}

function renderTranslationBlock(title, rows, fallback) {
  if (Array.isArray(rows) && rows.length) {
    return `
      <div class="translation-block">
        <h4>${esc(title)}</h4>
        ${rows
          .map(
            (row) => `
              <div class="translation-ref">
                <span class="ref-label">${esc(row.ref)}</span>
                <div>${esc(row.translation)}</div>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }
  if (fallback) {
    return `
      <div class="translation-block">
        <h4>${esc(title)}</h4>
        <p>${esc(fallback)}</p>
      </div>
    `;
  }
  return `<div class="empty">No ${esc(title.toLowerCase())} submitted.</div>`;
}

function renderGlosses(glosses = []) {
  if (!glosses.length) return `<div class="empty">No gloss table included yet.</div>`;
  return `
    <div class="gloss-table-wrap">
      <table>
        <thead>
          <tr><th>Ref</th><th>Token</th><th>Lemma</th><th>Morphology</th><th>Gloss</th></tr>
        </thead>
        <tbody>
          ${glosses
            .map(
              (row) => `
                <tr>
                  <td>${esc(row.ref ?? "")}</td>
                  <td>${esc(row.greek ?? row.token ?? "")}</td>
                  <td>${esc(row.lemma ?? "")}</td>
                  <td>${esc(row.morphology ?? "")}</td>
                  <td>${esc(row.gloss ?? "")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPromptSeed(seed = {}) {
  const notes = Array.isArray(seed.continuityNotes) ? seed.continuityNotes : [];
  return `
    <div class="prompt-box">
      <p>${esc(seed.prompt ?? "No illustration prompt seed submitted.")}</p>
      ${seed.style ? `<p class="small"><strong>Style:</strong> ${esc(seed.style)}</p>` : ""}
      ${
        notes.length
          ? `<ul>${notes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul>`
          : ""
      }
    </div>
  `;
}

function renderNotes(title, notes = []) {
  if (!notes.length) return "";
  return `
    <h3>${esc(title)}</h3>
    <div class="note-box">
      ${notes.map((note) => `<p>${esc(note)}</p>`).join("")}
    </div>
  `;
}

function renderModelRoute(route) {
  if (!route) return "";
  if (typeof route === "string") {
    return `<h3>Model Route</h3><div class="note-box"><p>${esc(route)}</p></div>`;
  }
  return `
    <h3>Model Route</h3>
    <div class="note-box route-list">
      ${Object.entries(route)
        .map(([key, value]) => `<p><strong>${esc(key)}:</strong> ${esc(value)}</p>`)
        .join("")}
    </div>
  `;
}

function renderOutputDetail(output) {
  const detail = $("#output-detail");
  if (!output) {
    detail.classList.remove("visible");
    detail.innerHTML = "";
    return;
  }
  const artifact = output.artifact ?? {};
  const source = artifact.source ?? {};
  const readerFallback = artifact.readerTranslation ?? artifact.combinedReaderTranslation;
  detail.classList.add("visible");
  detail.innerHTML = `
    <div class="panel-head">
      <h2>${esc(outputTitle(output))}</h2>
      <span>${esc(boundaryLabel(source) || output.stage)}</span>
    </div>
    <div class="meta-row">
      ${chip(output.stage)}
      ${chip(output.status)}
      <span class="chip">${esc(output.owner)}</span>
      ${source.browseUrl ? `<a href="${safeUrl(source.browseUrl)}">browse source</a>` : ""}
      ${source.sourceUrl ? `<a href="${safeUrl(source.sourceUrl)}">raw source</a>` : ""}
    </div>
    <div class="detail-grid">
      <div>
        <h3>Source Excerpt</h3>
        ${renderSourceExcerpt(artifact)}
      </div>
      <div>
        <h3>Reader Translation</h3>
        ${renderTranslationBlock("Reader translation", artifact.readerTranslations, readerFallback)}
        <h3>Literal Translation</h3>
        ${renderTranslationBlock("Literal translation", artifact.literalTranslations, artifact.literalTranslation)}
      </div>
    </div>
    <h3>Glosses</h3>
    ${renderGlosses(artifact.glosses)}
    <h3>Illustration Prompt Seed</h3>
    ${renderPromptSeed(artifact.illustrationPromptSeed)}
    ${renderNotes("Uncertainties", artifact.uncertainties)}
    ${renderNotes("Review Notes", artifact.reviewNotes)}
    ${renderModelRoute(artifact.modelRoute)}
  `;
}

function renderChunks() {
  const chunks = filteredChunks();
  $("#chunk-count").textContent = `${chunks.length} shown`;
  const visible = chunks.slice(0, 500);
  $("#chunk-table").innerHTML = [
    ...visible.map(
      (chunk) => `
        <tr>
          <td>${esc(chunk.id)}</td>
          <td>${esc(state.data.sourcesById[chunk.sourceId]?.title ?? chunk.sourceId)}</td>
          <td>${esc(chunk.coverage)}</td>
          <td>${chip(chunk.stages.translation)}</td>
          <td>${chip(chunk.stages.gloss)}</td>
          <td>${chip(chunk.stages.illustration)}</td>
          <td>${chip(chunk.stages.review)}</td>
        </tr>
      `
    ),
    chunks.length > visible.length
      ? `<tr><td colspan="7" class="small">Showing first ${visible.length} matching chunks. Use search or source filter to narrow.</td></tr>`
      : ""
  ].join("");
}

function render() {
  state.data.sourcesById = Object.fromEntries(state.data.sources.map((source) => [source.id, source]));
  $("#repo-link").href = safeUrl(state.data.repoUrl);
  renderMetrics();
  renderSources();
  renderOutputs();
  renderChunks();
}

async function init() {
  const response = await fetch("./worldlibrary-data.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching worldlibrary-data.json`);
  state.data = await response.json();
  renderFilters();
  $("#search").addEventListener("input", (event) => {
    state.search = event.target.value;
    state.selectedOutputId = null;
    render();
  });
  $("#source-filter").addEventListener("change", (event) => {
    state.source = event.target.value;
    state.selectedOutputId = null;
    render();
  });
  $("#stage-filter").addEventListener("change", (event) => {
    state.stage = event.target.value;
    state.selectedOutputId = null;
    render();
  });
  render();
}

init().catch((error) => {
  document.body.innerHTML = `<main><div class="panel"><h1>World Library data failed to load</h1><p>${esc(error.message)}</p></div></main>`;
});
