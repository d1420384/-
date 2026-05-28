import sqlite3
import os

DATABASE = 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db_exists = os.path.exists(DATABASE)
    connection = get_db_connection()
    if not db_exists:
        with open('schema.sql', encoding='utf-8') as f:
            connection.executescript(f.read())
        connection.commit()
    else:
        # Check if whole_foods column exists in records table, if not add it
        cursor = connection.cursor()
        cursor.execute("PRAGMA table_info(records)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'whole_foods' not in columns:
            cursor.execute("ALTER TABLE records ADD COLUMN whole_foods REAL DEFAULT 0")
            connection.commit()
    connection.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized.")
