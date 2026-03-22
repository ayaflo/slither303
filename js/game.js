game_W = 0, game_H = 0;

var bg_im = new Image();
bg_im.src = "images/Map2.png";
SPEED = 1;
MaxSpeed = 0;
chX = chY = 1;
mySpeed = 1;

mySnake = [];
FOOD = [];
sizeMap = 2000;

Xfocus = Yfocus = 0;
XX = 0, YY = 0;

class game {
    constructor() {
        this.canvas = null;
        this.context = null;
        this.socket = io();
        this.mySnakeMap = {};
        this.joined = false;
        this.init();
    }

    init() {
        let selectedHead = 1;
        document.querySelectorAll('.head-opt').forEach(img => {
            img.addEventListener('click', (e) => {
                document.querySelectorAll('.head-opt').forEach(opt => opt.style.borderColor = 'transparent');
                e.target.style.borderColor = '#4CAF50';
                selectedHead = parseInt(e.target.getAttribute('data-idx'));
            });
        });

        document.getElementById('playBtn').addEventListener('click', () => {
            let name = document.getElementById('playerName').value || 'Player';
            document.getElementById('overlay').style.display = 'none';
            this.socket.emit('join', { name: name, headIdx: selectedHead });
            this.joined = true;
        });

        document.getElementById('replayBtn').addEventListener('click', () => {
            document.getElementById('gameOverOverlay').style.display = 'none';
            document.getElementById('overlay').style.display = 'flex';
        });

        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        document.body.appendChild(this.canvas);

        this.render();

        this.socket.on('gameState', (data) => {
            FOOD = [];
            for(let f of data.foods) {
                FOOD.push(new food(this, f));
            }
            
            mySnake = [];
            let myId = this.socket.id;
            let me = data.players[myId];
            if(me) {
                if(!this.mySnakeMap[myId]) this.mySnakeMap[myId] = new snake(this, me);
                else this.mySnakeMap[myId].updateData(me);
                mySnake[0] = this.mySnakeMap[myId];
                
                if(mySnake[0].v && mySnake[0].v[0]) {
                     XX = mySnake[0].v[0].x - game_W / 2;
                     YY = mySnake[0].v[0].y - game_H / 2;
                }
            }
            
            let idx = me ? 1 : 0;
            for(let id in data.players) {
                if(id === myId) continue;
                let p = data.players[id];
                if(!this.mySnakeMap[id]) this.mySnakeMap[id] = new snake(this, p);
                else this.mySnakeMap[id].updateData(p);
                mySnake[idx++] = this.mySnakeMap[id];
            }
            
            for(let id in this.mySnakeMap) {
                if(!data.players[id]) delete this.mySnakeMap[id];
            }
        });

        this.socket.on('died', (score) => {
            this.joined = false;
            document.getElementById('gameOverOverlay').style.display = 'flex';
            document.getElementById('finalScoreText').innerText = "Final Score: " + Math.floor(score);
        });

        setInterval(() => {
            if(this.joined) {
                this.socket.emit('input', { chX, chY, speed: mySpeed });
            }
        }, 1000/30);

        this.loop();

        this.listenMouse();
        this.listenTouch();
    }

    listenTouch() {
        document.addEventListener("touchmove", evt => {
            var y = evt.touches[0].pageY;
            var x = evt.touches[0].pageX;
            chX = (x - game_W / 2) / 15;
            chY = (y - game_H / 2) / 15;
        });

        document.addEventListener("touchstart", evt => {
            var y = evt.touches[0].pageY;
            var x = evt.touches[0].pageX;
            chX = (x - game_W / 2) / 15;
            chY = (y - game_H / 2) / 15;
            mySpeed = 2;
        });

        document.addEventListener("touchend", evt => {
            mySpeed = 1;
        });
    }

    listenMouse() {
        document.addEventListener("mousedown", evt => {
            mySpeed = 2;
        });

        document.addEventListener("mousemove", evt => {
            var x = evt.offsetX == undefined ? evt.layerX : evt.offsetX;
            var y = evt.offsetY == undefined ? evt.layerY : evt.offsetY;
            chX = (x - game_W / 2) / 15;
            chY = (y - game_H / 2) / 15;
        });

        document.addEventListener("mouseup", evt => {
            mySpeed = 1;
        });
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        this.render();
        this.updateChXY();
    }

    updateChXY() {
        MaxSpeed = this.getSize() / 7;
        let maxS = MaxSpeed;
        while (Math.abs(chY) * Math.abs(chY) + Math.abs(chX) * Math.abs(chX) > maxS * maxS && chY * chX != 0) {
            chX /= 1.1;
            chY /= 1.1;
        }
        while (Math.abs(chY) * Math.abs(chY) + Math.abs(chX) * Math.abs(chX) < maxS * maxS && chY * chX != 0) {
            chX *= 1.1;
            chY *= 1.1;
        }

        Xfocus += 1.5 * chX * mySpeed;
        Yfocus += 1.5 * chY * mySpeed;
        if (Xfocus < 0)
            Xfocus = bg_im.width / 2 + 22;
        if (Xfocus > bg_im.width / 2 + 22)
            Xfocus = 0;
        if (Yfocus < 0)
            Yfocus = bg_im.height / 2 + 60;
        if (Yfocus > bg_im.height / 2 + 60)
            Yfocus = 0;
    }

