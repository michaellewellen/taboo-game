// socket/lobby.js

let players = [];
const colors = ['pink', 'blue', 'green'];
let sessionColor = colors[Math.floor(Math.random() * colors.length)];

// Team names (default to Team A/Team B)
let teamAName = 'Team A';
let teamBName = 'Team B';

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

            const teamPlayers = players.filter(p => p.team === data.team);
            const isFirstOnTeam = teamPlayers.length === 0;

            players.push({
                id: socket.id,
                name: data.name,
                team: data.team
            });

            // If first player on team, prompt them to name it
            if (isFirstOnTeam) {
                socket.emit('prompt-team-name', { team: data.team });
            }

            sendLobbyUpdate();
        });

        socket.on('set-team-name', (data) => {
            if (data.team === 'A' && data.name && data.name.trim()) {
                teamAName = data.name.trim();
                console.log(`Team A named: ${teamAName}`);
            } else if (data.team === 'B' && data.name && data.name.trim()) {
                teamBName = data.name.trim();
                console.log(`Team B named: ${teamBName}`);
            }
            sendLobbyUpdate();
        });

        socket.on('disconnect', () => {
            console.log('Player disconnected:', socket.id);
            players = players.filter(p => p.id !== socket.id);

            // If lobby is now empty, reset for next game
            if (players.length === 0) {
                sessionColor = colors[Math.floor(Math.random() * colors.length)];
                teamAName = 'Team A';
                teamBName = 'Team B';
                console.log(`Lobby empty - reset for next game, color: ${sessionColor}`);
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
            teamAName: teamAName,
            teamBName: teamBName,
            sessionColor: sessionColor
        });
    }

    function clearPlayers() {
        players = [];
    }

    return {
        getPlayers: () => players,
        getSessionColor: () => sessionColor,
        getTeamNames: () => ({ teamAName, teamBName }),
        clearPlayers: clearPlayers,
        registerResetCallback: (callback) => {
            resetGameCallback = callback;
        }
    };
};