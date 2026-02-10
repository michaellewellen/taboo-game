class Team {
    constructor(id, displayName = null) {
        this.id = id;  // 'A' or 'B'
        this.name = displayName || `Team ${id}`;  // Custom name or default
        this.players = [];
        this.score = 0;
    }
    addPlayer(player) {
        this.players.push(player);
    }

    addScore(points) {
        this.score += points;
    }
}

module.exports = Team;