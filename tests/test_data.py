import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('prepare_data', ROOT / 'scripts/prepare_data.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = module.build_dataset(ROOT / 'data/dataset.txt', ROOT / 'data/findings.json')

    def test_all_reports_and_original_text_are_preserved(self):
        reports = self.data['reports']
        self.assertEqual(len(reports), 111)
        self.assertEqual(len({r['id'] for r in reports}), 111)
        self.assertTrue(all(len(r['original']) == 9 for r in reports))
        self.assertIn('Walden Ave', reports[0]['description'])

    def test_reference_and_claim_provenance(self):
        ids = {r['id'] for r in self.data['reports']}
        self.assertTrue(all(ref in ids for r in self.data['reports'] for ref in r['references']))
        self.assertEqual(len(self.data['findings']), 4)
        for finding in self.data['findings']:
            self.assertTrue(set(finding['reportIds']) <= ids)
            for claim in finding['claims']:
                self.assertTrue(claim['reportIds'])
                self.assertTrue(set(claim['reportIds']) <= set(finding['reportIds']))
            for event in finding['events']:
                self.assertTrue(set(event['reportIds']) <= ids)

    def test_partial_dates_preserve_precision(self):
        month = module.parse_date('4/ /2003')
        self.assertEqual(month['precision'], 'month')
        self.assertEqual(month['start'], '2003-04-01')
        self.assertEqual(month['end'], '2003-04-30')
        year = module.parse_date('/ /1999')
        self.assertEqual(year['precision'], 'year')
        self.assertEqual(year['end'], '1999-12-31')
        self.assertEqual(module.parse_date('')['precision'], 'unknown')

    def test_invalid_dates_are_not_silently_changed(self):
        for value in ['2/30/2004', '13/1/2004', 'nonsense']:
            self.assertEqual(module.parse_date(value)['precision'], 'invalid')

    def test_place_anomaly_and_identity_caution(self):
        row = next(r for r in self.data['reports'] if r['id'] == 'FBI_31')
        self.assertTrue(any(p['anomaly'] for p in row['places']))
        self.assertIn('562 Fenkell', str(row['original']))
        self.assertTrue(any('same name' in issue['detail'].lower() for issue in self.data['quality']))

    def test_parser_rejects_duplicate_ids_and_missing_fields(self):
        source = (ROOT / 'data/dataset.txt').read_text()
        with self.assertRaises(ValueError):
            module.parse_reports(source + '\n' + source)
        with self.assertRaises(ValueError):
            module.parse_reports('REPORT\nID: X\nREPORTDATE: 1/1/2004')


if __name__ == '__main__':
    unittest.main()
