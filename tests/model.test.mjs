import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  filterReports,
  peopleFor,
  placesFor,
  cooccurrence,
  timelineEntries,
  loadWorkspace,
  saveWorkspace,
  canonicalName,
} from "../web/model.js";
const data = JSON.parse(
  readFileSync(new URL("../web/public/data.json", import.meta.url)),
);
const reports = data.reports;

test("combined filters intersect rather than leak other investigations", () => {
  const rows = filterReports(
    reports,
    { thread: "utilities", agency: "FBI", year: "2004", query: "Fenkell" },
    data.findings,
    data.aliases,
  );
  assert.ok(rows.length > 0);
  assert.ok(
    rows.every(
      (r) =>
        r.agency === "FBI" &&
        r.date.start.startsWith("2004") &&
        r.description.toLowerCase().includes("fenkell"),
    ),
  );
});
test("empty result and unknown query are handled", () => {
  assert.deepEqual(
    filterReports(reports, { query: "no-such-person-9482" }, data.findings),
    [],
  );
  assert.equal(filterReports(reports, {}, data.findings).length, 111);
});
test("aliases match all relevant raw mentions without merging generic names", () => {
  assert.equal(
    canonicalName("Mehdi Rafiki", data.aliases),
    "Abdillah Zinedine",
  );
  assert.equal(canonicalName("Ali", data.aliases), "Ali");
  const selected = filterReports(
    reports,
    { person: "Abdillah Zinedine" },
    data.findings,
    data.aliases,
  );
  assert.ok(selected.some((r) => r.id === "FBI_4"));
});
test("person and place filters compose and preserve source IDs", () => {
  const place = reports.find((r) => r.id === "FBI_1").places[0];
  const rows = filterReports(
    reports,
    { place: place.key, person: "Abdillah Zinedine" },
    data.findings,
    data.aliases,
  );
  assert.ok(rows.some((r) => r.id === "FBI_1"));
  assert.ok(rows.every((r) => r.places.some((p) => p.key === place.key)));
});
test("query symbols are treated literally", () => {
  assert.doesNotThrow(() =>
    filterReports(reports, { query: "[<.*" }, data.findings),
  );
  assert.equal(
    filterReports(reports, { query: "[<.*" }, data.findings).length,
    0,
  );
});
test("counts are distinct reports, not duplicate mentions", () => {
  const people = peopleFor([{ id: "T", persons: ["A", "A", "B"] }], []);
  assert.equal(people.find((p) => p.name === "A").count, 1);
  assert.equal(
    placesFor([
      {
        id: "T",
        places: [
          { key: "x", label: "X" },
          { key: "x", label: "X" },
        ],
      },
    ])[0].count,
    1,
  );
});
test("graph links include auditable co-mention report IDs", () => {
  const graph = cooccurrence(reports, data.aliases, 12);
  assert.ok(graph.nodes.length <= 12);
  assert.ok(
    graph.edges.every(
      (e) => e.reportIds.length === e.count && e.source !== e.target,
    ),
  );
});
test("timeline separates publication, mentioned dates, and curated events", () => {
  assert.equal(
    timelineEntries(reports, data.findings, "publication").length,
    111,
  );
  const partial = timelineEntries(reports, data.findings, "publication").find(
    (e) => e.reportIds.includes("CIA_7"),
  );
  assert.equal(partial.precision, "month");
  const events = timelineEntries(reports, data.findings, "events");
  assert.ok(
    events.some(
      (e) => e.title.includes("Viking Holiday") && e.start === "2004-12-18",
    ),
  );
  assert.ok(
    events.every((e) =>
      e.reportIds.every((id) => reports.some((r) => r.id === id)),
    ),
  );
  assert.ok(
    timelineEntries(reports, data.findings, "mentioned").some(
      (e) => e.precision === "year",
    ),
  );
});
test("curated events are restricted to visible supporting reports", () => {
  const events = timelineEntries(
    reports.filter((r) => r.id === "FBI_41"),
    data.findings,
    "events",
  );
  assert.ok(events.length > 0);
  assert.ok(events.every((e) => e.reportIds.includes("FBI_41")));
});
test("workspace survives storage roundtrip and corrupted storage is ignored", () => {
  let value;
  const storage = {
    getItem: () => value,
    setItem: (key, next) => {
      value = next;
    },
  };
  const workspace = { pins: ["FBI_1"], notes: "Check sources" };
  assert.equal(saveWorkspace(storage, workspace), true);
  assert.deepEqual(loadWorkspace(storage), workspace);
  value = "{broken";
  assert.deepEqual(loadWorkspace(storage), { pins: [], notes: "" });
  assert.deepEqual(
    loadWorkspace({
      getItem() {
        throw Error("blocked");
      },
    }),
    { pins: [], notes: "" },
  );
  assert.equal(
    saveWorkspace(
      {
        setItem() {
          throw Error("full");
        },
      },
      workspace,
    ),
    false,
  );
});
