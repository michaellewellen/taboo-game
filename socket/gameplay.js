const Game = require('../classes/Game');
const Team = require('../classes/Team');
const Player = require('../classes/Player');

let currentGame = null;

let gameStarted = false;
let expectedPlayerCount = 0;
let readyPlayers = new Set();

// Guards to prevent duplicate actions from multiple clients
let firstRoundStarted = false;
let roundInProgress = false;
let waitingForRecap = false;

// Function to force-reset all state (can be called from API)
function forceReset(lobbyRef) {
    console.log('[FORCE RESET] Clearing all game state');
    currentGame = null;
    gameStarted = false;
    readyPlayers = new Set();
    expectedPlayerCount = 0;
    firstRoundStarted = false;
    roundInProgress = false;
    waitingForRecap = false;
    if (lobbyRef) {
        lobbyRef.clearPlayers();
    }
}

// Export the reset function for use by API routes
module.exports = (io, pool, lobby) => {

    io.on('connection', (socket) => {

        // Player connected to game.html and is identifying themselves
        socket.on('player-ready', (data) => {
            console.log(`[player-ready] Received from ${data.name} (Team ${data.team}), socket: ${socket.id}`);
            console.log(`[player-ready] currentGame: ${!!currentGame}, gameStarted: ${gameStarted}, firstRoundStarted: ${firstRoundStarted}`);

            if (!currentGame) {
                console.log(`[player-ready] ERROR: No currentGame! Cannot process player-ready.`);
                return;
            }

            // Find and update the player's socket ID in the game
            const team = data.team === 'A' ? currentGame.teamA : currentGame.teamB;
            console.log(`[player-ready] Looking for ${data.name} in Team ${data.team}. Team has ${team.players.length} players:`, team.players.map(p => p.name));

            const player = team.players.find(p => p.name === data.name);

            if (player) {
                player.id = socket.id;  // Update to new socket ID
                readyPlayers.add(data.name);
                console.log(`[player-ready] Updated ${data.name}'s socket ID. Ready: ${readyPlayers.size}/${expectedPlayerCount}`);

                // Send the session color to this player
                io.to(socket.id).emit('set-theme', { color: currentGame.selectedColor });

                // Once all players are ready, start the first round (ONLY ONCE!)
                if (readyPlayers.size === expectedPlayerCount && !firstRoundStarted) {
                    firstRoundStarted = true;
                    console.log('[player-ready] All players ready! Starting first round...');
                    currentGame.startNextRound(io);
                }
            } else {
                console.log(`[player-ready] ERROR: Could not find player ${data.name} in Team ${data.team}!`);
            }
        });

        // Someone clicks "Start Game" in lobby
        socket.on('start-game', async () => {
            console.log(`[start-game] Received, gameStarted: ${gameStarted}`);
            if (gameStarted) {
                console.log('[start-game] Game already started, ignoring');
                return;
            }
            gameStarted = true;

            // Reset all guards for new game
            firstRoundStarted = false;
            roundInProgress = false;
            waitingForRecap = false;

            const players = lobby.getPlayers();
            console.log('Initializing game with players:', players);

            expectedPlayerCount = players.length;
            readyPlayers = new Set();

            // Create Team objects
            const teamA = new Team('A');
            const teamB = new Team('B');

            // Use the session color from lobby (consistent from lobby to game)
            const selectedColor = lobby.getSessionColor();

            // Create Player objects and add to teams
            players.forEach(p => {
                const player = new Player(p.id, p.name, p.team);
                if (p.team === 'A') {
                    teamA.addPlayer(player);
                } else {
                    teamB.addPlayer(player);
                }
            });

            // Create Game
            currentGame = new Game(teamA, teamB, selectedColor, pool);
            await currentGame.loadDeck();

            // Navigate everyone to game.html
            // startNextRound will be called once all players emit 'player-ready'
            console.log('About to emit navigate-to-game to all clients');
            io.emit('navigate-to-game');
        });

        // Monitoring team clicks "Start Round" - ONLY FIRST CLICK COUNTS
        socket.on('start-round', () => {
            console.log(`[start-round] Received, roundInProgress: ${roundInProgress}`);
            if (roundInProgress) {
                console.log('[start-round] Round already in progress, ignoring');
                return;
            }
            if (currentGame && currentGame.currentRound) {
                roundInProgress = true;
                console.log('[start-round] Starting round countdown...');
                currentGame.currentRound.startRound(io, (card) => {
                    // After countdown, emit card to all players
                    emitCard(io, card, currentGame.currentRound);
                });
            }
        });

        socket.on('buzzer-pressed', () => {
            if (currentGame && currentGame.currentRound) {
                currentGame.currentRound.pauseTimer();
                io.to(socket.id).emit('show-violation-decision');
            }
        });

        socket.on('violation-decision', (data) => {
            if (currentGame && currentGame.currentRound) {
                if (data.isViolation) {
                    const newCard = currentGame.currentRound.handleViolation(io);
                    emitCard(io, newCard, currentGame.currentRound);
                }
                // Always resume timer after violation decision (whether yes or no)
                currentGame.currentRound.resumeTimer(io);
            }
        });

        socket.on('correct-answer', () => {
            if (currentGame && currentGame.currentRound) {
                const newCard = currentGame.currentRound.handleCorrect(io);
                emitCard(io, newCard, currentGame.currentRound);
            }
        });

        socket.on('pass-card', () => {
            if (currentGame && currentGame.currentRound) {
                const newCard = currentGame.currentRound.handlePass(io);
                emitCard(io, newCard, currentGame.currentRound);
            }
        });

        // Continue after recap - ONLY FIRST CLICK COUNTS
        socket.on('recap-done', async () => {
            console.log(`[recap-done] Received, waitingForRecap: ${waitingForRecap}`);
            if (waitingForRecap) {
                console.log('[recap-done] Already processing, ignoring duplicate');
                return;
            }
            if (currentGame) {
                waitingForRecap = true;
                roundInProgress = false;  // Reset for next round
                console.log('[recap-done] Starting next round...');
                await currentGame.startNextRound(io);
                waitingForRecap = false;  // Allow next recap
            }
        });

        socket.on('play-again', () => {
            console.log('[play-again] Resetting ALL game state');
            if (currentGame) {
                currentGame.playAgain(io);
            }
            // Reset ALL state
            currentGame = null;
            gameStarted = false;
            readyPlayers = new Set();
            expectedPlayerCount = 0;
            firstRoundStarted = false;
            roundInProgress = false;
            waitingForRecap = false;
            // Clear lobby players so everyone re-registers
            lobby.clearPlayers();
        });

    });

    // Return the forceReset function bound to lobby
    return {
        forceReset: () => forceReset(lobby)
    };
};

function emitCard(io, card, round) {
    const clueGiverId = round.clueGiver.id;
    const activeTeamIds = round.activeTeam.players.map(p => p.id);

    // Emit to clue giver
    io.to(clueGiverId).emit('show-card', {
        word: card.word,
        tabooWords: card.tabooWords,
        color: card.color,
        role: 'clue-giver'
    });

    // emit to guessers (active team, not cluegiver)
    activeTeamIds.forEach(id => {
        if (id !== clueGiverId) {
            io.to(id).emit('show-waiting', {
                message: 'Listen and guess!',
                clueGiver: round.clueGiver.name
            });
        }
    });

    // emit to opposing team
    const allPlayers = [...currentGame.teamA.players, ...currentGame.teamB.players];
    const monitorids = allPlayers
        .filter(p => p.team !== round.activeTeam.name)
        .map(p => p.id);

    monitorids.forEach(id => {
        io.to(id).emit('show-card', {
            word: card.word,
            tabooWords: card.tabooWords,
            color: card.color,
            role: 'monitor'
        });
    });
}
