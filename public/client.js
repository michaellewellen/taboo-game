// Connect to the server
const socket = io();

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