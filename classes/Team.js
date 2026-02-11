class Team {
    constructor(name) {
        this.name = name;
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