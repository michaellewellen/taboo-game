// socket/lobby.js

let players = [];
const colors = ['pink', 'blue', 'green'];
let sessionColor = colors[Math.floor(Math.random() * colors.length)];

// Callback to reset game state (registered by gameplay.js)
let resetGameCallback = null;

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A player connected:', socket.id);

        // When a player connects to lobby, ensure game state is reset
        // This handles the case where players manually return to lobby
        if (resetGameCallback) {
            resetGameCallback();
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

            // If lobby is now empty, pick a new session color for next game
            if (players.length === 0) {
                sessionColor = colors[Math.floor(Math.random() * colors.length)];
                console.log(`Lobby empty - new session color: ${sessionColor}`);
            }

            sendLobbyUpdate();
        });

    });

    function sendLobbyUpdate() {
        const teamA = players.filter(p => p.team === 'A');
        const teamB = players.filter(p => p.team === 'B');

        io.emit('update-lobby', {
            teamA: teamA,
            teamB: teamB,
            sessionColor: sessionColor
        });
    }

    function clearPlayers() {
        players = [];
    }

    return {
        getPlayers: () => players,
        getSessionColor: () => sessionColor,
        clearPlayers: clearPlayers,
        registerResetCallback: (callback) => {
            resetGameCallback = callback;
        }
    };
};