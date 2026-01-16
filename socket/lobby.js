// socket/lobby.js

let players = [];
let hostId = null;

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A player connected:', socket.id);

        if (hostId === null) {
            hostId = socket.id;
            console.log('Host assigned:', socket.id);
        }

        sendLobbyUpdate();

        socket.on('join-team', (data) => {
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

            if (socket.id === hostId && players.length > 0) {
                hostId = players[0].id;
                console.log('New host assigned:', hostId);
            } else if (players.length === 0) {
                hostId = null;
            }

            sendLobbyUpdate();
        });
        
        socket.on('start-game', () => {
            if (socket.id === hostId) {
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
        });

        if (hostId) {
            io.to(hostId).emit('update-lobby', {
                teamA: teamA,
                teamB: teamB,
                isHost: true
            });
        }
    }
};