import { EnemyType, GameMap, Point, TowerType, Wave, Tower, Obstacle } from '../types/index';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Helper to scale path points to canvas
export const scalePath = (path: Point[]): Point[] => {
  return path.map(p => ({ x: (p.x / 100) * CANVAS_WIDTH, y: (p.y / 100) * CANVAS_HEIGHT }));
};

// Helper to scale obstacles
const scaleObstacles = (obstacles: Obstacle[]): Obstacle[] => {
    return obstacles.map(o => ({
        x: (o.x / 100) * CANVAS_WIDTH,
        y: (o.y / 100) * CANVAS_HEIGHT,
        width: (o.width / 100) * CANVAS_WIDTH,
        height: (o.height / 100) * CANVAS_HEIGHT,
        type: o.type
    }));
};

export const MAPS: GameMap[] = [
  {
    id: 'ruins',
    name: 'City Ruins',
    difficulty: 'EASY',
    background: '#2d2d2d',
    waves: 20,
    path: scalePath([
      { x: 0, y: 20 }, { x: 30, y: 20 }, { x: 30, y: 70 }, { x: 70, y: 70 }, { x: 70, y: 30 }, { x: 100, y: 30 }
    ]),
    obstacles: []
  },
  {
    id: 'wasteland',
    name: 'Toxic Wasteland',
    difficulty: 'MEDIUM',
    background: '#3a3228',
    waves: 35,
    path: scalePath([
      { x: 10, y: 0 }, { x: 10, y: 80 }, { x: 40, y: 80 }, { x: 40, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 100 }
    ]),
    obstacles: []
  },
  {
    id: 'bunker',
    name: 'Bunker Entrance',
    difficulty: 'HARD',
    background: '#202820',
    waves: 50,
    path: scalePath([
      { x: 0, y: 50 }, { x: 20, y: 50 }, { x: 20, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 80 }, { x: 80, y: 80 }, { x: 80, y: 50 }, { x: 100, y: 50 }
    ]),
    obstacles: []
  },
  // --- NEW MAPS ---
  {
      id: 'sector7',
      name: 'Sector 7',
      difficulty: 'MEDIUM',
      background: '#1e293b', // Slate dark blue
      waves: 40,
      path: scalePath([
          {x: 0, y: 15}, {x: 25, y: 15}, {x: 25, y: 85}, {x: 50, y: 85}, {x: 50, y: 15}, {x: 75, y: 15}, {x: 75, y: 85}, {x: 100, y: 85}
      ]),
      obstacles: scaleObstacles([
          { x: 30, y: 30, width: 15, height: 40, type: 'BUILDING' },
          { x: 55, y: 30, width: 15, height: 40, type: 'BUILDING' },
          { x: 5, y: 30, width: 15, height: 55, type: 'BUILDING' }
      ])
  },
  {
      id: 'canyon',
      name: 'The Canyon',
      difficulty: 'HARD',
      background: '#451a03', // Dark brown
      waves: 55,
      // Winding path approximating a curve
      path: scalePath([
          {x: 0, y: 10}, {x: 15, y: 15}, {x: 25, y: 30}, {x: 30, y: 50}, {x: 25, y: 70}, {x: 15, y: 85}, 
          {x: 40, y: 90}, {x: 60, y: 85}, {x: 70, y: 70}, {x: 75, y: 50}, {x: 70, y: 30}, {x: 60, y: 15},
          {x: 85, y: 10}, {x: 100, y: 10}
      ]),
      obstacles: scaleObstacles([
          { x: 35, y: 20, width: 20, height: 60, type: 'WATER' }, // Central river/gap
          { x: 0, y: 90, width: 30, height: 10, type: 'WRECKAGE' }
      ])
  },
  {
      id: 'reactor',
      name: 'Reactor Core',
      difficulty: 'EXTREME',
      background: '#111827', // Almost black
      waves: 60,
      // Spiral
      path: scalePath([
          {x: 0, y: 0}, {x: 90, y: 10}, {x: 90, y: 90}, {x: 10, y: 90}, 
          {x: 10, y: 20}, {x: 80, y: 20}, {x: 80, y: 80}, {x: 20, y: 80},
          {x: 20, y: 30}, {x: 50, y: 50} // Ends at core
      ]),
      obstacles: scaleObstacles([
          { x: 40, y: 40, width: 20, height: 20, type: 'CORE' }, // The Core
          { x: 48, y: 0, width: 4, height: 15, type: 'BUILDING' } // Pipe
      ])
  },
  {
      id: 'broken_hwy',
      name: 'Broken Highway',
      difficulty: 'MEDIUM',
      background: '#3f3f46', // Asphalt grey
      waves: 45,
      path: scalePath([
          {x: 10, y: 100}, {x: 10, y: 60}, {x: 40, y: 60}, {x: 60, y: 40}, {x: 90, y: 40}, {x: 90, y: 0}
      ]),
      obstacles: scaleObstacles([
          { x: 20, y: 65, width: 15, height: 35, type: 'WRECKAGE' },
          { x: 65, y: 0, width: 15, height: 35, type: 'WRECKAGE' },
          { x: 0, y: 0, width: 40, height: 40, type: 'WATER' } // Collapsed bridge area
      ])
  }
];

