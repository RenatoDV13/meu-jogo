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
let currentScreen = 'tutorial'; // 'tutorial', 'mainMenu', 'game', 'shop', 'gameOver'
let particlesEnabled = true;
let hasSeenTutorial = false;

let score = 0;
let cubes = 0;
let bossLevel = 0;
let player = {};
let projectiles = [];
let bosses = [];
let enemyProjectiles = [];
let cardsAvailable = false;
let gamePaused = false;

// Save/Load system
function saveGame() {
    const saveData = {
        cubes: cubes,
        permanentUpgrades: permanentUpgrades,
        unlockedBulletTypes: {},
        hasSeenTutorial: hasSeenTutorial
    };

    // Save unlocked bullet types
    for (const key in BULLET_TYPES) {
        saveData.unlockedBulletTypes[key] = BULLET_TYPES[key].unlocked;
    }

    localStorage.setItem('bossRushSave', JSON.stringify(saveData));
}

function loadGame() {
    const saveData = localStorage.getItem('bossRushSave');
    if (saveData) {
        const data = JSON.parse(saveData);
        cubes = data.cubes || 0;
        hasSeenTutorial = data.hasSeenTutorial || false;

        if (data.permanentUpgrades) {
            for (const key in data.permanentUpgrades) {
                if (permanentUpgrades[key]) {
                    permanentUpgrades[key].level = data.permanentUpgrades[key].level || 0;
                }
            }
        }

        if (data.unlockedBulletTypes) {
            for (const key in data.unlockedBulletTypes) {
                if (BULLET_TYPES[key]) {
                    BULLET_TYPES[key].unlocked = data.unlockedBulletTypes[key];
                }
            }
        }
    }
    
    // Set initial screen based on tutorial status
    if (hasSeenTutorial) {
        currentScreen = 'mainMenu';
    } else {
        currentScreen = 'tutorial';
    }
}

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

let damageBasedCubes = {
    damageDealt: 0,
    cubesAwarded: 0
}

// Constantes de Jogo
const PLAYER_SPEED_BASE = 5;
const PLAYER_FIRE_RATE_BASE = 15;
const ENEMY_BULLET_SPEED = 4;
const PLAYER_BULLET_SPEED_BASE = 8;
let PLAYER_MAX_HEALTH_BASE = 100;

const CUBE_DROP_CHANCE = 1;
const CRITICAL_CHANCE = 0.15;
const CRITICAL_MULTIPLIER = 2;

// Controles PC
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    space: false,
    p: false,
    e: false,
    E: false
};

// Controles Móveis
let isMobile = false;
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isMoving = false;
let joystickActive = false;
let joystickCenter = { x: 120, y: 480 }; // Posição inicial do joystick
let joystickKnob = { x: 120, y: 480 };
const JOYSTICK_RADIUS = 60;
const JOYSTICK_KNOB_RADIUS = 25;
const AUTO_FIRE_DELAY = 10;
let autoFireCounter = 0;
let currentOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

// Sistema de scroll da loja
let shopScroll = 0;
const SHOP_SCROLL_SPEED = 30;
const SHOP_ITEM_HEIGHT = 120;
let shopScrollBarDragging = false;
let shopScrollBarY = 0;
const SHOP_SCROLLBAR_WIDTH = 15;
let shopContentHeight = 0;
let shopVisibleHeight = 0;

// Botões móveis com áreas de toque maiores
let mobileButtons = {
    special: { x: 650, y: 420, width: 130, height: 100, active: false }
};

// Botão de voltar no HUD do jogo
let hudBackButton = { x: 0, y: 0, width: 80, height: 40, active: true };

// Função para ajustar controles móveis baseado na orientação
function adjustMobileControls() {
    const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    if (newOrientation !== currentOrientation) {
        currentOrientation = newOrientation;
        
        if (currentOrientation === 'portrait') {
            // Portrait - botões na parte inferior
            joystickCenter = { x: 120, y: canvas.height - 120 };
            mobileButtons.special = { x: canvas.width - 150, y: canvas.height - 150, width: 130, height: 100, active: false };
        } else {
            // Landscape - botões na lateral direita
            joystickCenter = { x: 120, y: canvas.height - 120 };
            mobileButtons.special = { x: canvas.width - 150, y: canvas.height / 2, width: 130, height: 100, active: false };
        }
        
        joystickKnob.x = joystickCenter.x;
        joystickKnob.y = joystickCenter.y;
    }
}

// Menu buttons
let menuButtons = {
    start: { x: 0, y: 0, width: 250, height: 70 },
    shop: { x: 0, y: 0, width: 250, height: 70 },
    particles: { x: 0, y: 0, width: 250, height: 70 }
};

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

// Objeto para armazenar botões da loja para detecção de clique
const shopButtons = {
    permanent: [],
    bullet: [],
    back: { x: 20, y: 520, width: 140, height: 60 }
};

// =================================================================================================
// --- Sistema de Upgrades Permanentes ---
// =================================================================================================
const permanentUpgrades = {
    health: { level: 0, maxLevel: 15, cost: 12, costMultiplier: 1.3 },
    damage: { level: 0, maxLevel: 12, cost: 18, costMultiplier: 1.35 },
    speed: { level: 0, maxLevel: 8, cost: 22, costMultiplier: 1.5 },
    fireRate: { level: 0, maxLevel: 10, cost: 25, costMultiplier: 1.45 },
    specialCooldown: { level: 0, maxLevel: 8, cost: 35, costMultiplier: 1.6 }
};

