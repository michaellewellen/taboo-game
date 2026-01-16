// import libraries 
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
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

// Use Railway's assigned port or 3000 for local dev
const PORT = process.env.PORT || 3000;

// Get the game URL (Railway provides this, or use localhost for local dev)
const gameUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
    : process.env.RAILWAY_STATIC_URL
    ? `https://${process.env.RAILWAY_STATIC_URL}`
    : `http://localhost:${PORT}`;

// Serve static files from 'public' folder
app.use(express.static('public'));

// Mount routes
const cardRoutes = require('./routes/cards');
const gameRoutes = require('./routes/game');
app.use('/api', cardRoutes(pool));
app.use(gameRoutes(gameUrl));  // Fixed typo

// Socket.IO lobby handler
const lobbyHandler = require('./socket/lobby');
lobbyHandler(io);

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=== Server Started ===`);
    console.log(`Game URL: ${gameUrl}`);
    console.log(`Server listening on port ${PORT}\n`);
});