export const TOWER_DEFINITIONS: Record<TowerType, Partial<Tower>> = {
  [TowerType.SURVIVOR]: {
    name: 'Scavenger',
    description: 'Basic unit. Reliable rate of fire. Lvl 7: Explosive rounds.',
    range: 150,
    damage: 40,
    cooldown: 40, // Frames
    cost: 100,
    color: '#3b82f6', // Blue
    type: TowerType.SURVIVOR
  },
  [TowerType.SNIPER]: {
    name: 'Ranger',
    description: 'Long range sniper. Lvl 7: Hits make enemies Vulnerable (+15% Dmg taken).',
    range: 330, // Very long
    damage: 120,
    cooldown: 140,
    cost: 450,
    color: '#16a34a', // Green
    type: TowerType.SNIPER
  },
  [TowerType.TURRET]: {
    name: 'Sentry',
    description: 'Rapid fire machine gun. Lvl 7: Spin-up mechanic for massive fire rate.',
    range: 140,
    damage: 24,
    cooldown: 8, // Fast
    cost: 300,
    color: '#ef4444', // Red
    type: TowerType.TURRET
  },
  [TowerType.FLAMETHROWER]: {
    name: 'Incinerator',
    description: 'Spews fire. Lvl 7: Blue fire deals more damage and reduces enemy healing.',
    range: 150,
    damage: 9, // Buffed from 7 to 9
    cooldown: 3, // Fire rate during burst
    cost: 700,
    color: '#f97316', // Orange
    type: TowerType.FLAMETHROWER
  },
  [TowerType.MORTAR]: {
    name: 'Earthshaker',
    description: 'Lobs explosive shells. High AOE damage. Lvl 7: Leaves burning napalm.',
    range: 280,
    damage: 150,
    cooldown: 180, // Very slow (3s)
    cost: 850,
    color: '#71717a', // Zinc
    type: TowerType.MORTAR
  },
  [TowerType.SHOCKWAVE]: {
    name: 'Pulverizer',
    description: 'Sonic pulse. Low DMG but high Stun/Slow. Lvl 7: Permanently breaks armor.',
    range: 110,
    damage: 30,
    cooldown: 60,
    cost: 650,
    color: '#d946ef', // Fuchsia
    type: TowerType.SHOCKWAVE
  },
  [TowerType.CHEMIST]: {
    name: 'Chemist',
    description: 'Lobs sticky bombs. Lvl 7: Dark Poison applies permanent damage over time.',
    range: 220,
    damage: 25, // Impact damage
    cooldown: 80,
    cost: 550,
    color: '#84cc16', // Lime Green
    type: TowerType.CHEMIST
  },
  [TowerType.TESLA]: {
    name: 'Tesla Coil',
    description: 'Zaps multiple targets. Lvl 7: Arcs stun enemies briefly.',
    range: 170,
    damage: 80,
    cooldown: 100,
    cost: 1400,
    color: '#8b5cf6', // Purple
    type: TowerType.TESLA
  },
  [TowerType.LASER]: {
    name: 'Ion Cannon',
    description: 'Fires a powerful beam. Lvl 7: Alternates Red (Burn) and Blue (Acid) beams.',
    range: 250,
    damage: 175, 
    cooldown: 210, 
    cost: 1300,
    color: '#06b6d4', // Cyan
    type: TowerType.LASER
  },
  [TowerType.MONK]: {
    name: 'Hunter',
    description: 'Global range homing arrow. Lvl 7: Kills grant Ammo for rapid fire bursts.',
    range: 3000, // Global
    damage: 90,
    cooldown: 30, // Base cooldown if arrow is lost
    cost: 1000,
    color: '#f43f5e', // Rose
    type: TowerType.MONK
  },
  [TowerType.RADAR]: {
    name: 'Command Link',
    description: 'Support Tower. Lvl 7: Nearby towers gain +15% Dmg & Speed.',
    range: 140,
    damage: 0,
    cooldown: 0,
    cost: 1100,
    color: '#0ea5e9', // Sky Blue
    type: TowerType.RADAR
  }
};

