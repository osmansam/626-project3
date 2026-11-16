const keyOf = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export function canonicalName(name, aliases = []) {
  return (
    aliases.find((group) =>
      group.names.some((alias) => keyOf(alias) === keyOf(name)),
    )?.canonical ?? name
  );
}

export function filterReports(
  reports,
  state = {},
  findings = [],
  aliases = [],
) {
  const thread = findings.find((item) => item.id === state.thread);
  const query = keyOf(state.query);
  return reports.filter((report) => {
    if (thread && !thread.reportIds.includes(report.id)) return false;
    if (state.agency && report.agency !== state.agency) return false;
    if (state.year && !report.date.start?.startsWith(state.year)) return false;
    if (
      state.person &&
      !report.persons.some(
        (name) => keyOf(canonicalName(name, aliases)) === keyOf(state.person),
      )
    )
      return false;
    if (
      state.place &&
      !report.places.some((place) => place.key === state.place)
    )
      return false;
    if (state.pinnedOnly && !state.pins?.includes(report.id)) return false;
    return (
      !query || keyOf(Object.values(report.original).join(" ")).includes(query)
    );
  });
}

export function peopleFor(reports, aliases = []) {
  const result = new Map();
  for (const report of reports) {
    for (const name of new Set(
      report.persons.map((value) => canonicalName(value, aliases)),
    )) {
      const item = result.get(name) ?? { name, count: 0, reportIds: [] };
      item.count += 1;
      item.reportIds.push(report.id);
      result.set(name, item);
    }
  }
  return [...result.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

export function placesFor(reports) {
  const result = new Map();
  for (const report of reports) {
    const seen = new Set();
    for (const place of report.places) {
      if (seen.has(place.key)) continue;
      seen.add(place.key);
      const item = result.get(place.key) ?? {
        ...place,
        count: 0,
        reportIds: [],
      };
      item.count++;
      item.reportIds.push(report.id);
      result.set(place.key, item);
    }
  }
  return [...result.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

export function cooccurrence(reports, aliases = [], limit = 12) {
  const nodes = peopleFor(reports, aliases).slice(0, limit);
  const allowed = new Set(nodes.map((node) => node.name));
  const edges = new Map();
  for (const report of reports) {
    const names = [
      ...new Set(report.persons.map((name) => canonicalName(name, aliases))),
    ]
      .filter((name) => allowed.has(name))
      .sort();
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = JSON.stringify([names[i], names[j]]);
        const edge = edges.get(key) ?? {
          source: names[i],
          target: names[j],
          count: 0,
          reportIds: [],
        };
        edge.count++;
        edge.reportIds.push(report.id);
        edges.set(key, edge);
      }
    }
  }
  return { nodes, edges: [...edges.values()] };
}

export function timelineEntries(reports, findings, mode) {
  const visible = new Set(reports.map((report) => report.id));
  let entries;
  if (mode === "events") {
    entries = findings
      .flatMap((finding) =>
        finding.events.map((event) => ({
          ...event,
          thread: finding.id,
          precision: "day",
        })),
      )
      .filter((event) => event.reportIds.some((id) => visible.has(id)));
  } else {
    entries = reports.flatMap((report) =>
      (mode === "mentioned" ? report.dates : [report.date]).map((date) => ({
        ...date,
        title: mode === "mentioned" ? `Mentioned in ${report.id}` : report.id,
        place: "",
        reportIds: [report.id],
        kind: mode === "mentioned" ? "Mentioned date" : "Publication",
      })),
    );
  }
  return entries
    .filter((event) => event.start)
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) || a.title.localeCompare(b.title),
    );
}

export function loadWorkspace(storage) {
  try {
    const value = JSON.parse(
      storage?.getItem("report-explorer-workspace") ?? "null",
    );
    if (value && Array.isArray(value.pins) && typeof value.notes === "string") {
      return {
        pins: [...new Set(value.pins.filter((id) => typeof id === "string"))],
        notes: value.notes,
      };
    }
  } catch {
    /* Storage can be disabled or contain an older malformed value. */
  }
  return { pins: [], notes: "" };
}

export function saveWorkspace(storage, workspace) {
  try {
    storage.setItem("report-explorer-workspace", JSON.stringify(workspace));
    return true;
  } catch {
    return false;
  }
}