// =================================================================================================
// --- Objeto Jogador (Player) ---
// =================================================================================================
function Player() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.radius = 20;
    this.health = PLAYER_MAX_HEALTH_BASE + (permanentUpgrades.health.level * 15);
    this.maxHealth = this.health;
    this.fireCooldown = 0;
    this.baseDamage = 8 + (permanentUpgrades.damage.level * 2.5);
    this.speed = PLAYER_SPEED_BASE + (permanentUpgrades.speed.level * 0.4);
    this.fireRate = Math.max(6, PLAYER_FIRE_RATE_BASE - (permanentUpgrades.fireRate.level * 1.5));
    this.color = 'cyan';
    this.statusEffects = new Map();
    this.damageDealt = 0;

    // Propriedades do Especial
    this.specialCooldownMax = Math.max(480, 1200 - (permanentUpgrades.specialCooldown.level * 90));
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
        // Controles PC
        if (!isMobile) {
            if (keys.w || keys.ArrowUp) this.y -= this.speed;
            if (keys.s || keys.ArrowDown) this.y += this.speed;
            if (keys.a || keys.ArrowLeft) this.x -= this.speed;
            if (keys.d || keys.ArrowRight) this.x += this.speed;
        }

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
                        data.tickCounter = 30;
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
                        break;
                    case 'cluster':
                        isExplosive = true;
                        break;
                    case 'energy':
                        isExplosive = true;
                        bulletDamage *= 1.2;
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
                    for (let i = 0; i < 1; i++) {
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
        damage: 0.8,
        speed: 1,
        radius: 5,
        special: "Sem efeito especial",
        unlocked: true
    },
    explosive: {
        name: "Explosiva",
        description: "Explode causando dano em área",
        price: 30,
        color: 'orange',
        damage: 1.3,
        speed: 0.8,
        radius: 7,
        special: "Explosão com dano em área",
        unlocked: false
    },
    piercing: {
        name: "Penetrante",
        description: "Atravessa múltiplos inimigos",
        price: 45,
        color: 'purple',
        damage: 1.1,
        speed: 1.2,
        radius: 5,
        special: "Atravessa inimigos",
        unlocked: false
    },
    rapid: {
        name: "Rápida",
        description: "Dispara múltiplas balas em rajada",
        price: 60,
        color: 'yellow',
        damage: 0.5,
        speed: 1.5,
        radius: 3,
        special: "Disparo triplo",
        unlocked: false
    },
    homing: {
        name: "Teleguiada",
        description: "Persegue inimigos automaticamente",
        price: 90,
        color: 'cyan',
        damage: 0.9,
        speed: 0.9,
        radius: 6,
        special: "Persegue inimigos",
        unlocked: false
    },
    freeze: {
        name: "Congelante",
        description: "Reduz velocidade dos inimigos",
        price: 75,
        color: 'lightblue',
        damage: 0.6,
        speed: 1,
        radius: 5,
        special: "Aplica efeito de lentidão",
        unlocked: false
    },
    poison: {
        name: "Venenosa",
        description: "Causa dano contínuo por tempo",
        price: 70,
        color: 'green',
        damage: 0.4,
        speed: 1,
        radius: 5,
        special: "Dano venenoso contínuo",
        unlocked: false
    },
    laser: {
        name: "Laser",
        description: "Raio de alta velocidade",
        price: 120,
        color: 'red',
        damage: 1.8,
        speed: 2,
        radius: 3,
        special: "Raio laser de alta velocidade",
        unlocked: false
    },
    cluster: {
        name: "Fragmentação",
        description: "Explode em múltiplas balas menores",
        price: 100,
        color: 'white',
        damage: 0.7,
        speed: 0.7,
        radius: 8,
        special: "Fragmenta em várias balas",
        unlocked: false
    },
    energy: {
        name: "Energia Pura",
        description: "Causa dano massivo em área",
        price: 180,
        color: 'gold',
        damage: 2.2,
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
    this.life = 270; // 4.5 seconds at 60fps
    this.maxLife = 270;

    this.draw = function() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    };

    this.update = function() {
        // Decrease lifetime
        this.life--;
        
        // Remove bullet if lifetime expired
        if (this.life <= 0) {
            return false;
        }

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
        if (particlesEnabled && Math.random() < 0.3) {
            particles.push(new Particle(this.x, this.y, this.color, 2, 0.3, 15));
        }
        
        return true;
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
    this.life = 270; // 4.5 seconds at 60fps
    this.maxLife = 270;
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

        if (particlesEnabled && Math.random() < 0.5) {
            particles.push(new Particle(this.x, this.y, this.color, 3, 1, 30));
        }

        if (this.life <= 0 || this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.explode();
            return true;
        }

        return false;
    };

    this.explode = function() {
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const miniProjectile = new Projectile(this.x, this.y, angle, 4, 12, 'orange', true, false, 5, 60, 1.5, 0);
            miniProjectile.life = 180; // 3 seconds for mini bullets
            projectiles.push(miniProjectile);
        }

        if (particlesEnabled) {
            for (let i = 0; i < 15; i++) {
                particles.push(new Particle(this.x, this.y, 'gold', 3, 2, 40));
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
    this.type = level % Object.keys(BOSS_TYPES).length;
    this.level = level;
    this.radius = 50 + (level * 1.5);
    this.hitboxRadius = this.radius * 0.75; // Reduced from 0.85 for better hitbox
    this.damageTakenThisPhase = 0;

    this.setupBossType = function() {
        switch (this.type) {
            case BOSS_TYPES.BRUTE:
                this.name = "Brute";
                this.color = 'darkred';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 20;
                this.damageScaling = 7;
                this.speed = 0.5;
                this.fireRate = 85; // Increased from 75
                this.baseAttackFrequency = 200; // Increased from 180
                this.specialAttackCooldown = 300;
                this.specialAttackTimer = 0;
                break;
            case BOSS_TYPES.SNIPER:
                this.name = "Sniper";
                this.color = 'darkgreen';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 40;
                this.damageScaling = 12;
                this.speed = 0.9;
                this.fireRate = 130; // Increased from 110
                this.baseAttackFrequency = 110; // Increased from 90
                break;
            case BOSS_TYPES.SWARM:
                this.name = "Swarm";
                this.color = 'darkorange';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 15;
                this.damageScaling = 5;
                this.speed = 1.5;
                this.fireRate = 40; // Increased from 30
                this.baseAttackFrequency = 120; // Increased from 100
                break;
            case BOSS_TYPES.TELEPORTER:
                this.name = "Teleporter";
                this.color = 'purple';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 28;
                this.damageScaling = 10;
                this.speed = 0.7;
                this.fireRate = 70; // Increased from 60
                this.baseAttackFrequency = 160; // Increased from 140
                this.teleportCooldown = 0;
                break;
            case BOSS_TYPES.SHIELD:
                this.name = "Shield";
                this.color = 'lightblue';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 20;
                this.damageScaling = 6;
                this.speed = 0.5;
                this.fireRate = 80; // Increased from 70
                this.baseAttackFrequency = 200; // Increased from 180
                this.shieldActive = false;
                this.shieldCooldown = 0;
                this.shieldDuration = 180;
                this.shieldRechargeTime = 300;
                break;
            case BOSS_TYPES.BERSERKER:
                this.name = "Berserker";
                this.color = 'darkmagenta';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 35;
                this.damageScaling = 16;
                this.speed = 0.8;
                this.fireRate = 60; // Increased from 50
                this.baseAttackFrequency = 100; // Increased from 90
                break;
            case BOSS_TYPES.FROST:
                this.name = "Frost";
                this.color = 'lightcyan';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 22;
                this.damageScaling = 7;
                this.speed = 0.9;
                this.fireRate = 95; // Increased from 85
                this.baseAttackFrequency = 170; // Increased from 150
                break;
            case BOSS_TYPES.SHADOW:
                this.name = "Shadow";
                this.color = 'gray';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 28;
                this.damageScaling = 9;
                this.speed = 1.2;
                this.fireRate = 55; // Increased from 45
                this.baseAttackFrequency = 150; // Increased from 130
                this.invisibilityCooldown = 0;
                this.invisibilityDuration = 120;
                this.isInvisible = false;
                break;
            case BOSS_TYPES.LASER:
                this.name = "Laser";
                this.color = 'yellow';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 45;
                this.damageScaling = 20;
                this.speed = 0.4;
                this.fireRate = 190; // Increased from 170
                this.baseAttackFrequency = 250; // Increased from 220
                this.chargingLaser = false;
                this.laserChargeTime = 0;
                this.maxLaserChargeTime = 120;
                break;
            case BOSS_TYPES.ULTIMATE:
                this.name = "Ultimate";
                this.color = 'gold';
                this.baseHealth = 755;
                this.healthScaling = 755;
                this.baseDamage = 55;
                this.damageScaling = 25;
                this.speed = 1.0;
                this.fireRate = 50; // Increased from 40
                this.baseAttackFrequency = 90; // Increased from 70
                break;
        }
    };

    this.createWeakPoints = function() {
        const points = [];
        const numPoints = 2 + Math.floor(this.level / 5);

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const distance = this.radius * 0.8;
            points.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                radius: 8,
                health: 3 + Math.floor(this.level / 3),
                maxHealth: 3 + Math.floor(this.level / 3),
                active: true
            });
        }
        return points;
    };

    this.setupBossType();

    this.health = this.baseHealth + (level * this.healthScaling);
    this.maxHealth = this.health;
    this.damage = this.baseDamage + (level * this.damageScaling) + (bossLevel * 5);
    this.scoreValue = 500 + (level * 200);

    this.fireCooldown = 0;
    this.attackPatternCounter = 0;
    this.attackPatternFrequency = this.baseAttackFrequency;
    this.phaseCounter = 0;
    this.isEnraged = false;
    this.statusEffects = new Map();

    this.weakPoints = this.createWeakPoints();
    this.weakPointHitCounter = 0;

    this.draw = function() {
        if (this.type === BOSS_TYPES.SHADOW && this.isInvisible) {
            ctx.globalAlpha = 0.3;
        }

        if (this.type === BOSS_TYPES.SHIELD && this.shieldActive) {
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.isEnraged) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (const wp of this.weakPoints) {
            if (wp.active) {
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(this.x + wp.x, this.y + wp.y, wp.radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x + wp.x, this.y + wp.y, wp.radius + 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.fillStyle = 'gray';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 15, this.radius * 2, 8);
        ctx.fillStyle = 'orange';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 15, (this.radius * 2) * (this.health / this.maxHealth), 8);

        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name + ' Lv.' + (this.level + 1), this.x, this.y - this.radius - 25);

        ctx.globalAlpha = 1;
    };

    this.update = function() {
        if (this.health / this.maxHealth < 0.3 && !this.isEnraged) {
            this.isEnraged = true;
            this.fireRate = Math.floor(this.fireRate * 0.6);
            this.speed *= 1.5;
        }

        this.updateMovement();
        this.updateAttacks();
        this.updateSpecialAbilities();
    };

    this.updateMovement = function() {
        switch (this.type) {
            case BOSS_TYPES.BRUTE:
                this.x += Math.cos(performance.now() / 1000) * this.speed * 3;
                break;
            case BOSS_TYPES.SNIPER:
                if (Math.random() < 0.01) {
                    this.x += (Math.random() - 0.5) * this.speed * 20;
                }
                break;
            case BOSS_TYPES.SWARM:
                this.x += Math.sin(performance.now() / 200) * this.speed * 2;
                this.y += Math.cos(performance.now() / 300) * this.speed;
                break;
            case BOSS_TYPES.TELEPORTER:
                if (this.teleportCooldown <= 0 && Math.random() < 0.005) {
                    this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
                    this.y = Math.random() * (canvas.height * 0.5) + this.radius;
                    this.teleportCooldown = 180;
                    if (particlesEnabled) {
                        for (let i = 0; i < 8; i++) {
                            particles.push(new Particle(this.x, this.y, 'purple', 4, 2, 40));
                        }
                    }
                }
                if (this.teleportCooldown > 0) this.teleportCooldown--;
                break;
            case BOSS_TYPES.SHADOW:
                if (this.invisibilityCooldown <= 0 && !this.isInvisible && Math.random() < 0.007) {
                    this.isInvisible = true;
                    this.invisibilityCooldown = this.invisibilityDuration + 300;
                } else if (this.isInvisible && this.invisibilityCooldown <= 300) {
                    this.isInvisible = false;
                }
                if (this.invisibilityCooldown > 0) this.invisibilityCooldown--;
                this.x += Math.cos(performance.now() / 1000 * 2) * this.speed * 5;
                break;
            case BOSS_TYPES.LASER:
                if (this.chargingLaser) {
                } else {
                    this.x += Math.cos(performance.now() / 1000 * 2) * this.speed * 3;
                }
                break;
            default:
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

        if (this.fireCooldown <= 0 && !this.chargingLaser) {
            const targetX = player.x;
            const targetY = player.y;
            const angleToPlayer = Math.atan2(targetY - this.y, targetX - this.x);

            this.performBasicAttack(angleToPlayer);
            this.fireCooldown = this.fireRate;
        }

        this.attackPatternCounter++;
        if (this.attackPatternCounter >= this.attackPatternFrequency) {
            this.attackPatternCounter = 0;
            this.performSpecialAttack();
        }

        if (this.type === BOSS_TYPES.BRUTE && this.specialAttackTimer > 0) {
            this.specialAttackTimer--;
        }
        if (this.type === BOSS_TYPES.TELEPORTER && this.teleportCooldown > 0) {
            this.teleportCooldown--;
        }
        if (this.type === BOSS_TYPES.SHIELD && this.shieldCooldown > 0) {
            this.shieldCooldown--;
            if (this.shieldActive && this.shieldCooldown <= (this.shieldRechargeTime - this.shieldDuration)) {
                this.shieldActive = false;
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
                this.fireCooldown = this.fireRate;
                this.attackPatternCounter = 0;
            }
        }
    };

    this.performBasicAttack = function(angleToPlayer) {
        switch (this.type) {
            case BOSS_TYPES.SNIPER:
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 2.5, this.damage, 'lime', 8));
                break;
            case BOSS_TYPES.SWARM:
                for (let i = -3; i <= 3; i++) {
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer + i * 0.15, ENEMY_BULLET_SPEED * 1.2, this.damage * 0.5, 'orange', 4));
                }
                break;
            case BOSS_TYPES.BERSERKER:
                for (let i = 0; i < 5; i++) {
                    const spread = (Math.random() - 0.5) * 0.5;
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer + spread, ENEMY_BULLET_SPEED * 1.5, this.damage * 0.7, 'darkmagenta', 5));
                }
                break;
            case BOSS_TYPES.FROST:
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 1.2, this.damage * 0.8, 'lightblue', 7, STATUS_EFFECTS.SLOW, 120));
                break;
            case BOSS_TYPES.SHADOW:
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 1.3, this.damage * 0.7, 'gray', 6, STATUS_EFFECTS.POISON, 180));
                break;
            case BOSS_TYPES.LASER:
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED, this.damage * 0.4, 'red', 3));
                break;
            case BOSS_TYPES.ULTIMATE:
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 1.5, this.damage, 'gold', 7));
                if (Math.random() < 0.3) {
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED, this.damage * 0.8, 'gold', 5, null, 0, true));
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
                if (this.specialAttackTimer <= 0) {
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angle, ENEMY_BULLET_SPEED * 0.8, this.damage * 1.2, 'darkred', 10));
                    }
                    this.specialAttackTimer = this.specialAttackCooldown;
                }
                break;
            case BOSS_TYPES.SNIPER:
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 4, this.damage * 1.5, 'yellow', 4, null, 0, false, true));
                break;
            case BOSS_TYPES.SWARM:
                for (let i = 0; i < 3 + Math.floor(this.level / 2); i++) {
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, Math.random() * Math.PI * 2, ENEMY_BULLET_SPEED * 0.5, this.damage * 0.7, 'lightcoral', 5, null, 0, true));
                }
                break;
            case BOSS_TYPES.TELEPORTER:
                this.x = player.x + (Math.random() - 0.5) * 100;
                this.y = player.y + (Math.random() - 0.5) * 100;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angle, ENEMY_BULLET_SPEED * 1.5, this.damage * 1.1, 'purple', 7));
                }
                break;
            case BOSS_TYPES.SHIELD:
                this.shieldActive = true;
                this.shieldCooldown = this.shieldRechargeTime;
                break;
            case BOSS_TYPES.BERSERKER:
                const dashSpeed = this.speed * 5;
                this.dx = Math.cos(angleToPlayer) * dashSpeed;
                this.dy = Math.sin(angleToPlayer) * dashSpeed;
                setTimeout(() => { this.dx = 0; this.dy = 0; }, 30);
                break;
            case BOSS_TYPES.FROST:
                enemyProjectiles.push(new AreaEffectProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED, this.damage * 1.5, 'blue', 15, STATUS_EFFECTS.SLOW, 240, 100));
                break;
            case BOSS_TYPES.SHADOW:
                this.isInvisible = true;
                this.invisibilityCooldown = this.invisibilityDuration + 300;
                break;
            case BOSS_TYPES.LASER:
                this.chargingLaser = true;
                this.laserChargeTime = this.maxLaserChargeTime;
                break;
            case BOSS_TYPES.ULTIMATE:
                // Brute-like attack for Ultimate boss
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angle, ENEMY_BULLET_SPEED * 0.8, this.damage * 1.2, 'gold', 10));
                }
                enemyProjectiles.push(new EnemyProjectile(this.x, this.y, angleToPlayer, ENEMY_BULLET_SPEED * 0.7, this.damage * 1.5, 'gold', 8, null, 0, true));
                this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
                this.y = Math.random() * (canvas.height * 0.5) + this.radius;
                break;
        }
    };

    this.shootLaser = function(angle) {
        enemyProjectiles.push(new EnemyLaser(this.x, this.y, angle, this.damage * 2, 'red', 5, 500));
    };

    this.updateSpecialAbilities = function() {
        if (this.type === BOSS_TYPES.SHIELD && this.shieldActive && this.shieldCooldown <= (this.shieldRechargeTime - this.shieldDuration)) {
            this.shieldActive = false;
        }
        if (this.type === BOSS_TYPES.SHADOW && this.isInvisible && this.invisibilityCooldown <= 0) {
            this.isInvisible = false;
        }
    };

    this.takeDamage = function(damageAmount) {
        if (this.type === BOSS_TYPES.SHIELD && this.shieldActive) {
            damageAmount *= 0.1;
        }
        this.health -= damageAmount;
        this.damageTakenThisPhase += damageAmount;

        const DAMAGE_THRESHOLD_CUBES = 1500;
        const CUBES_PER_THRESHOLD = 15;

        while (this.damageTakenThisPhase >= DAMAGE_THRESHOLD_CUBES) {
            cubes += CUBES_PER_THRESHOLD;
            this.damageTakenThisPhase -= DAMAGE_THRESHOLD_CUBES;
        }

        if (this.health <= 0) {
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
    this.radius = Math.max(radius * 0.8, 3); // Reduced hitbox radius for enemy projectiles
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

                const turnRate = 0.05;
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

function AreaEffectProjectile(x, y, angle, speed, damage, color, radius, statusEffect, statusDuration, areaRadius) {
    EnemyProjectile.call(this, x, y, angle, speed, damage, color, radius, statusEffect, statusDuration);
    this.areaRadius = areaRadius;
    this.exploded = false;
    this.explosionDuration = 60;
    this.explosionTimer = 0;

    const originalUpdate = this.update;

    this.update = function() {
        if (!this.exploded) {
            originalUpdate.call(this);

            if (this.y > canvas.height * 0.8 || this.x < 0 || this.x > canvas.width || this.y < 0) {
                this.exploded = true;
                this.explosionTimer = this.explosionDuration;
                this.dx = 0;
                this.dy = 0;
            }
        } else {
            this.explosionTimer--;
            if (this.explosionTimer <= 0) {
                return true;
            }

            const dist = Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2));
            if (dist < this.areaRadius + player.radius) {
                if (this.statusEffect && !player.statusEffects.has(this.statusEffect)) {
                    player.addStatusEffect(this.statusEffect, this.statusDuration, { source: 'AreaEffect' });
                }
            }
        }
        return false;
    };

    const originalDraw = this.draw;

    this.draw = function() {
        if (!this.exploded) {
            originalDraw.call(this);
        } else {
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

function EnemyLaser(x, y, angle, damage, color, radius, duration) {
    EnemyProjectile.call(this, x, y, angle, 0, damage, color, radius);
    this.duration = duration;
    this.timer = duration;
    this.length = 0;
    this.maxLength = Math.max(canvas.width, canvas.height) * 1.5;
    this.growSpeed = 30;

    this.draw = function() {
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = (this.timer / this.duration) * 0.8 + 0.2;

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

        const playerLineDist = distToSegment(player.x, player.y, this.x, this.y, this.x + Math.cos(angle) * this.length, this.y + Math.sin(angle) * this.length);
        if (playerLineDist < player.radius + this.radius) {
            player.health -= this.damage / 30;
            damageTexts.push(new DamageText(player.x, player.y - 20, Math.round(this.damage / 30), false, 'red'));
        }

        return this.timer <= 0;
    };
}

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

function DamageText(x, y, damage, isCritical, color = 'white') {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.isCritical = isCritical;
    this.color = color;
    this.life = 60;
    this.speedY = -1;
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
        this.alpha = this.life / 60;
    };
}

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
    damageBasedCubes = {
        damageDealt: 0,
        cubesAwarded: 0
    };
    runStats = {
        wavesClearedThisRun: 0,
        damageDealtThisRun: 0,
        survivalTimeThisRun: 0,
        cubesEarnedThisRun: 0
    };
    gameStarted = true;
    gameRunning = true;
    currentScreen = 'game';

    // Spawn the first boss
    spawnBoss();
}

function spawnBoss() {
    // Clear any existing bosses
    bosses = [];
    // Clear any remaining enemy projectiles
    enemyProjectiles = [];

    // Create new boss
    const newBoss = new Boss(bossLevel);
    bosses.push(newBoss);

    // Reset player position
    player.x = canvas.width / 2;
    player.y = canvas.height * 0.75;

    // Update run stats
    if (bossLevel > 0) { // Don't count the first boss spawn
        runStats.wavesClearedThisRun++;
    }

    console.log(`Boss Level ${bossLevel + 1} spawned: ${newBoss.name}`);
}

function drawHUD() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 30);
    ctx.fillText('Cubos: ' + cubes, 10, 60);
    ctx.fillText('Nível Boss: ' + (bossLevel + 1), 10, 90);

    ctx.fillStyle = 'red';
    ctx.fillRect(canvas.width - 160, 10, 150, 20);
    ctx.fillStyle = 'lime';
    ctx.fillRect(canvas.width - 160, 10, 150 * (player.health / player.maxHealth), 20);
    ctx.fillStyle = 'white';
    ctx.fillText('HP: ' + Math.ceil(player.health), canvas.width - 150, 27);

    ctx.fillStyle = 'gray';
    ctx.fillRect(canvas.width - 160, 40, 150, 15);
    ctx.fillStyle = 'gold';
    const specialFillWidth = (player.specialCooldownMax - player.specialCooldown) / player.specialCooldownMax * 150;
    ctx.fillRect(canvas.width - 160, 40, specialFillWidth, 15);
    ctx.fillStyle = 'white';
    ctx.fillText('Especial', canvas.width - 150, 53);

    // Back button in top-right corner, below special bar
    hudBackButton.x = canvas.width - 90;
    hudBackButton.y = 70;
    drawButton(hudBackButton.x, hudBackButton.y, hudBackButton.width, hudBackButton.height, 'Voltar', 'red');
}

