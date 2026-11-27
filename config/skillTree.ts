import { GlobalUpgrades } from '../types/index';

// Armory skill tree: buy the Command Core in the center, then each branch
// expands outward (X layout) as its nodes are purchased. Each branch has its
// own color and direction. Positions are virtual world coordinates; the view
// pans (click/touch drag) and zooms (wheel / pinch) around them.

export type SkillBranch = 'CORE' | 'DAMAGE' | 'PRECISION' | 'SPEED' | 'ECONOMY';

export interface SkillNodeEffect {
  damageMult?: number;          // additive: 0.10 = +10% damage
  rangeMult?: number;           // additive: 0.10 = +10% range
  costReduction?: number;       // additive: 0.05 = -5% tower cost (global cap 50%)
  startingCash?: number;        // flat starting money bonus
  cooldownReduction?: number;   // multiplicative per node: 0.06 = cooldown x0.94
  projectileSpeedMult?: number; // additive: 0.25 = +25% bullet speed
  bulletPierce?: number;        // flat extra pierce for bullets
}

export interface SkillNode {
  id: string;
  branch: SkillBranch;
  name: string;
  desc: string;
  cost: number; // Tech Points
  x: number;
  y: number;
  parent: string | null; // null only for the core node
  icon: string; // lucide-react icon name (mapped in ArmoryTree.tsx)
  effect: SkillNodeEffect;
}

export const BRANCH_COLORS: Record<SkillBranch, string> = {
  CORE: '#22d3ee',
  DAMAGE: '#ef4444',
  PRECISION: '#eab308',
  SPEED: '#3b82f6',
  ECONOMY: '#22c55e'
};

export const BRANCH_LABELS: Record<SkillBranch, string> = {
  CORE: 'Core',
  DAMAGE: 'Damage',
  PRECISION: 'Precision',
  SPEED: 'Attack Speed',
  ECONOMY: 'Economy'
};

export const SKILL_NODES: SkillNode[] = [
  // --- Core ---
  {
    id: 'core', branch: 'CORE', name: 'Command Core', icon: 'Cpu',
    desc: 'The heart of the armory. Unlocks the four research branches.',
    cost: 100, x: 0, y: 0, parent: null, effect: {}
  },

  // --- Damage (red, expands up-left) ---
  {
    id: 'dmg1', branch: 'DAMAGE', name: 'Ballistics I', icon: 'Crosshair',
    desc: '+10% Damage to all towers.',
    cost: 150, x: -170, y: -170, parent: 'core', effect: { damageMult: 0.10 }
  },
  {
    id: 'dmg2', branch: 'DAMAGE', name: 'Ballistics II', icon: 'Crosshair',
    desc: '+10% Damage to all towers.',
    cost: 300, x: -340, y: -340, parent: 'dmg1', effect: { damageMult: 0.10 }
  },
  {
    id: 'dmg3a', branch: 'DAMAGE', name: 'Heavy Rounds', icon: 'Bomb',
    desc: '+15% Damage to all towers.',
    cost: 550, x: -510, y: -420, parent: 'dmg2', effect: { damageMult: 0.15 }
  },
  {
    id: 'dmg3b', branch: 'DAMAGE', name: 'High Caliber', icon: 'Crosshair',
    desc: '+10% Damage to all towers.',
    cost: 450, x: -400, y: -520, parent: 'dmg2', effect: { damageMult: 0.10 }
  },
  {
    id: 'dmg_cap', branch: 'DAMAGE', name: 'Devastator', icon: 'Skull',
    desc: '+25% Damage to all towers.',
    cost: 1000, x: -680, y: -490, parent: 'dmg3a', effect: { damageMult: 0.25 }
  },

  // --- Precision (yellow, expands up-right) ---
  {
    id: 'prec1', branch: 'PRECISION', name: 'Optics I', icon: 'Target',
    desc: '+10% Range to all towers.',
    cost: 150, x: 170, y: -170, parent: 'core', effect: { rangeMult: 0.10 }
  },
  {
    id: 'prec2', branch: 'PRECISION', name: 'High-Velocity Rounds', icon: 'Rocket',
    desc: '+25% Bullet Speed. Faster bullets miss less often.',
    cost: 300, x: 340, y: -340, parent: 'prec1', effect: { projectileSpeedMult: 0.25 }
  },
  {
    id: 'prec3a', branch: 'PRECISION', name: 'Optics II', icon: 'Target',
    desc: '+10% Range to all towers.',
    cost: 500, x: 510, y: -420, parent: 'prec2', effect: { rangeMult: 0.10 }
  },
  {
    id: 'prec3b', branch: 'PRECISION', name: 'Railgun Coils', icon: 'Rocket',
    desc: '+25% Bullet Speed. Faster bullets miss less often.',
    cost: 550, x: 400, y: -520, parent: 'prec2', effect: { projectileSpeedMult: 0.25 }
  },
  {
    id: 'prec_cap', branch: 'PRECISION', name: 'Piercing Rounds', icon: 'Focus',
    desc: 'Bullets pierce +1 enemy before disappearing.',
    cost: 1000, x: 680, y: -490, parent: 'prec3b', effect: { bulletPierce: 1 }
  },

  // --- Attack speed (blue, expands down-right) ---
  {
    id: 'spd1', branch: 'SPEED', name: 'Trigger Mechanism I', icon: 'Gauge',
    desc: '-6% Cooldown on all towers.',
    cost: 150, x: 170, y: 170, parent: 'core', effect: { cooldownReduction: 0.06 }
  },
  {
    id: 'spd2', branch: 'SPEED', name: 'Trigger Mechanism II', icon: 'Gauge',
    desc: '-6% Cooldown on all towers.',
    cost: 300, x: 340, y: 340, parent: 'spd1', effect: { cooldownReduction: 0.06 }
  },
  {
    id: 'spd3a', branch: 'SPEED', name: 'Lightweight Bolt', icon: 'Zap',
    desc: '-8% Cooldown on all towers.',
    cost: 500, x: 510, y: 420, parent: 'spd2', effect: { cooldownReduction: 0.08 }
  },
  {
    id: 'spd3b', branch: 'SPEED', name: 'Auto-Loader', icon: 'Zap',
    desc: '-8% Cooldown on all towers.',
    cost: 550, x: 400, y: 520, parent: 'spd2', effect: { cooldownReduction: 0.08 }
  },
  {
    id: 'spd_cap', branch: 'SPEED', name: 'Overdrive', icon: 'Timer',
    desc: '-12% Cooldown on all towers.',
    cost: 1000, x: 680, y: 490, parent: 'spd3a', effect: { cooldownReduction: 0.12 }
  },

  // --- Economy (green, expands down-left) ---
  {
    id: 'eco1', branch: 'ECONOMY', name: 'Logistics I', icon: 'Package',
    desc: '-5% Tower Cost.',
    cost: 150, x: -170, y: 170, parent: 'core', effect: { costReduction: 0.05 }
  },
  {
    id: 'eco2', branch: 'ECONOMY', name: 'Reserves I', icon: 'Coins',
    desc: '+50 Starting Cash.',
    cost: 250, x: -340, y: 340, parent: 'eco1', effect: { startingCash: 50 }
  },
  {
    id: 'eco3a', branch: 'ECONOMY', name: 'Logistics II', icon: 'Package',
    desc: '-5% Tower Cost.',
    cost: 400, x: -510, y: 420, parent: 'eco2', effect: { costReduction: 0.05 }
  },
  {
    id: 'eco3b', branch: 'ECONOMY', name: 'Reserves II', icon: 'Coins',
    desc: '+50 Starting Cash.',
    cost: 400, x: -400, y: 520, parent: 'eco2', effect: { startingCash: 50 }
  },
  {
    id: 'eco_cap', branch: 'ECONOMY', name: 'War Economy', icon: 'Briefcase',
    desc: '-10% Tower Cost.',
    cost: 900, x: -680, y: 490, parent: 'eco3a', effect: { costReduction: 0.10 }
  }
];

