#!/usr/bin/env python3
"""Generate an incremental SQL patch from a local SQLite catalog to Turso.

The local SQLite file remains the source of truth. This script compares it with
an SQLite copy restored from the current Turso dump and emits only the writes
needed to make Turso logically equivalent for the catalog tables.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


CATALOG_TABLES = (
    "works",
    "authors",
    "attribution_sets",
    "attribution_groups",
    "attribution_members",
    "work_author_index",
    "text_access",
    "work_distances",
)

ROOT_TABLES = ("authors", "works")

DEPENDENT_TABLES = (
    "attribution_sets",
    "attribution_groups",
    "attribution_members",
    "work_author_index",
    "text_access",
    "work_distances",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate an incremental Turso sync SQL patch.")
    parser.add_argument("--local-db", type=Path, required=True)
    parser.add_argument("--remote-db", type=Path, required=True)
    parser.add_argument("--output-sql", type=Path, required=True)
    parser.add_argument("--report-json", type=Path, required=True)
    parser.add_argument("--expected-counts", type=Path, required=True)
    return parser.parse_args()


def connect(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return format(value, ".17g")
    if isinstance(value, bytes):
        return "X'" + value.hex() + "'"
    return "'" + str(value).replace("'", "''") + "'"


def get_columns(connection: sqlite3.Connection, table: str) -> list[str]:
    rows = connection.execute(f"PRAGMA table_info({quote_identifier(table)})").fetchall()
    return [str(row["name"]) for row in rows]


def validate_schema(local: sqlite3.Connection, remote: sqlite3.Connection) -> dict[str, list[str]]:
    columns_by_table: dict[str, list[str]] = {}
    for table in CATALOG_TABLES:
        local_columns = get_columns(local, table)
        remote_columns = get_columns(remote, table)
        if not local_columns:
            raise SystemExit(f"Falta tabla local: {table}")
        if not remote_columns:
            raise SystemExit(f"Falta tabla remota: {table}. Usa replace-turso-db.sh para inicializar.")
        if local_columns != remote_columns:
            raise SystemExit(
                "Esquema Turso distinto del SQLite local en "
                f"{table}: local={local_columns!r}, remoto={remote_columns!r}. "
                "No aplico sincronizacion incremental."
            )
        columns_by_table[table] = local_columns
    return columns_by_table


def normalize_value(value: Any) -> Any:
    if isinstance(value, float):
        return format(value, ".17g")
    if isinstance(value, bytes):
        return value.hex()
    return value


def normalize_row(row: sqlite3.Row, columns: list[str]) -> tuple[Any, ...]:
    return tuple(normalize_value(row[column]) for column in columns)


def rows_by_id(connection: sqlite3.Connection, table: str, columns: list[str]) -> dict[str, tuple[Any, ...]]:
    rows = connection.execute(
        f"SELECT {', '.join(quote_identifier(column) for column in columns)} "
        f"FROM {quote_identifier(table)} ORDER BY id"
    ).fetchall()
    return {str(row["id"]): normalize_row(row, columns) for row in rows}


def grouped_rows(
    connection: sqlite3.Connection,
    sql: str,
    key_column: str = "work_id",
) -> dict[str, list[tuple[Any, ...]]]:
    grouped: dict[str, list[tuple[Any, ...]]] = defaultdict(list)
    rows = connection.execute(sql).fetchall()
    for row in rows:
        grouped[str(row[key_column])].append(tuple(normalize_value(value) for value in row))
    return grouped


def dependent_signatures(connection: sqlite3.Connection) -> dict[str, tuple[Any, ...]]:
    text_access = grouped_rows(
        connection,
        """
        SELECT work_id, tipo, etiqueta, url, position
        FROM text_access
        ORDER BY work_id, position, tipo, etiqueta, url
        """,
    )
    work_author_index = grouped_rows(
        connection,
        """
        SELECT work_id, author_id, attribution_type, confianza, occurrences
        FROM work_author_index
        ORDER BY work_id, author_id, attribution_type, confianza
        """,
    )
    work_distances = grouped_rows(
        connection,
        """
        SELECT work_id, ambito, rank, related_work_id, distancia
        FROM work_distances
        ORDER BY work_id, ambito, rank, related_work_id
        """,
    )
    attribution = grouped_rows(
        connection,
        """
        SELECT
            s.work_id,
            s.attribution_type,
            s.raw_expression,
            g.group_order,
            m.member_order,
            m.author_id,
            m.confianza
        FROM attribution_sets s
        LEFT JOIN attribution_groups g ON g.attribution_set_id = s.id
        LEFT JOIN attribution_members m ON m.attribution_group_id = g.id
        ORDER BY s.work_id, s.attribution_type, s.raw_expression, g.group_order, m.member_order, m.author_id
        """,
    )

    work_ids = set(text_access) | set(work_author_index) | set(work_distances) | set(attribution)
    return {
        work_id: (
            tuple(text_access.get(work_id, [])),
            tuple(work_author_index.get(work_id, [])),
            tuple(work_distances.get(work_id, [])),
            tuple(attribution.get(work_id, [])),
        )
        for work_id in work_ids
    }


def table_count(connection: sqlite3.Connection, table: str) -> int:
    return int(connection.execute(f"SELECT COUNT(*) FROM {quote_identifier(table)}").fetchone()[0])


def make_insert_sql(table: str, columns: list[str], values: sqlite3.Row | tuple[Any, ...]) -> str:
    if isinstance(values, sqlite3.Row):
        raw_values = [values[column] for column in columns]
    else:
        raw_values = list(values)
    return (
        f"INSERT INTO {quote_identifier(table)} "
        f"({', '.join(quote_identifier(column) for column in columns)}) "
        f"VALUES ({', '.join(sql_literal(value) for value in raw_values)});"
    )


def make_upsert_sql(table: str, columns: list[str], row: sqlite3.Row) -> str:
    assignments = [column for column in columns if column != "id"]
    return (
        f"INSERT INTO {quote_identifier(table)} "
        f"({', '.join(quote_identifier(column) for column in columns)}) "
        f"VALUES ({', '.join(sql_literal(row[column]) for column in columns)}) "
        "ON CONFLICT(id) DO UPDATE SET "
        + ", ".join(f"{quote_identifier(column)}=excluded.{quote_identifier(column)}" for column in assignments)
        + ";"
    )


def fetch_rows_by_ids(
    connection: sqlite3.Connection,
    table: str,
    columns: list[str],
    ids: set[str],
) -> dict[str, sqlite3.Row]:
    if not ids:
        return {}
    placeholders = ", ".join("?" for _ in ids)
    rows = connection.execute(
        f"SELECT {', '.join(quote_identifier(column) for column in columns)} "
        f"FROM {quote_identifier(table)} WHERE id IN ({placeholders}) ORDER BY id",
        sorted(ids),
    ).fetchall()
    return {str(row["id"]): row for row in rows}


def chunked(items: list[str], size: int = 250) -> list[list[str]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def delete_where_in(sql_lines: list[str], table: str, column: str, values: set[str]) -> None:
    for group in chunked(sorted(values)):
        sql_lines.append(
            f"DELETE FROM {quote_identifier(table)} WHERE {quote_identifier(column)} IN "
            f"({', '.join(sql_literal(value) for value in group)});"
        )


def append_dependent_deletes(sql_lines: list[str], work_ids: set[str]) -> None:
    if not work_ids:
        return
    for group in chunked(sorted(work_ids)):
        quoted = ", ".join(sql_literal(value) for value in group)
        sql_lines.extend(
            [
                "DELETE FROM attribution_members WHERE attribution_group_id IN ("
                "SELECT g.id FROM attribution_groups g "
                "JOIN attribution_sets s ON s.id = g.attribution_set_id "
                f"WHERE s.work_id IN ({quoted}));",
                "DELETE FROM attribution_groups WHERE attribution_set_id IN ("
                "SELECT id FROM attribution_sets "
                f"WHERE work_id IN ({quoted}));",
                f"DELETE FROM attribution_sets WHERE work_id IN ({quoted});",
                f"DELETE FROM text_access WHERE work_id IN ({quoted});",
                f"DELETE FROM work_author_index WHERE work_id IN ({quoted});",
                f"DELETE FROM work_distances WHERE work_id IN ({quoted});",
            ]
        )


def append_attribution_inserts(sql_lines: list[str], local: sqlite3.Connection, work_ids: set[str]) -> None:
    if not work_ids:
        return
    placeholders = ", ".join("?" for _ in work_ids)
    set_rows = local.execute(
        f"""
        SELECT id, work_id, attribution_type, raw_expression
        FROM attribution_sets
        WHERE work_id IN ({placeholders})
        ORDER BY work_id, attribution_type, id
        """,
        sorted(work_ids),
    ).fetchall()
    set_ids = [row["id"] for row in set_rows]
    if not set_ids:
        return

    group_rows_by_set: dict[int, list[sqlite3.Row]] = defaultdict(list)
    member_rows_by_group: dict[int, list[sqlite3.Row]] = defaultdict(list)

    for group in chunked([str(value) for value in set_ids]):
        group_placeholders = ", ".join("?" for _ in group)
        group_rows = local.execute(
            f"""
            SELECT id, attribution_set_id, group_order
            FROM attribution_groups
            WHERE attribution_set_id IN ({group_placeholders})
            ORDER BY attribution_set_id, group_order, id
            """,
            group,
        ).fetchall()
        for row in group_rows:
            group_rows_by_set[int(row["attribution_set_id"])].append(row)

        group_ids = [str(row["id"]) for row in group_rows]
        if not group_ids:
            continue
        member_placeholders = ", ".join("?" for _ in group_ids)
        member_rows = local.execute(
            f"""
            SELECT attribution_group_id, author_id, confianza, member_order
            FROM attribution_members
            WHERE attribution_group_id IN ({member_placeholders})
            ORDER BY attribution_group_id, member_order, author_id
            """,
            group_ids,
        ).fetchall()
        for row in member_rows:
            member_rows_by_group[int(row["attribution_group_id"])].append(row)

    for set_row in set_rows:
        sql_lines.append(
            "INSERT INTO attribution_sets (work_id, attribution_type, raw_expression) VALUES "
            f"({sql_literal(set_row['work_id'])}, {sql_literal(set_row['attribution_type'])}, "
            f"{sql_literal(set_row['raw_expression'])});"
        )
        for group_row in group_rows_by_set.get(int(set_row["id"]), []):
            sql_lines.append(
                "INSERT INTO attribution_groups (attribution_set_id, group_order) VALUES "
                f"((SELECT max(id) FROM attribution_sets), {sql_literal(group_row['group_order'])});"
            )
            for member_row in member_rows_by_group.get(int(group_row["id"]), []):
                sql_lines.append(
                    "INSERT INTO attribution_members "
                    "(attribution_group_id, author_id, confianza, member_order) VALUES "
                    f"((SELECT max(id) FROM attribution_groups), {sql_literal(member_row['author_id'])}, "
                    f"{sql_literal(member_row['confianza'])}, {sql_literal(member_row['member_order'])});"
                )


def append_simple_dependent_inserts(sql_lines: list[str], local: sqlite3.Connection, work_ids: set[str]) -> None:
    if not work_ids:
        return
    simple_tables = {
        "text_access": ["work_id", "tipo", "etiqueta", "url", "position"],
        "work_author_index": ["work_id", "author_id", "attribution_type", "confianza", "occurrences"],
        "work_distances": ["work_id", "ambito", "rank", "related_work_id", "distancia"],
    }
    for table, columns in simple_tables.items():
        placeholders = ", ".join("?" for _ in work_ids)
        rows = local.execute(
            f"SELECT {', '.join(quote_identifier(column) for column in columns)} "
            f"FROM {quote_identifier(table)} WHERE work_id IN ({placeholders})",
            sorted(work_ids),
        ).fetchall()
        for row in rows:
            sql_lines.append(make_insert_sql(table, columns, row))


def write_expected_counts(path: Path, local: sqlite3.Connection) -> None:
    path.write_text(
        "".join(f"{table}|{table_count(local, table)}\n" for table in CATALOG_TABLES),
        encoding="utf-8",
    )


def main() -> int:
    args = parse_args()
    local = connect(args.local_db)
    remote = connect(args.remote_db)
    columns_by_table = validate_schema(local, remote)

    local_authors = rows_by_id(local, "authors", columns_by_table["authors"])
    remote_authors = rows_by_id(remote, "authors", columns_by_table["authors"])
    local_works = rows_by_id(local, "works", columns_by_table["works"])
    remote_works = rows_by_id(remote, "works", columns_by_table["works"])

    author_ids = set(local_authors) | set(remote_authors)
    added_authors = {item for item in author_ids if item in local_authors and item not in remote_authors}
    removed_authors = {item for item in author_ids if item in remote_authors and item not in local_authors}
    changed_authors = {
        item
        for item in author_ids
        if item in local_authors and item in remote_authors and local_authors[item] != remote_authors[item]
    }

    work_ids = set(local_works) | set(remote_works)
    added_works = {item for item in work_ids if item in local_works and item not in remote_works}
    removed_works = {item for item in work_ids if item in remote_works and item not in local_works}
    changed_works = {
        item
        for item in work_ids
        if item in local_works and item in remote_works and local_works[item] != remote_works[item]
    }

    local_dependent = dependent_signatures(local)
    remote_dependent = dependent_signatures(remote)
    common_works = set(local_works) & set(remote_works)
    changed_dependent_works = {
        work_id
        for work_id in common_works
        if local_dependent.get(work_id, ((), (), (), ())) != remote_dependent.get(work_id, ((), (), (), ()))
    }

    rewrite_dependents_for = added_works | changed_dependent_works | removed_works
    insert_dependents_for = rewrite_dependents_for - removed_works
    upsert_work_ids = added_works | changed_works
    upsert_author_ids = added_authors | changed_authors

    local_author_rows = fetch_rows_by_ids(local, "authors", columns_by_table["authors"], upsert_author_ids)
    local_work_rows = fetch_rows_by_ids(local, "works", columns_by_table["works"], upsert_work_ids)

    sql_lines: list[str] = [
        "-- Generated by deploy/scripts/generate-turso-sync-sql.py",
        "PRAGMA foreign_keys=OFF;",
        "BEGIN TRANSACTION;",
        "PRAGMA defer_foreign_keys=ON;",
    ]

    append_dependent_deletes(sql_lines, rewrite_dependents_for)
    delete_where_in(sql_lines, "works", "id", removed_works)
    delete_where_in(sql_lines, "authors", "id", removed_authors)

    for author_id in sorted(upsert_author_ids):
        sql_lines.append(make_upsert_sql("authors", columns_by_table["authors"], local_author_rows[author_id]))

    for work_id in sorted(upsert_work_ids):
        sql_lines.append(make_upsert_sql("works", columns_by_table["works"], local_work_rows[work_id]))

    append_simple_dependent_inserts(sql_lines, local, insert_dependents_for)
    append_attribution_inserts(sql_lines, local, insert_dependents_for)

    sql_lines.extend(["COMMIT;", "PRAGMA foreign_keys=ON;", ""])
    args.output_sql.write_text("\n".join(sql_lines), encoding="utf-8")
    write_expected_counts(args.expected_counts, local)

    report = {
        "changed": bool(
            added_authors
            or removed_authors
            or changed_authors
            or added_works
            or removed_works
            or changed_works
            or changed_dependent_works
        ),
        "authors": {
            "added": len(added_authors),
            "updated": len(changed_authors),
            "removed": len(removed_authors),
        },
        "works": {
            "added": len(added_works),
            "updated": len(changed_works),
            "removed": len(removed_works),
            "dependents_rewritten": len(rewrite_dependents_for),
            "dependents_only": len(changed_dependent_works - changed_works),
        },
        "rows": {
            table: {
                "local": table_count(local, table),
                "remote_before": table_count(remote, table),
            }
            for table in CATALOG_TABLES
        },
    }
    args.report_json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
