// import libraries 
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const os = require('os');
const pool = require('./database');
// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.RAILWAY_PUBLIC_DOMAIN
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
            : "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Game state
let players = [];
let hostId = null;

// Serve static files from 'public' folder
app.use(express.static('public'));

// When a client connects via WebSocket
io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    if (hostId === null) {
        hostId = socket.id;
        console.log('Host assigned:', socket.id);
    }

    sendLobbyUpdate();

    socket.on('join-team', (data)=> {
        console.log(`${data.name} joined Team ${data.team}`);

        players.push({
            id: socket.id,
            name: data.name,
            team: data.team
        });

        sendLobbyUpdate();
    });
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);

        players = players.filter(p => p.id !== socket.id);

        if(socket.id === hostId && players.length > 0) {
            hostId = players[0].id;
            console.log('New host assigned:', hostId);
        } else if (players.length === 0) {
            hostId = null;
        }

        sendLobbyUpdate();
    });
    
    socket.on('start-game', ()=> {
        if (socket.id === hostId){
            console.log('Host started the game');
            io.emit('game-started');
        }
    });
});

function sendLobbyUpdate() {
    const teamA = players.filter(p => p.team === 'A');
    const teamB = players.filter(p => p.team === 'B');

    io.emit('update-lobby', {
        teamA: teamA,
        teamB: teamB,
        isHost: false
    })

    if (hostId) {
        io.to(hostId).emit('update-lobby', {
            teamA: teamA,
            teamB: teamB,
            isHost: true
        });
    }    
}

// Use Railway's assigned port or 3000 for local dev
const PORT = process.env.PORT || 3000;

// Get the game URL (Railway provides this, or use localhost for local dev)
const gameUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
    : process.env.RAILWAY_STATIC_URL
    ? `https://${process.env.RAILWAY_STATIC_URL}`
    : `http://localhost:${PORT}`;

app.get('/api/cards', async (req, res) => {
    try{
        const result = await pool.query('SELECT * FROM taboo_cards WHERE used = false');
        res.json(result.rows);
    }
    catch(err) {
        console.error('Database error:', err);
        res.status(500).json({error: 'Database error' });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=== Server Started ===`);
    console.log(`Game URL: ${gameUrl}`);
    console.log(`Server listening on port ${PORT}\n`);
});

// Serve QR code for game URL
app.get('/qr/game', async (req, res) => {
    try {
        const qrImage = await QRCode.toDataURL(gameUrl);
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
app.get('/network-info', (req, res) => {
    res.json({
        gameUrl: gameUrl
    });
});