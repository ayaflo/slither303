class food {
    constructor(game, data) {
        this.game = game;
        this.data = data;
        this.size = data.size;
        this.color = data.color;
        this.x = data.x;
        this.y = data.y;
    }

    draw() {
        if (this.game.isPoint(this.x, this.y)) {
            this.game.context.beginPath();
            this.game.context.arc(this.x - this.size / 4 - XX, this.y - this.size / 4 - YY, this.size / 2, 0, Math.PI * 2, false);
            this.game.context.fillStyle = this.color;
            if (this.data.glow) {
                this.game.context.shadowBlur = 15;
                this.game.context.shadowColor = this.color;
            }
            this.game.context.fill();
            this.game.context.shadowBlur = 0;
            this.game.context.closePath();
        }
    }
}