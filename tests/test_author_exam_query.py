"""Verify optimized Examen author flags using SQLite only; never contact Turso."""
import re
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "src/lib/server/catalog-runtime.ts").read_text(encoding="utf-8")
CTE = re.search(r"const authorExamCte = `([\s\S]*?)`;", SOURCE).group(1).replace("${UNRESOLVED_AUTHOR_ID}", "no_apunta_a_ningun_autor")
SELECT = re.search(r"const authorExamSelect = '([^']+)';", SOURCE).group(1)
JOIN = re.search(r"const authorExamJoin = '([^']+)';", SOURCE).group(1)
LEGACY = """EXISTS (
 SELECT 1 FROM attribution_members em
 JOIN attribution_groups eg ON eg.id=em.attribution_group_id
 JOIN attribution_sets es ON es.id=eg.attribution_set_id
 JOIN works ew ON ew.id=es.work_id
 WHERE em.author_id=authors.id AND ew.examen_autorias=1
 AND es.attribution_type IN ('tradicional','estilometria')
 AND LOWER(COALESCE(es.raw_expression,'')) NOT LIKE '%no_apunta_a_ningun_autor%'
 AND NOT EXISTS (SELECT 1 FROM attribution_groups ug
 JOIN attribution_members um ON um.attribution_group_id=ug.id
 WHERE ug.attribution_set_id=es.id AND um.author_id='no_apunta_a_ningun_autor')
) AS has_authorship_exam"""
OLD_QUERY = "SELECT authors.id, " + LEGACY + " FROM authors ORDER BY authors.id"
NEW_QUERY = CTE + " SELECT authors.id, " + SELECT + " FROM authors " + JOIN + " ORDER BY authors.id"


class AuthorExamQueryTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.addCleanup(self.db.close)
        self.db.executescript("""
            CREATE TABLE authors(id TEXT PRIMARY KEY);
            CREATE TABLE works(id TEXT PRIMARY KEY, examen_autorias INTEGER);
            CREATE TABLE attribution_sets(id INTEGER PRIMARY KEY,work_id TEXT,attribution_type TEXT,raw_expression TEXT);
            CREATE TABLE attribution_groups(id INTEGER PRIMARY KEY,attribution_set_id INTEGER);
            CREATE TABLE attribution_members(id INTEGER PRIMARY KEY,attribution_group_id INTEGER,author_id TEXT);
        """)
        self.db.executemany("INSERT INTO authors VALUES(?)", [(x,) for x in ["traditional", "poetry_only", "raw_unresolved", "other_group_unresolved", "both", "no_analizada", "no_apunta_a_ningun_autor"]])
        self.db.executemany("INSERT INTO works VALUES(?,?)", [("exam", 1), ("outside", 0)])
        sets = [(1,"exam","tradicional","traditional"), (2,"outside","tradicional","poetry_only"), (3,"exam","tradicional","raw_unresolved OR NO_APUNTA_A_NINGUN_AUTOR"), (4,"exam","estilometria","other_group_unresolved"), (5,"exam","tradicional",None), (6,"exam","estilometria","both OR no_apunta_a_ningun_autor"), (7,"exam","estilometria","no_analizada")]
        self.db.executemany("INSERT INTO attribution_sets VALUES(?,?,?,?)", sets)
        groups = [(1,1),(2,2),(3,3),(4,4),(5,4),(6,5),(7,6),(8,7)]
        self.db.executemany("INSERT INTO attribution_groups VALUES(?,?)", groups)
        members = [(1,1,"traditional"),(2,2,"poetry_only"),(3,3,"raw_unresolved"),(4,4,"other_group_unresolved"),(5,5,"no_apunta_a_ningun_autor"),(6,6,"both"),(7,7,"both"),(8,8,"no_analizada")]
        self.db.executemany("INSERT INTO attribution_members VALUES(?,?,?)", members)

    def test_raw_markers_members_alternative_groups_and_scope_preserve_flags(self):
        actual = self.db.execute(NEW_QUERY).fetchall()
        self.assertEqual(actual, self.db.execute(OLD_QUERY).fetchall())
        self.assertEqual(dict(actual), {"traditional":1,"poetry_only":0,"raw_unresolved":0,"other_group_unresolved":0,"both":1,"no_analizada":1,"no_apunta_a_ningun_autor":0})
        # Person/status filtering remains in toCatalogAuthors, after SQL.

    def test_subset_query_preserves_same_flags(self):
        columns = " SELECT authors.id, "
        subset = ["traditional", "poetry_only", "other_group_unresolved"]
        old = columns + LEGACY + " FROM authors WHERE authors.id IN (?,?,?) ORDER BY authors.id"
        new = CTE + columns + SELECT + " FROM authors " + JOIN + " WHERE authors.id IN (?,?,?) ORDER BY authors.id"
        self.assertEqual(self.db.execute(new, subset).fetchall(), self.db.execute(old, subset).fetchall())

    def test_plan_has_no_correlated_subqueries(self):
        old_plan = [row[3] for row in self.db.execute("EXPLAIN QUERY PLAN " + OLD_QUERY)]
        new_plan = [row[3] for row in self.db.execute("EXPLAIN QUERY PLAN " + NEW_QUERY)]
        self.assertTrue(any("CORRELATED" in row for row in old_plan))
        self.assertFalse(any("CORRELATED" in row for row in new_plan))

    @unittest.skipUnless((ROOT / ".local/texoro-multigenre/catalogue.sqlite").exists(), "Local audit catalogue unavailable")
    def test_all_real_catalogue_author_flags_are_identical(self):
        with sqlite3.connect("file:" + str(ROOT / ".local/texoro-multigenre/catalogue.sqlite") + "?mode=ro", uri=True) as db:
            self.assertEqual(db.execute(NEW_QUERY).fetchall(), db.execute(OLD_QUERY).fetchall())


if __name__ == "__main__":
    unittest.main()
