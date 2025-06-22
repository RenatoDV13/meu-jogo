// =================================================================================================
// --- Configurações Iniciais do Jogo ---
// =================================================================================================
const canvas = document.getElementById('gameCanvas');
if (!canvas) {
    console.error("Erro: Canvas com ID 'gameCanvas' não encontrado no HTML!");
    alert("Erro crítico: O elemento canvas não foi encontrado. Verifique o HTML.");
    throw new Error("Canvas element not found.");
}
const ctx = canvas.getContext('2d');
if (!ctx) {
    console.error("Erro: Não foi possível obter o contexto 2D do canvas!");
    alert("Erro crítico: Não foi possível obter o contexto de desenho do canvas. Seu navegador pode não suportar.");
    throw new Error("Could not get 2D context.");
}

// DEFININDO UM TAMANHO FIXO PARA O CANVAS
const FIXED_CANVAS_WIDTH = 800;
const FIXED_CANVAS_HEIGHT = 600;

// Variáveis de Estado do Jogo
let gameRunning = false;
let gameStarted = false;
let currentScreen = 'mainMenu'; // 'mainMenu', 'game', 'shop', 'gameOver'
let particlesEnabled = true;

let score = 0;
let cubes = 0;
let bossLevel = 0;
let player = {};
let projectiles = [];
let bosses = [];
let enemyProjectiles = [];
let cardsAvailable = false;
let gamePaused = false;

let particles = [];
let damageTexts = [];
let powerUps = [];
let achievements = [];
let runStats = {
    wavesClearedThisRun: 0,
    damageDealtThisRun: 0,
    survivalTimeThisRun: 0,
    cubesEarnedThisRun: 0
};

// Constantes de Jogo
const PLAYER_SPEED_BASE = 5;
const PLAYER_FIRE_RATE_BASE = 15;
const ENEMY_BULLET_SPEED = 4;
const PLAYER_BULLET_SPEED_BASE = 8;
let PLAYER_MAX_HEALTH_BASE = 100;

const CUBE_DROP_CHANCE = 1;
const CRITICAL_CHANCE = 0.15;
const CRITICAL_MULTIPLIER = 2;

// Controles Móveis
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isMoving = false;
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickKnob = { x: 0, y: 0 };
const JOYSTICK_RADIUS = 70;
const JOYSTICK_KNOB_RADIUS = 20;
const AUTO_FIRE_DELAY = 10;
let autoFireCounter = 0;

// Botões móveis
let specialButton = { x: 0, y: 0, width: 80, height: 80, active: false };
let bulletSelectorButton = { x: 0, y: 0, width: 120, height: 40, active: false };
let backButton = { x: 0, y: 0, width: 80, height: 40, active: false };

// Menu buttons
let startButton = { x: 0, y: 0, width: 200, height: 60 };
let menuShopButton = { x: 0, y: 0, width: 200, height: 60 };
let particlesButton = { x: 0, y: 0, width: 200, height: 60 };

// Sistema de scroll da loja
let shopScroll = 0;
const SHOP_SCROLL_SPEED = 30;
const SHOP_ITEM_HEIGHT = 80;

// Estado do botão de tiro base
let baseFireToggle = {
    active: true,
    x: 0, y: 0, width: 0, height: 0
};

// Status Effects
const STATUS_EFFECTS = {
    POISON: 'poison',
    SLOW: 'slow',
    FIRE: 'fire',
    SHIELD: 'shield',
    SPEED_BOOST: 'speed_boost'
};

// =================================================================================================
// --- Sistema de Upgrades Permanentes ---
// =================================================================================================
const permanentUpgrades = {
    health: { level: 0, maxLevel: 10, cost: 15, costMultiplier: 1.4 }, // Preço reduzido
    damage: { level: 0, maxLevel: 10, cost: 20, costMultiplier: 1.4 }, // Preço reduzido
    speed: { level: 0, maxLevel: 10, cost: 25, costMultiplier: 1.4 }, // Preço reduzido
    fireRate: { level: 0, maxLevel: 10, cost: 30, costMultiplier: 1.4 }, // Preço reduzido
    specialCooldown: { level: 0, maxLevel: 5, cost: 40, costMultiplier: 1.8 } // Preço reduzido
};

// =================================================================================================
// --- Objeto Jogador (Player) ---
// =================================================================================================
function Player() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.radius = 20;
    this.health = PLAYER_MAX_HEALTH_BASE + (permanentUpgrades.health.level * 20);
    this.maxHealth = this.health;
    this.fireCooldown = 0;
    this.baseDamage = 10 + (permanentUpgrades.damage.level * 3);
    this.speed = PLAYER_SPEED_BASE + (permanentUpgrades.speed.level * 0.5);
    this.fireRate = Math.max(5, PLAYER_FIRE_RATE_BASE - (permanentUpgrades.fireRate.level * 2));
    this.color = 'cyan';
    this.statusEffects = new Map();
    this.damageDealt = 0; // Adicionado para rastrear dano causado na run

    // Propriedades do Especial
    this.specialCooldownMax = Math.max(600, 1200 - (permanentUpgrades.specialCooldown.level * 120));
    this.specialCooldown = 0;
    this.specialActive = false;
    this.specialDuration = 90;
    this.specialTimer = 0;
    this.specialEffect = 'hadouken';

    this.draw = function() {
        // Efeitos de status
        let glowColor = this.color;
        if (this.statusEffects.has(STATUS_EFFECTS.SHIELD)) {
            glowColor = 'gold';
        } else if (this.statusEffects.has(STATUS_EFFECTS.POISON)) {
            glowColor = 'green';
        } else if (this.statusEffects.has(STATUS_EFFECTS.FIRE)) {
            glowColor = 'red';
        }

        // Desenha brilho se tiver efeitos
        if (this.statusEffects.size > 0) {
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 15;
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Desenha o jogador
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Desenha a barra de vida
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, this.radius * 2, 5);
        ctx.fillStyle = 'lime';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, (this.radius * 2) * (this.health / this.maxHealth), 5);

        // Se o especial estiver ativo, desenha um brilho
        if (this.specialActive) {
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    };

    this.update = function() {
        // Reduz o cooldown de tiro
        if (this.fireCooldown > 0) {
            this.fireCooldown--;
        }

        // Auto-fire
        if (baseFireToggle.active) {
            autoFireCounter++;
            if (autoFireCounter >= AUTO_FIRE_DELAY) {
                this.shoot();
                autoFireCounter = 0;
            }
        }

        // Limita o jogador dentro dos limites do canvas
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        // Lógica do Especial
        if (this.specialCooldown > 0) {
            this.specialCooldown--;
        }

        if (this.specialActive) {
            this.specialTimer--;
            if (this.specialTimer <= 0) {
                this.specialActive = false;
            }
        }

        // Atualiza status effects
        this.updateStatusEffects();
    };

    this.updateStatusEffects = function() {
        for (let [effect, data] of this.statusEffects) {
            data.duration--;

            switch (effect) {
                case STATUS_EFFECTS.POISON:
                    if (data.tickCounter <= 0) {
                        this.health -= 2;
                        data.tickCounter = 30; // Dano a cada 0.5 segundos
                        damageTexts.push(new DamageText(this.x, this.y - 30, 2, false, 'green'));
                    } else {
                        data.tickCounter--;
                    }
                    break;
                case STATUS_EFFECTS.FIRE:
                    if (data.tickCounter <= 0) {
                        this.health -= 3;
                        data.tickCounter = 20;
                        damageTexts.push(new DamageText(this.x, this.y - 30, 3, false, 'orange'));
                    } else {
                        data.tickCounter--;
                    }
                    break;
            }

            if (data.duration <= 0) {
                this.statusEffects.delete(effect);
            }
        }
    };

    this.addStatusEffect = function(effect, duration, data = {}) {
        this.statusEffects.set(effect, { duration, ...data, tickCounter: 30 });
    };

    this.shoot = function() {
        if (this.fireCooldown <= 0) {
            let targetBoss = findClosestBoss(this.x, this.y);
            if (targetBoss) {
                const angle = Math.atan2(targetBoss.y - this.y, targetBoss.x - this.x);
                const bulletType = BULLET_TYPES[playerBulletConfig.currentType];

                let bulletDamage = this.baseDamage * bulletType.damage;
                let bulletColor = bulletType.color;
                let bulletRadius = bulletType.radius;
                let bulletSpeed = PLAYER_BULLET_SPEED_BASE * bulletType.speed;
                let isExplosive = false;
                let isPiercing = false;
                let isHoming = false;
                let numBullets = 1;
                let statusEffect = null;
                let statusDuration = 0;

                switch (playerBulletConfig.currentType) {
                    case 'explosive':
                        isExplosive = true;
                        break;
                    case 'piercing':
                        isPiercing = true;
                        break;
                    case 'rapid':
                        numBullets = 3;
                        break;
                    case 'homing':
                        isHoming = true;
                        break;
                    case 'freeze':
                        statusEffect = STATUS_EFFECTS.SLOW;
                        statusDuration = 180;
                        break;
                    case 'poison':
                        statusEffect = STATUS_EFFECTS.POISON;
                        statusDuration = 300;
                        break;
                    case 'laser':
                        numBullets = 1;
                        bulletSpeed *= 2;
                        isPiercing = true;
                        break;
                    case 'cluster':
                        isExplosive = true;
                        break;
                    case 'energy':
                        isExplosive = true;
                        bulletDamage *= 1.5;
                        break;
                }

                for(let i = 0; i < numBullets; i++) {
                    let spreadAngle = angle;
                    if (numBullets > 1) {
                        spreadAngle += (Math.random() - 0.5) * 0.3;
                    }

                    const proj = new Projectile(this.x, this.y, spreadAngle, bulletSpeed, bulletDamage, bulletColor, isExplosive, isPiercing, bulletRadius, 50, 1, 0);
                    proj.isHoming = isHoming;
                    proj.statusEffect = statusEffect;
                    proj.statusDuration = statusDuration;
                    proj.bulletType = playerBulletConfig.currentType;
                    projectiles.push(proj);
                }

                if (particlesEnabled) {
                    for (let i = 0; i < 3; i++) {
                        particles.push(new Particle(this.x, this.y, bulletColor, 2, 0.5, 30));
                    }
                }
                this.fireCooldown = this.fireRate;
            }
        }
    };

    this.activateSpecial = function() {
        if (this.specialCooldown === 0 && !this.specialActive) {
            this.specialActive = true;
            this.specialTimer = this.specialDuration;
            this.specialCooldown = this.specialCooldownMax;

            let targetBoss = findClosestBoss(this.x, this.y);
            let angle = 0;
            if (targetBoss) {
                angle = Math.atan2(targetBoss.y - this.y, targetBoss.x - this.x);
            } else {
                angle = Math.random() * Math.PI * 2;
            }
            projectiles.push(new SpecialProjectile(this.x, this.y, angle, 3, 15, 'lightblue', 40));
        }
    };
}

