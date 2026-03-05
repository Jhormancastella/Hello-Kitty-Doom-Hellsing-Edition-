import { SoundSystem } from "./systems/soundSystem.js";
import { GameState } from "./core/gameState.js";
import { ParticleSystem, ScreenParticleSystem } from "./systems/particleSystems.js";
import { WEAPONS, ITEM_TYPES, DIFFICULTIES, MAP, MAX_FRAME_DELTA } from "./config/gameConfig.js";

const soundSystem = new SoundSystem();
// =============================================
    // DETECCIÓN DE DISPOSITIVO
    // =============================================
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const deviceInfo = document.getElementById('device-info');
    const controlsInfo = document.getElementById('controls-info');
    
    if (isMobile) {
        deviceInfo.textContent = "Dispositivo: Móvil (Modo Game Boy)";
        controlsInfo.innerHTML = "CRUCETA: ↑↓ para avanzar/retroceder, ←→ para rotar<br>BOTÓN B: Disparar, BOTÓN A: Acción, BOTÓN P: Pausar";
    } else {
        deviceInfo.textContent = "Dispositivo: Escritorio (Modo TV CRT)";
        controlsInfo.innerHTML = "Usa W/S para avanzar o retroceder, A/D para rotar<br>Q/E para desplazarte lateralmente, Barra espaciadora para disparar, P para pausar";
    }
    
    // =============================================
    // VARIABLES GLOBALES DEL JUEGO
    // =============================================
    let gameStarted = false, gamePaused = false, currentDifficulty = 'easy';
    let animationFrameId;
    let textures = {};
    let lastTime = 0;
    let shootCooldown = 0;
    let damageEffectTimer = 0;
    let bossWarningTimer = 0;
    let weaponKickbackTimer = 0;
    let shootPressedLastFrame = false;
    let actionPressedLastFrame = false;
    let nextWaveDelay = 0;
    const splashScreen = document.getElementById('splash-screen');
    const startButton = document.getElementById('start-button');
    const pauseModal = document.getElementById('pause-modal');
    const resumeButton = document.getElementById('resume-button');
    const pauseBtn = document.getElementById('pause-btn');
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    
    let canvas, ctx, miniMapCanvas, miniMapCtx;
    if (isMobile) {
        canvas = document.getElementById('mobile-canvas');
        miniMapCanvas = document.getElementById('mini-map-canvas');
    } else {
        canvas = document.getElementById('desktop-canvas');
        miniMapCanvas = document.getElementById('desktop-mini-map');
    }
    ctx = canvas.getContext('2d');
    miniMapCtx = miniMapCanvas.getContext('2d');
const weapons = WEAPONS;
const itemTypes = ITEM_TYPES;
const difficulties = DIFFICULTIES;
const map = MAP;

