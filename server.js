const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css'
    };
    
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const wss = new WebSocket.Server({ server });

const gameState = {
    players: new Map(),
    zombies: [],
    bullets: [],
    worldWidth: 3000,
    worldHeight: 2000
};

wss.on('connection', (ws) => {
    const playerId = generateId();
    
    gameState.players.set(playerId, {
        id: playerId,
        x: 600 + Math.random() * 100,
        y: 400 + Math.random() * 100,
        health: 100,
        weapon: 'pistol',
        kills: 0
    });
    
    ws.playerId = playerId;
    
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        gameState: {
            players: Array.from(gameState.players.values()),
            zombies: gameState.zombies,
            bullets: gameState.bullets
        }
    }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('Invalid message:', error);
        }
    });
    
    ws.on('close', () => {
        gameState.players.delete(playerId);
        broadcast({
            type: 'playerLeft',
            playerId: playerId
        });
    });
});

function handleMessage(ws, data) {
    const playerId = ws.playerId;
    const player = gameState.players.get(playerId);
    
    if (!player) return;
    
    switch (data.type) {
        case 'move':
            player.x = Math.max(15, Math.min(gameState.worldWidth - 15, data.x));
            player.y = Math.max(15, Math.min(gameState.worldHeight - 15, data.y));
            break;
            
        case 'shoot':
            gameState.bullets.push({
                id: generateId(),
                x: player.x,
                y: player.y,
                angle: data.angle,
                playerId: playerId,
                damage: data.damage,
                speed: 8,
                range: data.range,
                distanceTraveled: 0
            });
            break;
            
        case 'takeDamage':
            player.health = Math.max(0, player.health - data.damage);
            break;
            
        case 'weaponSwitch':
            player.weapon = data.weapon;
            break;
    }
}

function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function updateGame() {
    gameState.bullets.forEach((bullet, index) => {
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;
        bullet.distanceTraveled += bullet.speed;
        
        if (bullet.distanceTraveled > bullet.range || 
            bullet.x < 0 || bullet.x > gameState.worldWidth ||
            bullet.y < 0 || bullet.y > gameState.worldHeight) {
            gameState.bullets.splice(index, 1);
        }
    });
    
    broadcast({
        type: 'gameUpdate',
        players: Array.from(gameState.players.values()),
        bullets: gameState.bullets
    });
}

function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

setInterval(updateGame, 1000 / 60);

server.listen(3000, () => {
    console.log('Game server running on http://localhost:3000');
});

module.exports = { server, wss };