// =================================================================================================
// --- Configuração e Estado das Balas do Jogador ---
// =================================================================================================
const BULLET_TYPES = {
    normal: {
        name: "Normal",
        description: "Balas básicas padrão",
        price: 0,
        color: 'lime',
        damage: 1,
        speed: 1,
        radius: 5,
        special: "Sem efeito especial",
        unlocked: true
    },
    explosive: {
        name: "Explosiva",
        description: "Explode causando dano em área",
        price: 30, // Preço reduzido
        color: 'orange',
        damage: 2,
        speed: 0.8,
        radius: 7,
        special: "Explosão com dano em área",
        unlocked: false
    },
    piercing: {
        name: "Penetrante",
        description: "Atravessa múltiplos inimigos",
        price: 45, // Preço reduzido
        color: 'purple',
        damage: 1.5,
        speed: 1.2,
        radius: 5,
        special: "Atravessa inimigos",
        unlocked: false
    },
    rapid: {
        name: "Rápida",
        description: "Dispara múltiplas balas em rajada",
        price: 60, // Preço reduzido
        color: 'yellow',
        damage: 0.7,
        speed: 1.5,
        radius: 3,
        special: "Disparo triplo",
        unlocked: false
    },
    homing: {
        name: "Teleguiada",
        description: "Persegue inimigos automaticamente",
        price: 90, // Preço reduzido
        color: 'cyan',
        damage: 1.2,
        speed: 0.9,
        radius: 6,
        special: "Persegue inimigos",
        unlocked: false
    },
    freeze: {
        name: "Congelante",
        description: "Reduz velocidade dos inimigos",
        price: 75, // Preço reduzido
        color: 'lightblue',
        damage: 0.8,
        speed: 1,
        radius: 5,
        special: "Aplica efeito de lentidão",
        unlocked: false
    },
    poison: {
        name: "Venenosa",
        description: "Causa dano contínuo por tempo",
        price: 70, // Preço reduzido
        color: 'green',
        damage: 0.6,
        speed: 1,
        radius: 5,
        special: "Dano venenoso contínuo",
        unlocked: false
    },
    laser: {
        name: "Laser",
        description: "Raio contínuo que atravessa tudo",
        price: 120, // Preço reduzido
        color: 'red',
        damage: 2.5,
        speed: 2,
        radius: 3,
        special: "Raio laser contínuo",
        unlocked: false
    },
    cluster: {
        name: "Fragmentação",
        description: "Explode em múltiplas balas menores",
        price: 100, // Preço reduzido
        color: 'white',
        damage: 1,
        speed: 0.7,
        radius: 8,
        special: "Fragmenta em várias balas",
        unlocked: false
    },
    energy: {
        name: "Energia Pura",
        description: "Causa dano massivo em área",
        price: 180, // Preço reduzido
        color: 'gold',
        damage: 3,
        speed: 0.6,
        radius: 10,
        special: "Dano massivo em área",
        unlocked: false
    }
};

const playerBulletConfig = {
    currentType: 'normal',
    unlockedTypes: { ...BULLET_TYPES }
};

// =================================================================================================
// --- Objeto Projétil (Projectile) ---
// =================================================================================================
function Projectile(x, y, angle, speed, damage, color, isExplosive = false, isPiercing = false, radius = 5, explosionRadius = 50, areaDamage = 1, piercingDamageReduction = 0) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.dx = Math.cos(angle) * speed;
    this.dy = Math.sin(angle) * speed;
    this.damage = damage;
    this.color = color;
    this.trailCounter = 0;
    this.isExplosive = isExplosive;
    this.isPiercing = isPiercing;
    this.explosionRadius = explosionRadius;
    this.areaDamage = areaDamage;
    this.piercingDamageReduction = piercingDamageReduction;
    this.enemiesHit = new Set();

    this.draw = function() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    };

    this.update = function() {
        // Homing behavior
        if (this.isHoming) {
            const target = findClosestBoss(this.x, this.y);
            if (target) {
                const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
                const currentAngle = Math.atan2(this.dy, this.dx);
                let angleDiff = targetAngle - currentAngle;

                // Normalize angle difference
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                // Turn towards target
                const turnRate = 0.1;
                const newAngle = currentAngle + angleDiff * turnRate;
                const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);

                this.dx = Math.cos(newAngle) * speed;
                this.dy = Math.sin(newAngle) * speed;
            }
        }

        this.x += this.dx;
        this.y += this.dy;
        if (particlesEnabled) {
            particles.push(new Particle(this.x, this.y, this.color, 2, 0.3, 15));
        }
    };
}

// =================================================================================================
// --- Objeto Projétil Especial (SpecialProjectile) ---
// =================================================================================================
function SpecialProjectile(x, y, angle, speed, damage, color, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.dx = Math.cos(angle) * speed;
    this.dy = Math.sin(angle) * speed;
    this.damage = damage;
    this.color = color;
    this.life = 180;
    this.maxLife = 180;
    this.hitTargets = new Set();

    this.draw = function() {
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    this.update = function() {
        this.x += this.dx;
        this.y += this.dy;
        this.life--;

        if (particlesEnabled) {
            for (let i = 0; i < 3; i++) {
                particles.push(new Particle(this.x, this.y, this.color, 3, 1, 30));
            }
        }

        if (this.life <= 0 || this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.explode();
            return true;
        }

        return false;
    };

    this.explode = function() {
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            projectiles.push(new Projectile(this.x, this.y, angle, 6, 8, 'orange', false, false, 4));
        }

        if (particlesEnabled) {
            for (let i = 0; i < 30; i++) {
                particles.push(new Particle(this.x, this.y, 'gold', 5, 3, 60));
            }
        }
    };
}

// =================================================================================================
// --- Sistema de Chefes Múltiplos ---
// =================================================================================================
const BOSS_TYPES = {
    BRUTE: 0,
    SNIPER: 1,
    SWARM: 2,
    TELEPORTER: 3,
    SHIELD: 4,
    BERSERKER: 5,
    FROST: 6,
    SHADOW: 7,
    LASER: 8,
    ULTIMATE: 9
};

