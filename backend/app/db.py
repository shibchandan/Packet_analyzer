import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .core.config import DB_PATH, ensure_directories


def init_db() -> None:
    ensure_directories()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                input_name TEXT NOT NULL,
                input_path TEXT NOT NULL,
                output_name TEXT NOT NULL,
                output_path TEXT NOT NULL,
                log_path TEXT NOT NULL,
                report_path TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                block_apps TEXT NOT NULL,
                block_domains TEXT NOT NULL,
                block_ips TEXT NOT NULL,
                load_balancers INTEGER NOT NULL,
                fps_per_lb INTEGER NOT NULL,
                stdout_text TEXT NOT NULL DEFAULT '',
                stderr_text TEXT NOT NULL DEFAULT '',
                exit_code INTEGER,
                total_packets INTEGER,
                forwarded_packets INTEGER,
                dropped_packets INTEGER,
                tcp_packets INTEGER,
                udp_packets INTEGER
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_type TEXT NOT NULL,
                value TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