// Stats for all enemies (+45% HEALTH BUFF APPLIED)
export const ENEMY_STATS: Record<EnemyType, { hp: number; speed: number; reward: number; color: string; radius: number; damageToPlayer: number, onDeathSpawn?: {type: EnemyType, count: number}, isHealer?: boolean, attackRange?: number, attackCooldown?: number }> = {
  // Walker: 70 * 1.45 = 101.5
  [EnemyType.WALKER]: { hp: 102, speed: 0.9, reward: 5, color: '#84cc16', radius: 10, damageToPlayer: 2 }, 
  
  // Runner: 45 * 1.45 = 65.25
  [EnemyType.RUNNER]: { hp: 65, speed: 1.1, reward: 8, color: '#facc15', radius: 8, damageToPlayer: 4 }, 
  
  // Ninja: REBALANCED TO MINI-BOSS
  [EnemyType.NINJA]: { hp: 450, speed: 2.0, reward: 40, color: '#171717', radius: 9, damageToPlayer: 2 },

  // Ice Mage: Moderate speed, attacks towers
  [EnemyType.ICE_MAGE]: { hp: 250, speed: 0.7, reward: 30, color: '#3b82f6', radius: 12, damageToPlayer: 5, attackRange: 150, attackCooldown: 180 },

  // Tank: 220 * 1.45 = 319
  [EnemyType.TANK]: { 
      hp: 319, speed: 0.75, reward: 20, color: '#57534e', radius: 14, damageToPlayer: 10,
      onDeathSpawn: { type: EnemyType.WALKER, count: 3 }
  }, 
  
  // Boss: 600 * 1.45 = 870
  [EnemyType.BOSS]: { 
      hp: 870, speed: 0.5, reward: 100, color: '#b91c1c', radius: 20, damageToPlayer: 30,
      onDeathSpawn: { type: EnemyType.TANK, count: 3 }
  },
  
  // Matryoshka: 2000 * 1.45 = 2900
  [EnemyType.MATRYOSHKA]: { 
    hp: 2900, speed: 0.4, reward: 500, color: '#0f172a', radius: 25, damageToPlayer: 50,
    onDeathSpawn: { type: EnemyType.BOSS, count: 3 } 
  },

  // Healer: 1000 * 1.45 = 1450
  [EnemyType.HEALER]: {
    hp: 1450, speed: 0.8, reward: 10, color: '#ffffff', radius: 16, damageToPlayer: 15,
    isHealer: true
  }
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
    
    // Boss wave check (Every 5 waves)
    const isBossWave = i % 5 === 0;

    if (isBossWave) {
        // Boss Waves scaling
        if (i === 5) {
             enemies.push({ type: EnemyType.TANK, count: 5, spacing: 40 });
             enemies.push({ type: EnemyType.HEALER, count: 1, spacing: 100 });
        } else if (i === 10) {
             enemies.push({ type: EnemyType.BOSS, count: 1, spacing: 0 }); 
             enemies.push({ type: EnemyType.NINJA, count: 1, spacing: 100 }); // Single Mini-boss intro
        } else if (i === 15) {
             enemies.push({ type: EnemyType.BOSS, count: 2, spacing: 150 });
             enemies.push({ type: EnemyType.ICE_MAGE, count: 4, spacing: 100 }); 
        } else if (i === 20) {
             enemies.push({ type: EnemyType.MATRYOSHKA, count: 1, spacing: 0 });
        } else {
             const eliteCount = Math.floor(i / 20);
             if (eliteCount > 0) enemies.push({ type: EnemyType.MATRYOSHKA, count: eliteCount, spacing: 300 });
             
             enemies.push({ type: EnemyType.HEALER, count: Math.floor(i/8), spacing: 200 });
             enemies.push({ type: EnemyType.ICE_MAGE, count: Math.floor(i/6), spacing: 150 });
             enemies.push({ type: EnemyType.NINJA, count: 1 + Math.floor(i/15), spacing: 200 }); // Sparse Ninjas
             enemies.push({ type: EnemyType.BOSS, count: Math.floor(i/10) + 1, spacing: 200 });
        }
    } else {
        // Normal Waves with progressive scaling
        const difficulty = i;
        
        if (i <= 3) {
            enemies.push({ type: EnemyType.WALKER, count: 6 + i * 2, spacing: 15 });
        } else {
            const runnerCount = Math.floor(difficulty * 1.5);
            const walkerCount = Math.floor(difficulty * 2);
            
            enemies.push({ type: EnemyType.WALKER, count: walkerCount, spacing: 12 });
            
            if (i > 3) enemies.push({ type: EnemyType.RUNNER, count: runnerCount, spacing: 15 });
            if (i > 6) enemies.push({ type: EnemyType.TANK, count: Math.floor(i / 3), spacing: 40 });
            
            // Introduce new enemies in normal waves
            // Reduced Ninja spawn rate significantly as they are now strong
            if (i > 8 && Math.random() > 0.90) enemies.push({ type: EnemyType.NINJA, count: 1, spacing: 100 });
            if (i > 12 && Math.random() > 0.7) enemies.push({ type: EnemyType.ICE_MAGE, count: 1 + Math.floor(i/8), spacing: 100 });
        }
    }

    // Reward scaling
    let reward;
    if (i <= 10) {
      reward = 150 + (i * 25);
    } else {
      reward = 500 + ((i - 10) * 30); // Slightly increased to compensate extreme difficulty
    }

    waves.push({
      number: i,
      enemies,
      reward
    });
  }
  return waves;
};