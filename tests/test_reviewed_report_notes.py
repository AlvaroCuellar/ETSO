import copy
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('notes_importer', Path(__file__).resolve().parents[1] / 'scripts/apply-reviewed-report-notes.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReviewedNotesTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.source = Path(self.directory.name) / 'source.pdf'
        self.source.write_bytes(b'verified source fixture')
        self.note = dict(id='case-1', reviewStatus='verified_for_catalog', source=dict(path=str(self.source), sha256=hashlib.sha256(self.source.read_bytes()).hexdigest()), standaloneParagraphs=['Primer párrafo <i>literal</i>.', 'Verso uno\nverso dos.'], mode='literal', workIds=['WORK'], referenceKey='article', pages=[12])
        self.bibliography = dict(entriesByKey=dict(article=dict(author='Autora', year='2026', title='Estudio', doi='10.1/example')))

    def build(self, note=None):
        return module.build_notes(dict(schemaVersion=1, notes=[note or self.note]), self.bibliography)

    def test_preserves_paragraphs_verses_and_distinguishes_summary(self):
        literal = self.build()['WORK']
        self.assertIn('\n\nPrimer párrafo <i>literal</i>.\n\nVerso uno\nverso dos.', literal)
        self.assertTrue(literal.startswith('Como se apunta en '))
        summary = copy.deepcopy(self.note)
        summary['mode'] = 'summary'
        self.assertTrue(self.build(summary)['WORK'].startswith('Resumen del estudio: '))

    def test_refuses_changed_source_or_unreviewed_note(self):
        self.source.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'Source changed'):
            self.build()
        self.note['reviewStatus'] = 'pending'
        with self.assertRaisesRegex(ValueError, 'Unreviewed note'):
            self.build()

    def test_rejects_duplicate_record_and_empty_mapping(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate note id'):
            module.build_notes(dict(schemaVersion=1, notes=[self.note, self.note]), self.bibliography)
        self.note['workIds'] = []
        with self.assertRaisesRegex(ValueError, 'No mapped work'):
            self.build()

if __name__ == '__main__':
    unittest.main()