function Boss(level) {
    this.x = canvas.width / 2;
    this.y = canvas.height * 0.2;
    this.type = level % Object.keys(BOSS_TYPES).length; // Cicla pelos tipos de chefe
    this.level = level;
    this.radius = 50 + (level * 1.5); // Ajustado para crescimento mais suave
    this.hitboxRadius = this.radius * 0.7;
    this.damageTakenThisPhase = 0; // Para recompensa de dano

    this.setupBossType = function() {
        switch (this.type) {
            case BOSS_TYPES.BRUTE:
                this.name = "Brute";
                this.color = 'darkred';
                this.baseHealth = 700; // Ajustado
                this.healthScaling = 300; // Ajustado
                this.baseDamage = 20;
                this.damageScaling = 7;
                this.speed = 0.5;
                this.fireRate = 75;
                this.baseAttackFrequency = 180;
                this.specialAttackCooldown = 300;
                this.specialAttackTimer = 0;
                break;
            case BOSS_TYPES.SNIPER:
                this.name = "Sniper";
                this.color = 'darkgreen';
                this.baseHealth = 500; // Ajustado
                this.healthScaling = 200;
                this.baseDamage = 40;
                this.damageScaling = 12;
                this.speed = 0.9;
                this.fireRate = 110;
                this.baseAttackFrequency = 90;
                break;
            case BOSS_TYPES.SWARM:
                this.name = "Swarm";
                this.color = 'darkorange';
                this.baseHealth = 600; // Ajustado
                this.healthScaling = 250;
                this.baseDamage = 15;
                this.damageScaling = 5;
                this.speed = 1.5;
                this.fireRate = 30;
                this.baseAttackFrequency = 100;
                break;
            case BOSS_TYPES.TELEPORTER:
                this.name = "Teleporter";
                this.color = 'purple';
                this.baseHealth = 550; // Ajustado
                this.healthScaling = 220;
                this.baseDamage = 28;
                this.damageScaling = 10;
                this.speed = 0.7;
                this.fireRate = 60;
                this.baseAttackFrequency = 140;
                this.teleportCooldown = 0;
                break;
            case BOSS_TYPES.SHIELD:
                this.name = "Shield";
                this.color = 'lightblue';
                this.baseHealth = 900; // Ajustado
                this.healthScaling = 350;
                this.baseDamage = 20;
                this.damageScaling = 6;
                this.speed = 0.5;
                this.fireRate = 70;
                this.baseAttackFrequency = 180;
                this.shieldActive = false;
                this.shieldCooldown = 0;
                this.shieldDuration = 180;
                this.shieldRechargeTime = 300;
                break;
            case BOSS_TYPES.BERSERKER:
                this.name = "Berserker";
                this.color = 'darkmagenta';
                this.baseHealth = 700; // Ajustado
                this.healthScaling = 280;
                this.baseDamage = 35;
                this.damageScaling = 16;
                this.speed = 0.8;
                this.fireRate = 50;
                this.baseAttackFrequency = 90;
                break;
            case BOSS_TYPES.FROST:
                this.name = "Frost";
                this.color = 'lightcyan';
                this.baseHealth = 650; // Ajustado
                this.healthScaling = 260;
                this.baseDamage = 22;
                this.damageScaling = 7;
                this.speed = 0.9;
                this.fireRate = 85;
                this.baseAttackFrequency = 150;
                break;
            case BOSS_TYPES.SHADOW:
                this.name = "Shadow";
                this.color = 'gray';
                this.baseHealth = 600; // Ajustado
                this.healthScaling = 240;
                this.baseDamage = 28;
                this.damageScaling = 9;
                this.speed = 1.2;
                this.fireRate = 45;
                this.baseAttackFrequency = 130;
                this.invisibilityCooldown = 0;
                this.invisibilityDuration = 120;
                this.isInvisible = false;
                break;
            case BOSS_TYPES.LASER:
                this.name = "Laser";
                this.color = 'yellow';
                this.baseHealth = 750; // Ajustado
                this.healthScaling = 300;
                this.baseDamage = 45;
                this.damageScaling = 20;
                this.speed = 0.4;
                this.fireRate = 170;
                this.baseAttackFrequency = 220;
                this.chargingLaser = false;
                this.laserChargeTime = 0;
                this.maxLaserChargeTime = 120;
                break;
            case BOSS_TYPES.ULTIMATE:
                this.name = "Ultimate";
                this.color = 'gold';
                this.baseHealth = 1300; // Ajustado
                this.healthScaling = 500;
                this.baseDamage = 55;
                this.damageScaling = 25;
                this.speed = 1.0;
                this.fireRate = 40;
                this.baseAttackFrequency = 70;
                break;
        }
    };

    this.createWeakPoints = function() {
        const points = [];
        const numPoints = 2 + Math.floor(this.level / 5); // Mais pontos fracos em níveis altos

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const distance = this.radius * 0.8;
            points.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                radius: 8,
                health: 3 + Math.floor(this.level / 3), // Vida dos pontos fracos escala
                maxHealth: 3 + Math.floor(this.level / 3),
                active: true
            });
        }
        return points;
    };

    // Call setupBossType BEFORE using the properties
    this.setupBossType();

    this.health = this.baseHealth + (level * this.healthScaling);
    this.maxHealth = this.health;
    this.damage = this.baseDamage + (level * this.damageScaling);
    this.scoreValue = 500 + (level * 200);

    this.fireCooldown = 0;
    this.attackPatternCounter = 0;
    this.attackPatternFrequency = this.baseAttackFrequency;
    this.phaseCounter = 0;
    this.isEnraged = false;
    this.statusEffects = new Map();

    // Weak points
    this.weakPoints = this.createWeakPoints();
    this.weakPointHitCounter = 0;

    this.draw = function() {
        // Invisibilidade para Shadow boss
        if (this.type === BOSS_TYPES.SHADOW && this.isInvisible) {
            ctx.globalAlpha = 0.3;
        }

        // Shield visual para Shield boss
        if (this.type === BOSS_TYPES.SHIELD && this.shieldActive) {
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Desenha o chefe
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Enraged effect
        if (this.isEnraged) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Desenha weak points
        for (const wp of this.weakPoints) {
            if (wp.active) {
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(this.x + wp.x, this.y + wp.y, wp.radius, 0, Math.PI * 2);
                ctx.fill();

                // Brilho nos weak points
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x + wp.x, this.y + wp.y, wp.radius + 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Barra de vida do chefe
        ctx.fillStyle = 'gray';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 15, this.radius * 2, 8);
        ctx.fillStyle = 'orange';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 15, (this.radius * 2) * (this.health / this.maxHealth), 8);

        // Nome do chefe
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name + ' Lv.' + (this.level + 1), this.x, this.y - this.radius - 25);

        ctx.globalAlpha = 1;
    };

    this.update = function() {
        // Fase de enraged quando vida baixa
        if (this.health / this.maxHealth < 0.3 && !this.isEnraged) {
            this.isEnraged = true;
            this.fireRate = Math.floor(this.fireRate * 0.6); // Atira mais rápido
            this.speed *= 1.5; // Move mais rápido
        }

        this.updateMovement();
        this.updateAttacks();
        this.updateSpecialAbilities();
    };

    this.updateMovement = function() {
        switch (this.type) {
            case BOSS_TYPES.BRUTE:
                // Movimento lento e previsível
                this.x += Math.cos(performance.now() / 1000) * this.speed * 3;
                break;
            case BOSS_TYPES.SNIPER:
                // Fica parado na maior parte do tempo, move ocasionalmente
                if (Math.random() < 0.01) {
                    this.x += (Math.random() - 0.5) * this.speed * 20;
                }
                break;
            case BOSS_TYPES.SWARM:
                // Movimento errático
                this.x += Math.sin(performance.now() / 200) * this.speed * 2;
                this.y += Math.cos(performance.now() / 300) * this.speed;
                break;
            case BOSS_TYPES.TELEPORTER:
                // Teleporte ocasional
                if (this.teleportCooldown <= 0 && Math.random() < 0.005) {
                    this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
                    this.y = Math.random() * (canvas.height * 0.5) + this.radius;
                    this.teleportCooldown = 180;
                    // Efeito visual de teleporte
                    if (particlesEnabled) {
                        for (let i = 0; i < 15; i++) {
                            particles.push(new Particle(this.x, this.y, 'purple', 4, 2, 40));
                        }
                    }
                }
                if (this.teleportCooldown > 0) this.teleportCooldown--;
                break;
            case BOSS_TYPES.SHADOW:
                // Invisibilidade
                if (this.invisibilityCooldown <= 0 && !this.isInvisible && Math.random() < 0.007) {
                    this.isInvisible = true;
                    this.invisibilityCooldown = this.invisibilityDuration + 300; // Cooldown para invisibilidade
                } else if (this.isInvisible && this.invisibilityCooldown <= 300) { // Tempo que fica invisível
                    this.isInvisible = false;
                }
                if (this.invisibilityCooldown > 0) this.invisibilityCooldown--;
                // Movimento padrão mesmo invisível
                this.x += Math.cos(performance.now() / 1000 * 2) * this.speed * 5;
                break;
            case BOSS_TYPES.LASER:
                // Foca em mirar no player durante o carregamento
                if (this.chargingLaser) {
                    // Sem movimento durante o carregamento para maior precisão
                } else {
                    this.x += Math.cos(performance.now() / 1000 * 2) * this.speed * 3;
                }
                break;
            default:
                // Movimento padrão
                this.x += Math.cos(performance.now() / 1000 * 2) * this.speed * 5;
                break;
        }

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height * 0.6, this.y));
    };

    this.updateAttacks = function() {
        if (this.fireCooldown > 0) {
            this.fireCooldown--;
        }

        // Ataques básicos sempre que o cooldown permitir
        if (this.fireCooldown <= 0 && !this.chargingLaser) { // Laser boss não atira normalmente enquanto carrega
            const targetX = player.x;
            const targetY = player.y;
            const angleToPlayer = Math.atan2(targetY - this.y, targetX - this.x);

            this.performBasicAttack(angleToPlayer);
            this.fireCooldown = this.fireRate;
        }

        // Ataques especiais baseados em frequência
        this.attackPatternCounter++;
        if (this.attackPatternCounter >= this.attackPatternFrequency) {
            this.attackPatternCounter = 0;
            this.performSpecialAttack();
        }

        // Cooldown para ataques especiais específicos
        if (this.type === BOSS_TYPES.BRUTE && this.specialAttackTimer > 0) {
            this.specialAttackTimer--;
        }
        if (this.type === BOSS_TYPES.TELEPORTER && this.teleportCooldown > 0) {
            this.teleportCooldown--;
        }
        if (this.type === BOSS_TYPES.SHIELD && this.shieldCooldown > 0) {
            this.shieldCooldown--;
            if (this.shieldActive && this.shieldCooldown <= (this.shieldRechargeTime - this.shieldDuration)) {
                this.shieldActive = false; // Desativa o escudo após a duração
            }
        }
        if (this.type === BOSS_TYPES.SHADOW && this.invisibilityCooldown > 0) {
            this.invisibilityCooldown--;
        }
        if (this.type === BOSS_TYPES.LASER && this.chargingLaser) {
            this.laserChargeTime--;
            if (this.laserChargeTime <= 0) {
                this.shootLaser(Math.atan2(player.y - this.y, player.x - this.x));
                this.chargingLaser = false;
                this.fireCooldown = this.fireRate; // Reinicia o cooldown após o laser
                this.attackPatternCounter = 0; // Reseta o contador do padrão de ataque
            }
        }
    };

    this.performBasicAttack = function(angleToPlayer) {
        switch (this.type) {
            case BOSS_TYPES.SNIPER:
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 2.5, this.damage, 'lime', 8)); // Bullet faster
                break;
            case BOSS_TYPES.SWARM:
                for (let i = -3; i <= 3; i++) { // Mais balas
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer + i * 0.15, ENEMY_BULLET_SPEED * 1.2, this.damage * 0.5, 'orange', 4));
                }
                break;
            case BOSS_TYPES.BERSERKER:
                // Disparo rápido de balas que se espalham
                for (let i = 0; i < 5; i++) {
                    const spread = (Math.random() - 0.5) * 0.5; // Maior spread
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer + spread, ENEMY_BULLET_SPEED * 1.5, this.damage * 0.7, 'darkmagenta', 5));
                }
                break;
            case BOSS_TYPES.FROST:
                // Projéteis que aplicam lentidão
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 1.2, this.damage * 0.8, 'lightblue', 7, STATUS_EFFECTS.SLOW, 120));
                break;
            case BOSS_TYPES.SHADOW:
                // Projéteis que causam dano ao longo do tempo (veneno)
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 1.3, this.damage * 0.7, 'gray', 6, STATUS_EFFECTS.POISON, 180));
                break;
            case BOSS_TYPES.LASER:
                // Pequenos projéteis enquanto não carrega o laser principal
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED, this.damage * 0.4, 'red', 3));
                break;
            case BOSS_TYPES.ULTIMATE:
                // Múltiplos projéteis, com alguns teleguiados
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 1.5, this.damage, 'gold', 7));
                if (Math.random() < 0.3) { // Chance de atirar um teleguiado
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED, this.damage * 0.8, 'gold', 5, null, 0, true)); // Homing
                }
                break;
            default:
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED, this.damage, 'red', 6));
                break;
        }
    };

    this.performSpecialAttack = function() {
        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);

        switch (this.type) {
            case BOSS_TYPES.BRUTE:
                // Onda de choque: projéteis se espalhando em todas as direções
                if (this.specialAttackTimer <= 0) {
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angle, ENEMY_BULLET_SPEED * 0.8, this.damage * 1.2, 'darkred', 10));
                    }
                    this.specialAttackTimer = this.specialAttackCooldown;
                }
                break;
            case BOSS_TYPES.SNIPER:
                // Mira e atira um laser de alta precisão (um projétil muito rápido e fino)
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 4, this.damage * 1.5, 'yellow', 4, null, 0, false, true)); // Piercing laser
                break;
            case BOSS_TYPES.SWARM:
                // Invoca pequenos orbes que perseguem o jogador (mini inimigos ou projéteis teleguiados lentos)
                for (let i = 0; i < 3 + Math.floor(this.level / 2); i++) {
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, Math.random() * Math.PI * 2, ENEMY_BULLET_SPEED * 0.5, this.damage * 0.7, 'lightcoral', 5, null, 0, true)); // Homing
                }
                break;
            case BOSS_TYPES.TELEPORTER:
                // Teleporta para perto do jogador e atira em todas as direções (explosão)
                this.x = player.x + (Math.random() - 0.5) * 100; // Teleporta para perto do player
                this.y = player.y + (Math.random() - 0.5) * 100;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angle, ENEMY_BULLET_SPEED * 1.5, this.damage * 1.1, 'purple', 7));
                }
                break;
            case BOSS_TYPES.SHIELD:
                // Ativa um escudo temporário que o torna invulnerável ou muito resistente
                this.shieldActive = true;
                this.shieldCooldown = this.shieldRechargeTime;
                break;
            case BOSS_TYPES.BERSERKER:
                // Investida: move-se rapidamente em direção ao jogador e causa dano de contato
                const dashSpeed = this.speed * 5;
                this.dx = Math.cos(angleToPlayer) * dashSpeed;
                this.dy = Math.sin(angleToPlayer) * dashSpeed;
                // Temporariamente aumenta a velocidade
                setTimeout(() => { this.dx = 0; this.dy = 0; }, 30); // Para a investida após um curto período
                break;
            case BOSS_TYPES.FROST:
                // Cria uma área congelante no chão ou atira um grande projétil que explode e causa lentidão em área
                enemyProjectiles.push(new AreaEffectProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED, this.damage * 1.5, 'blue', 15, STATUS_EFFECTS.SLOW, 240, 100));
                break;
            case BOSS_TYPES.SHADOW:
                // Invoca cópias de si mesmo (que não atacam ou têm vida muito baixa) ou se torna completamente invisível por um tempo
                this.isInvisible = true;
                this.invisibilityCooldown = this.invisibilityDuration + 300; // Total duration including cooldown
                break;
            case BOSS_TYPES.LASER:
                // Começa a carregar um grande laser que atira em linha reta após um atraso
                this.chargingLaser = true;
                this.laserChargeTime = this.maxLaserChargeTime;
                break;
            case BOSS_TYPES.ULTIMATE:
                // Combinação de ataques: uma onda de projéteis, um ataque teleguiado e um teleporte
                this.performSpecialAttack_Brute();
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 0.7, this.damage * 1.5, 'gold', 8, null, 0, true)); // Homing
                // Teleporte para uma nova posição
                this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
                this.y = Math.random() * (canvas.height * 0.5) + this.radius;
                break;
        }
    };

    this.shootLaser = function(angle) {
        // Implementação do laser contínuo do boss Laser
        enemyProjectiles.push(new EnemyLaser(this.x, this.y, angle, this.damage * 2, 'red', 5, 500)); // Dano alto, projétil longo
    };

    this.updateSpecialAbilities = function() {
        // Lógica para desativar escudo, invisibilidade, etc.
        if (this.type === BOSS_TYPES.SHIELD && this.shieldActive && this.shieldCooldown <= (this.shieldRechargeTime - this.shieldDuration)) {
            this.shieldActive = false;
        }
        if (this.type === BOSS_TYPES.SHADOW && this.isInvisible && this.invisibilityCooldown <= 0) {
            this.isInvisible = false;
        }
    };

    this.takeDamage = function(damageAmount) {
        if (this.type === BOSS_TYPES.SHIELD && this.shieldActive) {
            damageAmount *= 0.1; // Reduz dano se o escudo estiver ativo
        }
        this.health -= damageAmount;
        this.damageTakenThisPhase += damageAmount; // Adiciona ao dano total causado

        // Lógica de recompensa por dano
        const DAMAGE_THRESHOLD_CUBES = 1000; // Cada 1000 de dano = 25 cubos
        const CUBES_PER_THRESHOLD = 25;

        while (this.damageTakenThisPhase >= DAMAGE_THRESHOLD_CUBES) {
            cubes += CUBES_PER_THRESHOLD;
            this.damageTakenThisPhase -= DAMAGE_THRESHOLD_CUBES;
            // Opcional: feedback visual ou sonoro
        }

        if (this.health <= 0) {
            // Se o boss morrer, reseta o dano causado para a próxima run/fase
            this.damageTakenThisPhase = 0;
            return true;
        }
        return false;
    };
}

