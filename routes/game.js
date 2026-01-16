// routes/game.js
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

module.exports = (gameUrl) => {
    // Serve QR code for game URL
    router.get('/qr/game', async (req, res) => {
        try {
            const lobbyUrl = `${gameUrl}/lobby.html`;
            const qrImage = await QRCode.toDataURL(lobbyUrl);
            const img = Buffer.from(qrImage.split(',')[1], 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length
            });
            res.end(img);
        } catch (err) {
            res.status(500).send('Error generating QR code');
        }
    });

    // Serve network info as JSON
    router.get('/network-info', (req, res) => {
        res.json({
            gameUrl: `${gameUrl}/lobby.html`
        });
    });

    return router;
};