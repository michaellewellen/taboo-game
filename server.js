// import libraries 
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const QRCode = require('qrcode');
const readline = require('readline');
const os = require('os');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Game state
let players = [];
let hostId = null;

// Serve static files from 'public' folder
app.use(express.static('public'));


// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let iface of Object.values(interfaces)) {
        for (let alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

// Store network credentials
let networkSSID = '';
let networkPassword = '';
let gameUrl = '';

// When a client connects via WebSocket
io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    if (hostId === null) {
        hostID = socket.id;
        console.log('Host assigned:', socket.id);
    }

    sendLobbyUpdate();

    socket.on('join-team', (data)=> {
        console.log(`${data.name} join Team ${data.team}`);

        players.push({
            id: socket.id,
            name: data.name,
            team: data.team
        });

        sendLobbyUpdate();
    });
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);

        players = players.filter(p =>p.id !== socket.id);

        if(socket.id === hostId && players.length > 0) {
            hostID = players[0].id;
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

const PORT = 3000;

// Prompt for network credentials before starting server
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n=== Taboo Game Server Setup ===\n');

rl.question('Enter WiFi Network Name (SSID): ', (ssid) => {
    networkSSID = ssid;
    
    rl.question('Enter WiFi Password: ', (password) => {
        networkPassword = password;
        rl.close();
        
        // Start the server
        startServer();
    });
});

function startServer() {
    const localIP = getLocalIP();
    gameUrl = `http://${localIP}:${PORT}`;
    
    server.listen(PORT, () => {
        console.log(`\n=== Server Started ===`);
        console.log(`Network: ${networkSSID}`);
        console.log(`Game URL: ${gameUrl}`);
        console.log(`\nOpen this on your laptop: http://localhost:${PORT}/connect.html`);
        console.log(`\nOr scan QR codes from that page on your phone.\n`);
    });
    
    // Serve QR codes as images
    app.get('/qr/wifi', async (req, res) => {
        const wifiString = `WIFI:T:WPA;S:${networkSSID};P:${networkPassword};;`;
        try {
            const qrImage = await QRCode.toDataURL(wifiString);
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
            ssid: networkSSID,
            gameUrl: gameUrl
        });
    });
}