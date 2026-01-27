class Round {
    constructor(clueGiver, activeTeam, deck) {
        this.clueGiver = clueGiver;         // Player object
        this.activeTeam = activeTeam;       // Team object
        this.deck = deck;                   // Array of Card objects

        this.currentCard = null;
        this.cardHistory = [];
        this.roundScore = 0;
        this.passCount = 0;

        this.timeRemaining = 60;
        this.timerInterval = null;
        this.isPaused = false;
    }

    startRound(io) {
        setTimeout(() => {
            io.emit('countdown', { count: 3 });
        }, 0);

        setTimeout(() => {
            io.emit('countdown', { count: 2 });
        }, 1000);

        setTimeout(() => {
            io.emit('countdown', { count: 1 });
        }, 2000);

        setTimeout(() => {
            io.emit('countdown', { count: 'GO!' });
            this.drawCard();
            this.startTimer(io);
        }, 3000)    
    }

    drawCard() {
        if (this.deck.length === 0) {
            if (this.cardHistory.length === 0) {
                console.error('CRITICAL: No cards in deck OR history! ')
                return null;
            }
            const randomIndex = Math.floor(Math.random() * this.cardHistory.length);
            this.currentCard = this.cardHistory[randomIndex].card;
            console.log('Deck exhausted - recycling card from history');
            return this.currentCard;
        }

        this.currentCard = this.deck.pop();
        return this.currentCard;
    }

    startTimer(io) {
    this.startTime = Date.now();  // Record exact start time
    
    this.timerInterval = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        this.timeRemaining = 60 - (elapsed / 1000);
        
        io.emit('timer-update', { time: Math.ceil(this.timeRemaining) });
        
        if (this.timeRemaining <= 0) {
            this.endRound(io);
        }
    }, 100);  // Update every 100ms
}

    pauseTimer() {
        clearInterval(this.timerInterval);
        const elapsed = Date.now() - this.startTime;
        this.timeRemaining = 60 - (elapsed / 1000);  // Exact time remaining
        this.isPaused = true;
    }

    resumeTimer(io) {
        this.isPaused = false;
        this.startTime = Date.now() - ((60 - this.timeRemaining) * 1000);  // Adjust start time
        
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            this.timeRemaining = 60 - (elapsed / 1000);
            
            io.emit('timer-update', { time: Math.ceil(this.timeRemaining) });
            
            if (this.timeRemaining <= 0) {
                this.endRound(io);
            }
        }, 100);
    }

    handleCorrect(io) {
        this.cardHistory.push({
            card: this.currentCard,
            result: 'correct'
        });

        this.roundScore++;
        this.drawCard();
        return this.currentCard;
    }

    handleViolation(io) {
        this.cardHistory.push({
            card: this.currentCard, 
            result: 'violation'
        });
        this.roundScore--;
        this.drawCard();
        return this.currentCard;
    }

    handlePass(io) {
        this.cardHistory.push({
            card: this.currentCard,
            result: 'pass'
        });

        if(this.passCount > 0) {
            this.roundScore--;
        }
        this.passCount++;
        this.drawCard();
        return this.currentCard;
    }

    endRound(io) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        if (this.currentCard && this.timeRemaining <=0) {
            this.cardHistory.push({
                card: this.currentCard,
                result: 'timeout'
            })
        }
        this.activeTeam.addScore(this.roundScore);

        return {
            clueGiver: this.clueGiver,
            cardHistory: this.cardHistory, 
            roundScore: this.roundScore,
            teamScore: this.activeTeam.score
        };
    }
}
module.exports = Round;