import React from "react";
import {
  cooccurrence,
  peopleFor,
  placesFor,
  timelineEntries,
} from "./model.js";

export function Refs({ ids, onOpen }) {
  return (
    <div className="refs">
      {ids.map((id) => (
        <button
          key={id}
          className="ref"
          onClick={() => onOpen(id)}
          aria-label={`Read report ${id}`}
        >
          {id}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function dateLabel(date) {
  if (!date?.start) return date?.raw || "Unknown date";
  if (date.precision === "year") return `${date.start.slice(0, 4)} (year only)`;
  const value = new Date(`${date.start}T12:00:00Z`);
  const options = { timeZone: "UTC", month: "short", year: "numeric" };
  if (date.precision !== "month") options.day = "numeric";
  return (
    new Intl.DateTimeFormat("en-US", options).format(value) +
    (date.precision === "month" ? " (month only)" : "")
  );
}

export function Highlight({ text, query }) {
  const source = String(text ?? "");
  const needle = query?.trim().toLowerCase();
  if (!needle) return source;
  const parts = [];
  let cursor = 0;
  while (cursor < source.length) {
    const index = source.toLowerCase().indexOf(needle, cursor);
    if (index < 0) {
      parts.push(source.slice(cursor));
      break;
    }
    parts.push(source.slice(cursor, index));
    parts.push(
      <mark key={index}>{source.slice(index, index + needle.length)}</mark>,
    );
    cursor = index + needle.length;
  }
  return <>{parts}</>;
}

export function NetworkView({
  reports,
  aliases = [],
  selected = "",
  limit = 10,
  onSelect,
}) {
  const graph = cooccurrence(reports, aliases, limit);
  if (!graph.nodes.length)
    return <Empty>No people are listed in these reports.</Empty>;
  const positions = new Map(
    graph.nodes.map((node, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / graph.nodes.length;
      return [
        node.name,
        {
          x: 300 + 165 * Math.cos(angle),
          y: 178 + 110 * Math.sin(angle),
          cosine: Math.cos(angle),
          sine: Math.sin(angle),
        },
      ];
    }),
  );
  return (
    <>
      <svg
        className="network"
        viewBox="0 0 600 370"
        aria-label={`Network of the ${graph.nodes.length} most-mentioned people. Lines represent shared reports. Person buttons also follow the chart.`}
      >
        {graph.edges.map((edge) => {
          const a = positions.get(edge.source),
            b = positions.get(edge.target);
          const label = `${edge.source} + ${edge.target}: ${edge.reportIds.join(", ")}`;
          return (
            <line
              key={`${edge.source}|${edge.target}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={Math.min(4, 0.8 + edge.count * 0.45)}
              tabIndex="0"
              aria-label={label}
            >
              <title>{label}</title>
            </line>
          );
        })}
        {graph.nodes.map((node) => {
          const point = positions.get(node.name);
          const words = node.name.split(" "),
            half = Math.ceil(words.length / 2);
          const side = point.cosine > 0.25 ? 1 : point.cosine < -0.25 ? -1 : 0;
          const labelX = side * 30;
          const labelY = side ? -3 : point.sine > 0 ? 36 : -42;
          const anchor = side > 0 ? "start" : side < 0 ? "end" : "middle";
          return (
            <g
              key={node.name}
              className={`node ${selected === node.name ? "selected" : ""}`}
              role="button"
              tabIndex="0"
              onClick={() => onSelect?.(node.name)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect?.(node.name);
                }
              }}
              aria-label={`Filter by ${node.name}, ${node.count} reports`}
              aria-pressed={selected === node.name}
              transform={`translate(${point.x},${point.y})`}
            >
              <title>
                {node.name}: {node.reportIds.join(", ")}
              </title>
              <circle r={15 + Math.min(7, node.count)} />
              <text className="node-number" textAnchor="middle" y="4">
                {node.count}
              </text>
              <text textAnchor={anchor} x={labelX} y={labelY}>
                {words.slice(0, half).join(" ")}
                <tspan x={labelX} dy="13">
                  {words.slice(half).join(" ")}
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <div className="graph-caption">
        <span>Node number = distinct reports</span>
        <span>Line = co-mention, not proof of collaboration</span>
      </div>
    </>
  );
}

export function PeopleList({
  reports,
  aliases,
  selected = "",
  limit = 1000,
  onSelect,
}) {
  const people = peopleFor(reports, aliases).slice(0, limit);
  return people.length ? (
    people.map((person) => (
      <button
        key={person.name}
        className={`person-row ${selected === person.name ? "selected" : ""}`}
        onClick={() => onSelect(person.name)}
        aria-pressed={selected === person.name}
      >
        <span>
          <strong>{person.name}</strong>
          {person.name === "Abdul al Nami" && (
            <em>Same-name ambiguity · see quality notes</em>
          )}
        </span>
        <span className="count">{person.count}</span>
      </button>
    ))
  ) : (
    <Empty>No listed people in the current results.</Empty>
  );
}

export function PlaceList({ reports, selected = "", limit = 1000, onSelect }) {
  const places = placesFor(reports).slice(0, limit);
  return places.length ? (
    places.map((place) => (
      <button
        key={place.key}
        className={`place-row ${selected === place.key ? "selected" : ""}`}
        onClick={() => onSelect(place.key)}
        aria-pressed={selected === place.key}
      >
        <span>
          {place.label || place.raw}
          <em>
            {place.anomaly
              ? "Source formatting issue · original preserved"
              : place.country || "Country not specified"}
          </em>
          <span
            className="bar-track"
            aria-hidden="true"
            style={{ display: "block" }}
          >
            <span
              className="bar-fill"
              style={{
                width: `${(place.count / places[0].count) * 100}%`,
                display: "block",
              }}
            />
          </span>
        </span>
        <span className="count">{place.count}</span>
      </button>
    ))
  ) : (
    <Empty>No locations in the current results.</Empty>
  );
}

export function TimelineView({
  reports,
  findings,
  mode,
  limit = 40,
  onMore,
  onOpen,
}) {
  const entries = timelineEntries(reports, findings, mode);
  const months = new Map();
  for (const entry of entries) {
    const key = entry.start.slice(0, 7);
    months.set(key, (months.get(key) || 0) + 1);
  }
  const sorted = [...months].sort(([a], [b]) => a.localeCompare(b));
  const highest = Math.max(1, ...months.values());
  return (
    <>
      {entries.length > 0 && (
        <>
          <div
            className="histogram"
            role="img"
            aria-label={`Monthly entry counts; ${entries.length} dated entries. Dates and sources are listed below.`}
          >
            {sorted.map(([month, count]) => (
              <div
                className="column"
                key={month}
                title={`${month}: ${count} entries`}
              >
                <span style={{ height: `${(count / highest) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="axis">
            <span>{sorted[0][0]}</span>
            <span>Counts by represented month</span>
            <span>{sorted.at(-1)[0]}</span>
          </div>
        </>
      )}
      <p className="read-note">
        {mode === "events"
          ? "Curated from report narratives. Scheduled travel and stated deadlines are labeled; an attack date is not established."
          : mode === "publication"
            ? "Publication chronology. Partial dates retain their original precision."
            : "Dates from DATES fields, including background history. Year-only dates occupy an interval; the first day is only a sorting boundary."}{" "}
        {entries.length} dated entries.
      </p>
      <div className="timeline-list">
        {entries.length ? (
          entries.slice(0, limit).map((entry, index) => (
            <article
              className="timeline-item"
              key={`${entry.title}-${entry.start}-${index}`}
            >
              <div className="time-date">
                {dateLabel(entry)}
                {entry.end &&
                  entry.end !== entry.start &&
                  entry.precision === "day" && (
                    <>
                      <br />
                      to {dateLabel({ start: entry.end, precision: "day" })}
                    </>
                  )}
              </div>
              <div>
                <span className="badge">{entry.kind}</span>
                <h3>{entry.title}</h3>
                {entry.place && <p>{entry.place}</p>}
                {entry.precision !== "day" && (
                  <p>
                    Uncertainty interval: {entry.start} to {entry.end}
                  </p>
                )}
                <Refs ids={entry.reportIds} onOpen={onOpen} />
              </div>
            </article>
          ))
        ) : (
          <Empty>No dated entries match the current filters.</Empty>
        )}
      </div>
      {entries.length > limit && (
        <button className="secondary" onClick={onMore}>
          Show {Math.min(60, entries.length - limit)} more entries
        </button>
      )}
    </>
  );
}

export function RoutesView({ finding, onOpen }) {
  if (!finding)
    return (
      <p className="subtle">
        Choose an investigation to see its evidence-linked route.
      </p>
    );
  return (
    <>
      <p className="subtle">
        Schematic relationships from reports; arrows do not imply a verified
        shipment or geographic distance.
      </p>
      <div className="routes">
        {finding.routes.map((route, index) => (
          <div className="route" key={index}>
            <span>{route.from}</span>
            <svg className="arrow" viewBox="0 0 30 20" aria-hidden="true">
              <path
                d="M1 10H27M20 4l7 6-7 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span>
              {route.to}
              <small>{route.label}</small>
            </span>
            <Refs ids={route.reportIds} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </>
  );
}
