// socket/lobby.js

let players = [];

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A player connected:', socket.id);

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
            sendLobbyUpdate();
        });
        
    });

    function sendLobbyUpdate() {
        const teamA = players.filter(p => p.team === 'A');
        const teamB = players.filter(p => p.team === 'B');

        io.emit('update-lobby', {
            teamA: teamA,
            teamB: teamB
        });
    }

    return { getPlayers: () => players };
};