// =================================================================================================
// --- Objeto Projétil Inimigo (EnemyProjectile) ---
// =================================================================================================
function EnemyProjectile(x, y, angle, speed, damage, color, radius, statusEffect = null, statusDuration = 0, isHoming = false, isPiercing = false) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.dx = Math.cos(angle) * speed;
    this.dy = Math.sin(angle) * speed;
    this.damage = damage;
    this.color = color;
    this.statusEffect = statusEffect;
    this.statusDuration = statusDuration;
    this.isHoming = isHoming;
    this.isPiercing = isPiercing;

    this.draw = function() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    };

    this.update = function() {
        if (this.isHoming) {
            const target = player;
            if (target) {
                const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
                const currentAngle = Math.atan2(this.dy, this.dx);
                let angleDiff = targetAngle - currentAngle;

                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                const turnRate = 0.05; // Velocidade de curva do projétil teleguiado
                const newAngle = currentAngle + angleDiff * turnRate;
                const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);

                this.dx = Math.cos(newAngle) * speed;
                this.dy = Math.sin(newAngle) * speed;
            }
        }
        this.x += this.dx;
        this.y += this.dy;
    };
}

// Novo: Projétil de Área (para Frost Boss, por exemplo)
function AreaEffectProjectile(x, y, angle, speed, damage, color, radius, statusEffect, statusDuration, areaRadius) {
    EnemyProjectile.call(this, x, y, angle, speed, damage, color, radius, statusEffect, statusDuration);
    this.areaRadius = areaRadius;
    this.exploded = false;
    this.explosionDuration = 60; // Duração do efeito de área
    this.explosionTimer = 0;

    const originalUpdate = this.update; // Guarda a função original de update

    this.update = function() {
        if (!this.exploded) {
            originalUpdate.call(this); // Chama o update normal do projétil

            // Condição para explodir (pode ser ao atingir o chão ou depois de um tempo)
            if (this.y > canvas.height * 0.8 || this.x < 0 || this.x > canvas.width || this.y < 0) {
                this.exploded = true;
                this.explosionTimer = this.explosionDuration;
                this.dx = 0; // Para de mover
                this.dy = 0;
            }
        } else {
            this.explosionTimer--;
            if (this.explosionTimer <= 0) {
                return true; // Indica que o projétil deve ser removido
            }

            // Aplica efeito na área
            const dist = Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2));
            if (dist < this.areaRadius + player.radius) {
                if (this.statusEffect && !player.statusEffects.has(this.statusEffect)) {
                    player.addStatusEffect(this.statusEffect, this.statusDuration, { source: 'AreaEffect' });
                }
            }
        }
        return false;
    };

    const originalDraw = this.draw; // Guarda a função original de draw

    this.draw = function() {
        if (!this.exploded) {
            originalDraw.call(this);
        } else {
            // Desenha o efeito de área
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.areaRadius * (1 - this.explosionTimer / this.explosionDuration), 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.3 * (this.explosionTimer / this.explosionDuration);
            ctx.fill();
            ctx.restore();
        }
    };
}

