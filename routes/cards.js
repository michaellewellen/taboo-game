const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // Note: these are '/cards' and '/reset-cards' 
    // The '/api' prefix gets added in server.js when we mount the router
    router.get('/cards', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM taboo_cards WHERE used = false');
            res.json(result.rows);
        } catch (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error' });
        }
    });

    router.post('/reset-cards', async (req, res) => {
        try {
            const result = await pool.query('UPDATE taboo_cards SET used = false');
            res.json({ success: true, count: result.rowCount });
        } catch (err) {
            console.error('Error resetting cards:', err);
            res.status(500).json({ error: 'Failed to reset cards' });
        }
    });

    // Get game history (recent games)
    router.get('/history', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM game_history ORDER BY played_at DESC LIMIT 20'
            );
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching game history:', err);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    });

    // Get leaderboard (wins by team name)
    router.get('/leaderboard', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT winner as team_name, COUNT(*) as wins
                FROM game_history
                WHERE winner != 'TIE'
                GROUP BY winner
                ORDER BY wins DESC
                LIMIT 10
            `);
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    });

    return router;
};