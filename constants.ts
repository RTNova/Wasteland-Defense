import { EnemyType, GameMap, Point, TowerType, Wave, Tower } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Helper to scale path points to canvas
export const scalePath = (path: Point[]): Point[] => {
  return path.map(p => ({ x: (p.x / 100) * CANVAS_WIDTH, y: (p.y / 100) * CANVAS_HEIGHT }));
};

export const MAPS: GameMap[] = [
  {
    id: 'ruins',
    name: 'City Ruins',
    difficulty: 'EASY',
    background: '#2d2d2d',
    waves: 30,
    path: scalePath([
      { x: 0, y: 20 }, { x: 30, y: 20 }, { x: 30, y: 70 }, { x: 70, y: 70 }, { x: 70, y: 30 }, { x: 100, y: 30 }
    ])
  },
  {
    id: 'wasteland',
    name: 'Toxic Wasteland',
    difficulty: 'MEDIUM',
    background: '#3a3228',
    waves: 40,
    path: scalePath([
      { x: 10, y: 0 }, { x: 10, y: 80 }, { x: 40, y: 80 }, { x: 40, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 100 }
    ])
  },
  {
    id: 'bunker',
    name: 'Bunker Entrance',
    difficulty: 'HARD',
    background: '#202820',
    waves: 50,
    path: scalePath([
      { x: 0, y: 50 }, { x: 20, y: 50 }, { x: 20, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 80 }, { x: 80, y: 80 }, { x: 80, y: 50 }, { x: 100, y: 50 }
    ])
  }
];

export const TOWER_DEFINITIONS: Record<TowerType, Partial<Tower>> = {
  [TowerType.SURVIVOR]: {
    name: 'Scavenger',
    description: 'Basic unit. Reliable rate of fire and low cost.',
    range: 200,
    damage: 30,
    cooldown: 40, // Frames
    cost: 100,
    color: '#3b82f6', // Blue
    type: TowerType.SURVIVOR
  },
  [TowerType.SNIPER]: {
    name: 'Ranger',
    description: 'Long range sniper with high damage but slow reload.',
    range: 320, // Very long
    damage: 170,
    cooldown: 120,
    cost: 450,
    color: '#16a34a', // Green
    type: TowerType.SNIPER
  },
  [TowerType.TURRET]: {
    name: 'Sentry',
    description: 'Rapid fire machine gun. Low damage per hit but high DPS.',
    range: 170,
    damage: 24,
    cooldown: 10, // Fast
    cost: 350,
    color: '#ef4444', // Red
    type: TowerType.TURRET
  },
  [TowerType.FLAMETHROWER]: {
    name: 'Incinerator',
    description: 'Spews fire in a short cone. Excellent for crowd control.',
    range: 120,
    damage: 18, // Tick damage
    cooldown: 5,
    cost: 600,
    color: '#f97316', // Orange
    type: TowerType.FLAMETHROWER
  },
  [TowerType.TESLA]: {
    name: 'Tesla Coil',
    description: 'Zaps primary target and arcs to 3 additional enemies.',
    range: 160,
    damage: 90,
    cooldown: 70,
    cost: 1200,
    color: '#8b5cf6', // Purple
    type: TowerType.TESLA
  },
  [TowerType.LASER]: {
    name: 'Ion Cannon',
    description: 'Fires a powerful beam that cuts through everything in its path. Slow reload.',
    range: 250,
    damage: 40, // Lower single tick damage because it pierces infinite
    cooldown: 150, // Slower firing (2 seconds)
    cost: 900,
    color: '#06b6d4', // Cyan
    type: TowerType.LASER
  },
  [TowerType.MONK]: {
    name: 'Hunter',
    description: 'Fires a homing arrow with global range. Reloads immediately upon impact.',
    range: 3000, // Global
    damage: 100,
    cooldown: 30, // Base cooldown if arrow is lost
    cost: 800,
    color: '#f43f5e', // Rose
    type: TowerType.MONK
  }
};

export const ENEMY_STATS: Record<EnemyType, { hp: number; speed: number; reward: number; color: string; radius: number; damageToPlayer: number }> = {
  [EnemyType.WALKER]: { hp: 80, speed: 0.8, reward: 5, color: '#84cc16', radius: 10, damageToPlayer: 2 }, // Buffed HP
  [EnemyType.RUNNER]: { hp: 45, speed: 1, reward: 8, color: '#facc15', radius: 8, damageToPlayer: 4 }, 
  [EnemyType.TANK]: { hp: 220, speed: 0.6, reward: 20, color: '#57534e', radius: 14, damageToPlayer: 10 }, // Buffed HP
  [EnemyType.BOSS]: { hp: 500, speed: 0.5, reward: 100, color: '#b91c1c', radius: 20, damageToPlayer: 40 }, // Buffed HP
};

// Shop / Upgrade Config
export const UPGRADE_CONFIG = {
  damageLevel: { name: 'Ballistics', cost: 200, desc: '+10% Damage per level' },
  rangeLevel: { name: 'Optics', cost: 150, desc: '+10% Range per level' },
  discountLevel: { name: 'Logistics', cost: 300, desc: '-5% Tower Cost per level' },
  cashLevel: { name: 'Reserves', cost: 250, desc: '+50 Starting Cash per level' }
};

export const generateWaves = (count: number): Wave[] => {
  const waves: Wave[] = [];
  for (let i = 1; i <= count; i++) {
    let enemies = [];
    
    // Early waves
    if (i <= 3) {
      // Much tighter spacing (15) to allow Tesla chaining
      enemies.push({ type: EnemyType.WALKER, count: 8 + i * 2, spacing: 15 });
    } 
    // Mixed waves
    else if (i <= 7) {
      enemies.push({ type: EnemyType.WALKER, count: 15, spacing: 12 });
      enemies.push({ type: EnemyType.RUNNER, count: i * 2, spacing: 15 });
    }
    // Tank introduction
    else if (i <= 12) {
      enemies.push({ type: EnemyType.RUNNER, count: 20, spacing: 10 });
      enemies.push({ type: EnemyType.TANK, count: i, spacing: 30 });
    }
    // Boss waves
    else {
       enemies.push({ type: EnemyType.TANK, count: 15 + Math.floor(i), spacing: 25 });
       enemies.push({ type: EnemyType.BOSS, count: Math.floor(i / 5) + 1, spacing: 80 });
       enemies.push({ type: EnemyType.RUNNER, count: 40, spacing: 8 }); // Zerg rush
    }

    waves.push({
      number: i,
      enemies,
      reward: 150 + (i * 35) // Increased reward scaling for better late game economy
    });
  }
  return waves;
};