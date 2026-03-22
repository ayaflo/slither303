const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const players = {};
let foods = [];
const NFood = 500; // Reduced from 2000 for smoother network performance
const sizeMap = 2000;
const minScore = 200;
const MaxSpeed = 30; 

const ArrColor = ["#FF0000", "#FFFF00", "#00FF00", "#FF00FF", "#FFFFFF", "#00FFFF", "#7FFF00", "#FFCC00"];

function range(v1, v2) {
    if(!v1 || !v2) return 999999;
    return Math.sqrt((v1.x - v2.x) * (v1.x - v2.x) + (v1.y - v2.y) * (v1.y - v2.y));
}

function spawnFood() {
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: (Math.random() - Math.random()) * sizeMap * 2,
        y: (Math.random() - Math.random()) * sizeMap * 2,
        size: 200 / (7 + Math.random() * 10),
        color: ArrColor[Math.floor(Math.random() * 99999) % ArrColor.length]
    };
}

for(let i=0; i<NFood; i++){
    foods.push(spawnFood());
}

io.on('connection', (socket) => {
    console.log('User connected: ' + socket.id);
    
    socket.on('join', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name || "Player",
            headIdx: data.headIdx || 1,
            score: minScore,
            speed: 1,
            angle: 0,
            dx: 1,
            dy: 0,
            size: 50,
            v: []
        };
        for (let i = 0; i < 50; i++) {
            players[socket.id].v[i] = { x: 0, y: 0 };
        }
    });

    socket.on('input', (data) => {
        if(players[socket.id]) {
            players[socket.id].dx = data.chX;
            players[socket.id].dy = data.chY;
            players[socket.id].speed = data.speed;
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
        delete players[socket.id];
    });
});

setInterval(() => {
    for (let id in players) {
        let p = players[id];
        
        let maxS = MaxSpeed;
        while (Math.abs(p.dy) * Math.abs(p.dy) + Math.abs(p.dx) * Math.abs(p.dx) > maxS * maxS && p.dx * p.dy != 0) {
            p.dx /= 1.1;
            p.dy /= 1.1;
        }
        
        // update head
        if(p.v.length > 0) {
            p.v[0].x += p.dx * p.speed;
            p.v[0].y += p.dy * p.speed;
        }
        
        // decay score
        if (p.speed == 2 && p.score > 200) {
            p.score -= p.score / 2000;
        }
        
        // update body
        for (let i = 1; i < p.v.length; i++) {
            if (range(p.v[i], p.v[i - 1]) > p.size / 5) {
                p.v[i].x = (p.v[i].x + p.v[i - 1].x) / 2;
                p.v[i].y = (p.v[i].y + p.v[i - 1].y) / 2;
                p.v[i].x = (p.v[i].x + p.v[i - 1].x) / 2;
                p.v[i].y = (p.v[i].y + p.v[i - 1].y) / 2;
            }
        }
        
        let csUp = Math.pow(p.score / 1000, 1 / 5);
        p.size = 100 * csUp; 
        
        let N = 3 * Math.floor(50 * Math.pow(p.score / 1000, 1 / 1));
        if(N < 50) N = 50;
        if (N > p.v.length) {
            p.v[p.v.length] = { x: p.v[p.v.length - 1].x, y: p.v[p.v.length - 1].y };
        } else if (N < p.v.length) {
            p.v = p.v.slice(0, N);
        }
    }
    
    // Check food collisions
    for (let id in players) {
        let p = players[id];
        if(!p.v[0]) continue;
        for (let j = 0; j < foods.length; j++) {
            if (range(p.v[0], foods[j]) < 1.5 * p.size) {
                p.score += foods[j].size;
                foods.splice(j, 1);
                foods.push(spawnFood());
            }
        }
    }
    
    // Check snake collisions
    let ids = Object.keys(players);
    for (let i = 0; i < ids.length; i++) {
        for (let j = 0; j < ids.length; j++) {
            if (i !== j) {
                let p1 = players[ids[i]];
                let p2 = players[ids[j]];
                if(!p1 || !p2 || !p1.v || !p2.v || !p1.v[0] || !p2.v[0]) continue;
                let kt = true;
                for (let k = 0; k < p2.v.length; k++) {
                    if (range(p1.v[0], p2.v[k]) < p1.size) {
                        kt = false;
                        break;
                    }
                }
                if (!kt) {
                    for (let k = 0; k < p1.v.length; k += 5) {
                        foods.push({
                            id: Math.random().toString(36).substr(2, 9),
                            x: p1.v[k].x + Math.random() * p1.size / 2,
                            y: p1.v[k].y + Math.random() * p1.size / 2,
                            size: 1.0 * p1.score / (p1.v.length / 5),
                            color: ArrColor[Math.floor(Math.random() * 99999) % ArrColor.length],
                            glow: true
                        });
                    }
                    if(foods.length > NFood + 300) {
                        foods = foods.slice(foods.length - NFood);
                    }
                    
                    io.to(p1.id).emit('died', p1.score);
                    delete players[ids[i]];
                    break; // Ngưng check va chạm cho người chơi đã chết
                }
            }
        }
    }

    io.emit('gameState', { players, foods });

}, 30);

http.listen(3000, () => {
    console.log('listening on *:3000');
});