// Novo: Laser do Inimigo (para Laser Boss)
function EnemyLaser(x, y, angle, damage, color, radius, duration) {
    EnemyProjectile.call(this, x, y, angle, 0, damage, color, radius); // Velocidade 0, é um laser
    this.duration = duration;
    this.timer = duration;
    this.length = 0; // Comprimento inicial do laser
    this.maxLength = Math.max(canvas.width, canvas.height) * 1.5; // O laser pode ir além da tela
    this.growSpeed = 30; // Velocidade de crescimento do laser

    this.draw = function() {
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = (this.timer / this.duration) * 0.8 + 0.2; // Opacidade diminui com o tempo

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        const endX = this.x + Math.cos(angle) * this.length;
        const endY = this.y + Math.sin(angle) * this.length;
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    };

    this.update = function() {
        this.timer--;
        if (this.length < this.maxLength) {
            this.length += this.growSpeed;
        }

        // Detecta colisão com o player ao longo do raio do laser
        const playerLineDist = distToSegment(player.x, player.y, this.x, this.y, this.x + Math.cos(angle) * this.length, this.y + Math.sin(angle) * this.length);
        if (playerLineDist < player.radius + this.radius) {
            player.health -= this.damage / 30; // Dano contínuo
            damageTexts.push(new DamageText(player.x, player.y - 20, Math.round(this.damage / 30), false, 'red'));
        }

        return this.timer <= 0;
    };
}


// Função auxiliar para distância de ponto a segmento (para colisões de laser)
function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
    if (l2 === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projectionX = x1 + t * (x2 - x1);
    const projectionY = y1 + t * (y2 - y1);
    return Math.sqrt(Math.pow(px - projectionX, 2) + Math.pow(py - projectionY, 2));
}

// =================================================================================================
// --- Outras Funções do Jogo ---
// =================================================================================================

function findClosestBoss(x, y) {
    let closestBoss = null;
    let minDistance = Infinity;

    for (const boss of bosses) {
        const dist = Math.sqrt(Math.pow(boss.x - x, 2) + Math.pow(boss.y - y, 2));
        if (dist < minDistance) {
            minDistance = dist;
            closestBoss = boss;
        }
    }
    return closestBoss;
}

// Partículas
function Particle(x, y, color, radius, speed, life) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = radius;
    this.life = life;
    this.dx = (Math.random() - 0.5) * speed * 2;
    this.dy = (Math.random() - 0.5) * speed * 2;

    this.draw = function() {
        ctx.globalAlpha = this.life / life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    };

    this.update = function() {
        this.x += this.dx;
        this.y += this.dy;
        this.life--;
    };
}

// Texto de Dano
function DamageText(x, y, damage, isCritical, color = 'white') {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.isCritical = isCritical;
    this.color = color;
    this.life = 60; // 1 segundo de vida (60 frames)
    this.speedY = -1; // Sobe
    this.alpha = 1;

    this.draw = function() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = (this.isCritical ? 'bold 24px' : '16px') + ' Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.damage, this.x, this.y);
        ctx.globalAlpha = 1;
    };

    this.update = function() {
        this.y += this.speedY;
        this.life--;
        this.alpha = this.life / 60; // Desaparece gradualmente
    };
}

// Reinicia o jogo
function resetGame() {
    score = 0;
    bossLevel = 0;
    player = new Player();
    projectiles = [];
    bosses = [];
    enemyProjectiles = [];
    particles = [];
    damageTexts = [];
    powerUps = [];
    runStats = {
        wavesClearedThisRun: 0,
        damageDealtThisRun: 0,
        survivalTimeThisRun: 0,
        cubesEarnedThisRun: 0
    };
    gameStarted = true;
    gameRunning = true;
    currentScreen = 'game';
    spawnBoss(); // Começa com o primeiro chefe
}

// Spawna um novo chefe
function spawnBoss() {
    bosses = []; // Limpa chefes anteriores
    const newBoss = new Boss(bossLevel);
    bosses.push(newBoss);
    // Posiciona o player um pouco mais distante do boss
    player.x = canvas.width / 2;
    player.y = canvas.height * 0.75; // Move o player para mais longe do topo
    runStats.wavesClearedThisRun++;
}

// Desenha a HUD do jogo
function drawHUD() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 30);
    ctx.fillText('Cubos: ' + cubes, 10, 60);
    ctx.fillText('Nível Boss: ' + (bossLevel + 1), 10, 90);

    // Barra de vida do jogador
    ctx.fillStyle = 'red';
    ctx.fillRect(canvas.width - 160, 10, 150, 20);
    ctx.fillStyle = 'lime';
    ctx.fillRect(canvas.width - 160, 10, 150 * (player.health / player.maxHealth), 20);
    ctx.fillStyle = 'white';
    ctx.fillText('HP: ' + Math.ceil(player.health), canvas.width - 150, 27);

    // Cooldown do especial
    ctx.fillStyle = 'gray';
    ctx.fillRect(canvas.width - 160, 40, 150, 15);
    ctx.fillStyle = 'gold';
    const specialFillWidth = (player.specialCooldownMax - player.specialCooldown) / player.specialCooldownMax * 150;
    ctx.fillRect(canvas.width - 160, 40, specialFillWidth, 15);
    ctx.fillStyle = 'white';
    ctx.fillText('Especial', canvas.width - 150, 53);
}

// Desenha a tela do menu principal
function drawMainMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Boss Rush', canvas.width / 2, canvas.height / 3);

    // Botão Iniciar
    startButton.x = canvas.width / 2 - startButton.width / 2;
    startButton.y = canvas.height / 2;
    drawButton(startButton.x, startButton.y, startButton.width, startButton.height, 'Iniciar Jogo', 'green');

    // Botão Loja
    menuShopButton.x = canvas.width / 2 - menuShopButton.width / 2;
    menuShopButton.y = canvas.height / 2 + 80;
    drawButton(menuShopButton.x, menuShopButton.y, menuShopButton.width, menuShopButton.height, 'Loja', 'blue');

    // Botão Partículas
    particlesButton.x = canvas.width / 2 - particlesButton.width / 2;
    particlesButton.y = canvas.height / 2 + 160;
    drawButton(particlesButton.x, particlesButton.y, particlesButton.width, particlesButton.height, `Partículas: ${particlesEnabled ? 'Ligado' : 'Desligado'}`, 'purple');
}