function drawTutorial() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Como Jogar', canvas.width / 2, 80);

    ctx.font = '24px Arial';
    ctx.fillText('CONTROLES', canvas.width / 2, 140);

    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    
    // PC Controls
    ctx.fillStyle = 'lightblue';
    ctx.font = '20px Arial';
    ctx.fillText('PC:', 50, 180);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('• WASD ou Setas: Movimento', 70, 210);
    ctx.fillText('• Mouse: Clique para atirar', 70, 235);
    ctx.fillText('• E: Ativar especial', 70, 260);
    ctx.fillText('• P: Pausar jogo', 70, 285);

    // Mobile Controls
    ctx.fillStyle = 'lightgreen';
    ctx.font = '20px Arial';
    ctx.fillText('Mobile:', 50, 330);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('• Joystick: Movimento', 70, 360);
    ctx.fillText('• Tiro automático', 70, 385);
    ctx.fillText('• Botão Especial: Ativar especial', 70, 410);

    // General info
    ctx.fillStyle = 'yellow';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('OBJETIVO', canvas.width / 2, 460);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('Derrote chefes para ganhar cubos e comprar upgrades!', canvas.width / 2, 490);
    ctx.fillText('Sobreviva o máximo possível!', canvas.width / 2, 515);

    ctx.fillStyle = 'orange';
    ctx.font = '18px Arial';
    ctx.fillText('Clique ou toque em qualquer lugar para continuar', canvas.width / 2, 570);
}

function drawMainMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Boss Rush', canvas.width / 2, canvas.height / 3);

    menuButtons.start.x = canvas.width / 2 - menuButtons.start.width / 2;
    menuButtons.start.y = canvas.height / 2;
    drawButton(menuButtons.start.x, menuButtons.start.y, menuButtons.start.width, menuButtons.start.height, 'Iniciar Jogo', 'green');

    menuButtons.shop.x = canvas.width / 2 - menuButtons.shop.width / 2;
    menuButtons.shop.y = canvas.height / 2 + 90;
    drawButton(menuButtons.shop.x, menuButtons.shop.y, menuButtons.shop.width, menuButtons.shop.height, 'Loja', 'blue');

    menuButtons.particles.x = canvas.width / 2 - menuButtons.particles.width / 2;
    menuButtons.particles.y = canvas.height / 2 + 180;
    drawButton(menuButtons.particles.x, menuButtons.particles.y, menuButtons.particles.width, menuButtons.particles.height, `Partículas: ${particlesEnabled ? 'Ligado' : 'Desligado'}`, 'purple');
}

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

    // Calcular altura total do conteúdo
    shopContentHeight = (Object.keys(permanentUpgrades).length + Object.keys(BULLET_TYPES).length) * SHOP_ITEM_HEIGHT + 200;
    shopVisibleHeight = canvas.height - 120;

    // Limitar scroll
    const maxScroll = Math.max(0, shopContentHeight - shopVisibleHeight);
    shopScroll = Math.max(-maxScroll, Math.min(0, shopScroll));

    // Área de conteúdo com clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(20, 100, canvas.width - 60, shopVisibleHeight);
    ctx.clip();

    // Reset shop buttons
    shopButtons.permanent = [];
    shopButtons.bullet = [];

    // Desenhar upgrades permanentes
    let yOffset = 120 + shopScroll;
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
                currentValue = PLAYER_MAX_HEALTH_BASE + (currentLevel * 15);
                nextValue = PLAYER_MAX_HEALTH_BASE + ((currentLevel + 1) * 15);
                break;
            case 'damage':
                description = `Aumenta o dano base do jogador.`;
                currentValue = player.baseDamage;
                nextValue = player.baseDamage + 2.5;
                break;
            case 'speed':
                description = `Aumenta a velocidade de movimento do jogador.`;
                currentValue = player.speed;
                nextValue = player.speed + 0.4;
                break;
            case 'fireRate':
                description = `Aumenta a velocidade de tiro (menor cooldown).`;
                currentValue = player.fireRate;
                nextValue = Math.max(6, player.fireRate - 1.5);
                break;
            case 'specialCooldown':
                description = `Reduz o tempo de recarga da habilidade especial.`;
                currentValue = player.specialCooldownMax;
                nextValue = Math.max(480, player.specialCooldownMax - 90);
                break;
        }

        const upgradeText = `${upgrade.name || key.charAt(0).toUpperCase() + key.slice(1)} (Lv ${currentLevel}/${maxLevel})`;
        const statsText = `Atual: ${currentValue.toFixed(1)} ${nextValue !== 0 ? `-> Próx: ${nextValue.toFixed(1)}` : ''}`;
        const costText = `Custo: ${cost} Cubos`;

        ctx.fillStyle = 'darkgray';
        ctx.fillRect(40, yOffset, canvas.width - 120, SHOP_ITEM_HEIGHT - 20);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(40, yOffset, canvas.width - 120, SHOP_ITEM_HEIGHT - 20);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.font = '18px Arial';
        ctx.fillText(upgradeText, 50, yOffset + 25);
        ctx.font = '14px Arial';
        ctx.fillText(description, 50, yOffset + 45);
        if (currentLevel < maxLevel) {
            ctx.fillText(statsText, 50, yOffset + 65);
            ctx.fillText(costText, 50, yOffset + 85);

            const buyButton = {
                x: canvas.width - 150, y: yOffset + 30, width: 80, height: 50,
                key: key, type: 'permanentUpgrade'
            };
            drawButton(buyButton.x, buyButton.y, buyButton.width, buyButton.height, 'Comprar', cubes >= cost ? 'lime' : 'gray', cubes < cost);
            buyButton.active = true;
            shopButtons.permanent.push(buyButton);
        } else {
            ctx.fillStyle = 'lightgray';
            ctx.fillText('MAX', canvas.width - 100, yOffset + 65);
        }
        yOffset += SHOP_ITEM_HEIGHT;
    }

    // Desenhar tipos de bala
    yOffset += 30;
    ctx.fillStyle = 'white';
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Tipos de Bala', canvas.width / 2, yOffset);
    yOffset += 30;

    for (const key in BULLET_TYPES) {
        const bulletType = BULLET_TYPES[key];
        if (bulletType.price === 0 && !bulletType.unlocked) {
            bulletType.unlocked = true;
        }

        const bulletText = `${bulletType.name} - Dano: ${bulletType.damage}, Velocidade: ${bulletType.speed}`;
        const statusText = bulletType.unlocked ? 'Desbloqueado' : `Custo: ${bulletType.price} Cubos`;
        const actionText = bulletType.unlocked ? (playerBulletConfig.currentType === key ? 'Selecionado' : 'Selecionar') : 'Comprar';

        ctx.fillStyle = 'darkgray';
        ctx.fillRect(40, yOffset, canvas.width - 120, SHOP_ITEM_HEIGHT - 20);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(40, yOffset, canvas.width - 120, SHOP_ITEM_HEIGHT - 20);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.font = '18px Arial';
        ctx.fillText(bulletText, 50, yOffset + 25);
        ctx.font = '14px Arial';
        ctx.fillText(bulletType.description, 50, yOffset + 45);
        ctx.fillText(statusText, 50, yOffset + 65);

        const bulletButton = {
            x: canvas.width - 150, y: yOffset + 30, width: 80, height: 50,
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
        shopButtons.bullet.push(bulletButton);

        yOffset += SHOP_ITEM_HEIGHT;
    }

    ctx.restore();

    // Desenhar scrollbar
    if (shopContentHeight > shopVisibleHeight) {
        const scrollBarHeight = Math.max(20, (shopVisibleHeight / shopContentHeight) * shopVisibleHeight);
        const scrollBarMaxY = shopVisibleHeight - scrollBarHeight;
        shopScrollBarY = (-shopScroll / (shopContentHeight - shopVisibleHeight)) * scrollBarMaxY;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(canvas.width - 35, 100, SHOP_SCROLLBAR_WIDTH, shopVisibleHeight);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(canvas.width - 35, 100 + shopScrollBarY, SHOP_SCROLLBAR_WIDTH, scrollBarHeight);
    }

    // Botão Voltar - positioned better and larger for mobile
    shopButtons.back.x = 20;
    shopButtons.back.y = canvas.height - 80;
    shopButtons.back.width = 140;
    shopButtons.back.height = 60;

    drawButton(shopButtons.back.x, shopButtons.back.y, shopButtons.back.width, shopButtons.back.height, 'Voltar', 'red');
    shopButtons.back.active = true;
}