    render() {
        if (this.canvas.width != document.documentElement.clientWidth || this.canvas.height != document.documentElement.clientHeight) {
            this.canvas.width = document.documentElement.clientWidth;
            this.canvas.height = document.documentElement.clientHeight;
            game_W = this.canvas.width;
            game_H = this.canvas.height;
        }
    }

    draw() {
        this.clearScreen();
        if(!this.joined) return;
        for (let i = 0; i < FOOD.length; i++)
            FOOD[i].draw();
        for (let i = 0; i < mySnake.length; i++)
            if (mySnake[i]) mySnake[i].draw();
        this.drawScore();
        this.drawMinimap();
    }

    drawMinimap() {
        let mapRadius = 4000;
        let minimapSize = 150;
        let padding = 20;
        
        this.context.save();
        this.context.translate(game_W - minimapSize - padding, game_H - minimapSize - padding);
        
        // Background
        this.context.beginPath();
        this.context.rect(0, 0, minimapSize, minimapSize);
        this.context.fillStyle = "rgba(0,0,0,0.5)";
        this.context.fill();
        this.context.lineWidth = 2;
        this.context.strokeStyle = "rgba(255,255,255,0.5)";
        this.context.stroke();
        
        // Draw minimap food density
        this.context.fillStyle = "rgba(255, 255, 255, 0.4)";
        for(let f of FOOD) {
            let fx = (f.x + mapRadius) * (minimapSize / (mapRadius * 2));
            let fy = (f.y + mapRadius) * (minimapSize / (mapRadius * 2));
            if(fx >= 0 && fx <= minimapSize && fy >= 0 && fy <= minimapSize) {
                this.context.fillRect(fx, fy, 1, 1);
            }
        }
        
        // Draw players
        for(let i=0; i<mySnake.length; i++) {
            if(!mySnake[i] || !mySnake[i].v || !mySnake[i].v[0]) continue;
            let px = mySnake[i].v[0].x;
            let py = mySnake[i].v[0].y;
            
            let mx = (px + mapRadius) * (minimapSize / (mapRadius * 2));
            let my = (py + mapRadius) * (minimapSize / (mapRadius * 2));
            
            mx = Math.max(0, Math.min(minimapSize, mx));
            my = Math.max(0, Math.min(minimapSize, my));
            
            this.context.beginPath();
            this.context.arc(mx, my, i === 0 ? 3 : 2, 0, Math.PI * 2);
            this.context.fillStyle = i === 0 ? "#00FF00" : "#FF0000";
            this.context.fill();
        }
        
        this.context.restore();
    }

    drawScore() {
        let data = [];
        for (let i = 0; i < mySnake.length; i++)
            data[i] = mySnake[i];
        
        data.sort((a,b) => b.score - a.score);
        
        let index = -1;
        for (let i = 0; i < data.length; i++)
            if (data[i] === mySnake[0])
                index = i;
                
        this.context.font = this.getSize() / 4 + 'px Arial Black';
        for (let i = 0; i < Math.min(10, data.length); i++) {
            this.context.fillStyle = "#AA0000";
            if (i == index)
                this.context.fillStyle = "#CC99FF";
            this.context.fillText("#" + (i + 1), 3 * game_W / 4, this.getSize() / 2 * (i + 1));
            this.context.fillText(data[i].name, 3 * game_W / 4 + game_W / 24, this.getSize() / 2 * (i + 1));
            this.context.fillText(Math.floor(data[i].score), 3 * game_W / 4 + game_W / 5.5, this.getSize() / 2 * (i + 1));
        }
        if (index > 9) {
            this.context.fillStyle = "#CC99FF";
            this.context.fillText("#" + (index + 1), 3 * game_W / 4, this.getSize() / 2 * (10 + 1));
            this.context.fillText(data[index].name, 3 * game_W / 4 + game_W / 24, this.getSize() / 2 * (10 + 1));
            this.context.fillText(Math.floor(data[index].score), 3 * game_W / 4 + game_W / 5.5, this.getSize() / 2 * (10 + 1));
        }
    }

    clearScreen() {
        this.context.clearRect(0, 0, game_W, game_H);
        this.context.drawImage(bg_im, Xfocus, Yfocus, 1.5 * game_W, 1.5 * game_H, 0, 0, game_W, game_H);
    }

    getSize() {
        var area = game_W * game_H;
        return Math.sqrt(area / 300);
    }

    isPoint(x, y) {
        if (x - XX < -3 * this.getSize())
            return false;
        if (y - YY < -3 * this.getSize())
            return false;
        if (x - XX > game_W + 3 * this.getSize())
            return false;
        if (y - YY > game_H + 3 * this.getSize())
            return false;
        return true;
    }
}

var g = new game();