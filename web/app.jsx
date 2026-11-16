import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  filterReports,
  peopleFor,
  placesFor,
  loadWorkspace,
  saveWorkspace,
} from "./model.js";
import EvidenceReader from "./components/EvidenceReader.jsx";
import AnalysisViews from "./components/AnalysisViews.jsx";
import "./styles.css";

const INITIAL_FILTERS = {
  thread: "",
  agency: "",
  year: "",
  query: "",
  person: "",
  place: "",
  pinnedOnly: false,
};
const NAVIGATION = [
  ["overview", "▦", "Overview"],
  ["people", "♧", "People & links"],
  ["timeline", "◷", "Timeline"],
  ["places", "⌖", "Places & routes"],
  ["notebook", "▤", "Notebook"],
  ["guide", "?", "Guide & quality"],
];
const TITLES = {
  overview: "Follow the evidence.",
  people: "People and connections",
  timeline: "Put events in context.",
  places: "Trace places and routes.",
  notebook: "Your investigation notebook",
  guide: "Guide and data quality",
};
const SUBTITLES = {
  overview:
    "Explore four investigation threads. Connect people, plans, and dates back to the original reports.",
  people:
    "Explore report visibility and co-mentions. Frequency helps prioritize reading; it is not a measure of guilt.",
  timeline:
    "Compare publication dates, mentioned dates, and evidence-linked events without losing uncertainty.",
  places:
    "Select a reported location to narrow the evidence. Routes are schematic and retain their source links.",
  notebook:
    "Pin source reports, record your reasoning, and export a portable evidence bundle.",
  guide:
    "Understand the methods, the interactions, and the limitations of the source collection.",
};
function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function App({ data }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [view, setView] = useState("overview");
  const [reportId, setReportId] = useState("FBI_1");
  const [workspace, setWorkspace] = useState(() => {
    const saved = loadWorkspace(getStorage());
    return {
      ...saved,
      pins: saved.pins.filter((id) =>
        data.reports.some((report) => report.id === id),
      ),
    };
  });
  const [storageSaved, setStorageSaved] = useState(false);
  const [timelineMode, setTimelineMode] = useState("events");
  const [timelineLimit, setTimelineLimit] = useState(40);
  const [notification, setNotification] = useState("");
  const rows = useMemo(
    () =>
      filterReports(
        data.reports,
        { ...filters, pins: workspace.pins },
        data.findings,
        data.aliases,
      ),
    [filters, workspace.pins],
  );
  const reportScope = rows.map((row) => row.id).join("|");
  const thread = data.findings.find((finding) => finding.id === filters.thread);
  const peopleContext = filterReports(
    data.reports,
    { ...filters, person: "", pins: workspace.pins },
    data.findings,
    data.aliases,
  );
  const placeContext = filterReports(
    data.reports,
    { ...filters, place: "", pins: workspace.pins },
    data.findings,
    data.aliases,
  );

  useEffect(() => {
    setStorageSaved(saveWorkspace(getStorage(), workspace));
  }, [workspace]);
  useEffect(() => {
    // Reference navigation can open a source outside the filter. Reconcile selection only when scope changes.
    setReportId((current) =>
      rows.some((row) => row.id === current) ? current : (rows[0]?.id ?? null),
    );
  }, [reportScope]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(() => setNotification(""), 3500);
    return () => clearTimeout(timer);
  }, [notification]);

  function onOpen(id) {
    setReportId(id);
    if (window.matchMedia("(max-width:950px)").matches)
      requestAnimationFrame(() =>
        document
          .querySelector(".reader-body")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
  }
  function onThread(id) {
    setFilters((current) => ({
      ...current,
      thread: current.thread === id ? "" : id,
      person: "",
      place: "",
    }));
    setTimelineLimit(40);
    setView("overview");
  }
  function toggleFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: current[key] === value ? "" : value,
    }));
    setTimelineLimit(40);
  }
  function onPin(id) {
    setWorkspace((current) => ({
      ...current,
      pins: current.pins.includes(id)
        ? current.pins.filter((pin) => pin !== id)
        : [...current.pins, id],
    }));
  }
  function onExport() {
    const bundle = {
      exportedAt: new Date().toISOString(),
      notes: workspace.notes,
      filters,
      selectedView: view,
      pinnedReports: data.reports.filter((report) =>
        workspace.pins.includes(report.id),
      ),
      findings: thread ? [thread] : data.findings,
      qualityNotes: data.quality,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "investigation-evidence.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setNotification("Evidence bundle exported");
  }
  const actions = {
    onOpen,
    onPin,
    onThread,
    onExport,
    onView: setView,
    onPerson: (name) => toggleFilter("person", name),
    onPlace: (key) => toggleFilter("place", key),
    onNotes: (notes) => setWorkspace((current) => ({ ...current, notes })),
    onPinnedOnly: () =>
      setFilters((current) => ({
        ...current,
        pinnedOnly: !current.pinnedOnly,
      })),
    onTimelineMode: (mode) => {
      setTimelineMode(mode);
      setTimelineLimit(40);
    },
    onMoreTimeline: () => setTimelineLimit((current) => current + 60),
    onRouteThread: (id) => {
      setFilters((current) => ({
        ...current,
        thread: id,
        person: "",
        place: "",
      }));
      setTimelineLimit(40);
    },
  };
  const selectedPlace = data.reports
    .flatMap((report) => report.places)
    .find((place) => place.key === filters.place);
  const active = [
    ["thread", thread?.title],
    ["agency", filters.agency],
    ["year", filters.year],
    ["person", filters.person],
    ["place", selectedPlace?.label],
    ["pinnedOnly", filters.pinnedOnly ? "Pinned evidence" : ""],
    ["query", filters.query ? `Search: ${filters.query}` : ""],
  ].filter(([key]) => filters[key]);

  return (
    <>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              ⌁
            </span>
            <span>
              Report
              <br />
              Explorer
            </span>
          </div>
          <small>Analysis workspace</small>
          <nav className="nav" aria-label="Analysis views">
            {NAVIGATION.map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={view === id ? "active" : ""}
                aria-current={view === id ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </nav>
          <div className="side-line" />
          <div className="side-filters">
            <label>
              Reporting agency
              <select
                value={filters.agency}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    agency: event.target.value,
                  }))
                }
              >
                <option value="">All agencies</option>
                {["FBI", "CIA", "NSA", "DIA", "USCBP"].map((agency) => (
                  <option key={agency}>{agency}</option>
                ))}
              </select>
            </label>
            <label>
              Publication year
              <select
                value={filters.year}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    year: event.target.value,
                  }))
                }
              >
                <option value="">All years</option>
                {["2003", "2004"].map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </label>
            <button
              className="clear-link"
              onClick={() => {
                setFilters(INITIAL_FILTERS);
                setTimelineLimit(40);
              }}
            >
              ↺ Reset filters
            </button>
          </div>
          <div className="side-footer">
            <strong>111 reports. One collection.</strong>FBI · CIA · NSA · DIA ·
            USCBP
            <br />
            Source period: 2003–2004
            <button className="secondary" onClick={onExport}>
              Export workspace ↗
            </button>
          </div>
        </aside>
        <div className="page">
          <header className="topbar">
            <div className="breadcrumb">
              Project 3 <span aria-hidden="true"> / </span>{" "}
              <strong>Intelligence analysis</strong>
            </div>
            <label className="search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                aria-label="Search all report fields"
                placeholder="Search names, places, report IDs…"
                value={filters.query}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    query: event.target.value,
                  }))
                }
              />
            </label>
          </header>
          <div className="content-grid">
            <main id="main" className="analysis" tabIndex="-1">
              <div className="eyebrow">Intelligence report explorer</div>
              <div className="intro">
                <div>
                  <h1>{TITLES[view]}</h1>
                  <p>{SUBTITLES[view]}</p>
                </div>
                <span className="badge blue">● Local collection</span>
              </div>
              <div className="active-filters" aria-label="Active filters">
                {active.map(([key, label]) => (
                  <button
                    className="filter-chip"
                    key={key}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        [key]: key === "pinnedOnly" ? false : "",
                      }))
                    }
                    aria-label={`Remove ${label} filter`}
                  >
                    {label}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
              <div className="stats" aria-live="polite">
                <div className="stat">
                  <span>Reports in scope</span>
                  <strong>
                    {rows.length}
                    <small> / 111</small>
                  </strong>
                  <small>5 reporting agencies in collection</small>
                </div>
                <div className="stat">
                  <span>People labels</span>
                  <strong>{peopleFor(rows, data.aliases).length}</strong>
                  <small>With documented aliases combined</small>
                </div>
                <div className="stat">
                  <span>Reported places</span>
                  <strong>{placesFor(rows).length}</strong>
                  <small>Original location labels retained</small>
                </div>
              </div>
              {!rows.length && (
                <div className="caution" role="status">
                  No reports match these filters. Remove an active filter or
                  select Reset filters.
                </div>
              )}
              <AnalysisViews
                view={view}
                data={data}
                rows={rows}
                filters={filters}
                thread={thread}
                peopleContext={peopleContext}
                placeContext={placeContext}
                workspace={workspace}
                storageSaved={storageSaved}
                timelineMode={timelineMode}
                timelineLimit={timelineLimit}
                actions={actions}
              />
              <p className="footer-note">
                Evidence supports investigation, not a finding of guilt. Curated
                hypotheses remain separate from reported observations. Use Guide
                & quality to inspect source inconsistencies.
              </p>
            </main>
            <EvidenceReader
              data={data}
              rows={rows}
              reportId={reportId}
              pins={workspace.pins}
              query={filters.query}
              onOpen={onOpen}
              onPin={onPin}
              onPerson={actions.onPerson}
              onPlace={actions.onPlace}
            />
          </div>
        </div>
      </div>
      {notification && (
        <div className="toast" role="status">
          {notification}
        </div>
      )}
    </>
  );
}

function DataLoader() {
  const [collection, setCollection] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Collection request failed (${response.status})`);
        return response.json();
      })
      .then(setCollection)
      .catch((failure) => {
        if (failure.name !== "AbortError") setError(failure.message);
      });
    return () => controller.abort();
  }, []);
  if (error)
    return (
      <div className="empty">
        <h1>Unable to load the collection</h1>
        <p>{error}</p>
        <p>
          Run npm run dev, or build the app before starting the local server.
        </p>
      </div>
    );
  return collection ? (
    <App data={collection} />
  ) : (
    <div className="loading" role="status">
      Loading the report collection…
    </div>
  );
}

createRoot(document.querySelector("#app")).render(
  <React.StrictMode>
    <DataLoader />
  </React.StrictMode>,
);