export const SKILL_NODE_MAP: Record<string, SkillNode> = Object.fromEntries(
  SKILL_NODES.map(n => [n.id, n])
);

export type SkillNodeStatus = 'PURCHASED' | 'AVAILABLE' | 'LOCKED';

export const getSkillNodeStatus = (node: SkillNode, purchasedIds: string[]): SkillNodeStatus => {
  if (purchasedIds.includes(node.id)) return 'PURCHASED';
  if (node.parent === null || purchasedIds.includes(node.parent)) return 'AVAILABLE';
  return 'LOCKED';
};

// Effective global modifiers = legacy flat upgrades (kept working for old
// saves) + purchased skill-tree nodes.
export interface ArmoryEffects {
  damageMult: number;
  rangeMult: number;
  costReduction: number;
  cooldownMult: number;
  projectileSpeedMult: number;
  bulletPierce: number;
  startingCash: number;
}

export const getArmoryEffects = (upgrades: GlobalUpgrades, skillNodes: string[] = []): ArmoryEffects => {
  const effects: ArmoryEffects = {
    damageMult: 1 + (upgrades.damageLevel || 0) * 0.1,
    rangeMult: 1 + (upgrades.rangeLevel || 0) * 0.1,
    costReduction: (upgrades.discountLevel || 0) * 0.05,
    cooldownMult: 1,
    projectileSpeedMult: 1,
    bulletPierce: 0,
    startingCash: 0
  };
  for (const id of skillNodes) {
    const node = SKILL_NODE_MAP[id];
    if (!node) continue;
    const e = node.effect;
    if (e.damageMult) effects.damageMult += e.damageMult;
    if (e.rangeMult) effects.rangeMult += e.rangeMult;
    if (e.costReduction) effects.costReduction += e.costReduction;
    if (e.cooldownReduction) effects.cooldownMult *= (1 - e.cooldownReduction);
    if (e.projectileSpeedMult) effects.projectileSpeedMult += e.projectileSpeedMult;
    if (e.bulletPierce) effects.bulletPierce += e.bulletPierce;
    if (e.startingCash) effects.startingCash += e.startingCash;
  }
  effects.costReduction = Math.min(0.5, effects.costReduction);
  return effects;
};