function drawButton(x, y, width, height, text, color, disabled = false) {
    ctx.fillStyle = disabled ? 'darkgray' : color;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + width / 2, y + height / 2 + 5);
}

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

    menuButtons.start.x = canvas.width / 2 - menuButtons.start.width / 2;
    menuButtons.start.y = canvas.height - 120;
    drawButton(menuButtons.start.x, menuButtons.start.y, menuButtons.start.width, menuButtons.start.height, 'Menu Principal', 'green');
}

function drawMobileControls() {
    if (!isMobile || currentScreen !== 'game') return;

    // Adjust controls for current orientation
    adjustMobileControls();

    // Joystick background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(joystickCenter.x, joystickCenter.y, JOYSTICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Joystick knob
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(joystickKnob.x, joystickKnob.y, JOYSTICK_KNOB_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Special button - shows proper state
    const specialReady = player.specialCooldown === 0 && !player.specialActive;
    drawButton(mobileButtons.special.x, mobileButtons.special.y, mobileButtons.special.width, mobileButtons.special.height, 
        'Especial', specialReady ? 'gold' : 'gray', !specialReady);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentScreen === 'tutorial') {
        drawTutorial();
    } else if (currentScreen === 'mainMenu') {
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

function update() {
    if (!gameRunning || gamePaused) return;

    player.update();

    projectiles = projectiles.filter(proj => {
        const stillAlive = proj.update();
        if (stillAlive === false || proj.life <= 0) {
            return false;
        }
        return proj.x + proj.radius > 0 && proj.x - proj.radius < canvas.width &&
               proj.y + proj.radius > 0 && proj.y - proj.radius < canvas.height;
    });

    enemyProjectiles = enemyProjectiles.filter(proj => {
        const shouldRemove = proj.update();
        return !shouldRemove && proj.x + proj.radius > 0 && proj.x - proj.radius < canvas.width &&
               proj.y + proj.radius > 0 && proj.y - proj.radius < canvas.height;
    });

    particles = particles.filter(p => {
        p.update();
        return p.life > 0;
    });

    damageTexts = damageTexts.filter(dt => {
        dt.update();
        return dt.life > 0;
    });

    powerUps = powerUps.filter(pu => {
        pu.update();
        return pu.life > 0;
    });

    // Colisão jogador-boss
    for (const boss of bosses) {
        const dist = Math.sqrt(Math.pow(player.x - boss.x, 2) + Math.pow(player.y - boss.y, 2));
        if (dist < player.radius + boss.radius) {
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            player.x = boss.x + Math.cos(angle) * (player.radius + boss.radius);
            player.y = boss.y + Math.sin(angle) * (player.radius + boss.radius);

            player.health -= boss.damage / 20;
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
                        let damage = proj.damage * 3;
                        const isCritical = Math.random() < CRITICAL_CHANCE;
                        if (isCritical) damage *= CRITICAL_MULTIPLIER;

                        boss.health -= damage;
                        boss.damageTakenThisPhase += damage;
                        runStats.damageDealtThisRun += damage;
                        damageBasedCubes.damageDealt += damage;
                        damageTexts.push(new DamageText(wpX, wpY - 10, Math.round(damage), isCritical, 'yellow'));
                        if (wp.health <= 0) {
                            wp.active = false;
                            boss.weakPointHitCounter++;
                            score += 100;
                            if (particlesEnabled) {
                                for (let i = 0; i < 10; i++) {
                                    particles.push(new Particle(wpX, wpY, 'gold', 3, 2, 40));
                                }
                            }
                        }
                        if (!proj.isPiercing) {
                            proj.life = 0;
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

                    if (!(boss.type === BOSS_TYPES.SHIELD && boss.shieldActive)) {
                        boss.health -= damage;
                        boss.damageTakenThisPhase += damage;
                        runStats.damageDealtThisRun += damage;
                        damageBasedCubes.damageDealt += damage;
                        damageTexts.push(new DamageText(boss.x, boss.y - boss.radius - 20, Math.round(damage), isCritical));
                        score += Math.round(damage / 5);
                    } else {
                        damageTexts.push(new DamageText(boss.x, boss.y - boss.radius - 20, 'Escudo!', false, 'lightblue'));
                    }

                    if (proj.isExplosive) {
                        if (particlesEnabled) {
                            for (let i = 0; i < 5; i++) {
                                particles.push(new Particle(proj.x, proj.y, 'red', 4, 1.5, 30));
                            }
                        }
                    }

                    if (!proj.isPiercing) {
                        proj.life = 0;
                    }

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
                damageTexts.push(new DamageText(player.x, player.y - 20, 'Bloqueado!', false, 'gold'));
            } else {
                player.health -= eProj.damage;
                damageTexts.push(new DamageText(player.x, player.y - 20, Math.round(eProj.damage), false, 'red'));
                if (eProj.statusEffect) {
                    player.addStatusEffect(eProj.statusEffect, eProj.statusDuration);
                }
            }
            if (!eProj.isPiercing) {
                eProj.life = 0;
            }
        }
    });
    enemyProjectiles = enemyProjectiles.filter(eProj => eProj.life === undefined || eProj.life > 0);

    bosses = bosses.filter(boss => {
        boss.update();
        if (boss.health <= 0) {
            score += boss.scoreValue;
            cubes += Math.floor(boss.scoreValue / 100) + (boss.level * 5);
            runStats.cubesEarnedThisRun += Math.floor(boss.scoreValue / 100) + (boss.level * 5);
            bossLevel++;
            saveGame();

            // Clear all enemy projectiles when boss is defeated
            enemyProjectiles = [];

            // Award cubes based on damage dealt to boss
            cubes += Math.floor(damageBasedCubes.damageDealt / 500);
            damageBasedCubes.cubesAwarded += Math.floor(damageBasedCubes.damageDealt / 500);

            // Reset damage dealt for next boss
            damageBasedCubes.damageDealt = 0;

            // Spawn next boss after a short delay
            setTimeout(() => {
                spawnBoss();
            }, 500);

            return false;
        }
        return true;
    });

    if (player.health <= 0) {
        gameRunning = false;
        gameStarted = false;
        currentScreen = 'gameOver';

         // Award cubes based on damage dealt to boss even if player dies
         cubes += Math.floor(damageBasedCubes.damageDealt / 500);
         damageBasedCubes.cubesAwarded += Math.floor(damageBasedCubes.damageDealt / 500);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// =================================================================================================
// --- Controles e Eventos ---
// =================================================================================================

function handleKeyDown(e) {
    if (e.key in keys) {
        keys[e.key] = true;
    }
    if (e.key === ' ' && currentScreen === 'game' && !gamePaused) {
        player.shoot();
        e.preventDefault();
    }
    if ((e.key === 'e' || e.key === 'E') && currentScreen === 'game' && !gamePaused) {
        player.activateSpecial();
        e.preventDefault();
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

function handleClick(x, y) {
    if (currentScreen === 'tutorial') {
        hasSeenTutorial = true;
        currentScreen = 'mainMenu';
        saveGame();
    } else if (currentScreen === 'mainMenu') {
        if (isButtonClicked(x, y, menuButtons.start)) {
            resetGame();
        } else if (isButtonClicked(x, y, menuButtons.shop)) {
            currentScreen = 'shop';
            shopScroll = 0;
        } else if (isButtonClicked(x, y, menuButtons.particles)) {
            particlesEnabled = !particlesEnabled;
        }
    } else if (currentScreen === 'shop') {
        // Check back button first with larger hit area for mobile
        const backButtonExtended = {
            x: shopButtons.back.x - 10,
            y: shopButtons.back.y - 10,
            width: shopButtons.back.width + 20,
            height: shopButtons.back.height + 20
        };
        if (isButtonClicked(x, y, backButtonExtended)) {
            currentScreen = 'mainMenu';
            return;
        } else {
            for (const btn of shopButtons.permanent) {
                if (isButtonClicked(x, y, btn) && btn.active) {
                    const upgrade = permanentUpgrades[btn.key];
                    const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.level));
                    if (cubes >= cost && upgrade.level < upgrade.maxLevel) {
                        cubes -= cost;
                        upgrade.level++;
                        player.maxHealth = PLAYER_MAX_HEALTH_BASE + (permanentUpgrades.health.level * 15);
                        player.health = Math.min(player.health, player.maxHealth);
                        player.baseDamage = 8 + (permanentUpgrades.damage.level * 2.5);
                        player.speed = PLAYER_SPEED_BASE + (permanentUpgrades.speed.level * 0.4);
                        player.fireRate = Math.max(6, PLAYER_FIRE_RATE_BASE - (permanentUpgrades.fireRate.level * 1.5));
                        player.specialCooldownMax = Math.max(480, 1200 - (permanentUpgrades.specialCooldown.level * 90));
                        saveGame();
                    }
                }
            }
            for (const btn of shopButtons.bullet) {
                if (isButtonClicked(x, y, btn) && btn.active) {
                    const bulletType = BULLET_TYPES[btn.key];
                    if (!bulletType.unlocked && cubes >= bulletType.price) {
                        cubes -= bulletType.price;
                        bulletType.unlocked = true;
                        playerBulletConfig.currentType = btn.key;
                        saveGame();
                    } else if (bulletType.unlocked && playerBulletConfig.currentType !== btn.key) {
                        playerBulletConfig.currentType = btn.key;
                    }
                }
            }
        }
    } else if (currentScreen === 'gameOver') {
        if (isButtonClicked(x, y, menuButtons.start)) {
            currentScreen = 'mainMenu';
        }
    } else if (currentScreen === 'game' && !gamePaused) {
        // Check back button first
        if (isButtonClicked(x, y, hudBackButton)) {
            currentScreen = 'mainMenu';
            return;
        }
        
        if (isMobile) {
            // Ensure mobile controls are positioned correctly
            adjustMobileControls();
            
            // Extended touch areas for better mobile experience
            const specialButtonExtended = {
                x: mobileButtons.special.x - 30,
                y: mobileButtons.special.y - 30,
                width: mobileButtons.special.width + 60,
                height: mobileButtons.special.height + 60
            };
            
            if (isButtonClicked(x, y, specialButtonExtended) && player.specialCooldown === 0 && !player.specialActive) {
                player.activateSpecial();
            }
        } else {
            player.shoot();
        }
    }
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    handleClick(mouseX, mouseY);
}

function handleTouchStart(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);

    touchStartX = touchX;
    touchStartY = touchY;

    if (currentScreen === 'game' && !gamePaused) {
        // Check if touch is in joystick area - increased touch area for better mobile usability
        const distFromJoystick = Math.sqrt(Math.pow(touchX - joystickCenter.x, 2) + Math.pow(touchY - joystickCenter.y, 2));
        if (distFromJoystick <= JOYSTICK_RADIUS + 60) {
            joystickActive = true;
            isMoving = true;
            // Immediately set joystick knob position
            let dx = touchX - joystickCenter.x;
            let dy = touchY - joystickCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > JOYSTICK_RADIUS) {
                dx = (dx / distance) * JOYSTICK_RADIUS;
                dy = (dy / distance) * JOYSTICK_RADIUS;
            }

            joystickKnob.x = joystickCenter.x + dx;
            joystickKnob.y = joystickCenter.y + dy;
            return;
        }

        // Ensure mobile controls are positioned correctly before checking
        adjustMobileControls();
        
        // Check mobile buttons with larger touch areas
        const specialButtonExtended = {
            x: mobileButtons.special.x - 30,
            y: mobileButtons.special.y - 30,
            width: mobileButtons.special.width + 60,
            height: mobileButtons.special.height + 60
        };
        
        if (isButtonClicked(touchX, touchY, specialButtonExtended)) {
            if (player.specialCooldown === 0 && !player.specialActive) {
                player.activateSpecial();
            }
            return;
        }
    } else if (currentScreen === 'shop') {
        // Check scrollbar
        if (touchX >= canvas.width - 35 && touchX <= canvas.width - 20 && touchY >= 100 && touchY <= 100 + shopVisibleHeight) {
            shopScrollBarDragging = true;
            return;
        }
    }

    handleClick(touchX, touchY);
}

function handleTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);

    if (joystickActive && currentScreen === 'game' && !gamePaused) {
        let dx = touchX - joystickCenter.x;
        let dy = touchY - joystickCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Constrain joystick knob within radius
        if (distance > JOYSTICK_RADIUS) {
            dx = (dx / distance) * JOYSTICK_RADIUS;
            dy = (dy / distance) * JOYSTICK_RADIUS;
        }

        joystickKnob.x = joystickCenter.x + dx;
        joystickKnob.y = joystickCenter.y + dy;

        // Move player based on joystick position with improved sensitivity
        if (distance > 8) { // Better threshold for responsiveness
            const normalizedDistance = Math.min(distance / JOYSTICK_RADIUS, 1);
            const moveSpeed = normalizedDistance * player.speed;
            const moveAngle = Math.atan2(dy, dx);

            // Apply movement directly
            const newX = player.x + Math.cos(moveAngle) * moveSpeed;
            const newY = player.y + Math.sin(moveAngle) * moveSpeed;

            // Keep player within bounds
            player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, newX));
            player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, newY));
        }
    } else if (currentScreen === 'shop') {
        if (shopScrollBarDragging) {
            const scrollBarHeight = Math.max(20, (shopVisibleHeight / shopContentHeight) * shopVisibleHeight);
            const scrollBarMaxY = shopVisibleHeight - scrollBarHeight;
            const newScrollBarY = Math.max(0, Math.min(scrollBarMaxY, touchY - 100));
            shopScroll = -(newScrollBarY / scrollBarMaxY) * (shopContentHeight - shopVisibleHeight);
        } else {
            const scrollDelta = (touchY - touchStartY) * 2;
            shopScroll += scrollDelta;
            const maxScroll = Math.max(0, shopContentHeight - shopVisibleHeight);
            shopScroll = Math.max(-maxScroll, Math.min(0, shopScroll));
            touchStartY = touchY;
        }
    }
}

