const Round = require('./Round');
const Card = require('./Card');

class Game {
    constructor(teamA, teamB, selectedColor, pool) {
        this.teamA = teamA;
        this.teamB = teamB;
        this.selectedColor = selectedColor;
        this.pool = pool; 

        // coin flip to see who goes first
        this.teamAstartFirst = Math.random() < 0.5;

        this.totalRounds = 2*Math.max(teamA.players.length, teamB.players.length);
        this.currentRoundNumber = 0;

        this.teamARotation = this.shuffleArray([...teamA.players]);
        this.teamBRotation = this.shuffleArray([...teamB.players]);
        this.teamAIndex = 0;
        this.teamBIndex = 0;

        this.currentRound = null;
        this.deck = [];
        this.gameState = 'lobby';
    }
    shuffleArray(array) {
        for (let i = array.length -1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async loadDeck() {
        try {
            const result = await this.pool.query(
                'SELECT * FROM taboo_cards WHERE color = $1 AND used = false',
                [this.selectedColor]
            );
            this.deck = result.rows.map(row =>
                new Card(row.id, row.word,
                    [row.taboo_word_1, row.taboo_word_2, row.taboo_word_3,
                        row.taboo_word_4, row.taboo_word_5],
                        row.color)
                    );

            // Shuffle the deck so cards come in random order
            this.deck = this.shuffleArray(this.deck);
            console.log(`Loaded and shuffled ${this.deck.length} cards`);

        } catch(err) {
            console.error('Error loading deck:', err);
            return 0;
        }
    }

    getNextClueGiver() {
        let isTeamATurn;
        if (this.teamAstartFirst) {
            isTeamATurn = (this.currentRoundNumber % 2 === 0);
        } else {
            isTeamATurn = (this.currentRoundNumber % 2 === 1);
        }

        if(isTeamATurn) {
            const player = this.teamARotation[this.teamAIndex];
            this.teamAIndex++;

            if (this.teamAIndex >= this.teamARotation.length) {
                this.teamARotation = this.shuffleArray([...this.teamA.players]);
                this.teamAIndex = 0;
            }
            return player;
        } else  {
            const player = this.teamBRotation[this.teamBIndex];
            this.teamBIndex++;

            if (this.teamBIndex >= this.teamBRotation.length) {
                this.teamBRotation = this.shuffleArray([...this.teamB.players]);
                this.teamBIndex = 0;
            }
            return player;
        }        
    }

    async checkDeckStatus() {
        const result = await this.pool.query(
            'SELECT COUNT(*) FROM taboo_cards WHERE color = $1 AND used = false',
            [this.selectedColor]
        );

        const availableCards = parseInt(result.rows[0].count);

        if (availableCards < 10) {
            console.log(`Only ${availableCards} cards left - resetting ${this.selectedColor} deck`);
            await this.pool.query(
                'UPDATE taboo_cards SET used = false WHERE color = $1',
                [this.selectedColor]
            );

            await this.loadDeck();
            return true;
        }
        return false;
    }    

    async startNextRound(io) {
        if (this.currentRoundNumber >= this.totalRounds) {
            this.endGame(io);
            return;
        }

        await this.checkDeckStatus();

        const clueGiver = this.getNextClueGiver();

        const isTeamATurn = this.teamAstartFirst
            ? (this.currentRoundNumber % 2 === 0)
            : (this.currentRoundNumber % 2 === 1);

        const activeTeam = isTeamATurn ? this.teamA : this.teamB;
        const monitoringTeam = isTeamATurn ? this.teamB : this.teamA;

        this.currentRound = new Round(clueGiver, activeTeam, this.deck);

        this.currentRoundNumber++;

        // Send score update to all players
        io.emit('score-update', {
            teamAScore: this.teamA.score,
            teamBScore: this.teamB.score
        });

        // Notify clue giver they are giving clues this round
        io.to(clueGiver.id).emit('show-waiting', {
            message: `You are the clue giver! Wait for the opposing team to start the round.`,
            isClueGiver: true
        });

        // Notify active team guessers to wait
        activeTeam.players.forEach(player => {
            if (player.id !== clueGiver.id) {
                io.to(player.id).emit('show-waiting', {
                    message: `${clueGiver.name} is giving clues this round. Wait for the round to start.`
                });
            }
        });

        // Notify monitoring team - they get the start button
        monitoringTeam.players.forEach(player => {
            io.to(player.id).emit('show-start-button', {
                clueGiver: clueGiver.name,
                round: this.currentRoundNumber
            });
        });
    }

    async endGame(io) {
        this.gameState = 'ended';

        if(this.currentRound) {
            clearInterval(this.currentRound.timerInterval);
        }

        const winner = this.teamA.score > this.teamB.score
            ? this.teamA
            : this.teamB.score > this.teamA.score
                ? this.teamB
                : null;

        // Save game to history
        try {
            await this.pool.query(
                `INSERT INTO game_history (team_a_name, team_b_name, team_a_score, team_b_score, winner)
                 VALUES ($1, $2, $3, $4, $5)`,
                [this.teamA.name, this.teamB.name, this.teamA.score, this.teamB.score, winner ? winner.name : 'TIE']
            );
            console.log('Game saved to history');
        } catch (err) {
            console.error('Error saving game history:', err);
        }

        io.emit('game-ended', {
            teamAName: this.teamA.name,
            teamBName: this.teamB.name,
            teamAScore: this.teamA.score,
            teamBScore: this.teamB.score,
            winner: winner ? winner.name : 'TIE',
            message: winner
                ? `${winner.name} wins ${winner.score} to ${winner === this.teamA ? this.teamB.score: this.teamA.score}!`
                : `It's a tie at ${this.teamA.score}!`,
            showPlayAgain: true
        });
    }

    playAgain(io) {
        io.emit('navigate-to-lobby');
    }
}
module.exports = Game;