let gameData = new GameState();
let particleSystem = new ParticleSystem(1000);
let screenParticleSystem = new ScreenParticleSystem(260, () => ({ width: canvas.width, height: canvas.height }));
    // =============================================
    // FUNCIONES DE UTILIDAD
    // =============================================
    function resizeCanvas() {
        if (isMobile) {
            const screenArea = document.querySelector('.console-screen-area');
            canvas.width = screenArea.clientWidth - 20;
            canvas.height = screenArea.clientHeight - 20;
            
            if (window.innerWidth <= 360) {
                miniMapCanvas.width = 80;
                miniMapCanvas.height = 80;
            } else {
                miniMapCanvas.width = 100;
                miniMapCanvas.height = 100;
            }
        } else {
            canvas.width = 800;
            canvas.height = 600;
            
            if (window.innerWidth <= 1024) {
                miniMapCanvas.width = 150;
                miniMapCanvas.height = 150;
            } else {
                miniMapCanvas.width = 200;
                miniMapCanvas.height = 200;
            }
        }
    }

    function updateScore(s) { 
        document.querySelectorAll('[data-hud="score"]').forEach(d => d.textContent = `PUNTOS: ${s}`);
        if (isMobile) document.getElementById('mobile-score').textContent = s;
    }
    
    function updateHealth(h) { 
        document.querySelectorAll('[data-hud="health"]').forEach(d => d.textContent = `VIDA: ${h}`);
        if (isMobile) document.getElementById('mobile-health').textContent = h;
    }
    
    function updateAmmo(a) { 
        document.querySelectorAll('[data-hud="ammo"]').forEach(d => d.textContent = `MUNICIÓN: ${a}`);
        if (isMobile) document.getElementById('mobile-ammo').textContent = a;
    }
    
    function updateWave(w) { 
        document.querySelectorAll('[data-hud="wave"]').forEach(d => d.textContent = `OLEADA: ${w}`);
        if (isMobile) document.getElementById('mobile-wave').textContent = w;
    }

    function updateWeaponDisplay() {
        const currentWeapon = weapons[gameData.player.currentWeapon];
        const weaponName = isMobile ? document.getElementById('weapon-name') : document.getElementById('desktop-weapon-name');
        const weaponIcon = isMobile ? document.getElementById('weapon-icon') : document.getElementById('desktop-weapon-icon');
        
        weaponName.textContent = currentWeapon.name;
        weaponIcon.style.backgroundImage = `url('${currentWeapon.icon}')`;
    }

    function showBossWarning() {
        const warning = document.createElement('div');
        warning.className = 'boss-warning';
        warning.textContent = '¡JEFE INMINENTE!';
        document.body.appendChild(warning);
        
        setTimeout(() => {
            if (warning.parentNode) warning.parentNode.removeChild(warning);
        }, 2000);
    }
    difficultyButtons.forEach(btn => btn.addEventListener('click', () => {
        difficultyButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.difficulty;
    }));

    // =============================================
    // SISTEMA DE COLISIONES MEJORADO
    // =============================================
    class CollisionSystem {
        static get mapWidth() { return map[0].length; }
        static get mapHeight() { return map.length; }

        static isInsideBounds(x, y, radius = 0) {
            return (
                x - radius >= 0 &&
                y - radius >= 0 &&
                x + radius < this.mapWidth &&
                y + radius < this.mapHeight
            );
        }

        static isWallTile(tileX, tileY) {
            if (tileX < 0 || tileY < 0 || tileX >= this.mapWidth || tileY >= this.mapHeight) {
                return true;
            }
            return map[tileY][tileX] !== 0;
        }

        static checkMapCollision(x, y, radius = 0.3) {
            if (!this.isInsideBounds(x, y, radius)) return true;

            const samples = [
                [x, y],
                [x - radius, y - radius],
                [x + radius, y - radius],
                [x - radius, y + radius],
                [x + radius, y + radius]
            ];

            for (const [sx, sy] of samples) {
                if (this.isWallTile(Math.floor(sx), Math.floor(sy))) return true;
            }

            return false;
        }

        static isValidPosition(x, y, radius = 0.3) {
            return !this.checkMapCollision(x, y, radius);
        }
    }
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getWaveProfile(wave = gameData.wave) {
        const diff = difficulties[currentDifficulty];
        const tier = Math.floor((wave - 1) / 3);

        return {
            wave,
            isBossWave: wave % 5 === 0,
            enemyCount: diff.enemyCount + Math.floor(wave * 1.5) + tier,
            enemyHealth: Math.round(diff.enemyHealth * (1 + tier * 0.18) + wave * 6),
            enemySpeed: Math.min(diff.enemySpeed * (1 + tier * 0.1) + wave * 0.0012, 0.05),
            enemyDamage: Math.round(diff.enemyDamage + tier * 1.5 + wave * 0.25),
            enemyArmor: diff.enemyArmor + tier * 0.04,
            itemSpawnChance: Math.max(0.1, diff.itemSpawnChance - tier * 0.02),
            waveBonus: Math.round(diff.waveBonus * (1 + tier * 0.25)),
            bossHealth: Math.round((280 + wave * 70) * diff.bossHealthMult),
            bossDamage: Math.round(diff.bossDamage + wave * 0.6),
            bossArmor: 1.65 + tier * 0.08
        };
    }

    function findSpawnPosition({
        minPlayerDistance = 3,
        minEnemyDistance = 1.2,
        minItemDistance = 0.8,
        maxAttempts = 120
    } = {}) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const tileX = Math.floor(Math.random() * (map[0].length - 2)) + 1;
            const tileY = Math.floor(Math.random() * (map.length - 2)) + 1;

            if (map[tileY][tileX] !== 0) continue;

            const x = tileX + 0.5;
            const y = tileY + 0.5;

            if (Math.hypot(x - gameData.player.x, y - gameData.player.y) < minPlayerDistance) continue;

            let blocked = false;
            for (const enemy of gameData.enemies) {
                if (Math.hypot(x - enemy.x, y - enemy.y) < minEnemyDistance) {
                    blocked = true;
                    break;
                }
            }
            if (blocked) continue;

            for (const item of gameData.items) {
                if (item.collected) continue;
                if (Math.hypot(x - item.x, y - item.y) < minItemDistance) {
                    blocked = true;
                    break;
                }
            }
            if (blocked) continue;

            return { x, y };
        }

        return null;
    }

    function hasLineOfSight(fromX, fromY, toX, toY, step = 0.12) {
        const distance = Math.hypot(toX - fromX, toY - fromY);
        if (distance < 0.001) return true;

        const steps = Math.ceil(distance / step);
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            if (CollisionSystem.isWallTile(Math.floor(x), Math.floor(y))) return false;
        }
        return true;
    }

    function getSeparationVector(enemy, enemyIndex, radius = 0.85) {
        let sepX = 0;
        let sepY = 0;

        for (let i = 0; i < gameData.enemies.length; i++) {
            if (i === enemyIndex) continue;
            const other = gameData.enemies[i];
            const dist = Math.hypot(enemy.x - other.x, enemy.y - other.y);
            if (dist > 0.001 && dist < radius) {
                const strength = (radius - dist) / radius;
                sepX += ((enemy.x - other.x) / dist) * strength;
                sepY += ((enemy.y - other.y) / dist) * strength;
            }
        }

        return { x: sepX, y: sepY };
    }

    // =============================================
    // FUNCIONES DE ITEMS
    // =============================================
    function spawnItem(type, x, y) {
        const item = {
            x: x,
            y: y,
            type: type,
            collected: false,
            spawnTime: Date.now()
        };
        
        if (type === 'weapon') {
            const availableWeapons = Object.keys(weapons).filter(w => !gameData.player.weapons.includes(w));
            if (availableWeapons.length > 0) {
                item.weaponType = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
                item.texture = itemTypes.weapon.textures[Object.keys(weapons).indexOf(item.weaponType) % itemTypes.weapon.textures.length];
            } else {
                return null;
            }
        }
        
        gameData.items.push(item);
        return item;
    }

    function spawnRandomItem() {
        const profile = getWaveProfile();
        if (Math.random() >= profile.itemSpawnChance) return null;

        const spawn = findSpawnPosition({
            minPlayerDistance: 2.2,
            minEnemyDistance: 1.4,
            minItemDistance: 1.0,
            maxAttempts: 80
        });
        if (!spawn) return null;

        let weights = [0.4, 0.4, 0.2];
        if (gameData.player.health < 35) {
            weights = [0.55, 0.3, 0.15];
        } else if (gameData.player.ammo < 20) {
            weights = [0.25, 0.55, 0.2];
        }

        const random = Math.random();
        let selectedType = 'health';
        if (random < weights[0]) selectedType = 'health';
        else if (random < weights[0] + weights[1]) selectedType = 'ammo';
        else selectedType = 'weapon';

        return spawnItem(selectedType, spawn.x, spawn.y);
    }

    // =============================================
    // CARGAR TEXTURAS (INCLUYENDO JEFES)
    // =============================================
    async function loadTextures() {
        const textureSources = {
            wall: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1762346475/pared0_nkefoz.jpg',
            enemy: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761849704/de24431f-418a-4ffa-b40c-58d6eec4fb48_yg9n2n.png',
            floor: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761769080/techo0_gqwtwh.jpg',
            health: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761931100/Photoroom-20251031_120315_1_vwz2bq.png',
            ammo: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761931100/Photoroom-20251031_120316_2_nnf0u7.png',
            weapon1: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761931100/Photoroom-20251031_120316_3_i1i8kj.png',
            weapon2: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761931101/Photoroom-20251031_120316_5_osprby.png',
            weapon3: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761931101/Photoroom-20251031_120316_6_tflii5.png',
            playerWeapon: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761931100/descarga_4_fbm3t4.png',
            // NUEVAS TEXTURAS DE JEFES
            boss1: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761952986/Photoroom-20251031_182239_1_j4ttbk.png',
            boss2: 'https://res.cloudinary.com/dipv76dpn/image/upload/v1761952985/Photoroom-20251031_182239_2_xszjso.png'
        };

        const loadPromises = Object.entries(textureSources).map(([key, url]) => {
            return new Promise(resolve => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => { textures[key] = img; resolve(); };
                img.onerror = () => {
                    const c = document.createElement('canvas');
                    c.width = c.height = 64;
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = '#ff1744'; ctx.fillRect(0,0,64,64);
                    ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.fillText(key.toUpperCase(), 5, 35);
                    textures[key] = c;
                    resolve();
                };
                img.src = url + '?t=' + Date.now();
            });
        });
        await Promise.all(loadPromises);
    }

    // =============================================
    // SISTEMA DE ARMAS Y ITEMS
    // =============================================
    function switchWeapon(weaponType) {
        if (gameData.player.weapons.includes(weaponType)) {
            gameData.player.currentWeapon = weaponType;
            updateWeaponDisplay();
            soundSystem.playWeaponSwitch();
            return true;
        }
        return false;
    }

    function collectItem(item) {
        if (item.collected) return false;
        
        item.collected = true;
        
        switch(item.type) {
            case 'health':
                gameData.player.health = Math.min(100, gameData.player.health + itemTypes.health.value);
                updateHealth(gameData.player.health);
                soundSystem.playHealthPickup();
                break;
                
            case 'ammo':
                gameData.player.ammo += itemTypes.ammo.value;
                updateAmmo(gameData.player.ammo);
                soundSystem.playPickup();
                break;
                
            case 'weapon':
                if (item.weaponType && !gameData.player.weapons.includes(item.weaponType)) {
                    gameData.player.weapons.push(item.weaponType);
                    switchWeapon(item.weaponType);
                }
                break;
        }
        
        return true;
    }

    // =============================================
    // SISTEMA DE DISPARO MEJORADO
    // =============================================
    function getDistanceDamageMultiplier(weapon, distance) {
        if (distance <= weapon.falloffStart) return 1;
        if (distance >= weapon.falloffEnd) return weapon.minDamageMultiplier;
        const t = (distance - weapon.falloffStart) / Math.max(weapon.falloffEnd - weapon.falloffStart, 0.001);
        return 1 - t * (1 - weapon.minDamageMultiplier);
    }

    function applyWeaponDamage(enemy, weapon, distance) {
        const distanceMultiplier = getDistanceDamageMultiplier(weapon, distance);
        const armor = Math.max(0.2, enemy.armor || 1);
        const penetration = Math.max(0.1, weapon.armorPenetration || 1);
        const rawDamage = weapon.damage * distanceMultiplier * penetration / armor;
        const finalDamage = Math.max(1, Math.round(rawDamage));
        enemy.health -= finalDamage;
        return finalDamage;
    }

    function firePellet(weapon, angle) {
        const stepSize = 0.14;
        const maxSteps = 120;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let x = gameData.player.x;
        let y = gameData.player.y;

        for (let i = 0; i < maxSteps; i++) {
            x += dx * stepSize;
            y += dy * stepSize;

            if (CollisionSystem.isWallTile(Math.floor(x), Math.floor(y))) {
                return { hit: false, x, y, target: null };
            }

            for (const enemy of gameData.enemies) {
                const hitRadius = enemy.boss ? 0.7 : 0.55;
                if (Math.hypot(enemy.x - x, enemy.y - y) <= hitRadius) {
                    const travelDistance = Math.hypot(x - gameData.player.x, y - gameData.player.y);
                    applyWeaponDamage(enemy, weapon, travelDistance);
                    return { hit: true, x, y, target: enemy };
                }
            }
        }

        return { hit: false, x, y, target: null };
    }

    function shoot() {
        const currentWeapon = weapons[gameData.player.currentWeapon];

        if (shootCooldown > 0 || gameData.player.ammo < currentWeapon.ammoCost) return false;

        gameData.player.ammo -= currentWeapon.ammoCost;
        shootCooldown = currentWeapon.cooldown;
        weaponKickbackTimer = 0.12;
        soundSystem.playShoot();
        screenParticleSystem.createMuzzleFlash(currentWeapon);
        updateAmmo(gameData.player.ammo);

        const pellets = Math.max(1, currentWeapon.pellets || 1);
        let anyHit = false;
        let bossHit = false;
        let normalHit = false;

        for (let i = 0; i < pellets; i++) {
            const spread = (Math.random() - 0.5) * (currentWeapon.spread || 0);
            const shotAngle = gameData.player.angle + spread;
            const result = firePellet(currentWeapon, shotAngle);
            if (result.hit) {
                anyHit = true;
                if (result.target && result.target.boss) {
                    bossHit = true;
                } else {
                    normalHit = true;
                }
                screenParticleSystem.createEnemyBlood(!!(result.target && result.target.boss));
            }
        }

        if (bossHit) soundSystem.playBossHit();
        if (normalHit) soundSystem.playHit();
        return anyHit;
    }

    // =============================================
    // RENDERIZADO DEL MINI MAPA
    // =============================================
    function renderMiniMap() {
        const cellSize = miniMapCanvas.width / map[0].length;
        const playerSize = Math.max(3, cellSize * 0.6);
        
        miniMapCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        miniMapCtx.fillRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);
        
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                if (map[y][x] === 1) {
                    miniMapCtx.fillStyle = '#ff6b9d';
                } else {
                    miniMapCtx.fillStyle = '#333344';
                }
                miniMapCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                
                miniMapCtx.strokeStyle = 'rgba(255, 107, 157, 0.3)';
                miniMapCtx.lineWidth = 0.5;
                miniMapCtx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
        
        gameData.items.forEach(item => {
            if (!item.collected) {
                let color;
                switch(item.type) {
                    case 'health': color = '#00ff00'; break;
                    case 'ammo': color = '#ffff00'; break;
                    case 'weapon': color = '#ff00ff'; break;
                    default: color = '#ffffff';
                }
                miniMapCtx.fillStyle = color;
                miniMapCtx.beginPath();
                miniMapCtx.arc(item.x * cellSize, item.y * cellSize, playerSize * 0.5, 0, Math.PI * 2);
                miniMapCtx.fill();
            }
        });
        
        gameData.enemies.forEach(enemy => {
            if (enemy.boss) {
                miniMapCtx.fillStyle = '#ff00ff'; // Color morado para el jefe
            } else {
                miniMapCtx.fillStyle = '#ff1744';
            }
            miniMapCtx.beginPath();
            miniMapCtx.arc(enemy.x * cellSize, enemy.y * cellSize, playerSize * (enemy.boss ? 1.2 : 0.8), 0, Math.PI * 2);
            miniMapCtx.fill();
            
            const healthRatio = enemy.health / enemy.maxHealth;
            if (healthRatio < 1) {
                miniMapCtx.fillStyle = healthRatio > 0.5 ? '#00ff00' : healthRatio > 0.25 ? '#ffff00' : '#ff0000';
                miniMapCtx.fillRect(
                    enemy.x * cellSize - playerSize * 0.4,
                    enemy.y * cellSize - playerSize * 1.2,
                    playerSize * 0.8 * healthRatio,
                    2
                );
            }
        });
        
        miniMapCtx.fillStyle = '#00ff00';
        miniMapCtx.beginPath();
        miniMapCtx.arc(gameData.player.x * cellSize, gameData.player.y * cellSize, playerSize, 0, Math.PI * 2);
        miniMapCtx.fill();
        
        const directionLength = playerSize * 1.5;
        miniMapCtx.strokeStyle = '#00ff00';
        miniMapCtx.lineWidth = 2;
        miniMapCtx.beginPath();
        miniMapCtx.moveTo(gameData.player.x * cellSize, gameData.player.y * cellSize);
        miniMapCtx.lineTo(
            gameData.player.x * cellSize + Math.cos(gameData.player.angle) * directionLength,
            gameData.player.y * cellSize + Math.sin(gameData.player.angle) * directionLength
        );
        miniMapCtx.stroke();
        
        miniMapCtx.strokeStyle = '#ff6b9d';
        miniMapCtx.lineWidth = 2;
        miniMapCtx.strokeRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);
    }

    // =============================================
    // SISTEMA DE RAYCASTING OPTIMIZADO
    // =============================================
    function castRay(angle, maxDistance = 30) {
        const dx = Math.cos(angle), dy = Math.sin(angle);
        let mapX = Math.floor(gameData.player.x), mapY = Math.floor(gameData.player.y);
        const deltaX = Math.abs(1 / (dx || 0.0001)), deltaY = Math.abs(1 / (dy || 0.0001));
        let stepX = dx < 0 ? -1 : 1, stepY = dy < 0 ? -1 : 1;
        let sideDistX = dx < 0 ? (gameData.player.x - mapX) * deltaX : (mapX + 1 - gameData.player.x) * deltaX;
        let sideDistY = dy < 0 ? (gameData.player.y - mapY) * deltaY : (mapY + 1 - gameData.player.y) * deltaY;
        let hit = false;
        let side = 0;
        let steps = 0;
        const maxSteps = map.length * map[0].length * 2;

        while (!hit && steps < maxSteps) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaY;
                mapY += stepY;
                side = 1;
            }

            if (mapX < 0 || mapY < 0 || mapX >= map[0].length || mapY >= map.length) {
                return maxDistance;
            }

            if (map[mapY][mapX] > 0) hit = true;
            steps++;
        }

        if (!hit) return maxDistance;

        const dist = side === 0
            ? (mapX - gameData.player.x + (1 - stepX) / 2) / (dx || 0.0001)
            : (mapY - gameData.player.y + (1 - stepY) / 2) / (dy || 0.0001);

        if (!Number.isFinite(dist)) return maxDistance;
        return clamp(dist, 0, maxDistance);
    }

    function isEnemyVisible(enemy) {
        const dist = Math.hypot(enemy.x - gameData.player.x, enemy.y - gameData.player.y);
        if (dist > 15) return false;
        
        const angle = Math.atan2(enemy.y - gameData.player.y, enemy.x - gameData.player.x) - gameData.player.angle;
        const normAngle = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
        const fov = Math.PI / 3;
        
        const adjustedFov = dist < 5 ? fov * 1.5 : fov;
        
        if (Math.abs(normAngle) > adjustedFov / 2 + 0.5) return false;
        
        const wallDist = castRay(gameData.player.angle - fov / 2 + (normAngle + fov / 2) / fov * fov);
        return dist < wallDist + 0.3;
    }

    // =============================================
    // SISTEMA DE RENDERIZADO MEJORADO (CON JEFES)
    // =============================================
    function renderItems() {
        if (!textures.health) return;
        
        const width = canvas.width, height = canvas.height, fov = Math.PI / 3;
        
        gameData.items.forEach(item => {
            if (item.collected) return;
            
            const dist = Math.hypot(item.x - gameData.player.x, item.y - gameData.player.y);
            if (dist > 8) return;
            
            const angle = Math.atan2(item.y - gameData.player.y, item.x - gameData.player.x) - gameData.player.angle;
            const normAngle = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
            if (Math.abs(normAngle) > fov / 2 + 0.2) return;
            
            const screenX = width / 2 + (normAngle / (fov / 2)) * (width / 2);
            const scale = height / dist * 1.2;
            const h = scale, w = scale;
            const y = height / 2 - h / 2, x = screenX - w / 2;
            
            const wallDist = castRay(gameData.player.angle - fov / 2 + (screenX / width) * fov);
            if (dist > wallDist + 0.1) return;
            
            let texture;
            switch(item.type) {
                case 'health': texture = textures.health; break;
                case 'ammo': texture = textures.ammo; break;
                case 'weapon': 
                    texture = textures[item.texture === itemTypes.weapon.textures[0] ? 'weapon1' : 
                                  item.texture === itemTypes.weapon.textures[1] ? 'weapon2' : 'weapon3'];
                    break;
                default: texture = textures.health;
            }
            
            if (texture) {
                ctx.save();
                ctx.globalAlpha = Math.max(0.5, 1 - dist / 8);
                const blink = Math.sin(Date.now() * 0.005) > 0;
                if (blink) {
                    ctx.drawImage(texture, 0, 0, texture.width, texture.height, x, y, w, h);
                }
                ctx.restore();
            }
        });
    }

    function renderPlayerWeapon() {
        if (!textures.playerWeapon) return;
        
        const width = canvas.width, height = canvas.height;
        const scale = height * 0.3;
        const x = width / 2 - scale / 2;
        const kickProgress = clamp(weaponKickbackTimer / 0.12, 0, 1);
        const kickOffset = Math.sin(kickProgress * Math.PI) * height * 0.03;
        const y = height - scale + kickOffset;
        
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(textures.playerWeapon, 0, 0, textures.playerWeapon.width, textures.playerWeapon.height, x, y, scale, scale);
        ctx.restore();
    }

    function renderSprites() {
        const width = canvas.width, height = canvas.height, fov = Math.PI / 3;
        const sprites = gameData.enemies.map(e => ({ e, dist: Math.hypot(e.x - gameData.player.x, e.y - gameData.player.y) })).sort((a, b) => b.dist - a.dist);
        
        for (const { e, dist } of sprites) {
            if (dist > 15) continue;
            
            const angle = Math.atan2(e.y - gameData.player.y, e.x - gameData.player.x) - gameData.player.angle;
            const normAngle = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
            
            const adjustedFov = dist < 5 ? fov * 1.5 : fov;
            
            if (Math.abs(normAngle) > adjustedFov / 2 + 0.5) continue;
            
            const screenX = width / 2 + (normAngle / (fov / 2)) * (width / 2);
            
            // Escala diferente para jefes
            const baseScale = e.boss ? 2.5 : 1.8;
            const scale = height / dist * baseScale;
            const h = scale, w = scale;
            const y = height / 2 - h / 2, x = screenX - w / 2;
            
            const wallDist = castRay(gameData.player.angle - fov / 2 + (screenX / width) * fov);
            if (dist > wallDist + 0.3) continue;
            
            const healthRatio = e.health / e.maxHealth;
            ctx.save();
            
            let alpha = Math.max(0.4, 1 - dist / 15);
            if (!isEnemyVisible(e)) {
                alpha *= 0.6;
            }
            
            ctx.globalAlpha = alpha;
            
            // Efectos especiales para jefes
            if (e.boss) {
                if (e.health < e.maxHealth * 0.5) {
                    // Cambiar textura cuando está a mitad de vida
                    ctx.drawImage(textures.boss2, 0, 0, textures.boss2.width, textures.boss2.height, x, y, w, h);
                    // Efecto de furia
                    if (Math.sin(Date.now() * 0.02) > 0) {
                        ctx.filter = 'brightness(2) saturate(3)';
                    }
                } else {
                    ctx.drawImage(textures.boss1, 0, 0, textures.boss1.width, textures.boss1.height, x, y, w, h);
                }
                
                // Aura del jefe
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#ff00ff';
                ctx.beginPath();
                ctx.arc(screenX, y + h/2, w/2 * 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha;
            } else {
                if (e.health < 30 && Math.sin(Date.now() * 0.01) > 0) {
                    ctx.filter = 'brightness(1.8) saturate(2)';
                }
                ctx.drawImage(textures.enemy, 0, 0, textures.enemy.width, textures.enemy.height, x, y, w, h);
            }
            
            ctx.restore();
            
            // Barra de salud mejorada para jefes
            if (dist < (e.boss ? 12 : 8)) {
                const bw = w * (e.boss ? 1.2 : 0.8), bh = e.boss ? 10 : 6, by = y - (e.boss ? 25 : 15);
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; 
                ctx.fillRect(screenX - bw/2, by, bw, bh);
                
                if (e.boss) {
                    // Barra de salud del jefe con colores especiales
                    const gradient = ctx.createLinearGradient(screenX - bw/2, by, screenX + bw/2, by);
                    gradient.addColorStop(0, '#ff0000');
                    gradient.addColorStop(0.5, '#ffff00');
                    gradient.addColorStop(1, '#00ff00');
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = `hsl(${healthRatio * 120}, 100%, 50%)`;
                }
                ctx.fillRect(screenX - bw/2, by, bw * healthRatio, bh);
            }
            
            if (!isEnemyVisible(e)) {
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = e.boss ? '#ff00ff' : '#ff0000';
                ctx.beginPath();
                ctx.arc(screenX, y + h/2, w/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    function renderDamageEffect() {
        if (damageEffectTimer > 0) {
            const intensity = damageEffectTimer / 1.0;
            ctx.fillStyle = `rgba(255, 0, 0, ${0.3 * intensity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (gameData.player.health < 30) {
            const intensity = 0.3 * (1 - gameData.player.health / 30);
            ctx.fillStyle = `rgba(255, 0, 0, ${intensity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function renderBossWarning() {
        if (bossWarningTimer > 0) {
            const intensity = Math.sin(bossWarningTimer * 10) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 0, 255, ${0.2 * intensity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
            ctx.font = 'bold 48px Comic Sans MS';
            ctx.textAlign = 'center';
            ctx.fillText('¡JEFE ACERCÁNDOSE!', canvas.width / 2, canvas.height / 2);
        }
    }

    function renderScene() {
        const w = canvas.width, h = canvas.height, fov = Math.PI / 3;
        
        // Optimización: Reducir número de rayos
        const rayStep = isMobile ? 1 : Math.max(1, Math.floor(w / 200));
        const rays = Math.floor(w / rayStep);
        
        ctx.fillStyle = '#000'; 
        ctx.fillRect(0, 0, w, h);
        
        const horizon = h / 2;
        for (let y = horizon; y < h; y++) { 
            const d = h / (2 * (y - horizon)); 
            const b = Math.max(0, 1 - d / 10) * 50 + 30; 
            ctx.fillStyle = `hsl(0, 50%, ${b}%)`; 
            ctx.fillRect(0, y, w, 1); 
        }
        for (let y = 0; y < horizon; y++) { 
            const b = Math.max(0, 1 - (horizon - y) / 10) * 30 + 10; 
            ctx.fillStyle = `hsl(300, 30%, ${b}%)`; 
            ctx.fillRect(0, y, w, 1); 
        }

        for (let i = 0; i < rays; i++) {
            const angle = gameData.player.angle - fov / 2 + i * (fov / rays);
            let mx = Math.floor(gameData.player.x), my = Math.floor(gameData.player.y);
            const dx = Math.cos(angle), dy = Math.sin(angle);
            const deltaX = Math.abs(1 / (dx || 0.0001)), deltaY = Math.abs(1 / (dy || 0.0001));
            let stepX = dx < 0 ? -1 : 1, stepY = dy < 0 ? -1 : 1;
            let sideDistX = dx < 0 ? (gameData.player.x - mx) * deltaX : (mx + 1 - gameData.player.x) * deltaX;
            let sideDistY = dy < 0 ? (gameData.player.y - my) * deltaY : (my + 1 - gameData.player.y) * deltaY;
            let hit = false, side = 0;
            let steps = 0;
            const maxSteps = map.length * map[0].length * 2;
            while (!hit && steps < maxSteps) {
                if (sideDistX < sideDistY) {
                    sideDistX += deltaX;
                    mx += stepX;
                    side = 0;
                } else {
                    sideDistY += deltaY;
                    my += stepY;
                    side = 1;
                }

                if (mx < 0 || my < 0 || mx >= map[0].length || my >= map.length) {
                    hit = true;
                    break;
                }

                if (map[my][mx] > 0) hit = true;
                steps++;
            }
            const distRaw = side === 0 ? (mx - gameData.player.x + (1 - stepX)/2) / (dx || 0.0001) : (my - gameData.player.y + (1 - stepY)/2) / (dy || 0.0001);
            const dist = Math.max(Math.abs(distRaw), 0.1);
            const lineH = h / dist;
            const start = Math.max(0, -lineH / 2 + h / 2), end = Math.min(h - 1, lineH / 2 + h / 2);
            let brightness = Math.max(0.2, 1 - dist / 10); if (side === 1) brightness *= 0.7;
            if (textures.wall) {
                let wallX = side === 0 ? gameData.player.y + dist * dy : gameData.player.x + dist * dx; wallX -= Math.floor(wallX);
                const texX = Math.floor(wallX * textures.wall.width);
                ctx.globalAlpha = brightness;
                ctx.drawImage(textures.wall, texX, 0, 1, textures.wall.height, i * rayStep, start, rayStep, end - start);
                ctx.globalAlpha = 1;
            }
        }
        
        renderSprites();
        renderItems();
        particleSystem.render(ctx);
        renderPlayerWeapon();
        screenParticleSystem.render(ctx);
        renderDamageEffect();
        renderBossWarning();
        
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0.7, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
        
        if (!isMobile) { 
            ctx.fillStyle = 'rgba(255,107,157,0.03)'; 
            for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1); 
        }
        
        renderMiniMap();
    }

    // =============================================
    // SISTEMA DE CONTROLES
    // =============================================
    let controls = { forward: false, backward: false, left: false, right: false, strafeLeft: false, strafeRight: false, shoot: false, action: false };

    if (isMobile) {
        const setupButton = (btn, control) => {
            const press = (e) => { e.preventDefault(); controls[control] = true; btn.classList.add('pressed'); };
            const release = () => { controls[control] = false; btn.classList.remove('pressed'); };
            btn.addEventListener('touchstart', press, { passive: false });
            btn.addEventListener('mousedown', press);
            btn.addEventListener('touchend', release, { passive: false });
            btn.addEventListener('touchcancel', release, { passive: false });
            btn.addEventListener('mouseup', release);
            btn.addEventListener('mouseleave', release);
        };
        setupButton(document.getElementById('up-btn'), 'forward');
        setupButton(document.getElementById('down-btn'), 'backward');
        setupButton(document.getElementById('left-btn'), 'left');
        setupButton(document.getElementById('right-btn'), 'right');
        setupButton(document.getElementById('btn-shoot'), 'shoot');
        setupButton(document.getElementById('btn-action'), 'action');
        document.getElementById('btn-pause').addEventListener('click', togglePause);
    } else {
        pauseBtn.addEventListener('click', togglePause);
        
        document.addEventListener('keydown', e => {
            if (!gameStarted || gamePaused) return;
            const key = e.key.toLowerCase();
            
            if (key === '1' && gameData.player.weapons.includes('pistol')) {
                switchWeapon('pistol');
            } else if (key === '2' && gameData.player.weapons.includes('shotgun')) {
                switchWeapon('shotgun');
            } else if (key === '3' && gameData.player.weapons.includes('rifle')) {
                switchWeapon('rifle');
            } else if (key === 'r') {
                const currentIndex = gameData.player.weapons.indexOf(gameData.player.currentWeapon);
                const nextIndex = (currentIndex + 1) % gameData.player.weapons.length;
                switchWeapon(gameData.player.weapons[nextIndex]);
            }
        });
    }

    document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        if (key === 'p') togglePause();
        if (!gameStarted || gamePaused) return;
        if (key === 'arrowleft' || key === 'a') controls.left = true;
        if (key === 'arrowright' || key === 'd') controls.right = true;
        if (key === 'arrowup' || key === 'w') controls.forward = true;
        if (key === 'arrowdown' || key === 's') controls.backward = true;
        if (key === ' ') controls.shoot = true;
        if (key === 'q') controls.strafeLeft = true;
        if (key === 'e') controls.strafeRight = true;
    });

    document.addEventListener('keyup', e => {
        const key = e.key.toLowerCase();
        if (key === 'arrowleft' || key === 'a') controls.left = false;
        if (key === 'arrowright' || key === 'd') controls.right = false;
        if (key === 'arrowup' || key === 'w') controls.forward = false;
        if (key === 'arrowdown' || key === 's') controls.backward = false;
        if (key === ' ') controls.shoot = false;
        if (key === 'q') controls.strafeLeft = false;
        if (key === 'e') controls.strafeRight = false;
    });

    function togglePause() {
        if (!gameStarted) return;
        gamePaused = !gamePaused;
        pauseModal.style.display = gamePaused ? 'flex' : 'none';
        if (gamePaused) {
            controls.forward = false;
            controls.backward = false;
            controls.left = false;
            controls.right = false;
            controls.strafeLeft = false;
            controls.strafeRight = false;
            controls.shoot = false;
            controls.action = false;
            shootPressedLastFrame = false;
            actionPressedLastFrame = false;
        }
    }
    resumeButton.addEventListener('click', togglePause);

    // =============================================
    // SISTEMA DE ENEMIGOS Y JEFES
    // =============================================
    function createEnemyEntity(x, y, profile, boss = false) {
        if (boss) {
            return {
                x,
                y,
                health: profile.bossHealth,
                maxHealth: profile.bossHealth,
                speed: clamp(profile.enemySpeed * 0.85, 0.008, 0.032),
                damage: profile.bossDamage,
                armor: profile.bossArmor,
                attackCooldown: 0,
                attackInterval: 0.75,
                attackRange: 2.1,
                aggroRange: 11.5,
                orbitDir: Math.random() < 0.5 ? -1 : 1,
                boss: true
            };
        }

        return {
            x,
            y,
            health: profile.enemyHealth,
            maxHealth: profile.enemyHealth,
            speed: profile.enemySpeed,
            damage: profile.enemyDamage,
            armor: profile.enemyArmor,
            attackCooldown: 0,
            attackInterval: 1.0,
            attackRange: 1.45,
            aggroRange: 8.5,
            orbitDir: Math.random() < 0.5 ? -1 : 1,
            boss: false
        };
    }

    function spawnBoss(profile) {
        const spawn = findSpawnPosition({
            minPlayerDistance: 5.5,
            minEnemyDistance: 2.0,
            maxAttempts: 200
        });
        if (!spawn) return null;

        const boss = createEnemyEntity(spawn.x, spawn.y, profile, true);
        gameData.enemies.push(boss);
        gameData.bossActive = true;

        soundSystem.playBossSpawn();
        particleSystem.createBossSpawn(boss.x, boss.y);
        showBossWarning();
        bossWarningTimer = 2.0;

        return boss;
    }

    function generateEnemies() {
        gameData.enemies = [];
        const profile = getWaveProfile();
        gameData.bossActive = false;
        gameData.bossDefeated = false;

        if (profile.isBossWave) {
            const boss = spawnBoss(profile);
            if (boss) {
                const supportEnemies = Math.max(2, Math.floor(profile.enemyCount * 0.35));
                for (let i = 0; i < supportEnemies; i++) {
                    const spawn = findSpawnPosition({
                        minPlayerDistance: 4.5,
                        minEnemyDistance: 1.4,
                        maxAttempts: 120
                    });
                    if (!spawn) continue;
                    gameData.enemies.push(createEnemyEntity(spawn.x, spawn.y, profile, false));
                }
            }
        } else {
            gameData.bossActive = false;
            for (let i = 0; i < profile.enemyCount; i++) {
                const spawn = findSpawnPosition({
                    minPlayerDistance: 3.5,
                    minEnemyDistance: 1.3,
                    maxAttempts: 120
                });
                if (!spawn) continue;
                gameData.enemies.push(createEnemyEntity(spawn.x, spawn.y, profile, false));
            }
        }

        if (gameData.enemies.length === 0) {
            const fallbackSpawn = findSpawnPosition({
                minPlayerDistance: 2.5,
                minEnemyDistance: 1.0,
                maxAttempts: 40
            });
            if (fallbackSpawn) {
                gameData.enemies.push(createEnemyEntity(fallbackSpawn.x, fallbackSpawn.y, profile, false));
            }
            gameData.bossActive = false;
        }

        for (let i = 0; i < 2; i++) {
            spawnRandomItem();
        }
    }

    // =============================================
    // ACTUALIZACIÓN DEL JUEGO OPTIMIZADA
    // =============================================
    function updateGame(deltaTime) {
        const dt = clamp(deltaTime, 0, MAX_FRAME_DELTA);
        const moveSpeed = 0.08;
        const turnSpeed = isMobile ? 0.03 : 0.05;

        if (shootCooldown > 0) shootCooldown = Math.max(0, shootCooldown - dt);
        if (damageEffectTimer > 0) damageEffectTimer = Math.max(0, damageEffectTimer - dt);
        if (bossWarningTimer > 0) bossWarningTimer = Math.max(0, bossWarningTimer - dt);
        if (weaponKickbackTimer > 0) weaponKickbackTimer = Math.max(0, weaponKickbackTimer - dt);

        if (controls.left) gameData.player.angle -= turnSpeed * dt * 60;
        if (controls.right) gameData.player.angle += turnSpeed * dt * 60;

        let moveX = 0, moveY = 0;
        if (controls.forward) {
            moveX += Math.cos(gameData.player.angle) * moveSpeed * dt * 60;
            moveY += Math.sin(gameData.player.angle) * moveSpeed * dt * 60;
        }
        if (controls.backward) {
            moveX -= Math.cos(gameData.player.angle) * moveSpeed * dt * 60;
            moveY -= Math.sin(gameData.player.angle) * moveSpeed * dt * 60;
        }
        if (controls.strafeLeft) {
            moveX += Math.cos(gameData.player.angle - Math.PI / 2) * moveSpeed * 0.7 * dt * 60;
            moveY += Math.sin(gameData.player.angle - Math.PI / 2) * moveSpeed * 0.7 * dt * 60;
        }
        if (controls.strafeRight) {
            moveX += Math.cos(gameData.player.angle + Math.PI / 2) * moveSpeed * 0.7 * dt * 60;
            moveY += Math.sin(gameData.player.angle + Math.PI / 2) * moveSpeed * 0.7 * dt * 60;
        }

        if (moveX || moveY) {
            const nx = gameData.player.x + moveX;
            const ny = gameData.player.y + moveY;
            if (CollisionSystem.isValidPosition(nx, ny)) {
                gameData.player.x = nx;
                gameData.player.y = ny;
            } else {
                if (CollisionSystem.isValidPosition(nx, gameData.player.y)) gameData.player.x = nx;
                if (CollisionSystem.isValidPosition(gameData.player.x, ny)) gameData.player.y = ny;
            }
        }

        const activeWeapon = weapons[gameData.player.currentWeapon];
        if (controls.shoot) {
            if (activeWeapon.fireMode === 'auto') {
                shoot();
            } else if (!shootPressedLastFrame) {
                shoot();
            }
        }
        shootPressedLastFrame = controls.shoot;

        if (controls.action && !actionPressedLastFrame && gameData.player.weapons.length > 1) {
            const currentIndex = gameData.player.weapons.indexOf(gameData.player.currentWeapon);
            const nextIndex = (currentIndex + 1) % gameData.player.weapons.length;
            switchWeapon(gameData.player.weapons[nextIndex]);
        }
        actionPressedLastFrame = controls.action;

        const now = Date.now();
        for (let i = gameData.items.length - 1; i >= 0; i--) {
            const item = gameData.items[i];
            if (!item.collected) {
                const dist = Math.hypot(gameData.player.x - item.x, gameData.player.y - item.y);
                if (dist < 0.8 && collectItem(item)) {
                    let particleColor = '#ffffff';
                    if (item.type === 'health') particleColor = '#00ff00';
                    if (item.type === 'ammo') particleColor = '#ffff00';
                    if (item.type === 'weapon') particleColor = '#ff00ff';
                    particleSystem.createItemPickup(item.x, item.y, particleColor);
                }

                if (now - item.spawnTime > 30000) gameData.items.splice(i, 1);
            } else if (now - item.spawnTime > 5000) {
                gameData.items.splice(i, 1);
            }
        }

        for (let i = gameData.enemies.length - 1; i >= 0; i--) {
            const enemy = gameData.enemies[i];
            const dist = Math.hypot(gameData.player.x - enemy.x, gameData.player.y - enemy.y);
            const canSeePlayer = hasLineOfSight(enemy.x, enemy.y, gameData.player.x, gameData.player.y);
            enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

            if (dist < enemy.aggroRange && dist > 0.001) {
                let dirX = 0;
                let dirY = 0;
                if (canSeePlayer || dist < enemy.aggroRange * 0.65) {
                    dirX = (gameData.player.x - enemy.x) / dist;
                    dirY = (gameData.player.y - enemy.y) / dist;
                } else {
                    const orbit = Math.atan2(gameData.player.y - enemy.y, gameData.player.x - enemy.x) + (Math.PI / 2) * enemy.orbitDir;
                    dirX = Math.cos(orbit) * 0.6;
                    dirY = Math.sin(orbit) * 0.6;
                }

                if (dist < enemy.attackRange * 0.95) {
                    dirX *= 0.3;
                    dirY *= 0.3;
                }

                const separation = getSeparationVector(enemy, i);
                dirX += separation.x * 0.9;
                dirY += separation.y * 0.9;

                const len = Math.hypot(dirX, dirY);
                if (len > 0.0001) {
                    const stepX = (dirX / len) * enemy.speed * dt * 60;
                    const stepY = (dirY / len) * enemy.speed * dt * 60;
                    const nx = enemy.x + stepX;
                    const ny = enemy.y + stepY;

                    if (CollisionSystem.isValidPosition(nx, ny, enemy.boss ? 0.42 : 0.34)) {
                        enemy.x = nx;
                        enemy.y = ny;
                    } else {
                        if (CollisionSystem.isValidPosition(nx, enemy.y, enemy.boss ? 0.42 : 0.34)) enemy.x = nx;
                        if (CollisionSystem.isValidPosition(enemy.x, ny, enemy.boss ? 0.42 : 0.34)) enemy.y = ny;
                    }
                }
            }

            if (enemy.attackCooldown <= 0 && dist < enemy.attackRange && canSeePlayer) {
                gameData.player.health = Math.max(0, gameData.player.health - enemy.damage);
                gameData.player.lastDamageTime = now;
                damageEffectTimer = 1.0;
                enemy.attackCooldown = enemy.attackInterval;
                soundSystem.playHurt();
                updateHealth(gameData.player.health);
                canvas.style.transform = `translate(${(Math.random() - 0.5) * 8}px, ${(Math.random() - 0.5) * 8}px)`;
                setTimeout(() => { canvas.style.transform = ''; }, 100);
            }

            if (enemy.health <= 0) {
                const isBoss = !!enemy.boss;
                particleSystem.createExplosion(enemy.x, enemy.y, isBoss ? 34 : 14);

                gameData.score += isBoss ? 1500 : 120;
                updateScore(gameData.score);

                if (isBoss) {
                    gameData.bossActive = false;
                    gameData.bossDefeated = true;
                }

                if (Math.random() < (isBoss ? 0.85 : 0.35)) {
                    spawnRandomItem();
                }

                if (Math.random() < (isBoss ? 0.9 : 0.3)) {
                    gameData.player.ammo += difficulties[currentDifficulty].ammoDrop;
                    updateAmmo(gameData.player.ammo);
                }

                gameData.enemies.splice(i, 1);
            }
        }

        if (gameData.enemies.length === 0) {
            if (nextWaveDelay <= 0) {
                nextWaveDelay = 0.9;
            } else {
                nextWaveDelay -= dt;
                if (nextWaveDelay <= 0) {
                    const profile = getWaveProfile(gameData.wave);
                    gameData.score += profile.waveBonus;
                    gameData.wave++;
                    updateScore(gameData.score);
                    updateWave(gameData.wave);
                    soundSystem.playWaveComplete();
                    generateEnemies();
                }
            }
        } else {
            nextWaveDelay = 0;
        }

        if (gameData.player.health <= 0) {
            soundSystem.playGameOver();
            alert(`GAME OVER\nPuntuación: ${gameData.score}\nOleada: ${gameData.wave}`);
            resetGame();
        }

        particleSystem.update(dt);
        screenParticleSystem.update(dt);
    }

    // =============================================
    // BUCLE PRINCIPAL OPTIMIZADO
    // =============================================
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        
        if (!gameStarted || gamePaused) { 
            animationFrameId = requestAnimationFrame(gameLoop); 
            return; 
        }
        
        updateGame(deltaTime); 
        renderScene(); 
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // =============================================
    // FUNCIONES DE INICIALIZACIÓN
    // =============================================
    function resetGame() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        particleSystem = new ParticleSystem(1000);
        screenParticleSystem = new ScreenParticleSystem(260, () => ({ width: canvas.width, height: canvas.height }));
        gameData = new GameState();
        updateScore(0); 
        updateHealth(100); 
        updateAmmo(100); 
        updateWave(1);
        updateWeaponDisplay();
        gameStarted = false; 
        gamePaused = false; 
        splashScreen.style.display = 'flex'; 
        setTimeout(() => splashScreen.style.opacity = '1', 50);
        controls = { forward: false, backward: false, left: false, right: false, strafeLeft: false, strafeRight: false, shoot: false, action: false };
        shootCooldown = 0;
        damageEffectTimer = 0;
        bossWarningTimer = 0;
        weaponKickbackTimer = 0;
        shootPressedLastFrame = false;
        actionPressedLastFrame = false;
        nextWaveDelay = 0;
        lastTime = 0;
        soundSystem.stopBackgroundMusic();
    }

    async function init() { 
        resizeCanvas(); 
        await loadTextures(); 
        document.addEventListener('click', () => soundSystem.initAudio(), { once: true }); 
        renderMiniMap();
        updateWeaponDisplay();
    }
    
    function startGame() {
        if (gameStarted) return;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        controls = { forward: false, backward: false, left: false, right: false, strafeLeft: false, strafeRight: false, shoot: false, action: false };
        shootPressedLastFrame = false;
        actionPressedLastFrame = false;
        nextWaveDelay = 0;
        gameData.player.health = 100;
        gameData.player.ammo = 100;
        updateHealth(gameData.player.health);
        updateAmmo(gameData.player.ammo);

        gamePaused = false;
        pauseModal.style.display = 'none';
        gameStarted = true; 
        splashScreen.style.opacity = '0'; 
        setTimeout(() => splashScreen.style.display = 'none', 500);
        generateEnemies(); 
        soundSystem.playBackgroundMusic(); 
        lastTime = 0;
        animationFrameId = requestAnimationFrame(gameLoop);
        setTimeout(resizeCanvas, 100);
    }

    startButton.addEventListener('click', startGame);
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && !gameStarted) startGame(); });
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('load', init);
    