// Desenha a tela da loja
function drawShop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loja de Upgrades', canvas.width / 2, 60);

    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Cubos: ' + cubes, 10, 50);

    // Desenhar upgrades permanentes
    let yOffset = 100 + shopScroll;
    for (const key in permanentUpgrades) {
        const upgrade = permanentUpgrades[key];
        const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.level));
        const currentLevel = upgrade.level;
        const maxLevel = upgrade.maxLevel;

        let description = "";
        let currentValue = 0;
        let nextValue = 0;

        switch(key) {
            case 'health':
                description = `Aumenta a vida máxima do jogador.`;
                currentValue = PLAYER_MAX_HEALTH_BASE + (currentLevel * 20);
                nextValue = PLAYER_MAX_HEALTH_BASE + ((currentLevel + 1) * 20);
                break;
            case 'damage':
                description = `Aumenta o dano base do jogador.`;
                currentValue = player.baseDamage;
                nextValue = player.baseDamage + 3;
                break;
            case 'speed':
                description = `Aumenta a velocidade de movimento do jogador.`;
                currentValue = player.speed;
                nextValue = player.speed + 0.5;
                break;
            case 'fireRate':
                description = `Aumenta a velocidade de tiro (menor cooldown).`;
                currentValue = player.fireRate;
                nextValue = Math.max(5, player.fireRate - 2);
                break;
            case 'specialCooldown':
                description = `Reduz o tempo de recarga da habilidade especial.`;
                currentValue = player.specialCooldownMax;
                nextValue = Math.max(600, player.specialCooldownMax - 120);
                break;
        }

        const upgradeText = `${upgrade.name || key.charAt(0).toUpperCase() + key.slice(1)} (Lv ${currentLevel}/${maxLevel})`;
        const statsText = `Atual: ${currentValue.toFixed(1)} ${nextValue !== 0 ? `-> Próx: ${nextValue.toFixed(1)}` : ''}`;
        const costText = `Custo: ${cost} Cubos`;

        ctx.fillStyle = 'darkgray';
        ctx.fillRect(50, yOffset, canvas.width - 100, SHOP_ITEM_HEIGHT - 10);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(50, yOffset, canvas.width - 100, SHOP_ITEM_HEIGHT - 10);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.font = '20px Arial';
        ctx.fillText(upgradeText, 60, yOffset + 25);
        ctx.font = '16px Arial';
        ctx.fillText(description, 60, yOffset + 45);
        if (currentLevel < maxLevel) {
            ctx.fillText(statsText, 60, yOffset + 65);
            ctx.fillText(costText, 60, yOffset + 85);

            const buyButton = {
                x: canvas.width - 140, y: yOffset + 30, width: 80, height: 40,
                key: key, type: 'permanentUpgrade'
            };
            drawButton(buyButton.x, buyButton.y, buyButton.width, buyButton.height, 'Comprar', cubes >= cost ? 'lime' : 'gray', cubes < cost);
            buyButton.active = true; // Marca como ativo para click
            // Armazena a posição do botão para detecção de clique
            if (!shopButtons.permanent) shopButtons.permanent = [];
            shopButtons.permanent.push(buyButton);
        } else {
            ctx.fillStyle = 'lightgray';
            ctx.fillText('MAX', canvas.width - 100, yOffset + 55);
        }
        yOffset += SHOP_ITEM_HEIGHT;
    }

    // Desenhar tipos de bala
    yOffset += 50; // Espaço entre upgrades permanentes e balas
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Tipos de Bala', canvas.width / 2, yOffset - 20);

    for (const key in BULLET_TYPES) {
        const bulletType = BULLET_TYPES[key];
        if (bulletType.price === 0 && !bulletType.unlocked) { // Garante que a normal é sempre desbloqueada
            bulletType.unlocked = true;
        }

        const bulletText = `${bulletType.name} - Dano: ${bulletType.damage}, Velocidade: ${bulletType.speed}`;
        const statusText = bulletType.unlocked ? 'Desbloqueado' : `Custo: ${bulletType.price} Cubos`;
        const actionText = bulletType.unlocked ? (playerBulletConfig.currentType === key ? 'Selecionado' : 'Selecionar') : 'Comprar';

        ctx.fillStyle = 'darkgray';
        ctx.fillRect(50, yOffset, canvas.width - 100, SHOP_ITEM_HEIGHT - 10);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(50, yOffset, canvas.width - 100, SHOP_ITEM_HEIGHT - 10);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.font = '20px Arial';
        ctx.fillText(bulletText, 60, yOffset + 25);
        ctx.font = '16px Arial';
        ctx.fillText(bulletType.description, 60, yOffset + 45);
        ctx.fillText(statusText, 60, yOffset + 65);

        const bulletButton = {
            x: canvas.width - 140, y: yOffset + 30, width: 80, height: 40,
            key: key, type: 'bulletType'
        };

        let buttonColor = 'gray';
        let disabled = true;
        if (bulletType.unlocked) {
            if (playerBulletConfig.currentType === key) {
                buttonColor = 'lightgray';
                disabled = true;
            } else {
                buttonColor = 'cyan';
                disabled = false;
            }
        } else if (cubes >= bulletType.price) {
            buttonColor = 'lime';
            disabled = false;
        }

        drawButton(bulletButton.x, bulletButton.y, bulletButton.width, bulletButton.height, actionText, buttonColor, disabled);
        bulletButton.active = !disabled;
        if (!shopButtons.bullet) shopButtons.bullet = [];
        shopButtons.bullet.push(bulletButton);

        yOffset += SHOP_ITEM_HEIGHT;
    }

    // Botão Voltar
    backButton.x = 10;
    backButton.y = canvas.height - 50;
    drawButton(backButton.x, backButton.y, backButton.width, backButton.height, 'Voltar', 'red');
    backButton.active = true;
}

// Desenha um botão genérico
function drawButton(x, y, width, height, text, color, disabled = false) {
    ctx.fillStyle = disabled ? 'darkgray' : color;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + width / 2, y + height / 2 + 7);
}

// Desenha a tela de Game Over
function drawGameOver() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'red';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 3);

    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('Pontuação Final: ' + score, canvas.width / 2, canvas.height / 2);
    ctx.fillText('Cubos Ganhos: ' + runStats.cubesEarnedThisRun, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText('Dano Causado: ' + runStats.damageDealtThisRun.toFixed(0), canvas.width / 2, canvas.height / 2 + 80);
    ctx.fillText('Bosses Derrotados: ' + runStats.wavesClearedThisRun, canvas.width / 2, canvas.height / 2 + 120);


    // Botão Voltar para o Menu Principal
    startButton.x = canvas.width / 2 - startButton.width / 2;
    startButton.y = canvas.height - 100;
    drawButton(startButton.x, startButton.y, startButton.width, startButton.height, 'Menu Principal', 'green');
}

// Função principal de desenho
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentScreen === 'mainMenu') {
        drawMainMenu();
    } else if (currentScreen === 'game') {
        ctx.fillStyle = 'darkblue';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        player.draw();

        projectiles.forEach(proj => proj.draw());
        enemyProjectiles.forEach(proj => proj.draw());
        bosses.forEach(boss => boss.draw());
        particles.forEach(p => p.draw());
        damageTexts.forEach(dt => dt.draw());
        powerUps.forEach(pu => pu.draw());

        drawHUD();
        drawMobileControls();

        if (gamePaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSADO', canvas.width / 2, canvas.height / 2);
        }

    } else if (currentScreen === 'shop') {
        drawShop();
    } else if (currentScreen === 'gameOver') {
        drawGameOver();
    }
}