function handleTouchEnd(e) {
    joystickActive = false;
    isMoving = false;
    shopScrollBarDragging = false;

    // Reset joystick knob position
    joystickKnob.x = joystickCenter.x;
    joystickKnob.y = joystickCenter.y;
}

function handleWheel(e) {
    if (currentScreen === 'shop') {
        e.preventDefault();
        shopScroll -= e.deltaY * 0.5;
        const maxScroll = Math.max(0, shopContentHeight - shopVisibleHeight);
        shopScroll = Math.max(-maxScroll, Math.min(0, shopScroll));
    }
}

function isButtonClicked(mouseX, mouseY, button) {
    return mouseX > button.x && mouseX < button.x + button.width &&
           mouseY > button.y && mouseY < button.y + button.height;
}

function detectMobile() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
}

function init() {
    detectMobile();

    canvas.width = FIXED_CANVAS_WIDTH;
    canvas.height = FIXED_CANVAS_HEIGHT;

    // Load saved game data
    loadGame();

    // Adiciona event listeners para controles
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('wheel', handleWheel);

    // Mobile touch controls
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Add orientation change listener for mobile
    window.addEventListener('resize', adjustMobileControls);
    window.addEventListener('orientationchange', adjustMobileControls);

    // Initial mobile control adjustment
    if (isMobile) {
        adjustMobileControls();
    }

    player = new Player();
    gameLoop();
}

init();