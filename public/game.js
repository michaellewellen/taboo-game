const socket = io();

// Pie timer element
const pieTimer = document.getElementById('pie-timer');
const TOTAL_TIME = 60;

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

// Handle theme color from server
socket.on('set-theme', (data) => {
    console.log(`[game.js] Setting theme color: ${data.color}`);
    document.body.className = `theme-${data.color}`;
});

// DOM Elements
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

const waitingScreen = document.getElementById('waiting-screen');
const waitingTitle = document.getElementById('waiting-title');
const waitingMessage = document.getElementById('waiting-message');

const readyScreen = document.getElementById('ready-screen');
const roundNumber = document.getElementById('round-number');
const readyMessage = document.getElementById('ready-message');
const startRoundBtnMain = document.getElementById('start-round-btn-main');

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
    readyScreen.style.display = 'none';
    violationDecision.style.display = 'none';
    recapScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    clueGiverControls.style.display = 'none';
    monitorControls.style.display = 'none';
}

socket.on('navigate-to-game', () => {
    window.location.href = '/game.html';
});

// Score update handler
socket.on('score-update', (data) => {
    teamAScore.textContent = data.teamAScore;
    teamBScore.textContent = data.teamBScore;
});

// Opposing team sees this - clean screen with start button
socket.on('show-start-button', (data) => {
    hideAllScreens();
    readyScreen.style.display = 'flex';
    roundNumber.textContent = data.round;
    readyMessage.textContent = `${data.clueGiver} is giving clues. Press START when ready!`;
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

    // Update pie chart progress
    const progress = (data.time / TOTAL_TIME) * 100;
    if (pieTimer) {
        pieTimer.style.setProperty('--progress', `${progress}%`);
    }
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
    }
});

socket.on('show-waiting', (data) => {
    hideAllScreens();
    waitingScreen.style.display = 'flex';

    if (data.isClueGiver) {
        waitingTitle.textContent = 'You Are The Clue Giver!';
    } else {
        waitingTitle.textContent = 'Listen and Guess!';
    }
    waitingMessage.textContent = data.message;
});

socket.on('show-violation-decision', () => {
    violationDecision.style.display = 'flex';
});

socket.on('show-recap', (data) => {
    hideAllScreens();
    recapScreen.style.display = 'flex';

    recapCards.innerHTML = '';
    data.cardHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = `recap-card ${item.result}`;

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

// Button event listeners
startRoundBtnMain.addEventListener('click', () => {
    socket.emit('start-round');
    readyScreen.style.display = 'none';
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
    socket.emit('violation-decision', { isViolation: false });
    violationDecision.style.display = 'none';
});

continueBtn.addEventListener('click', () => {
    socket.emit('recap-done');
});

playAgainBtn.addEventListener('click', () => {
    socket.emit('play-again');
});
