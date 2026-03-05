export const MAX_FRAME_DELTA = 0.05;

export const WEAPONS = {
    pistol: {
        name: "PISTOLA",
        damage: 28,
        ammoCost: 1,
        cooldown: 0.24,
        pellets: 1,
        spread: 0.015,
        fireMode: "semi",
        falloffStart: 5,
        falloffEnd: 12,
        minDamageMultiplier: 0.65,
        armorPenetration: 1.0,
        texture: "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931100/Photoroom-20251031_120316_3_i1i8kj.png",
        icon: "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931100/Photoroom-20251031_120316_3_i1i8kj.png"
    },
    shotgun: {
        name: "ESCOPETA",
        damage: 12,
        ammoCost: 2,
        cooldown: 0.85,
        pellets: 8,
        spread: 0.18,
        fireMode: "semi",
        falloffStart: 2,
        falloffEnd: 8,
        minDamageMultiplier: 0.35,
        armorPenetration: 1.2,
        texture: "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931101/Photoroom-20251031_120316_5_osprby.png",
        icon: "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931101/Photoroom-20251031_120316_5_osprby.png"
    },
    rifle: {
        name: "RIFLE",
        damage: 20,
        ammoCost: 1,
        cooldown: 0.09,
        pellets: 1,
        spread: 0.03,
        fireMode: "auto",
        falloffStart: 7,
        falloffEnd: 16,
        minDamageMultiplier: 0.75,
        armorPenetration: 1.35,
        texture: "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931101/Photoroom-20251031_120316_6_tflii5.png",
        icon: "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931101/Photoroom-20251031_120316_6_tflii5.png"
    }
};

export const ITEM_TYPES = {
    health: {
        texture: "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931100/Photoroom-20251031_120315_1_vwz2bq.png",
        value: 25,
        sound: "playHealthPickup"
    },
    ammo: {
        texture: "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931100/Photoroom-20251031_120316_2_nnf0u7.png",
        value: 30,
        sound: "playPickup"
    },
    weapon: {
        textures: [
            "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931100/Photoroom-20251031_120316_3_i1i8kj.png",
            "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931101/Photoroom-20251031_120316_5_osprby.png",
            "https://res.cloudinary.com/dipv76dpn/image/upload/v1761931101/Photoroom-20251031_120316_6_tflii5.png"
        ],
        sound: "playWeaponSwitch"
    }
};

export const DIFFICULTIES = {
    easy: {
        enemyCount: 3,
        enemyHealth: 50,
        enemySpeed: 0.008,
        ammoDrop: 30,
        waveBonus: 100,
        itemSpawnChance: 0.4,
        enemyDamage: 8,
        enemyArmor: 1.0,
        bossHealthMult: 0.9,
        bossDamage: 14
    },
    medium: {
        enemyCount: 5,
        enemyHealth: 75,
        enemySpeed: 0.012,
        ammoDrop: 20,
        waveBonus: 200,
        itemSpawnChance: 0.3,
        enemyDamage: 10,
        enemyArmor: 1.08,
        bossHealthMult: 1.0,
        bossDamage: 18
    },
    hard: {
        enemyCount: 7,
        enemyHealth: 100,
        enemySpeed: 0.016,
        ammoDrop: 15,
        waveBonus: 300,
        itemSpawnChance: 0.25,
        enemyDamage: 12,
        enemyArmor: 1.15,
        bossHealthMult: 1.1,
        bossDamage: 22
    },
    nightmare: {
        enemyCount: 10,
        enemyHealth: 150,
        enemySpeed: 0.02,
        ammoDrop: 10,
        waveBonus: 500,
        itemSpawnChance: 0.2,
        enemyDamage: 15,
        enemyArmor: 1.25,
        bossHealthMult: 1.25,
        bossDamage: 28
    }
};

export const MAP = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1],
    [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];
