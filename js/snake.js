Nball = 13;
class snake {
    constructor(game, data) {
        this.game = game;
        this.name = data.name || "Player";
        this.score = data.score;
        this.x = data.v && data.v.length > 0 ? data.v[0].x : 0;
        this.y = data.v && data.v.length > 0 ? data.v[0].y : 0;
        this.v = data.v || [];
        this.size = data.size || 50;
        this.dx = data.dx || 1;
        this.dy = data.dy || 0;

        this.sn_im = new Image();
        this.sn_im.src = "images/head" + (data.headIdx || 1) + ".png";
        
        let rnd = 0;
        if(data.id) {
            for(let i=0; i<data.id.length; i++) rnd += data.id.charCodeAt(i);
        }
        this.bd_im = new Image();
        this.bd_im.src = "images/body/" + (rnd % Nball) + ".png";
    }

    updateData(data) {
        this.score = data.score;
        this.v = data.v;
        this.size = data.size;
        this.dx = data.dx;
        this.dy = data.dy;
        if(this.v && this.v.length > 0 && this.v[0]){
             this.x = this.v[0].x;
             this.y = this.v[0].y;
        }
    }

    draw() {
        if (!this.v || this.v.length === 0 || !this.v[0]) return;

        for (let i = this.v.length - 1; i >= 1; i--) {
            if (this.game.isPoint(this.v[i].x, this.v[i].y)) {
                this.game.context.drawImage(this.bd_im, this.v[i].x - XX - (this.size) / 2, this.v[i].y - YY - (this.size) / 2, this.size, this.size);
            }
        }

        let angle = this.getAngle(this.dx, this.dy);

        this.game.context.save();
        this.game.context.translate(this.v[0].x - XX, this.v[0].y - YY);
        this.game.context.rotate(angle - Math.PI / 2);
        this.game.context.drawImage(this.sn_im, -this.size / 2, -this.size / 2, this.size, this.size);
        this.game.context.restore();
    }

    getAngle(a, b) {
        if(a === 0 && b === 0) return 0;
        let c = Math.sqrt(a * a + b * b);
        let al = Math.acos(a / c);
        if (b < 0)
            al += 2 * (Math.PI - al);
        return al;
    }
}