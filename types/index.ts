

export enum EnemyType {
  WALKER = 'WALKER', // Basic, slow
  RUNNER = 'RUNNER', // Fast, weak
  TANK = 'TANK', // Slow, high health
  BOSS = 'BOSS', // Very high health
  MATRYOSHKA = 'MATRYOSHKA', // Elite Spawner
  HEALER = 'HEALER', // Heals allies
  ICE_MAGE = 'ICE_MAGE', // Ranged, slows towers
  NINJA = 'NINJA' // Fast, paralyzes towers on finish
}

export enum TowerType {
  SURVIVOR = 'SURVIVOR', // Basic pistol
  SNIPER = 'SNIPER', // Long range, high damage, slow
  FLAMETHROWER = 'FLAMETHROWER', // Short range, splash/AOE
  TESLA = 'TESLA', // Chain lightning
  TURRET = 'TURRET', // Fast fire rate
  LASER = 'LASER', // High pierce line
  MONK = 'MONK', // Homing, reset on hit
  CHEMIST = 'CHEMIST', // Throws sticky bombs
  RADAR = 'RADAR', // Buffs nearby towers with homing
  MORTAR = 'MORTAR', // AOE Explosive
  SHOCKWAVE = 'SHOCKWAVE' // AOE Stun Pulse
}

export interface Point {
  x: number;
  y: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'BUILDING' | 'WATER' | 'WRECKAGE' | 'CORE';
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number; // Current target node index in the path
  frozen?: number; // Frames frozen
  slowFactor?: number; // 0-1 multiplier for speed (1 = normal, 0.5 = half speed)
  distanceTraveled: number; // Used for targeting priority
  reward: number;
  damageToPlayer: number; // Lives deducted if reached end
  color: string;
  radius: number;
  // Mechanics
  onDeathSpawn?: { type: EnemyType; count: number }; // Matryoshka logic
  isHealer?: boolean; // Healer logic
  healTimer?: number; // Frames until next heal pulse
  attackRange?: number; // For Ice Mage
  attackCooldown?: number; // For Ice Mage
  // Status Effects
  burnTimer?: number; // Frames remaining for burn
  burnDamage?: number; // Damage per tick
  healingReduction?: number; // 0 to 1 (0.3 = 30% less healing)
  poisonDoT?: number; // % of Max Health per second (Chemist Lvl 4)
  vulnerable?: number; // Frames vulnerable (+15% dmg)
  armorBroken?: boolean; // Permanent damage increase taken
}

export interface Tower {
  id: string;
  type: TowerType;
  x: number;
  y: number;
  range: number;
  damage: number;
  cooldown: number;
  cooldownTimer: number;
  cost: number;
  level: number;
  color: string;
  name: string;
  description: string;
  rotation: number;
  totalDamage: number; // Track damage dealt over the game
  activeProjectileId?: string | null; // For Monk logic
  frame?: number; // For animations
  
  // Status Effects (Debuffs from Enemies)
  frozenTimer?: number; // If > 0, attacks 20% slower
  stunnedTimer?: number; // If > 0, cannot attack (Ninja effect)

  // Buff State
  isBuffed?: boolean; // Granted by Radar

  // Flamethrower specific
  burstCount?: number; 
  isReloading?: boolean;

  // Sentry Specific
  rampUpMultiplier?: number; // 1.0 to 1.5

  // Ion Cannon Specific
  laserMode?: 'RED' | 'BLUE';

  // Hunter Specific
  ammo?: number; // Stored arrows from kills
}

export interface Projectile {
  id: string;
  ownerId?: string; // To trace back to tower
  x: number;
  y: number;
  endX?: number; // For Laser Beam or Mortar
  endY?: number; // For Laser Beam or Mortar
  chainIds?: string[]; // For Tesla lightning chain
  targetId: string | null; // If null, linear movement
  hitIds?: string[]; // List of enemies already hit by this specific projectile (for piercing/flame)
  velocity: Point;
  speed: number;
  acceleration?: number; // For Monk arrow
  damage: number;
  color: string;
  radius: number;
  type: 'BULLET' | 'FLAME' | 'LASER' | 'MISSILE' | 'ARROW' | 'BEAM' | 'LIGHTNING' | 'GLUE_BOMB' | 'MORTAR_SHELL' | 'ICE_BOLT';
  pierce: number; // How many enemies it can hit
  lifespan: number; // Frames to live
  
  // Special properties
  isHoming?: boolean; // Granted by Radar buff
  healingReduction?: number; // Applied to target
  splashRadius?: number; // For Mortar

  // Lvl 10 Flags
  isBlueFire?: boolean;
  isExplosive?: boolean; // Scavenger Lvl 10
  laserColor?: 'RED' | 'BLUE'; // Ion Cannon Lvl 10
}

export interface GroundEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  lifespan: number;
  maxLifespan?: number; // For progress animations (charging)
  type: 'ACID_POOL' | 'DELAYED_HEAL' | 'FIRE_POOL' | 'SHOCKWAVE';
  damagePerFrame: number;
  healAmount?: number; // For delayed heal
  slowFactor: number; // 0.5 means 50% speed
  isDarkPoison?: boolean; // Chemist Lvl 10
}

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface GameMap {
  id: string;
  name: string;
  difficulty: DifficultyLevel | 'EXTREME';
  path: Point[]; // Array of coordinates (0-100 percentages)
  obstacles?: Obstacle[]; // Blocked areas
  background: string;
  waves: number; // Total waves
}

export interface Wave {
  number: number;
  enemies: { type: EnemyType; count: number; spacing: number }[];
  reward: number;
}

export interface GlobalUpgrades {
  damageLevel: number; // +10% per level
  rangeLevel: number; // +10% per level
  discountLevel: number; // -5% cost per level
  cashLevel: number; // +50 starting cash per level
}

export interface PlayerProgress {
  techPoints: number; // Meta currency
  upgrades: GlobalUpgrades;
  completedMaps: string[];
  completedDifficulties?: string[]; // e.g., ['ruins_EASY', 'ruins_HARD']
  unlockedAchievements?: string[]; // IDs of unlocked milestones
  stats?: {
    mutantsKilled: number;
    bossesKilled: number;
    totalTechPointsEarned: number;
    wavesCleared: number;
    endlessWaveRecord: number;
    towersBuilt: number;
  };
}

export interface Profile {
    id: string;
    name: string;
    lastPlayed: number; // Timestamp
    progress: PlayerProgress;
}

export interface DragState {
  isDragging: boolean;
  towerType: TowerType | null;
  validPlacement: boolean;
  x: number; // Screen X
  y: number; // Screen Y
  gameX: number; // Game X (800x600 space)
  gameY: number; // Game Y
}

export interface CurrencyPopup {
  id: string;
  x: number;
  y: number;
  amount: number;
  lifespan: number;     // e.g. 50 frames
  maxLifespan: number;  // total duration
  vy: number;           // upward float velocity
  vx: number;           // slight horizontal drift
}

