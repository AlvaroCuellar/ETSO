import importlib.util
import sqlite3
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('texoro_sync', Path(__file__).resolve().parents[1] / 'deploy/scripts/generate-turso-sync-sql.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class TexoroMigrationTests(unittest.TestCase):
    def database(self, multigenre=False):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.row_factory = sqlite3.Row
        for table in sync.CATALOG_TABLES:
            fields = ', asodat_id INTEGER' if table == 'works' else ''
            if table == 'works' and multigenre:
                fields += ", genero_general TEXT NOT NULL DEFAULT 'Teatro', collection_size INTEGER"
            db.execute(f'CREATE TABLE {table} (id TEXT PRIMARY KEY{fields})')
        db.execute("INSERT INTO works (id, asodat_id) VALUES ('theatre', 2254)")
        db.commit()
        return db

    def test_new_genres_preserve_theatre_defaults_and_asodat(self):
        local = self.database(multigenre=True)
        remote = self.database()
        local.execute("INSERT INTO works VALUES ('poetry', NULL, 'Poesía', 4814)")
        columns, migrations = sync.validate_schema(local, remote)
        before = sync.rows_by_id(remote, 'works', columns['works'])
        target = sync.rows_by_id(local, 'works', columns['works'])
        # A schema migration must not classify every old theatre record as changed.
        self.assertEqual(before['theatre'], target['theatre'])
        self.assertEqual(len(migrations), 2)
        sql = ['BEGIN;', *migrations]
        sql.append(sync.make_upsert_sql('works', columns['works'], local.execute("SELECT * FROM works WHERE id='poetry'").fetchone()))
        sql.append('COMMIT;')
        remote.executescript('\n'.join(sql))
        self.assertEqual(sync.rows_by_id(remote, 'works', columns['works']), target)
        self.assertEqual(remote.execute("SELECT asodat_id FROM works WHERE id='theatre'").fetchone()[0], 2254)
        self.assertEqual(sync.validate_schema(local, remote)[1], [])
        self.assertEqual(remote.execute('PRAGMA integrity_check').fetchone()[0], 'ok')

    def test_genres_and_asodat_can_be_added_together(self):
        local = self.database(multigenre=True)
        remote = self.database()
        remote.execute('ALTER TABLE works DROP COLUMN asodat_id')
        columns, migrations = sync.validate_schema(local, remote)
        self.assertEqual(len(migrations), 3)
        self.assertEqual(sync.rows_by_id(remote, 'works', columns['works'])['theatre'], ('theatre', None, 'Teatro', None))


if __name__ == '__main__':
    unittest.main()
