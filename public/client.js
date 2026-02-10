// Connect to the server
const socket = io();

let playerName = '';
let playerTeam = null;
let isHost = false;

//DOM elements
const nameEntry = document.getElementById('name-entry');
const playerNameInput = document.getElementById('player-name');
const joinTeamABtn = document.getElementById('join-team-a');
const joinTeamBBtn = document.getElementById('join-team-b');
const startGameBtn = document.getElementById('start-game');
const statusText = document.getElementById('status');
const teamAList = document.getElementById('team-a-list');
const teamBList = document.getElementById('team-b-list');
const teamACount = document.getElementById('team-a-count');
const teamBCount = document.getElementById('team-b-count');

// When connection succeeds:
socket.on('connect', () => {
    console.log('Connected to server!');
    document.getElementById('status').textContent = 'Connected!';
    document.getElementById('status').style.color = 'green';
});

// When connection fails or disconnects
socket.on('disconnect', () => {
    console.log('Disconnected from server');
    document.getElementById('status').textContent = 'Disconnected';
    document.getElementById('status').style.color = 'red';
});

joinTeamABtn.addEventListener('click', ()=>{
    const name = playerNameInput.value.trim();
    if (name === '') {
        alert('Please enter your name first!');
        return;
    }

    playerName = name;
    playerTeam = 'A';

    // Store in sessionStorage so game.html can identify this player
    // (sessionStorage is per-tab, unlike localStorage which is shared)
    sessionStorage.setItem('playerName', playerName);
    sessionStorage.setItem('playerTeam', 'A');

    socket.emit('join-team', { name: playerName, team: 'A' });

    nameEntry.style.display = 'none';
    joinTeamABtn.disabled = true;
    joinTeamBBtn.disabled = true;
});

joinTeamBBtn.addEventListener('click', ()=>{
    const name = playerNameInput.value.trim();
    if (name === '') {
        alert('Please enter your name first!');
        return;
    }

    playerName = name;
    playerTeam = 'B';

    // Store in sessionStorage so game.html can identify this player
    // (sessionStorage is per-tab, unlike localStorage which is shared)
    sessionStorage.setItem('playerName', playerName);
    sessionStorage.setItem('playerTeam', 'B');

    socket.emit('join-team', { name: playerName, team: 'B' });

    nameEntry.style.display = 'none';
    joinTeamABtn.disabled = true;
    joinTeamBBtn.disabled = true;
});

// Team name header elements
const teamAHeader = document.querySelector('#teams .team:first-child h2');
const teamBHeader = document.querySelector('#teams .team:last-child h2');

socket.on('update-lobby', (data) => {
    console.log('Lobby update:', data);

    // Apply session color theme to lobby
    if (data.sessionColor) {
        document.body.className = `lobby-page theme-${data.sessionColor}`;
    }

    // Update team names in headers
    if (data.teamAName && teamAHeader) {
        teamAHeader.innerHTML = `${data.teamAName} (<span id="team-a-count">${data.teamA.length}</span>)`;
    }
    if (data.teamBName && teamBHeader) {
        teamBHeader.innerHTML = `${data.teamBName} (<span id="team-b-count">${data.teamB.length}</span>)`;
    }

    teamAList.innerHTML = '';
    data.teamA.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        teamAList.appendChild(li);
    });

    teamBList.innerHTML = '';
    data.teamB.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        teamBList.appendChild(li);
    });

    if(data.teamA.length >= 2 && data.teamB.length >= 2){
    startGameBtn.style.display = 'block';
    } else {
    startGameBtn.style.display = 'none';
    }
});

// Prompt first player on a team to name it
socket.on('prompt-team-name', (data) => {
    const defaultName = data.team === 'A' ? 'Team A' : 'Team B';
    const teamName = prompt(`You're the first on ${defaultName}! Give your team a name (or leave blank to keep "${defaultName}"):`);

    if (teamName && teamName.trim()) {
        socket.emit('set-team-name', { team: data.team, name: teamName.trim() });
    }
})

startGameBtn.addEventListener('click', () => {
    socket.emit('start-game');
});

socket.on('navigate-to-game', () => {
    console.log('Navigating to game...');
    window.location.href = '/game.html';
});

// Reset cards button
const resetCardsBtn = document.getElementById('reset-cards-btn');
const resetStatus = document.getElementById('reset-status');

resetCardsBtn.addEventListener('click', async () => {
    if (confirm('Reset all cards to unused? This will give everyone a fresh deck.')) {
        try {
            const response = await fetch('/api/reset-cards', { method: 'POST' });
            const data = await response.json();
            resetStatus.textContent = `${data.count} cards reset!`;
            setTimeout(() => {
                resetStatus.textContent = '';
            }, 3000);
        } catch (err) {
            resetStatus.textContent = 'Error resetting cards';
        }
    }
});