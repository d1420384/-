DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS records;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    protein_portions INTEGER DEFAULT 0,
    carb_portions INTEGER DEFAULT 0,
    veg_portions INTEGER DEFAULT 0,
    food_name TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
