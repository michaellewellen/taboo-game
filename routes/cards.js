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

    return router;
};