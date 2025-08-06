const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

class Game {
    constructor() {
        this.player = new Player(canvas.width/2, canvas.height/2);
        this.zombies = [];
        this.bullets = [];
        this.weapons = [];
        this.vehicles = [];
        this.buildings = [];
        this.particles = [];
        
        this.camera = { x: 0, y: 0 };
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        this.worldWidth = 2000;
        this.worldHeight = 1500;
        
        this.kills = 0;
        this.gameTime = 0;
        
        this.setupEventListeners();
        this.generateWorld();
        this.gameLoop();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
            const worldX = this.mouse.x + this.camera.x;
            const worldY = this.mouse.y + this.camera.y;
            this.player.shoot(worldX, worldY);
        });
        
        canvas.addEventListener('mouseup', (e) => {
            this.mouse.down = false;
        });
        
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    generateWorld() {
        // Generate buildings
        for (let i = 0; i < 8; i++) {
            this.buildings.push(new Building(
                200 + Math.random() * (this.worldWidth - 400),
                200 + Math.random() * (this.worldHeight - 400),
                120 + Math.random() * 80,
                80 + Math.random() * 60
            ));
        }
        
        // Generate vehicles
        for (let i = 0; i < 4; i++) {
            this.vehicles.push(new Vehicle(
                Math.random() * this.worldWidth,
                Math.random() * this.worldHeight
            ));
        }
        
        // Generate weapons
        for (let i = 0; i < 6; i++) {
            this.weapons.push(new WeaponPickup(
                Math.random() * this.worldWidth,
                Math.random() * this.worldHeight,
                ['rifle', 'shotgun', 'machinegun'][Math.floor(Math.random() * 3)]
            ));
        }
        
        // Generate zombies
        for (let i = 0; i < 20; i++) {
            let x, y;
            do {
                x = Math.random() * this.worldWidth;
                y = Math.random() * this.worldHeight;
            } while (Math.abs(x - this.player.x) < 200 && Math.abs(y - this.player.y) < 200);
            
            this.zombies.push(new Zombie(x, y, 'normal'));
        }
        
        // Generate boss zombies
        for (let i = 0; i < 2; i++) {
            let x, y;
            do {
                x = Math.random() * this.worldWidth;
                y = Math.random() * this.worldHeight;
            } while (Math.abs(x - this.player.x) < 300 && Math.abs(y - this.player.y) < 300);
            
            this.zombies.push(new Zombie(x, y, 'boss'));
        }
    }
    
    update() {
        this.gameTime++;
        
        this.player.update(this.keys, this.mouse, this.camera);
        
        // Update camera to follow player
        this.camera.x = Math.max(0, Math.min(this.worldWidth - canvas.width, this.player.x - canvas.width / 2));
        this.camera.y = Math.max(0, Math.min(this.worldHeight - canvas.height, this.player.y - canvas.height / 2));
        
        // Update bullets
        this.bullets.forEach(bullet => bullet.update());
        this.bullets = this.bullets.filter(bullet => !bullet.destroyed);
        
        // Update zombies
        this.zombies.forEach(zombie => {
            zombie.update(this.player);
            this.checkZombieBulletCollision(zombie);
        });
        this.zombies = this.zombies.filter(zombie => zombie.health > 0);
        
        // Update particles
        this.particles.forEach(particle => particle.update());
        this.particles = this.particles.filter(particle => particle.life > 0);
        
        // Check collisions
        this.checkPlayerZombieCollision();
        this.checkPlayerWeaponPickup();
        this.checkPlayerVehicleInteraction();
        
        this.updateUI();
    }
    
    checkZombieBulletCollision(zombie) {
        this.bullets.forEach(bullet => {
            const dx = bullet.x - zombie.x;
            const dy = bullet.y - zombie.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < zombie.size + bullet.size) {
                zombie.takeDamage(bullet.damage);
                bullet.destroyed = true;
                
                this.particles.push(new Particle(zombie.x, zombie.y, '#ff0000'));
                
                if (zombie.health <= 0) {
                    this.kills++;
                    for (let i = 0; i < 5; i++) {
                        this.particles.push(new Particle(
                            zombie.x + (Math.random() - 0.5) * 20,
                            zombie.y + (Math.random() - 0.5) * 20,
                            '#8B0000'
                        ));
                    }
                }
            }
        });
    }
    
    checkPlayerZombieCollision() {
        this.zombies.forEach(zombie => {
            const dx = this.player.x - zombie.x;
            const dy = this.player.y - zombie.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.player.size + zombie.size && !this.player.isDodging) {
                this.player.takeDamage(zombie.damage);
            }
        });
    }
    
    checkPlayerWeaponPickup() {
        this.weapons.forEach((weapon, index) => {
            const dx = this.player.x - weapon.x;
            const dy = this.player.y - weapon.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 30 && this.keys['KeyF']) {
                this.player.switchWeapon(weapon.type);
                this.weapons.splice(index, 1);
            }
        });
    }
    
    checkPlayerVehicleInteraction() {
        this.vehicles.forEach(vehicle => {
            const dx = this.player.x - vehicle.x;
            const dy = this.player.y - vehicle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 40 && this.keys['KeyC']) {
                if (this.player.inVehicle) {
                    this.player.exitVehicle();
                } else {
                    this.player.enterVehicle(vehicle);
                }
            }
        });
    }
    
    updateUI() {
        document.getElementById('health').textContent = this.player.health;
        document.getElementById('weapon').textContent = this.player.currentWeapon.name;
        document.getElementById('ammo').textContent = this.player.currentWeapon.ammo;
        document.getElementById('kills').textContent = this.kills;
    }
    
    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw world bounds
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);
        
        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.worldWidth; x += 100) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.worldHeight);
            ctx.stroke();
        }
        for (let y = 0; y < this.worldHeight; y += 100) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.worldWidth, y);
            ctx.stroke();
        }
        
        // Draw game objects
        this.buildings.forEach(building => building.render(ctx));
        this.vehicles.forEach(vehicle => vehicle.render(ctx));
        this.weapons.forEach(weapon => weapon.render(ctx));
        this.zombies.forEach(zombie => zombie.render(ctx));
        this.bullets.forEach(bullet => bullet.render(ctx));
        this.particles.forEach(particle => particle.render(ctx));
        this.player.render(ctx);
        
        ctx.restore();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
        this.speed = 3;
        this.health = 100;
        this.maxHealth = 100;
        
        this.weapons = {
            pistol: { name: 'Pistol', damage: 25, ammo: 15, maxAmmo: 15, fireRate: 10, range: 300 },
            rifle: { name: 'Rifle', damage: 40, ammo: 30, maxAmmo: 30, fireRate: 5, range: 500 },
            shotgun: { name: 'Shotgun', damage: 60, ammo: 8, maxAmmo: 8, fireRate: 15, range: 150 },
            machinegun: { name: 'Machine Gun', damage: 20, ammo: 100, maxAmmo: 100, fireRate: 3, range: 400 }
        };
        
        this.currentWeapon = this.weapons.pistol;
        this.lastShot = 0;
        
        this.isDodging = false;
        this.dodgeCooldown = 0;
        
        this.inVehicle = false;
        this.vehicle = null;
    }
    
    update(keys, mouse, camera) {
        this.dodgeCooldown = Math.max(0, this.dodgeCooldown - 1);
        
        if (keys['Space'] && this.dodgeCooldown === 0) {
            this.isDodging = true;
            this.dodgeCooldown = 60;
            setTimeout(() => { this.isDodging = false; }, 200);
        }
        
        const moveSpeed = this.inVehicle ? this.vehicle.speed : this.speed;
        const speedMultiplier = this.isDodging ? 2 : 1;
        
        if (keys['KeyW'] || keys['ArrowUp']) this.y -= moveSpeed * speedMultiplier;
        if (keys['KeyS'] || keys['ArrowDown']) this.y += moveSpeed * speedMultiplier;
        if (keys['KeyA'] || keys['ArrowLeft']) this.x -= moveSpeed * speedMultiplier;
        if (keys['KeyD'] || keys['ArrowRight']) this.x += moveSpeed * speedMultiplier;
        
        this.x = Math.max(this.size, Math.min(game.worldWidth - this.size, this.x));
        this.y = Math.max(this.size, Math.min(game.worldHeight - this.size, this.y));
        
        if (this.inVehicle) {
            this.vehicle.x = this.x;
            this.vehicle.y = this.y;
        }
        
        this.lastShot++;
        
        if (mouse.down && this.lastShot >= this.currentWeapon.fireRate && this.currentWeapon.ammo > 0) {
            const worldX = mouse.x + camera.x;
            const worldY = mouse.y + camera.y;
            this.shoot(worldX, worldY);
        }
    }
    
    shoot(targetX, targetY) {
        if (this.currentWeapon.ammo <= 0) return;
        
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        
        if (this.currentWeapon.name === 'Shotgun') {
            for (let i = 0; i < 5; i++) {
                const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
                game.bullets.push(new Bullet(this.x, this.y, spreadAngle, this.currentWeapon));
            }
        } else {
            game.bullets.push(new Bullet(this.x, this.y, angle, this.currentWeapon));
        }
        
        this.currentWeapon.ammo--;
        this.lastShot = 0;
    }
    
    switchWeapon(weaponType) {
        if (this.weapons[weaponType]) {
            this.currentWeapon = this.weapons[weaponType];
        }
    }
    
    enterVehicle(vehicle) {
        this.inVehicle = true;
        this.vehicle = vehicle;
    }
    
    exitVehicle() {
        this.inVehicle = false;
        this.vehicle = null;
    }
    
    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        if (this.health <= 0) {
            console.log('Game Over!');
        }
    }
    
    render(ctx) {
        if (this.isDodging) {
            ctx.globalAlpha = 0.5;
        }
        
        if (this.inVehicle) {
            return;
        }
        
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x - 8, this.y - 8, 16, 16);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - 10, this.y - this.size - 10, 20 * (this.health / this.maxHealth), 4);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', this.x, this.y - 25);
        
        ctx.globalAlpha = 1;
    }
}

