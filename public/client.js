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

    socket.emit('join-team', { name: playerName, team: 'B' });

    nameEntry.style.display = 'none';
    joinTeamABtn.disabled = true;
    joinTeamBBtn.disabled = true;
});

socket.on('update-lobby', (data) => {
    console.log('Lobby update:', data);

    teamAList.innerHTML = '';
    data.teamA.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        teamAList.appendChild(li);
    });
    teamACount.textContent = data.teamA.length;

    teamBList.innerHTML = '';
    data.teamB.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        teamBList.appendChild(li);
    });
    teamBCount.textContent = data.teamB.length;

    if(data.isHost){
        isHost = true;
        startGameBtn.style.display = 'block';
    }
})

startGameBtn.addEventListener('click', () =>{
    socket.emit('start-game');
});