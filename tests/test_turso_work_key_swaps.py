import importlib.util
import sqlite3
import unittest
from pathlib import Path


path = Path(__file__).resolve().parents[1] / "deploy/scripts/generate-turso-sync-sql.py"
spec = importlib.util.spec_from_file_location("turso_sync", path)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class WorkKeySwapTests(unittest.TestCase):
    def database(self, rows):
        db = sqlite3.connect(":memory:")
        self.addCleanup(db.close)
        db.row_factory = sqlite3.Row
        db.execute("CREATE TABLE works (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, public_id INTEGER UNIQUE)")
        db.executemany("INSERT INTO works VALUES (?, ?, ?)", rows)
        db.commit()
        return db

    def test_swap_preserves_ids_and_handles_temporary_slug_collision(self):
        untouched = ("other", "__turso_sync_pending__a", 3)
        remote = self.database([("a", "first", 1), ("b", "second", 2), untouched])
        local = self.database([("a", "second", 2), ("b", "first", 1), untouched])
        sql = ["BEGIN;"]
        sync.release_changed_work_keys(sql, local, remote, {"a", "b"})
        for row in local.execute("SELECT * FROM works WHERE id IN ('a', 'b') ORDER BY id"):
            sql.append(sync.make_upsert_sql("works", ["id", "slug", "public_id"], row))
        sql.append("COMMIT;")
        remote.executescript("\n".join(sql))
        self.assertEqual(
            [tuple(row) for row in remote.execute("SELECT * FROM works ORDER BY id")],
            [tuple(row) for row in local.execute("SELECT * FROM works ORDER BY id")],
        )
        self.assertEqual(remote.execute("PRAGMA integrity_check").fetchone()[0], "ok")

    def test_released_keys_roll_back_with_transaction(self):
        remote = self.database([("a", "first", 1), ("b", "second", 2)])
        local = self.database([("a", "second", 2), ("b", "first", 1)])
        sql = ["BEGIN;"]
        sync.release_changed_work_keys(sql, local, remote, {"a", "b"})
        sql.append("ROLLBACK;")
        remote.executescript("\n".join(sql))
        self.assertEqual(
            [tuple(row) for row in remote.execute("SELECT * FROM works ORDER BY id")],
            [("a", "first", 1), ("b", "second", 2)],
        )


if __name__ == "__main__":
    unittest.main()