class Zombie {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        if (type === 'boss') {
            this.size = 25;
            this.speed = 1.5;
            this.health = 200;
            this.maxHealth = 200;
            this.damage = 30;
            this.color = '#660000';
        } else {
            this.size = 12;
            this.speed = 1;
            this.health = 50;
            this.maxHealth = 50;
            this.damage = 15;
            this.color = '#006600';
        }
        
        this.lastAttack = 0;
    }
    
    update(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        this.lastAttack++;
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - this.size, this.y - this.size - 8, (this.size * 2) * (this.health / this.maxHealth), 3);
        
        if (this.type === 'boss') {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('BOSS', this.x, this.y - 30);
        }
    }
}

class Bullet {
    constructor(x, y, angle, weapon) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.size = 3;
        this.damage = weapon.damage;
        this.range = weapon.range;
        this.distanceTraveled = 0;
        this.destroyed = false;
    }
    
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.distanceTraveled += this.speed;
        
        if (this.distanceTraveled > this.range) {
            this.destroyed = true;
        }
        
        if (this.x < 0 || this.x > game.worldWidth || this.y < 0 || this.y > game.worldHeight) {
            this.destroyed = true;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
}

class WeaponPickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = 10;
    }
    
    render(ctx) {
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(this.x - this.size, this.y - this.size/2, this.size * 2, this.size);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type.toUpperCase(), this.x, this.y - 15);
    }
}

class Vehicle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 25;
        this.speed = 5;
        this.color = '#444444';
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        ctx.fillStyle = '#88ccff';
        ctx.fillRect(this.x - this.width/2 + 5, this.y - this.height/2 + 5, this.width - 10, this.height - 10);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CAR', this.x, this.y + 2);
    }
}

class Building {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    render(ctx) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Windows
        ctx.fillStyle = '#FFD700';
        const windowsX = Math.floor(this.width / 30);
        const windowsY = Math.floor(this.height / 25);
        for (let i = 0; i < windowsX; i++) {
            for (let j = 0; j < windowsY; j++) {
                ctx.fillRect(
                    this.x + 10 + i * 30,
                    this.y + 10 + j * 25,
                    15, 15
                );
            }
        }
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.color = color;
        this.life = 30;
        this.maxLife = 30;
        this.size = 3;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.life--;
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

const game = new Game();