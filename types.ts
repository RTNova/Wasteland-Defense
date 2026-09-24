

export enum EnemyType {
  WALKER = 'WALKER', // Basic, slow
  RUNNER = 'RUNNER', // Fast, weak
  TANK = 'TANK', // Slow, high health
  BOSS = 'BOSS' // Very high health
}

export enum TowerType {
  SURVIVOR = 'SURVIVOR', // Basic pistol
  SNIPER = 'SNIPER', // Long range, high damage, slow
  FLAMETHROWER = 'FLAMETHROWER', // Short range, splash/AOE
  TESLA = 'TESLA', // Chain lightning
  TURRET = 'TURRET', // Fast fire rate
  LASER = 'LASER', // High pierce line
  MONK = 'MONK' // Homing, reset on hit
}

export interface Point {
  x: number;
  y: number;
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
  distanceTraveled: number; // Used for targeting priority
  reward: number;
  damageToPlayer: number; // Lives deducted if reached end
  color: string;
  radius: number;
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
  description: string; // Added description
  rotation: number; // For visual direction
  activeProjectileId?: string | null; // For Monk logic
  
  // Flamethrower specific
  burstCount?: number; 
  isReloading?: boolean;
}

export interface Projectile {
  id: string;
  ownerId?: string; // To trace back to tower
  x: number;
  y: number;
  endX?: number; // For Laser Beam
  endY?: number; // For Laser Beam
  chainIds?: string[]; // For Tesla lightning chain
  targetId: string | null; // If null, linear movement
  velocity: Point;
  speed: number;
  acceleration?: number; // For Monk arrow
  damage: number;
  color: string;
  radius: number;
  type: 'BULLET' | 'FLAME' | 'LASER' | 'MISSILE' | 'ARROW' | 'BEAM' | 'LIGHTNING';
  pierce: number; // How many enemies it can hit
  lifespan: number; // Frames to live
}

export interface GameMap {
  id: string;
  name: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  path: Point[]; // Array of coordinates (0-100 percentages)
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