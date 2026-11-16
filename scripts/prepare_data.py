"""Convert the report collection into validated, traceable dashboard data."""

import calendar
import datetime as dt
import json
import re
from pathlib import Path

FIELDS = {'ID', 'REPORTDATE', 'REFERENCEID', 'REPORTSOURCE', 'REPORTDESCRIPTION',
          'PERSONS', 'DATES', 'PLACES', 'ORGANIZATIONS'}
ROOT = Path(__file__).resolve().parents[1]


def parse_date(value):
    """Keep uncertain dates as intervals instead of supplying an invented day."""
    result = {'raw': value.strip(), 'precision': 'unknown', 'start': None, 'end': None}
    if not value.strip():
        return result
    match = re.fullmatch(r'\s*(\d{0,2})\s*/\s*(\d{0,2})\s*/\s*(\d{4})\s*', value)
    if not match:
        return {**result, 'precision': 'invalid'}
    month, day, year = (int(x) if x else None for x in match.groups())
    try:
        if not month and not day:
            start, end, precision = dt.date(year, 1, 1), dt.date(year, 12, 31), 'year'
        elif month and not day:
            start = dt.date(year, month, 1)
            end, precision = dt.date(year, month, calendar.monthrange(year, month)[1]), 'month'
        else:
            start = end = dt.date(year, month, day)
            precision = 'day'
        return {**result, 'precision': precision, 'start': start.isoformat(), 'end': end.isoformat()}
    except (ValueError, TypeError):
        return {**result, 'precision': 'invalid'}


def split_values(value):
    return list(dict.fromkeys(x.strip() for x in value.split(';') if x.strip()))


def parse_place(value):
    parts = [re.sub(r'\s+', ' ', x).strip() for x in value.split('/')]
    anomaly = len(parts) != 4
    # One source record has an extra empty segment; retain the raw value and flag it.
    if len(parts) == 5 and not parts[1]:
        parts.pop(1)
    parts = (parts + [''] * 4)[:4]
    address, city, region, country = parts
    return {'raw': value, 'address': address, 'city': city, 'region': region,
            'country': country, 'label': ', '.join(x for x in parts if x),
            'key': '|'.join(x.casefold() for x in parts), 'anomaly': anomaly}


def parse_reports(text):
    records, seen = [], set()
    for block in re.split(r'(?m)^REPORT\s*$', text):
        if not block.strip():
            continue
        original = {}
        current = None
        for line in block.splitlines():
            head, sep, tail = line.partition(':')
            if sep and head in FIELDS:
                if head in original:
                    raise ValueError(f'Duplicate field {head}')
                current = head
                original[head] = tail.strip()
            elif line.strip() and current:
                original[current] += '\n' + line
        if set(original) != FIELDS:
            raise ValueError(f'Missing fields: {sorted(FIELDS - set(original))}')
        report_id = original['ID']
        if report_id in seen:
            raise ValueError(f'Duplicate report ID: {report_id}')
        seen.add(report_id)
        records.append({
            'id': report_id, 'agency': report_id.split('_')[0],
            'date': parse_date(original['REPORTDATE']),
            'source': original['REPORTSOURCE'], 'description': original['REPORTDESCRIPTION'],
            'references': split_values(original['REFERENCEID']),
            'persons': split_values(original['PERSONS']),
            'dates': [parse_date(x) for x in split_values(original['DATES'])],
            'places': [parse_place(x) for x in split_values(original['PLACES'])],
            'organizations': split_values(original['ORGANIZATIONS']), 'original': original,
        })
    return records


def build_dataset(path, findings_path):
    reports = parse_reports(Path(path).read_text(encoding='utf-8'))
    curated = json.loads(Path(findings_path).read_text(encoding='utf-8'))
    ids = {r['id'] for r in reports}
    for finding in curated['findings']:
        used = set(finding['reportIds'])
        if not used <= ids:
            raise ValueError(f'Unknown evidence IDs in {finding["id"]}')
        for item in finding['claims'] + finding['events'] + finding['people']:
            if not item['reportIds'] or not set(item['reportIds']) <= used:
                raise ValueError(f'Invalid claim provenance in {finding["id"]}')
    quality = [
        {'reportIds': ['FBI_18', 'FBI_20', 'FBI_36'], 'kind': 'Identity',
         'detail': 'Two people have the same name Abdul al Nami. The utility employee lives at 562 Fenkell Ave.; the teacher lives at 766 Livernois Rd. Name counts combine mentions and do not establish identity.'},
        {'reportIds': ['NSA_20'], 'kind': 'Location conflict',
         'detail': 'The introduction says the call went to Havana; its receiving phone is explicitly described as the Seashore Hotel in Nassau. The inconsistency is retained.'},
        {'reportIds': ['FBI_41'], 'kind': 'Date omission',
         'detail': 'The narrative includes September 21, November 7 and 14, and December 17 travel dates missing from DATES. Curated travel events cite the narrative.'},
        {'reportIds': ['FBI_37', 'FBI_38'], 'kind': 'Location conflict',
         'detail': 'Cartagena is encoded with Columbia as a region and USA as country. Original labels are preserved rather than treated as reliable coordinates.'},
        {'reportIds': ['FBI_25'], 'kind': 'Reference mismatch',
         'detail': 'REFERENCEID points to FBI_20, but the narrative discusses the Houston militia investigation. A reference link records the source field and does not certify relevance.'},
        {'reportIds': ['CIA_16', 'FBI_34'], 'kind': 'Reference mismatch',
         'detail': 'The Derwish email is NSA_4. CIA_16 describes its report date inconsistently; FBI_34 references NSA_1 while describing that email. Original reference IDs are preserved.'},
    ]
    for report in reports:
        if report['date']['precision'] != 'day':
            quality.append({'reportIds': [report['id']], 'kind': 'Partial date',
                            'detail': f'Publication date {report["date"]["raw"]} has {report["date"]["precision"]} precision.'})
        for place in report['places']:
            if place['anomaly']:
                quality.append({'reportIds': [report['id']], 'kind': 'Place syntax',
                                'detail': f'Extra slash-delimited segment in {place["raw"]}; original retained.'})
        for ref in report['references']:
            if ref not in ids:
                quality.append({'reportIds': [report['id']], 'kind': 'Missing reference', 'detail': f'{ref} is not in the dataset.'})
    return {'title': 'Intelligence Report Explorer', 'reports': reports,
            'findings': curated['findings'], 'aliases': curated['aliases'], 'quality': quality}


if __name__ == '__main__':
    data = build_dataset(ROOT / 'data/dataset.txt', ROOT / 'data/findings.json')
    target = ROOT / 'web/public/data.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(data["reports"])} reports, {len(data["findings"])} investigations, {len(data["quality"])} quality notes -> {target}')
