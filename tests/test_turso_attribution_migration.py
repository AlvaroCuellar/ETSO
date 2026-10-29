import contextlib
import importlib.util
import io
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    'attribution_sync', Path(__file__).resolve().parents[1] / 'deploy/scripts/generate-turso-sync-sql.py'
)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class AttributionMigrationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)

    def database(self, name, modern=False):
        path = self.root / name
        with sqlite3.connect(path) as db:
            db.executescript('''
                PRAGMA foreign_keys=ON;
                CREATE TABLE works (id TEXT PRIMARY KEY, slug TEXT UNIQUE, public_id INTEGER UNIQUE);
                CREATE TABLE authors (id TEXT PRIMARY KEY, nombre TEXT);
                CREATE TABLE attribution_sets (id INTEGER PRIMARY KEY, work_id TEXT REFERENCES works(id), attribution_type TEXT, raw_expression TEXT);
                CREATE TABLE attribution_groups (id INTEGER PRIMARY KEY, attribution_set_id INTEGER REFERENCES attribution_sets(id), group_order INTEGER);
                CREATE TABLE attribution_members (id INTEGER PRIMARY KEY, attribution_group_id INTEGER REFERENCES attribution_groups(id), author_id TEXT REFERENCES authors(id), confianza TEXT, member_order INTEGER);
                CREATE TABLE work_author_index (id INTEGER PRIMARY KEY, work_id TEXT, author_id TEXT, attribution_type TEXT, confianza TEXT, occurrences INTEGER);
                CREATE TABLE text_access (id INTEGER PRIMARY KEY, work_id TEXT, tipo TEXT, etiqueta TEXT, url TEXT, position INTEGER);
                CREATE TABLE work_distances (id INTEGER PRIMARY KEY, work_id TEXT, ambito TEXT, rank INTEGER, related_work_id TEXT, distancia REAL);
                INSERT INTO works VALUES ('obra', 'obra', 123), ('otra', 'otra', 456);
                INSERT INTO authors VALUES ('a', 'Autor A'), ('b', 'Autor B'), ('c', 'Autor C');
                INSERT INTO attribution_sets VALUES (1, 'obra', 'tradicional', 'a OR (b AND c)'), (2, 'obra', 'estilometrica', 'a OR (b AND c)'), (3, 'otra', 'tradicional', 'a');
                INSERT INTO attribution_groups VALUES (1,1,1), (2,1,2), (3,2,1), (4,2,2), (5,3,1);
                INSERT INTO attribution_members VALUES (1,1,'a',NULL,1), (2,2,'b',NULL,1), (3,2,'c',NULL,2), (4,3,'a','seguro',1), (5,4,'b','probable',1), (6,4,'c','seguro',2), (7,5,'a',NULL,1);
            ''')
            if modern:
                db.execute('ALTER TABLE attribution_sets ADD COLUMN reviewed_phrase TEXT')
                db.execute('ALTER TABLE attribution_members ADD COLUMN scope TEXT')
        return path

    def generate(self, local, remote):
        args = SimpleNamespace(local_db=local, remote_db=remote,
                               output_sql=self.root/'patch.sql', report_json=self.root/'report.json',
                               expected_counts=self.root/'counts.txt')
        with patch.object(sync, 'parse_args', return_value=args), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(sync.main(), 0)
        return args.output_sql.read_text(), json.loads(args.report_json.read_text())

    def apply_and_compare(self, local, remote, sql):
        with sqlite3.connect(remote) as db:
            db.executescript(sql)
            self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
            self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
        a, b = sync.connect(local), sync.connect(remote)
        try:
            self.assertEqual(sync.dependent_signatures(a), sync.dependent_signatures(b))
            for table in sync.ROOT_TABLES:
                columns = sync.get_columns(a, table)
                self.assertEqual(sync.rows_by_id(a, table, columns), sync.rows_by_id(b, table, columns))
        finally:
            a.close()
            b.close()
        _, second = self.generate(local, remote)
        self.assertFalse(second['changed'])
        self.assertEqual(second['schema_migrations'], [])

    def test_legacy_migration_preserves_reviewed_phrase_participation_and_alternatives(self):
        local, remote = self.database('local', True), self.database('remote')
        phrase = "Obra atribuida a A o a la colaboración de B y C: d'Autor.\nSegunda línea."
        with sqlite3.connect(local) as db:
            db.execute('UPDATE attribution_sets SET reviewed_phrase=? WHERE id=1', (phrase,))
            db.execute("UPDATE attribution_members SET scope='participation' WHERE id=5")
        sql, report = self.generate(local, remote)
        self.assertEqual(report['schema_migrations'], [
            'ALTER TABLE "attribution_sets" ADD COLUMN "reviewed_phrase" TEXT;',
            'ALTER TABLE "attribution_members" ADD COLUMN "scope" TEXT;',
        ])
        self.assertEqual(report['works']['updated'], 0)
        self.assertEqual(report['works']['dependents_only'], 1)
        self.assertEqual(report['works']['dependents_rewritten'], 1)
        self.apply_and_compare(local, remote, sql)
        with sqlite3.connect(remote) as db:
            self.assertEqual(db.execute("SELECT reviewed_phrase FROM attribution_sets WHERE work_id='obra' AND attribution_type='tradicional'").fetchone()[0], phrase)
            self.assertEqual(db.execute("SELECT g.group_order,m.member_order,m.author_id,m.confianza,m.scope FROM attribution_sets s JOIN attribution_groups g ON g.attribution_set_id=s.id JOIN attribution_members m ON m.attribution_group_id=g.id WHERE s.work_id='obra' AND s.attribution_type='estilometrica' ORDER BY g.group_order,m.member_order").fetchall(), [
                (1, 1, 'a', 'seguro', None), (2, 1, 'b', 'probable', 'participation'), (2, 2, 'c', 'seguro', None)
            ])

    def test_null_legacy_defaults_do_not_rewrite_unchanged_attributions(self):
        local, remote = self.database('local', True), self.database('remote')
        sql, report = self.generate(local, remote)
        self.assertEqual(len(report['schema_migrations']), 2)
        self.assertEqual(report['works']['dependents_rewritten'], 0)
        self.assertNotIn('INSERT INTO attribution_', sql)
        self.apply_and_compare(local, remote, sql)

    def test_each_sidecar_only_change_and_removal_is_detected_and_idempotent(self):
        local, remote = self.database('local', True), self.database('remote', True)
        updates = [
            ("UPDATE attribution_sets SET reviewed_phrase=? WHERE id=1", ("Frase exacta d'Autor",)),
            ("UPDATE attribution_members SET scope='participation' WHERE id=5", ()),
            ("UPDATE attribution_sets SET reviewed_phrase=NULL WHERE id=1", ()),
            ("UPDATE attribution_members SET scope=NULL WHERE id=5", ()),
        ]
        for statement, values in updates:
            with self.subTest(statement=statement):
                with sqlite3.connect(local) as db:
                    db.execute(statement, values)
                sql, report = self.generate(local, remote)
                self.assertEqual(report['schema_migrations'], [])
                self.assertEqual(report['works']['updated'], 0)
                self.assertEqual(report['works']['dependents_only'], 1)
                self.apply_and_compare(local, remote, sql)

    def test_unknown_schema_change_is_rejected(self):
        local, remote = self.database('local', True), self.database('remote')
        with sqlite3.connect(local) as db:
            db.execute('ALTER TABLE attribution_sets ADD COLUMN unrelated TEXT')
        with self.assertRaisesRegex(SystemExit, 'Esquema Turso distinto'):
            self.generate(local, remote)

    def test_incompatible_additive_definition_is_rejected(self):
        local, remote = self.database('local'), self.database('remote')
        with sqlite3.connect(local) as db:
            db.execute('ALTER TABLE attribution_members ADD COLUMN scope INTEGER')
        with self.assertRaisesRegex(SystemExit, 'Columna aditiva no compatible'):
            self.generate(local, remote)


if __name__ == '__main__':
    unittest.main()
