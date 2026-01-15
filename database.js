const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false} : falst
});

pool.connect((err, client, release) => {
    if(err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Database connected successfully');
        release();
    }
});

module.exports = pool;