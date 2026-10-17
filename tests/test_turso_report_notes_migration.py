import importlib.util
import sqlite3
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('notes_sync', Path(__file__).resolve().parents[1] / 'deploy/scripts/generate-turso-sync-sql.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class ReportNotesMigrationTests(unittest.TestCase):
    def database(self, notes=False):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.row_factory = sqlite3.Row
        for table in sync.CATALOG_TABLES:
            extra = ', resultado1 TEXT, resultado2 TEXT' if table == 'works' else ''
            if table == 'works' and notes:
                extra += ', notas TEXT'
            db.execute(f'CREATE TABLE {table} (id TEXT PRIMARY KEY{extra})')
        db.execute("INSERT INTO works (id, resultado1, resultado2) VALUES ('obra', 'Uno', 'Dos')")
        db.commit()
        return db

    def test_adds_nullable_notes_and_preserves_results_and_literal_paragraphs(self):
        local, remote = self.database(True), self.database()
        note = 'Como se apunta en «Artículo»:\n\nUn <i>título</i> y un apóstrofo: d\'Aragón.\n\nSegundo párrafo.\nVerso siguiente.'
        local.execute('UPDATE works SET notas=?', (note,))
        columns, migrations = sync.validate_schema(local, remote)
        self.assertEqual(sync.rows_by_id(remote, 'works', columns['works'])['obra'], ('obra', 'Uno', 'Dos', None))
        remote.executescript('\n'.join(['BEGIN;', *migrations,
            sync.make_upsert_sql('works', columns['works'], local.execute('SELECT * FROM works').fetchone()), 'COMMIT;']))
        row = remote.execute('SELECT resultado1, resultado2, notas FROM works').fetchone()
        self.assertEqual(tuple(row), ('Uno', 'Dos', note))
        self.assertEqual(sync.validate_schema(local, remote)[1], [])


if __name__ == '__main__':
    unittest.main()