// Função principal de atualização
function update() {
    if (!gameRunning || gamePaused) return;

    player.update();

    // Atualiza e remove projéteis do jogador
    projectiles = projectiles.filter(proj => {
        proj.update();
        // Remove se sair da tela
        return proj.x + proj.radius > 0 && proj.x - proj.radius < canvas.width &&
               proj.y + proj.radius > 0 && proj.y - proj.radius < canvas.height;
    });

    // Atualiza e remove projéteis do inimigo
    enemyProjectiles = enemyProjectiles.filter(proj => {
        // Para EnemyLaser e AreaEffectProjectile, o update pode retornar true para remoção
        const shouldRemove = proj.update();
        return !shouldRemove && proj.x + proj.radius > 0 && proj.x - proj.radius < canvas.width &&
               proj.y + proj.radius > 0 && proj.y - proj.radius < canvas.height;
    });

    // Atualiza e remove partículas
    particles = particles.filter(p => {
        p.update();
        return p.life > 0;
    });

    // Atualiza e remove textos de dano
    damageTexts = damageTexts.filter(dt => {
        dt.update();
        return dt.life > 0;
    });

    // Atualiza e remove power-ups
    powerUps = powerUps.filter(pu => {
        pu.update();
        return pu.life > 0;
    });

    // Colisão jogador-boss
    for (const boss of bosses) {
        const dist = Math.sqrt(Math.pow(player.x - boss.x, 2) + Math.pow(player.y - boss.y, 2));
        if (dist < player.radius + boss.radius) {
            // Empurra o jogador para fora do boss
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            player.x = boss.x + Math.cos(angle) * (player.radius + boss.radius);
            player.y = boss.y + Math.sin(angle) * (player.radius + boss.radius);

            // Causa dano por contato
            player.health -= boss.damage / 20; // Dano contínuo por estar em contato
            damageTexts.push(new DamageText(player.x, player.y - 30, Math.round(boss.damage / 20), false, 'red'));
        }
    }

    // Colisão projétil-inimigo
    projectiles.forEach(proj => {
        bosses.forEach(boss => {
            let hitWeakPoint = false;
            for (const wp of boss.weakPoints) {
                if (wp.active) {
                    const wpX = boss.x + wp.x;
                    const wpY = boss.y + wp.y;
                    const dist = Math.sqrt(Math.pow(proj.x - wpX, 2) + Math.pow(proj.y - wpY, 2));
                    if (dist < proj.radius + wp.radius) {
                        let damage = proj.damage * 3; // Dano extra em pontos fracos
                        const isCritical = Math.random() < CRITICAL_CHANCE;
                        if (isCritical) damage *= CRITICAL_MULTIPLIER;

                        wp.health -= damage;
                        boss.damageTakenThisPhase += damage; // Adiciona ao dano total do boss
                        runStats.damageDealtThisRun += damage; // Adiciona ao dano total da run
                        damageTexts.push(new DamageText(wpX, wpY - 10, Math.round(damage), isCritical, 'yellow'));
                        if (wp.health <= 0) {
                            wp.active = false;
                            boss.weakPointHitCounter++;
                            score += 100; // Pontos por destruir ponto fraco
                            if (particlesEnabled) {
                                for (let i = 0; i < 20; i++) {
                                    particles.push(new Particle(wpX, wpY, 'gold', 3, 2, 40));
                                }
                            }
                        }
                        if (!proj.isPiercing) {
                            proj.life = 0; // Remove o projétil se não for penetrante
                        }
                        hitWeakPoint = true;
                        break;
                    }
                }
            }

            if (!hitWeakPoint) {
                const dist = Math.sqrt(Math.pow(proj.x - boss.x, 2) + Math.pow(proj.y - boss.y, 2));
                if (dist < proj.radius + boss.hitboxRadius) {
                    let damage = proj.damage;
                    const isCritical = Math.random() < CRITICAL_CHANCE;
                    if (isCritical) damage *= CRITICAL_MULTIPLIER;

                    // O boss recebe dano apenas se o escudo não estiver ativo
                    if (!(boss.type === BOSS_TYPES.SHIELD && boss.shieldActive)) {
                        boss.health -= damage;
                        boss.damageTakenThisPhase += damage; // Adiciona ao dano total do boss
                        runStats.damageDealtThisRun += damage; // Adiciona ao dano total da run
                        damageTexts.push(new DamageText(boss.x, boss.y - boss.radius - 20, Math.round(damage), isCritical));
                        score += Math.round(damage / 5);
                    } else {
                        damageTexts.push(new DamageText(boss.x, boss.y - boss.radius - 20, 'Escudo!', false, 'lightblue'));
                    }

                    if (proj.isExplosive) {
                        // Causa dano em área em outros inimigos (se houver, no futuro) ou apenas efeito visual
                        if (particlesEnabled) {
                            for (let i = 0; i < 10; i++) {
                                particles.push(new Particle(proj.x, proj.y, 'red', 4, 1.5, 30));
                            }
                        }
                    }

                    if (!proj.isPiercing) {
                        proj.life = 0; // Remove o projétil se não for penetrante
                    }

                    // Aplica status effect
                    if (proj.statusEffect && !(boss.type === BOSS_TYPES.SHIELD && boss.shieldActive)) {
                        boss.addStatusEffect(proj.statusEffect, proj.statusDuration);
                    }
                }
            }
        });
    });

    // Colisão projétil inimigo-jogador
    enemyProjectiles.forEach(eProj => {
        const dist = Math.sqrt(Math.pow(eProj.x - player.x, 2) + Math.pow(eProj.y - player.y, 2));
        if (dist < eProj.radius + player.radius) {
            if (player.statusEffects.has(STATUS_EFFECTS.SHIELD)) {
                // Escudo absorve dano
                damageTexts.push(new DamageText(player.x, player.y - 20, 'Bloqueado!', false, 'gold'));
            } else {
                player.health -= eProj.damage;
                damageTexts.push(new DamageText(player.x, player.y - 20, Math.round(eProj.damage), false, 'red'));
                if (eProj.statusEffect) {
                    player.addStatusEffect(eProj.statusEffect, eProj.statusDuration);
                }
            }
            if (!eProj.isPiercing) {
                 // Remove o projétil se não for penetrante
                // Isso precisa ser feito de forma um pouco diferente, marcando para remoção
                // ou removendo de dentro do loop, o que é arriscado.
                // Uma solução é usar um novo array ou um filtro como feito acima para projéteis do jogador.
                eProj.life = 0; // Assume que EnemyProjectile também tem 'life' para remoção segura
            }
        }
    });
    // Remove projéteis inimigos que atingiram o player (se não forem piercing)
    enemyProjectiles = enemyProjectiles.filter(eProj => eProj.life === undefined || eProj.life > 0);


    // Atualiza bosses e verifica se morreram
    bosses = bosses.filter(boss => {
        boss.update();
        if (boss.health <= 0) {
            score += boss.scoreValue;
            cubes += Math.floor(boss.scoreValue / 100) + (boss.level * 5); // Cubos por chefe derrotado
            runStats.cubesEarnedThisRun += Math.floor(boss.scoreValue / 100) + (boss.level * 5);
            bossLevel++;
            spawnBoss(); // Spawna o próximo chefe
            // Redireciona o player para longe do novo boss (sempre no spawnBoss)
            return false; // Remove o boss morto
        }
        return true;
    });

    // Verifica Game Over
    if (player.health <= 0) {
        gameRunning = false;
        gameStarted = false;
        currentScreen = 'gameOver';
    }
}

// Loop principal do jogo
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// =================================================================================================
// --- Controles e Eventos ---
// =================================================================================================
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    space: false,
    p: false
};

// Objeto para armazenar botões da loja para detecção de clique
const shopButtons = {
    permanent: [],
    bullet: []
};

function handleKeyDown(e) {
    if (e.key in keys) {
        keys[e.key] = true;
    }
    if (e.key === ' ' && currentScreen === 'game' && !gamePaused) {
        player.shoot();
    }
    if (e.key === 'p') {
        gamePaused = !gamePaused;
    }
}

function handleKeyUp(e) {
    if (e.key in keys) {
        keys[e.key] = false;
    }
}

function handleMouseMove(e) {
    if (currentScreen === 'game' && gameRunning && !gamePaused && !joystickActive) {
        // Player moves towards mouse in desktop
        // player.x = e.clientX - canvas.getBoundingClientRect().left;
        // player.y = e.clientY - canvas.getBoundingClientRect().top;
    }
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (currentScreen === 'mainMenu') {
        if (isButtonClicked(mouseX, mouseY, startButton)) {
            resetGame();
        } else if (isButtonClicked(mouseX, mouseY, menuShopButton)) {
            currentScreen = 'shop';
        } else if (isButtonClicked(mouseX, mouseY, particlesButton)) {
            particlesEnabled = !particlesEnabled;
        }
    } else if (currentScreen === 'shop') {
        if (isButtonClicked(mouseX, mouseY, backButton)) {
            currentScreen = 'mainMenu';
        } else {
            // Check permanent upgrade buttons
            for (const btn of shopButtons.permanent) {
                if (isButtonClicked(mouseX, mouseY, btn) && btn.active) {
                    const upgrade = permanentUpgrades[btn.key];
                    const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.level));
                    if (cubes >= cost && upgrade.level < upgrade.maxLevel) {
                        cubes -= cost;
                        upgrade.level++;
                        // Recalcula atributos do player para aplicar o upgrade imediatamente
                        player.maxHealth = PLAYER_MAX_HEALTH_BASE + (permanentUpgrades.health.level * 20);
                        player.health = Math.min(player.health, player.maxHealth); // Garante que a vida não exceda o novo máximo
                        player.baseDamage = 10 + (permanentUpgrades.damage.level * 3);
                        player.speed = PLAYER_SPEED_BASE + (permanentUpgrades.speed.level * 0.5);
                        player.fireRate = Math.max(5, PLAYER_FIRE_RATE_BASE - (permanentUpgrades.fireRate.level * 2));
                        player.specialCooldownMax = Math.max(600, 1200 - (permanentUpgrades.specialCooldown.level * 120));
                    }
                }
            }
            // Check bullet type buttons
            for (const btn of shopButtons.bullet) {
                if (isButtonClicked(mouseX, mouseY, btn) && btn.active) {
                    const bulletType = BULLET_TYPES[btn.key];
                    if (!bulletType.unlocked && cubes >= bulletType.price) {
                        cubes -= bulletType.price;
                        bulletType.unlocked = true;
                        playerBulletConfig.unlockedTypes[btn.key].unlocked = true; // Atualiza o objeto real
                        playerBulletConfig.currentType = btn.key; // Seleciona automaticamente ao comprar
                    } else if (bulletType.unlocked && playerBulletConfig.currentType !== btn.key) {
                        playerBulletConfig.currentType = btn.key;
                    }
                }
            }
        }
    } else if (currentScreen === 'gameOver') {
        if (isButtonClicked(mouseX, mouseY, startButton)) {
            currentScreen = 'mainMenu';
        }
    } else if (currentScreen === 'game' && !gamePaused) {
        if (isTouchDevice()) {
            // Mobile controls interaction
            if (e.target === specialButton) { // Assuming specialButton is a DOM element
                 player.activateSpecial();
            } else if (isButtonClicked(mouseX, mouseY, specialButton)) {
                player.activateSpecial();
            } else if (isButtonClicked(mouseX, mouseY, bulletSelectorButton)) {
                // Implement bullet selection logic
                let types = Object.keys(playerBulletConfig.unlockedTypes).filter(type => playerBulletConfig.unlockedTypes[type].unlocked);
                let currentIndex = types.indexOf(playerBulletConfig.currentType);
                let nextIndex = (currentIndex + 1) % types.length;
                playerBulletConfig.currentType = types[nextIndex];
            } else if (isButtonClicked(mouseX, mouseY, baseFireToggle)) {
                baseFireToggle.active = !baseFireToggle.active;
            } else {
                joystickActive = true;
                joystickCenter = { x: mouseX, y: mouseY };
                joystickKnob = { x: mouseX, y: mouseY };
                isMoving = true;
            }
        } else {
            // Desktop click to shoot
            player.shoot();
        }
    }
}

