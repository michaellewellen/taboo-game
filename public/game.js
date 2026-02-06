const socket = io();

// When connected, identify this player to the server with new socket ID
socket.on('connect', () => {
    const playerName = sessionStorage.getItem('playerName');
    const playerTeam = sessionStorage.getItem('playerTeam');
    console.log(`[game.js] Connected with socket ID: ${socket.id}`);
    console.log(`[game.js] sessionStorage - playerName: ${playerName}, playerTeam: ${playerTeam}`);
    if (playerName && playerTeam) {
        console.log(`[game.js] Emitting player-ready for ${playerName} on Team ${playerTeam}`);
        socket.emit('player-ready', { name: playerName, team: playerTeam });
    } else {
        console.log(`[game.js] ERROR: Missing playerName or playerTeam in sessionStorage!`);
    }
});

const countdownScreen = document.getElementById('countdown-screen');
const countdownDisplay = document.getElementById('countdown-display');
const timerText = document.getElementById('timer-text');
const teamAScore = document.getElementById('team-a-score');
const teamBScore = document.getElementById('team-b-score');

const cardDisplay = document.getElementById('card-display');
const cardWord = document.getElementById('card-word');
const tabooWords = document.getElementById('taboo-words');

const clueGiverControls = document.getElementById('clue-giver-controls');
const passBtn = document.getElementById('pass-btn');

const monitorControls = document.getElementById('monitor-controls');
const buzzerBtn = document.getElementById('buzzer-btn');
const correctBtn = document.getElementById('correct-btn');
const startRoundBtn = document.getElementById('start-round-btn');

const waitingScreen = document.getElementById('waiting-screen');
const waitingMessage = document.getElementById('waiting-message');

const violationDecision = document.getElementById('violation-decision');
const violationYes = document.getElementById('violation-yes');
const violationNo = document.getElementById('violation-no');

const recapScreen = document.getElementById('recap-screen');
const recapCards = document.getElementById('recap-cards');
const recapScore = document.getElementById('recap-score');
const continueBtn = document.getElementById('continue-btn');

const gameOverScreen = document.getElementById('game-over-screen');
const winnerText = document.getElementById('winner-text');
const finalScores = document.getElementById('final-scores');
const playAgainBtn = document.getElementById('play-again-btn');

function hideAllScreens() {
    countdownScreen.style.display = 'none';
    cardDisplay.style.display = 'none';
    waitingScreen.style.display = 'none';
    violationDecision.style.display = 'none';
    recapScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    clueGiverControls.style.display = 'none';
    monitorControls.style.display = 'none';
}

socket.on('navigate-to-game', () => {
    window.location.href = '/game.html';
});

socket.on('show-start-button', (data) => {
    hideAllScreens();
    cardDisplay.style.display = 'block';
    monitorControls.style.display = 'block';
    startRoundBtn.style.display = 'block';
    buzzerBtn.style.display = 'none'
    correctBtn.style.display = 'none';
});

socket.on('countdown', (data) => {
    hideAllScreens();
    countdownScreen.style.display = 'flex';
    countdownDisplay.textContent = data.count;

    countdownDisplay.classList.remove('countdown-number');
    void countdownDisplay.offsetWidth;
    countdownDisplay.classList.add('countdown-number');
});

socket.on('timer-update', (data) => {
    timerText.textContent = data.time;
});

socket.on('show-card', (data) => {
    hideAllScreens();
    cardDisplay.style.display = 'block';

    cardWord.textContent = data.word;
    tabooWords.innerHTML = '';
    data.tabooWords.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        tabooWords.appendChild(li);
    });

    const card = document.getElementById('card');
    card.className = `card ${data.color}`;

    if (data.role === 'clue-giver') {
        clueGiverControls.style.display = 'block';
        monitorControls.style.display = 'none';
    } else if (data.role === 'monitor') {
        monitorControls.style.display = 'block';
        clueGiverControls.style.display = 'none';
        startRoundBtn.style.display = 'none';
        buzzerBtn.style.display = 'block';
        correctBtn.style.display = 'block';
    }
});

socket.on('show-waiting', (data) => {
    hideAllScreens();
    waitingScreen.style.display = 'flex';
    waitingMessage.textContent = data.message;
});

socket.on('show-violation-decision', () => {
    violationDecision.style.display = 'flex';
});

socket.on('show-recap', (data) => {
    hideAllScreens();
    recapScreen.style.display = 'block';

    recapCards.innerHTML = '';
    data.cardHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = `recap-card ${item.results}`;

        let symbol = '';
        if (item.result === 'correct') symbol = '✓';
        else if (item.result === 'violation') symbol = '✗';
        else if (item.result === 'pass') symbol = '⊘';
        else if (item.result === 'timeout') symbol = '⏱';

        div.innerHTML = `
            <span class="symbol">${symbol}</span>
            <span class="word">${item.card.word}</span>
        `;
        recapCards.appendChild(div);
    });

    recapScore.innerHTML = `
        <p>Round Score: ${data.roundScore}</p>
        <p>Team Total: ${data.teamScore}</p>
    `;
});

socket.on('game-ended', (data) => {
    hideAllScreens();
    gameOverScreen.style.display = 'flex';

    winnerText.textContent = data.message;
    finalScores.innerHTML = `
        <p>Team A: ${data.teamAScore}</p>
        <p>Team B: ${data.teamBScore}</p>
    `;
});

socket.on('navigate-to-lobby', () => {
    window.location.href = '/lobby.html';
});

startRoundBtn.addEventListener('click', () => {
    socket.emit('start-round');
    startRoundBtn.style.display = 'none';
});

buzzerBtn.addEventListener('click', () => {
    socket.emit('buzzer-pressed');
});

correctBtn.addEventListener('click', () => {
    socket.emit('correct-answer');
});

passBtn.addEventListener('click', () => {
    socket.emit('pass-card');
});

violationYes.addEventListener('click', () => {
    socket.emit('violation-decision', { isViolation: true });
    violationDecision.style.display = 'none';
});

violationNo.addEventListener('click', () => {
    socket.emit('violation-decision', {isViolation: false });
    violationDecision.style.display = 'none';
});

continueBtn.addEventListener('click', () => {
    socket.emit('recap-done');
});

playAgainBtn.addEventListener('click', () => {
    socket.emit('play-again');
});
