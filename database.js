require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false} : false
});

pool.connect(async (err, client, release) => {
    if(err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Database connected successfully');

        // Create game_history table if it doesn't exist
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS game_history (
                    id SERIAL PRIMARY KEY,
                    team_a_name VARCHAR(100) NOT NULL,
                    team_b_name VARCHAR(100) NOT NULL,
                    team_a_score INTEGER NOT NULL,
                    team_b_score INTEGER NOT NULL,
                    winner VARCHAR(100),
                    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Game history table ready');
        } catch (tableErr) {
            console.error('Error creating game_history table:', tableErr);
        }

        release();
    }
});

module.exports = pool;