-- Table for User Registration & Login
CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
	email VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL, -- We will store hashed passwords here later
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for Game Scoreboard
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    game_name VARCHAR(50) NOT NULL, -- e.g., 'Tetris', 'Snake', 'Battleships'
    score INT NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);