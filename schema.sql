DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS food_shortcuts;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    target_proteins REAL DEFAULT 3.0,
    target_carbs REAL DEFAULT 2.0,
    target_veggies REAL DEFAULT 5.0
);

CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    proteins REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    veggies REAL DEFAULT 0,
    clean_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE food_shortcuts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🥗',
    proteins REAL DEFAULT 0.0,
    carbs REAL DEFAULT 0.0,
    veggies REAL DEFAULT 0.0,
    clean_score INTEGER DEFAULT 10,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

