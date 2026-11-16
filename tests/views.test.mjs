import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

const output = await build({
  entryPoints: ["web/views.jsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { Highlight, Refs, Empty, NetworkView, TimelineView } = await import(
  `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`
);
const render = (component, props) =>
  renderToStaticMarkup(React.createElement(component, props));

test("React escapes report text and treats search terms literally", () => {
  const html = render(Highlight, {
    text: "<script>alert(1)</script> [x]",
    query: "[x]",
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("<mark>[x]</mark>"));
});
test("evidence buttons preserve report IDs", () => {
  const html = render(Refs, { ids: ["FBI_35", "FBI_40"], onOpen() {} });
  assert.ok(html.includes("Read report FBI_35"));
  assert.ok(html.includes("Read report FBI_40"));
});
test("empty states and empty network render meaningful text", () => {
  assert.ok(
    render(Empty, { children: "No reports match" }).includes(
      "No reports match",
    ),
  );
  assert.ok(
    render(NetworkView, { reports: [], aliases: [] }).includes("No people"),
  );
});
test("timeline explains partial dates and empty results", () => {
  const html = render(TimelineView, {
    reports: [],
    findings: [],
    mode: "publication",
    onOpen() {},
  });
  assert.ok(html.includes("Partial dates"));
  assert.ok(html.includes("No dated entries"));
});
