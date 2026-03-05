export class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.player = {
            x: 1.5,
            y: 1.5,
            angle: 0,
            health: 100,
            ammo: 100,
            currentWeapon: "pistol",
            weapons: ["pistol"],
            lastDamageTime: 0
        };
        this.score = 0;
        this.enemies = [];
        this.wave = 1;
        this.items = [];
        this.gameTime = 0;
        this.bossActive = false;
        this.bossDefeated = false;
    }
}
