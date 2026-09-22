import importlib.util
import sqlite3
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('asodat_sync', Path(__file__).resolve().parents[1] / 'deploy/scripts/generate-turso-sync-sql.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class AsodatMigrationTests(unittest.TestCase):
    def database(self, extra=''):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.row_factory = sqlite3.Row
        for table in sync.CATALOG_TABLES:
            db.execute(f'CREATE TABLE {table} (id TEXT PRIMARY KEY{extra if table == "works" else ""})')
        db.execute("INSERT INTO works (id) VALUES ('example')")
        db.commit()
        return db

    def test_migration_and_data_patch_work_together(self):
        local = self.database(', asodat_id INTEGER')
        remote = self.database(', tipo_transcripcion TEXT')
        local.execute('UPDATE works SET asodat_id=1234')
        columns, migrations = sync.validate_schema(local, remote)
        self.assertEqual(sync.rows_by_id(remote, 'works', columns['works'])['example'], ('example', None))
        sql = ['BEGIN;', *migrations]
        sql.append(sync.make_upsert_sql('works', columns['works'], local.execute('SELECT * FROM works').fetchone()))
        sql.append('COMMIT;')
        remote.executescript('\n'.join(sql))
        self.assertEqual(sync.rows_by_id(remote, 'works', columns['works']), sync.rows_by_id(local, 'works', columns['works']))
        self.assertEqual(sync.validate_schema(local, remote)[1], [])

    def test_unknown_schema_change_is_rejected(self):
        local = self.database(', asodat_id INTEGER, unexpected TEXT')
        remote = self.database()
        with self.assertRaises(SystemExit):
            sync.validate_schema(local, remote)


if __name__ == '__main__':
    unittest.main()
