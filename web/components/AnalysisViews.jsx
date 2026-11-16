import React from "react";
import { peopleFor, placesFor } from "../model.js";
import {
  Refs,
  Empty,
  dateLabel,
  NetworkView,
  PeopleList,
  PlaceList,
  TimelineView,
  RoutesView,
} from "../views.jsx";
import { ThreadCards, FindingDetail } from "./Investigation.jsx";

export default function AnalysisViews({
  view,
  data,
  rows,
  filters,
  thread,
  peopleContext,
  placeContext,
  workspace,
  storageSaved,
  timelineMode,
  timelineLimit,
  actions,
}) {
  const { onOpen, onPerson, onPlace, onThread, onView } = actions;
  if (view === "overview")
    return (
      <>
        <ThreadCards
          findings={data.findings}
          selected={filters.thread}
          onSelect={onThread}
        />
        {thread ? (
          <FindingDetail
            finding={thread}
            aliases={data.aliases}
            onOpen={onOpen}
            onPerson={onPerson}
          />
        ) : (
          <>
            <div className="two-panels">
              <section className="panel overview-chart">
                <div className="panel-title">
                  <h2>People in the reports</h2>
                  <button
                    className="text-button"
                    onClick={() => onView("people")}
                  >
                    Explore →
                  </button>
                </div>
                <p className="subtle">
                  Most-mentioned people in the current evidence
                </p>
                <PeopleList
                  reports={rows}
                  aliases={data.aliases}
                  selected={filters.person}
                  limit={6}
                  onSelect={onPerson}
                />
              </section>
              <section className="panel overview-chart">
                <div className="panel-title">
                  <h2>Evidence network</h2>
                  <button
                    className="text-button"
                    onClick={() => onView("people")}
                  >
                    Open network →
                  </button>
                </div>
                <p className="subtle">Shared reports connect these people</p>
                <NetworkView
                  reports={rows}
                  aliases={data.aliases}
                  selected={filters.person}
                  limit={7}
                  onSelect={onPerson}
                />
              </section>
            </div>
            <section className="panel">
              <div className="panel-title">
                <h2>A useful starting point</h2>
                <button
                  className="text-button"
                  onClick={() => onThread("caribbean")}
                >
                  Open investigation →
                </button>
              </div>
              <p className="subtle">
                Compare the six scholarship recipients in FBI_35 with the cruise
                booking pairs in FBI_40 and FBI_41. Then follow the package and
                contact reports to test the larger hypothesis.
              </p>
              <Refs ids={["FBI_35", "FBI_40", "FBI_41"]} onOpen={onOpen} />
            </section>
          </>
        )}
      </>
    );
  if (view === "people")
    return (
      <>
        <section className="panel">
          <div className="panel-title">
            <h2>Co-mention network</h2>
            <span className="badge">Top 12 people</span>
          </div>
          <p className="subtle">
            {filters.person &&
              "Network retains the context before the person filter. "}
            Select a node or a name below to filter the evidence reader. Hover
            or focus a link or node for source information.
          </p>
          <NetworkView
            reports={peopleContext}
            aliases={data.aliases}
            selected={filters.person}
            limit={12}
            onSelect={onPerson}
          />
          <p className="graph-list-note">
            Confirmed alias groups are combined; initials and generic first
            names are kept separate.
          </p>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>People index</h2>
            <span className="badge">
              {peopleFor(peopleContext, data.aliases).length} labels
            </span>
          </div>
          <p className="subtle">
            Distinct report count. People listed here may be witnesses,
            bystanders, or investigators.
          </p>
          <div className="caution">
            Abdul al Nami is a shared name. The utility employee and the teacher
            are distinct people. Name-based filtering returns both contexts.
            <Refs ids={["FBI_18", "FBI_36"]} onOpen={onOpen} />
          </div>
          <div className="list-scroll people-list">
            <PeopleList
              reports={peopleContext}
              aliases={data.aliases}
              selected={filters.person}
              onSelect={onPerson}
            />
          </div>
        </section>
      </>
    );
  if (view === "timeline")
    return (
      <section className="panel">
        <div className="panel-title">
          <h2>Evidence chronology</h2>
          <span className="badge">{rows.length} reports in scope</span>
        </div>
        <div className="toolbar">
          <label htmlFor="timeline-mode" className="subtle">
            Show
          </label>
          <select
            id="timeline-mode"
            value={timelineMode}
            onChange={(event) => actions.onTimelineMode(event.target.value)}
          >
            <option value="events">Curated events and schedules</option>
            <option value="publication">Report publication dates</option>
            <option value="mentioned">Mentioned dates from metadata</option>
          </select>
        </div>
        <TimelineView
          reports={rows}
          findings={thread ? [thread] : data.findings}
          mode={timelineMode}
          limit={timelineLimit}
          onMore={actions.onMoreTimeline}
          onOpen={onOpen}
        />
      </section>
    );
  if (view === "places")
    return (
      <>
        <section className="panel">
          <div className="panel-title">
            <h2>Investigation routes</h2>
          </div>
          <div className="toolbar">
            <label htmlFor="route-thread" className="subtle">
              Investigation
            </label>
            <select
              id="route-thread"
              value={filters.thread}
              onChange={(event) => actions.onRouteThread(event.target.value)}
            >
              <option value="">Choose an investigation</option>
              {data.findings.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          <RoutesView finding={thread} onOpen={onOpen} />
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Reported places</h2>
            <span className="badge">
              {placesFor(placeContext).length} locations
            </span>
          </div>
          <p className="subtle">
            {filters.place &&
              "Location counts retain context before the place filter. "}
            Click a location to filter reports. Source location errors are
            preserved; no coordinates are inferred.
          </p>
          <div className="list-scroll">
            <PlaceList
              reports={placeContext}
              selected={filters.place}
              onSelect={onPlace}
            />
          </div>
        </section>
      </>
    );
  if (view === "notebook")
    return (
      <>
        <section className="panel notebook">
          <div className="panel-title">
            <h2>Reasoning notes</h2>
            <span className="badge">Browser-local workspace</span>
          </div>
          <p className="subtle">
            Keep claims, alternative explanations, and unanswered questions
            together. Notes and pins stay in this browser; export them to keep a
            separate copy.
          </p>
          <label htmlFor="notes" className="read-note block-label">
            Your investigation notes
          </label>
          <textarea
            id="notes"
            placeholder="Claim → supporting report IDs → uncertainty → next question"
            value={workspace.notes}
            onChange={(event) => actions.onNotes(event.target.value)}
          />
          <p className="save-status" role="status">
            {storageSaved
              ? "Saved in this browser"
              : "Browser storage unavailable. Export to keep your work."}
          </p>
          <div className="toolbar">
            <button className="primary" onClick={actions.onExport}>
              Export evidence bundle
            </button>
            <button className="secondary" onClick={actions.onPinnedOnly}>
              {filters.pinnedOnly
                ? "Show all reports"
                : "Filter to pinned reports"}
            </button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Pinned evidence</h2>
            <span className="badge">{workspace.pins.length} reports</span>
          </div>
          {workspace.pins.length ? (
            workspace.pins.map((id) => {
              const report = data.reports.find((item) => item.id === id);
              return (
                report && (
                  <article className="claim" key={id}>
                    <div className="panel-title">
                      <button
                        className="text-button"
                        onClick={() => onOpen(id)}
                      >
                        {id} · {dateLabel(report.date)}
                      </button>
                      <button
                        className="pin pinned"
                        onClick={() => actions.onPin(id)}
                        aria-label={`Unpin ${id}`}
                      >
                        Unpin
                      </button>
                    </div>
                    <p>{report.description.slice(0, 180)}…</p>
                  </article>
                )
              );
            })
          ) : (
            <Empty>
              No pinned reports yet. Open a report and select Pin report.
            </Empty>
          )}
        </section>
      </>
    );
  return (
    <>
      <section className="panel">
        <h2>How to investigate</h2>
        <div className="help-grid">
          {[
            [
              "1. Start with a question",
              "Choose an investigation on Overview. Read what is reported, what is inferred, and what remains uncertain.",
            ],
            [
              "2. Connect the views",
              "Select people, places, agency, or year. Filters intersect. Search includes report descriptions and original metadata. Active chips remove individual filters; Reset filters clears all.",
            ],
            [
              "3. Inspect the source",
              "Use the evidence reader or a source-ID button. References can open a report outside the current filter; the reader labels this. Original entities and dates are shown below each report.",
            ],
            [
              "4. Compare time",
              "Publication dates tell you when a report was issued. Mentioned dates include history and background. Curated events use narrative evidence and label travel, claims, and deadlines. Partial dates are intervals.",
            ],
            [
              "5. Keep your reasoning",
              "Pin relevant reports and add notes in Notebook. Export creates a JSON bundle containing the original pinned reports, notes, filters, and curated findings.",
            ],
          ].map(([title, text]) => (
            <div key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Computational methods</h2>
        <p className="story-summary">
          A deterministic parser separates REPORT blocks and nine named fields.
          Semicolon lists become entities. Counts use distinct report IDs;
          co-mention links preserve those IDs. Seven conservative alias groups
          use explicit source evidence. Curated investigations and events are
          separate from automatically calculated statistics.
        </p>
        <p className="read-note">
          React coordinates the views and native SVG renders the network. Local
          text search uses literal substring matching. Scores do not estimate
          criminality or threat likelihood. Every source record remains
          available.
        </p>
      </section>
      <section className="panel">
        <div className="panel-title">
          <h2>Source quality notes</h2>
          <span className="badge">{data.quality.length} issues</span>
        </div>
        {data.quality.map((issue, index) => (
          <article className="quality-item" key={index}>
            <span className="badge amber">{issue.kind}</span>
            <p>{issue.detail}</p>
            <Refs ids={issue.reportIds} onOpen={onOpen} />
          </article>
        ))}
      </section>
      <section className="panel">
        <h2>Alias provenance</h2>
        {data.aliases.map((group) => (
          <article className="quality-item" key={group.canonical}>
            <h3>{group.canonical}</h3>
            <p>{group.names.join(" · ")}</p>
            <Refs ids={group.reportIds} onOpen={onOpen} />
          </article>
        ))}
      </section>
    </>
  );
}
