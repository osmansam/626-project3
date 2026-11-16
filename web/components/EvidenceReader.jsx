import React, { useEffect, useRef } from "react";
import { canonicalName } from "../model.js";
import { Refs, Empty, Highlight, dateLabel } from "../views.jsx";

export default function EvidenceReader({
  data,
  rows,
  reportId,
  pins,
  query,
  onOpen,
  onPin,
  onPerson,
  onPlace,
}) {
  const report = data.reports.find((item) => item.id === reportId);
  const outside = report && !rows.some((item) => item.id === report.id);
  const resultList = useRef(null);
  useEffect(() => {
    const selected = resultList.current?.querySelector(".result.active");
    if (selected)
      resultList.current.scrollTop =
        selected.offsetTop - resultList.current.offsetTop;
  }, [reportId]);
  return (
    <aside className="reader" aria-label="Evidence reader">
      <div className="reader-head">
        <div className="panel-title">
          <h2>Evidence reader</h2>
          <span className="badge">
            {rows.length} / {data.reports.length}
          </span>
        </div>
        <p>Original reports · click any source to inspect</p>
      </div>
      <div
        className="reader-results"
        ref={resultList}
        aria-label="Matching reports"
      >
        {rows.length ? (
          rows.map((item) => (
            <button
              className={`result ${reportId === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => onOpen(item.id)}
              aria-label={`Open ${item.id}`}
            >
              <span className="result-top">
                <strong>{item.id}</strong>
                <span>{dateLabel(item.date)}</span>
              </span>
              <p>
                <Highlight text={item.description} query={query} />
              </p>
            </button>
          ))
        ) : (
          <Empty>
            No matching reports. Remove a filter or try another search.
          </Empty>
        )}
      </div>
      <div className="reader-body">
        {report ? (
          <>
            <div className="report-top">
              <h3>{report.id}</h3>
              <button
                className={`pin ${pins.includes(report.id) ? "pinned" : ""}`}
                onClick={() => onPin(report.id)}
              >
                {pins.includes(report.id) ? "Unpin report" : "Pin report"}
              </button>
            </div>
            {outside && (
              <div className="caution">
                This source is outside the current filtered results. Filters are
                still active.
              </div>
            )}
            <dl className="report-meta">
              <dt>Published</dt>
              <dd>{dateLabel(report.date)}</dd>
              <dt>Agency</dt>
              <dd>{report.agency}</dd>
              <dt>Source</dt>
              <dd>{report.source || "Not supplied"}</dd>
            </dl>
            <div className="report-text">
              <Highlight text={report.description} query={query} />
            </div>
            <h4>Referenced reports</h4>
            {report.references.length ? (
              <Refs ids={report.references} onOpen={onOpen} />
            ) : (
              <p className="subtle">None listed</p>
            )}
            <h4>People as recorded</h4>
            <div className="entity-tags">
              {report.persons.length ? (
                report.persons.map((name) => (
                  <button
                    key={name}
                    className="entity-tag"
                    onClick={() => onPerson(canonicalName(name, data.aliases))}
                  >
                    {name}
                  </button>
                ))
              ) : (
                <p className="subtle">None listed</p>
              )}
            </div>
            <h4>Dates as recorded</h4>
            {report.dates.length ? (
              report.dates.map((date, index) => (
                <span className="date-tag" key={index} title={date.raw}>
                  {dateLabel(date)}
                </span>
              ))
            ) : (
              <p className="subtle">None listed</p>
            )}
            <h4>Places as recorded</h4>
            <div className="entity-tags">
              {report.places.length ? (
                report.places.map((place, index) => (
                  <button
                    key={`${place.key}-${index}`}
                    className="entity-tag"
                    title={place.raw}
                    onClick={() => onPlace(place.key)}
                  >
                    {place.label}
                  </button>
                ))
              ) : (
                <p className="subtle">None listed</p>
              )}
            </div>
            <h4>Organizations as recorded</h4>
            <p className="subtle">
              {report.organizations.join(" · ") || "None listed"}
            </p>
            {data.quality
              .filter((issue) => issue.reportIds.includes(report.id))
              .map((issue, index) => (
                <div className="caution" key={index}>
                  <strong>{issue.kind}</strong>
                  <br />
                  {issue.detail}
                </div>
              ))}
            <details className="read-note">
              <summary>Original structured fields</summary>
              <pre className="original-fields">
                {Object.entries(report.original)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join("\n")}
              </pre>
            </details>
          </>
        ) : (
          <Empty>Select a source report to begin.</Empty>
        )}
      </div>
    </aside>
  );
}
