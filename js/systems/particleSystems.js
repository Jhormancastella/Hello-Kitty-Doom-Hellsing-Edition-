function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export class ParticleSystem {
    constructor(maxParticles = 1000) {
        this.particles = [];
        this.maxParticles = maxParticles;
    }

    createExplosion(x, y, count = 10) {
        const actualCount = Math.min(count, this.maxParticles - this.particles.length);
        for (let i = 0; i < actualCount; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 0.1,
                vy: (Math.random() - 0.5) * 0.1,
                life: 1.0,
                decay: 0.02,
                color: `hsl(${Math.random() * 60}, 100%, 50%)`
            });
        }
    }

    createItemPickup(x, y, color) {
        const actualCount = Math.min(8, this.maxParticles - this.particles.length);
        for (let i = 0; i < actualCount; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 0.05,
                vy: (Math.random() - 0.5) * 0.05,
                life: 1.0,
                decay: 0.03,
                color
            });
        }
    }

    createBossSpawn(x, y) {
        const actualCount = Math.min(50, this.maxParticles - this.particles.length);
        for (let i = 0; i < actualCount; i++) {
            const angle = (i / actualCount) * Math.PI * 2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * 0.1,
                vy: Math.sin(angle) * 0.1,
                life: 1.0,
                decay: 0.01,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`
            });
        }
    }

    update(deltaTime) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx * deltaTime * 60;
            p.y += p.vy * deltaTime * 60;
            p.life -= p.decay * deltaTime * 60;
            return p.life > 0;
        });
    }

    render(ctx) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x * 20 - 2, p.y * 20 - 2, 4, 4);
        });
        ctx.restore();
    }
}

export class ScreenParticleSystem {
    constructor(maxParticles = 240, viewportProvider = () => ({ width: 0, height: 0 })) {
        this.maxParticles = maxParticles;
        this.particles = [];
        this.viewportProvider = viewportProvider;
    }

    createMuzzleFlash(weapon) {
        const { width, height } = this.viewportProvider();
        const centerX = width / 2;
        const centerY = height / 2;
        const count = weapon.pellets > 1 ? 12 : 8;

        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const angle = (Math.random() - 0.5) * Math.PI * 0.8 - Math.PI / 2;
            const speed = 2.5 + Math.random() * 3.2;
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * 10,
                y: centerY + 8 + Math.random() * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.8,
                life: 0.22 + Math.random() * 0.08,
                maxLife: 0.3,
                size: 1.2 + Math.random() * 2.2,
                color: Math.random() > 0.35 ? "#ffd166" : "#ff6b00"
            });
        }
    }

    createEnemyBlood(isBoss = false) {
        const { width, height } = this.viewportProvider();
        const centerX = width / 2;
        const centerY = height / 2;
        const count = isBoss ? 18 : 10;

        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const angle = (Math.random() - 0.5) * Math.PI * 1.1 - Math.PI / 2;
            const speed = 1.4 + Math.random() * 2.8;
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * 18,
                y: centerY + (Math.random() - 0.5) * 14,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: isBoss ? 0.4 : 0.3,
                maxLife: isBoss ? 0.4 : 0.3,
                size: isBoss ? 2.4 + Math.random() * 2 : 1.7 + Math.random() * 1.6,
                color: isBoss ? "#8b0000" : "#c1121f"
            });
        }
    }

    update(deltaTime) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx * deltaTime * 60;
            p.y += p.vy * deltaTime * 60;
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.life -= deltaTime;
            return p.life > 0;
        });
    }

    render(ctx) {
        ctx.save();
        for (const p of this.particles) {
            const alpha = clamp(p.life / p.maxLife, 0, 1);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
