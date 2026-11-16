# Intelligence Report Explorer

A React dashboard for Project 3. The application connects 111 original reports with four curated investigations, people, co-mentions, dates, places, and source evidence.

## Run the React app

Requirements: Node.js 20.19+ or 22.12+, npm, and a modern browser. Python 3.10+ is needed only to regenerate the dataset or use the optional static server.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally http://127.0.0.1:5173. Keep the terminal running and press Ctrl+C to stop.

## Production build

```bash
npm run build
npm run preview
```

Alternatively, after building, run `python3 run.py` and open http://127.0.0.1:8000. Use `python3 run.py --port 8001` if that port is busy. The finished app works locally without an account, API key, or internet connection. Do not open `index.html` directly; use a local server.

## Use

1. Choose an investigation on Overview to inspect the possible plan, dates, places, people, and evidence chain.
2. Select a person in People & links. Counts measure distinct reports, and network lines represent co-mentions. Neither is a guilt score.
3. Open Timeline to compare curated events, publication dates, and mentioned dates. Scheduled travel and deadlines are labeled; they are not confirmed attack dates.
4. Open Places & routes to inspect source-linked schematic routes and filter by a reported location.
5. Combine agency, publication year, literal text search, people, and place filters. Remove an active chip or use Reset filters to broaden the results.
6. Select a source-ID button or report result to read the original narrative. A notice identifies a referenced source outside the current filters.
7. Pin reports, add notes in Notebook, and export a JSON evidence bundle. Notes and pins stay in this browser. Export before clearing browser data.
8. Open Guide & quality to inspect source inconsistencies, identity ambiguity, date precision, and alias provenance.

## Data and checks

The supplied `data/dataset.txt` is unchanged. `data/findings.json` holds curated claims and their source IDs. To regenerate the dashboard collection and run checks:

```bash
python3 scripts/prepare_data.py
python3 -m unittest discover -s tests -p 'test_*.py'
npm test
npm run build
```

The parser rejects duplicate IDs and missing fields and validates curated evidence. React rendering tests check literal search highlighting, escaped source text, source links, and empty states. Analytical tests cover combined filters, aliases, distinct-report counts, graph provenance, uncertain dates, and browser storage failures.

## Source structure

- `web/app.jsx`: React state, linked filters, local persistence, and export.
- `web/components/`: investigation views, analysis panels, and evidence reader.
- `web/views.jsx`: reusable React charts, lists, timeline, and source links.
- `web/model.js`: pure analytical functions.
- `web/styles.css`: responsive dashboard styling.
- `web/public/data.json`: generated browser collection.
- `data/`: original reports and curated findings.
- `scripts/prepare_data.py`: reproducible parsing and validation.
- `tests/`: data, model, and React rendering checks.

## Interpretation

The interface distinguishes reported evidence, informant reports, anonymous claims, and inferences. Seven documented alias groups are combined for counts; initials and generic first names remain separate. The same-name Abdul al Nami ambiguity is flagged. Locations preserve source errors, so routes are schematics rather than a geographic map. The dataset does not establish an exact attack date, decode the biological shipment codes, or confirm a Texas disease outbreak.

The separately delivered project report uses Times New Roman 12-point text and single spacing. Group names and contributions are blank for the group to complete before submission.

## Libraries

The interface uses React and React DOM with Vite for development and production builds. The network uses native SVG. No external visualization, map, font, or backend service is required. Dependency versions are pinned by `package-lock.json`.
# 626-project3
