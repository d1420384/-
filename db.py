import sqlite3
import os

DATABASE = 'nutrition_helper.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if not os.path.exists(DATABASE):
        connection = get_db_connection()
        with open('schema.sql', 'r', encoding='utf-8') as f:
            connection.executescript(f.read())
        connection.commit()
        connection.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized.")
