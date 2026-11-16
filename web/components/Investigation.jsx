import React from "react";
import { canonicalName } from "../model.js";
import { Refs } from "../views.jsx";

export function ThreadCards({ findings, selected, onSelect }) {
  return (
    <>
      <div className="section-head">
        <h2>Investigation threads</h2>
        <small>Curated findings · linked sources</small>
      </div>
      <div className="thread-grid">
        {findings.map((finding) => (
          <button
            className={`thread-card ${selected === finding.id ? "selected" : ""}`}
            key={finding.id}
            onClick={() => onSelect(finding.id)}
            aria-pressed={selected === finding.id}
          >
            <div className="card-meta">
              <span className="number">{finding.number}</span>
              <span className={`badge ${finding.color}`}>{finding.status}</span>
            </div>
            <h3>{finding.title}</h3>
            <p>{finding.short}</p>
            <div className="card-bottom">
              <span>{finding.reportIds.length} source reports</span>
              <span className="card-arrow" aria-hidden="true">
                ↗
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

export function FindingDetail({ finding, aliases, onOpen, onPerson }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>{finding.title}</h2>
        <span className={`badge ${finding.color}`}>{finding.status}</span>
      </div>
      <p className="story-summary">{finding.summary}</p>
      <div className="question-grid">
        {[
          ["What is the possible plan?", finding.plan],
          ["When?", finding.when],
          ["Where?", finding.where],
        ].map(([label, text]) => (
          <div className="question-box" key={label}>
            <small>{label}</small>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="caution">
        <strong>What remains uncertain</strong>
        <br />
        {finding.uncertainty}
      </div>
      <div className="section-head">
        <h2>Who merits investigation?</h2>
        <small>Roles supported by cited reports</small>
      </div>
      {finding.people.map((person) => (
        <div className="claim" key={person.name}>
          <button
            className="text-button"
            onClick={() => onPerson(canonicalName(person.name, aliases))}
          >
            {person.name}
          </button>
          <p>{person.role}</p>
          <Refs ids={person.reportIds} onOpen={onOpen} />
        </div>
      ))}
      <div className="section-head">
        <h2>Evidence chain</h2>
      </div>
      {finding.claims.map((claim, index) => (
        <article className="claim" key={index}>
          <span className="badge">{claim.status}</span>
          <p>{claim.text}</p>
          <Refs ids={claim.reportIds} onOpen={onOpen} />
        </article>
      ))}
    </section>
  );
}
