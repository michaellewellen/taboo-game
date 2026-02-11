require('dotenv').config();

const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_PUBLIC_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_PUBLIC_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false} : false
    });

    pool.connect((err, client, release) => {
        if(err) {
            console.error('Error connecting to database:', err);
        } else {
            console.log('Database connected successfully');
            release();
        }
    });
} else {
    console.log('No DATABASE_PUBLIC_URL set — using cards.json fallback (no database)');
}

module.exports = pool;