function handleMouseUp(e) {
    joystickActive = false;
    isMoving = false;
}

function handleTouchStart(e) {
    e.preventDefault(); // Prevents scrolling and zooming
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    if (currentScreen === 'mainMenu') {
        if (isButtonClicked(touchX, touchY, startButton)) {
            resetGame();
        } else if (isButtonClicked(touchX, touchY, menuShopButton)) {
            currentScreen = 'shop';
        } else if (isButtonClicked(touchX, touchY, particlesButton)) {
            particlesEnabled = !particlesEnabled;
        }
    } else if (currentScreen === 'shop') {
        if (isButtonClicked(touchX, touchY, backButton)) {
            currentScreen = 'mainMenu';
        } else {
            // Check permanent upgrade buttons
            for (const btn of shopButtons.permanent) {
                if (isButtonClicked(touchX, touchY, btn) && btn.active) {
                    const upgrade = permanentUpgrades[btn.key];
                    const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.level));
                    if (cubes >= cost && upgrade.level < upgrade.maxLevel) {
                        cubes -= cost;
                        upgrade.level++;
                        player.maxHealth = PLAYER_MAX_HEALTH_BASE + (permanentUpgrades.health.level * 20);
                        player.health = Math.min(player.health, player.maxHealth);
                        player.baseDamage = 10 + (permanentUpgrades.damage.level * 3);
                        player.speed = PLAYER_SPEED_BASE + (permanentUpgrades.speed.level * 0.5);
                        player.fireRate = Math.max(5, PLAYER_FIRE_RATE_BASE - (permanentUpgrades.fireRate.level * 2));
                        player.specialCooldownMax = Math.max(600, 1200 - (permanentUpgrades.specialCooldown.level * 120));
                    }
                }
            }
            // Check bullet type buttons
            for (const btn of shopButtons.bullet) {
                if (isButtonClicked(touchX, touchY, btn) && btn.active) {
                    const bulletType = BULLET_TYPES[btn.key];
                    if (!bulletType.unlocked && cubes >= bulletType.price) {
                        cubes -= bulletType.price;
                        bulletType.unlocked = true;
                        playerBulletConfig.unlockedTypes[btn.key].unlocked = true;
                        playerBulletConfig.currentType = btn.key;
                    } else if (bulletType.unlocked && playerBulletConfig.currentType !== btn.key) {
                        playerBulletConfig.currentType = btn.key;
                    }
                }
            }
        }
    } else if (currentScreen === 'gameOver') {
        if (isButtonClicked(touchX, touchY, startButton)) {
            currentScreen = 'mainMenu';
        }
    } else if (currentScreen === 'game' && !gamePaused) {
        // Check for special button
        if (isButtonClicked(touchX, touchY, specialButton)) {
            player.activateSpecial();
        } else if (isButtonClicked(touchX, touchY, bulletSelectorButton)) {
            let types = Object.keys(playerBulletConfig.unlockedTypes).filter(type => playerBulletConfig.unlockedTypes[type].unlocked);
            let currentIndex = types.indexOf(playerBulletConfig.currentType);
            let nextIndex = (currentIndex + 1) % types.length;
            playerBulletConfig.currentType = types[nextIndex];
        } else if (isButtonClicked(touchX, touchY, baseFireToggle)) {
            baseFireToggle.active = !baseFireToggle.active;
        } else {
            // Activate joystick
            joystickActive = true;
            joystickCenter = { x: touchX, y: touchY };
            joystickKnob = { x: touchX, y: touchY };
            isMoving = true;
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    if (joystickActive && currentScreen === 'game' && !gamePaused) {
        let dx = touchX - joystickCenter.x;
        let dy = touchY - joystickCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > JOYSTICK_RADIUS) {
            dx = (dx / distance) * JOYSTICK_RADIUS;
            dy = (dy / distance) * JOYSTICK_RADIUS;
        }

        joystickKnob.x = joystickCenter.x + dx;
        joystickKnob.y = joystickCenter.y + dy;

        player.x += dx * 0.05 * player.speed;
        player.y += dy * 0.05 * player.speed;
    } else if (currentScreen === 'shop' && e.touches.length === 1) {
        // Shop scroll
        const scrollDelta = touchY - touchStartY;
        shopScroll += scrollDelta;
        // Limitar scroll (precisa calcular o conteúdo total)
        const totalContentHeight = Object.keys(permanentUpgrades).length * SHOP_ITEM_HEIGHT + Object.keys(BULLET_TYPES).length * SHOP_ITEM_HEIGHT + 150; // Aprox.
        shopScroll = Math.max(Math.min(0, shopScroll), canvas.height - totalContentHeight - 100);

        touchStartY = touchY; // Atualiza para o próximo cálculo
    }
}

function handleTouchEnd(e) {
    joystickActive = false;
    isMoving = false;
}

function isButtonClicked(mouseX, mouseY, button) {
    return mouseX > button.x && mouseX < button.x + button.width &&
           mouseY > button.y && mouseY < button.y + button.height;
}

function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
}

// Draw mobile controls
function drawMobileControls() {
    if (!isTouchDevice() || currentScreen !== 'game') return;

    // Joystick background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(joystickCenter.x, joystickCenter.y, JOYSTICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Joystick knob
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(joystickKnob.x, joystickKnob.y, JOYSTICK_KNOB_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Special button
    specialButton.x = canvas.width - specialButton.width - 20;
    specialButton.y = canvas.height - specialButton.height - 20;
    drawButton(specialButton.x, specialButton.y, specialButton.width, specialButton.height, 'Especial', player.specialCooldown === 0 && !player.specialActive ? 'gold' : 'gray', player.specialCooldown !== 0 || player.specialActive);

    // Bullet Selector Button
    bulletSelectorButton.x = canvas.width - bulletSelectorButton.width - 20;
    bulletSelectorButton.y = canvas.height - specialButton.height - bulletSelectorButton.height - 40;
    drawButton(bulletSelectorButton.x, bulletSelectorButton.y, bulletSelectorButton.width, bulletSelectorButton.height, BULLET_TYPES[playerBulletConfig.currentType].name, 'darkcyan');

    // Base Fire Toggle Button
    baseFireToggle.width = 80;
    baseFireToggle.height = 40;
    baseFireToggle.x = canvas.width - baseFireToggle.width - 20;
    baseFireToggle.y = canvas.height - specialButton.height - bulletSelectorButton.height - baseFireToggle.height - 60;
    drawButton(baseFireToggle.x, baseFireToggle.y, baseFireToggle.width, baseFireToggle.height, `Auto: ${baseFireToggle.active ? 'ON' : 'OFF'}`, baseFireToggle.active ? 'green' : 'red');
}

// Initial setup
function init() {
    canvas.width = FIXED_CANVAS_WIDTH;
    canvas.height = FIXED_CANVAS_HEIGHT;

    // Adiciona event listeners para controles
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Mobile touch controls
    if (isTouchDevice()) {
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        // Set initial joystick position for mobile
        joystickCenter = { x: 100, y: canvas.height - 100 };
        joystickKnob = { x: 100, y: canvas.height - 100 };
    }

    player = new Player(); // Initialize player for menu screen for accurate stats display
    gameLoop();
}

init();