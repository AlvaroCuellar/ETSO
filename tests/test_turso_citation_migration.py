import importlib.util
import sqlite3
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location(
    'citation_sync',
    Path(__file__).resolve().parents[1] / 'deploy/scripts/generate-turso-sync-sql.py',
)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class CitationMigrationTests(unittest.TestCase):
    def database(self, citation=False, indexed=True):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.row_factory = sqlite3.Row
        for table in sync.CATALOG_TABLES:
            fields = ', titulo TEXT, asodat_id INTEGER' if table == 'works' else ''
            if table == 'works' and citation:
                fields += ', citar TEXT'
            db.execute(f'CREATE TABLE {table} (id TEXT PRIMARY KEY{fields})')
        db.execute("INSERT INTO works (id, titulo, asodat_id) VALUES ('example', 'Comedia', 1234)")
        db.execute('CREATE INDEX idx_works_titulo ON works(titulo)')
        if citation:
            db.execute("UPDATE works SET citar='general'")
            if indexed:
                db.execute('CREATE INDEX idx_works_citar ON works(citar)')
        db.commit()
        return db

    def test_drop_preserves_data_and_other_indexes_and_is_idempotent(self):
        local = self.database()
        remote = self.database(citation=True)
        columns, migrations = sync.validate_schema(local, remote)
        self.assertEqual(migrations, [
            'DROP INDEX IF EXISTS "idx_works_citar";',
            'ALTER TABLE "works" DROP COLUMN "citar";',
        ])
        remote.executescript('\n'.join(['BEGIN;', *migrations, 'COMMIT;']))
        self.assertEqual(sync.rows_by_id(remote, 'works', columns['works']),
                         sync.rows_by_id(local, 'works', columns['works']))
        self.assertNotIn('citar', sync.get_columns(remote, 'works'))
        indexes = {row['name'] for row in remote.execute('PRAGMA index_list(works)')}
        self.assertIn('idx_works_titulo', indexes)
        self.assertIn('sqlite_autoindex_works_1', indexes)
        self.assertNotIn('idx_works_citar', indexes)
        self.assertEqual(sync.validate_schema(local, remote)[1], [])
        self.assertEqual(remote.execute('PRAGMA integrity_check').fetchone()[0], 'ok')

    def test_drop_without_legacy_index_and_with_other_supported_cleanup(self):
        local = self.database()
        remote = self.database(citation=True, indexed=False)
        remote.execute('ALTER TABLE works ADD COLUMN tipo_transcripcion TEXT')
        columns, migrations = sync.validate_schema(local, remote)
        remote.executescript('\n'.join(migrations))
        self.assertEqual(sync.get_columns(remote, 'works'), columns['works'])
        self.assertEqual(sync.validate_schema(local, remote)[1], [])

    def test_unknown_changes_are_rejected_before_any_mutation(self):
        for side in ('local', 'remote'):
            with self.subTest(side=side):
                local = self.database()
                remote = self.database(citation=True)
                db = local if side == 'local' else remote
                db.execute('ALTER TABLE works ADD COLUMN unexpected TEXT')
                with self.assertRaises(SystemExit):
                    sync.validate_schema(local, remote)
                self.assertIn('citar', sync.get_columns(remote, 'works'))
                self.assertIsNotNone(remote.execute(
                    "SELECT name FROM sqlite_master WHERE name='idx_works_citar'"
                ).fetchone())

    def test_no_cleanup_while_local_still_requires_citation(self):
        local = self.database(citation=True)
        remote = self.database(citation=True)
        self.assertEqual(sync.validate_schema(local, remote)[1], [])
        with self.assertRaises(SystemExit):
            sync.validate_schema(local, self.database())


if __name__ == '__main__':
    unittest.main()
