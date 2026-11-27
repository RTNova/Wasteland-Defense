/**
 * Sistemas de estrategia (v2): resistencias, especializaciones, escudo de jefe,
 * reliquias y habilidades activas. Todo es lógica pura y se prueba en tests/features.test.ts.
 */

// ---------------------------------------------------------------------------
// 1) Tipos de daño y resistencias
// ---------------------------------------------------------------------------
export type DamageClass = 'KINETIC' | 'FIRE' | 'ENERGY' | 'EXPLOSIVE';

export const TOWER_DAMAGE_CLASS: Record<string, DamageClass> = {
  SURVIVOR: 'KINETIC',
  SNIPER: 'KINETIC',
  TURRET: 'KINETIC',
  MONK: 'KINETIC',
  FLAMETHROWER: 'FIRE',
  TESLA: 'ENERGY',
  LASER: 'ENERGY',
  SHOCKWAVE: 'ENERGY',
  MORTAR: 'EXPLOSIVE',
  CHEMIST: 'EXPLOSIVE',
};

/** Multiplicador de daño recibido por tipo de daño. Lo que no aparece vale 1. */
export const ENEMY_RESISTANCES: Partial<Record<string, Partial<Record<DamageClass, number>>>> = {
  TANK: { KINETIC: 0.7, EXPLOSIVE: 1.25 },
  NINJA: { ENERGY: 0.7, KINETIC: 1.1 },
  ICE_MAGE: { FIRE: 1.3, ENERGY: 0.8 },
  BOSS: { KINETIC: 0.9, EXPLOSIVE: 1.1 },
  MATRYOSHKA: { FIRE: 0.85, ENERGY: 1.15 },
};

export const getDamageClass = (towerType?: string): DamageClass | undefined =>
  towerType ? TOWER_DAMAGE_CLASS[towerType] : undefined;

export const resistanceMultiplier = (enemyType: string, cls?: DamageClass): number => {
  if (!cls) return 1;
  return ENEMY_RESISTANCES[enemyType]?.[cls] ?? 1;
};

/** Texto corto para la ficha del enemigo/torre: "Resiste cinético (-30%)". */
export const CLASS_LABEL: Record<DamageClass, string> = {
  KINETIC: 'cinético',
  FIRE: 'fuego',
  ENERGY: 'energía',
  EXPLOSIVE: 'explosivo',
};

// ---------------------------------------------------------------------------
// 2) Escudo de jefe: solo energía y explosivos lo rompen bien
// ---------------------------------------------------------------------------
export const BOSS_SHIELD_FRACTION = 0.35; // del HP máximo
export const BOSS_SHIELD_WEAK_MULT = 0.25; // daño que sí entra al escudo con otros tipos

export const shieldDamageMultiplier = (cls?: DamageClass): number =>
  cls === 'ENERGY' || cls === 'EXPLOSIVE' ? 1 : BOSS_SHIELD_WEAK_MULT;

/**
 * Reparte un golpe entre escudo y vida. Devuelve lo que queda de escudo y el daño
 * que pasa a la vida (el daño sobrante tras romper el escudo pasa entero).
 */
export const splitShieldDamage = (shield: number, damage: number, cls?: DamageClass) => {
  if (shield <= 0) return { shield: 0, toHealth: damage, broke: false };
  const vsShield = damage * shieldDamageMultiplier(cls);
  if (vsShield < shield) return { shield: shield - vsShield, toHealth: 0, broke: false };
  const leftoverFraction = (vsShield - shield) / vsShield; // parte del golpe que sobra
  return { shield: 0, toHealth: damage * leftoverFraction, broke: true };
};

// ---------------------------------------------------------------------------
// 3) Especializaciones al nivel 3 (bifurcación)
// ---------------------------------------------------------------------------
export const BRANCH_LEVEL = 3;

export interface BranchDef {
  id: string;
  name: string;
  desc: string;
  damageMult?: number;
  rangeMult?: number;
  cooldownMult?: number;
  critChance?: number; // 0..1, crítico = x2
  ignoreResist?: boolean; // ignora resistencias del enemigo
}

const B = (id: string, name: string, desc: string, rest: Partial<BranchDef>): BranchDef => ({ id, name, desc, ...rest });

export const TOWER_BRANCHES: Record<string, [BranchDef, BranchDef]> = {
  SURVIVOR: [
    B('survivor_crit', 'Tirador', '25% de crítico (x2 de daño)', { critChance: 0.25 }),
    B('survivor_rapid', 'Ráfaga', '-25% de recarga, -10% de daño', { cooldownMult: 0.75, damageMult: 0.9 }),
  ],
  SNIPER: [
    B('sniper_pierce', 'Perforante', 'Ignora resistencias, +10% de daño', { ignoreResist: true, damageMult: 1.1 }),
    B('sniper_crit', 'Cazador', '30% de crítico (x2 de daño)', { critChance: 0.3 }),
  ],
  FLAMETHROWER: [
    B('flame_hot', 'Llama azul', '+35% de daño', { damageMult: 1.35 }),
    B('flame_long', 'Alcance largo', '+25% de alcance, +10% de daño', { rangeMult: 1.25, damageMult: 1.1 }),
  ],
  TESLA: [
    B('tesla_volt', 'Alto voltaje', '+30% de daño', { damageMult: 1.3 }),
    B('tesla_fast', 'Descarga rápida', '-25% de recarga', { cooldownMult: 0.75 }),
  ],
  TURRET: [
    B('turret_hail', 'Granizo', '-30% de recarga, -10% de daño', { cooldownMult: 0.7, damageMult: 0.9 }),
    B('turret_ap', 'Perforante', 'Ignora resistencias, +15% de daño', { ignoreResist: true, damageMult: 1.15 }),
  ],
  LASER: [
    B('laser_focus', 'Foco', '+30% de daño, -10% de alcance', { damageMult: 1.3, rangeMult: 0.9 }),
    B('laser_wide', 'Barrido', '+20% de alcance, -25% de recarga', { rangeMult: 1.2, cooldownMult: 0.75 }),
  ],
  MONK: [
    B('monk_swift', 'Veloz', '-25% de recarga', { cooldownMult: 0.75 }),
    B('monk_crit', 'Preciso', '25% de crítico (x2 de daño)', { critChance: 0.25 }),
  ],
  CHEMIST: [
    B('chem_acid', 'Ácido', '+30% de daño', { damageMult: 1.3 }),
    B('chem_range', 'Lanzador', '+25% de alcance', { rangeMult: 1.25 }),
  ],
  RADAR: [
    B('radar_far', 'Antena larga', '+30% de alcance', { rangeMult: 1.3 }),
    B('radar_fast', 'Pulso rápido', '-20% de recarga', { cooldownMult: 0.8 }),
  ],
  MORTAR: [
    B('mortar_heavy', 'Proyectil pesado', '+35% de daño, +15% de recarga', { damageMult: 1.35, cooldownMult: 1.15 }),
    B('mortar_auto', 'Autocargador', '-25% de recarga', { cooldownMult: 0.75 }),
  ],
  SHOCKWAVE: [
    B('shock_wave', 'Onda ancha', '+25% de alcance', { rangeMult: 1.25 }),
    B('shock_pulse', 'Pulso rápido', '-25% de recarga, +10% de daño', { cooldownMult: 0.75, damageMult: 1.1 }),
  ],
};

export const getBranches = (towerType: string): [BranchDef, BranchDef] | undefined => TOWER_BRANCHES[towerType];

export const getBranch = (towerType: string, branchId?: string): BranchDef | undefined =>
  branchId ? TOWER_BRANCHES[towerType]?.find(b => b.id === branchId) : undefined;

/** Aplica una rama a las estadísticas actuales de una torre. */
export const applyBranchStats = (branch: BranchDef, s: { damage: number; range: number; cooldown: number }) => ({
  damage: Math.max(1, Math.round(s.damage * (branch.damageMult ?? 1))),
  range: Math.round(s.range * (branch.rangeMult ?? 1)),
  cooldown: Math.max(2, s.cooldown * (branch.cooldownMult ?? 1)),
});

// ---------------------------------------------------------------------------
// 4) Reliquias: una activa por partida, se elige 1 de 3 al terminar
// ---------------------------------------------------------------------------
export interface RelicDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  damageMult?: number;
  rangeMult?: number;
  cooldownMult?: number;
  costMult?: number;
  rewardMult?: number;
  startMoney?: number;
  startLives?: number;
  waveBonus?: number; // dinero extra al terminar cada oleada
  bossDamageMult?: number;
}

export const RELICS: RelicDef[] = [
  { id: 'scrap_magnet', name: 'Imán de chatarra', icon: '🧲', desc: '+25% de dinero por enemigo', rewardMult: 1.25 },
  { id: 'iron_core', name: 'Núcleo de hierro', icon: '🛡️', desc: '+30 vidas de inicio', startLives: 30 },
  { id: 'overclock', name: 'Overclock', icon: '⚡', desc: 'Todas las torres disparan un 10% más rápido', cooldownMult: 0.9 },
  { id: 'long_lens', name: 'Lente larga', icon: '🔭', desc: '+12% de alcance en todas las torres', rangeMult: 1.12 },
  { id: 'war_chest', name: 'Cofre de guerra', icon: '💰', desc: '+250 de dinero inicial', startMoney: 250 },
  { id: 'bulk_discount', name: 'Compra al por mayor', icon: '🏷️', desc: '-10% en el coste de las torres', costMult: 0.9 },
  { id: 'boss_breaker', name: 'Rompejefes', icon: '💥', desc: '+30% de daño contra jefes', bossDamageMult: 1.3 },
  { id: 'wave_pay', name: 'Paga de oleada', icon: '📦', desc: '+40 de dinero al terminar cada oleada', waveBonus: 40 },
  { id: 'sharp_rounds', name: 'Munición afilada', icon: '🎯', desc: '+8% de daño en todas las torres', damageMult: 1.08 },
];

export const getRelic = (id?: string | null): RelicDef | undefined =>
  id ? RELICS.find(r => r.id === id) : undefined;

/** Elige `count` reliquias distintas, sin repetir la activa si se puede. */
export const rollRelicChoices = (rand: () => number = Math.random, exclude?: string | null, count = 3): RelicDef[] => {
  const pool = RELICS.filter(r => r.id !== exclude);
  const out: RelicDef[] = [];
  while (out.length < count && pool.length) {
    const i = Math.floor(rand() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
};

// ---------------------------------------------------------------------------
// 5) Habilidades activas del jugador
// ---------------------------------------------------------------------------
export type AbilityId = 'BOMBARD' | 'REPAIR' | 'SLOW';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  key: string;
  cooldownFrames: number; // a 60 fps
  needsTarget: boolean;
  desc: string;
}

export const ABILITIES: AbilityDef[] = [
  { id: 'BOMBARD', name: 'Bombardeo', key: 'Q', cooldownFrames: 60 * 45, needsTarget: true, desc: 'Explosión en el punto que elijas (radio 90, 40 de daño por vida de oleada)' },
  { id: 'REPAIR', name: 'Reparar', key: 'W', cooldownFrames: 60 * 90, needsTarget: false, desc: 'Recupera 10 vidas' },
  { id: 'SLOW', name: 'Campo lento', key: 'E', cooldownFrames: 60 * 60, needsTarget: false, desc: 'Todos los enemigos al 50% de velocidad durante 5 s' },
];

export const BOMBARD_RADIUS = 90;
export const REPAIR_LIVES = 10;
export const SLOW_FRAMES = 60 * 5;

/** El bombardeo escala con la oleada para seguir siendo útil. */
export const bombardDamage = (wave: number): number => 120 + 40 * Math.max(1, wave);

// ---------------------------------------------------------------------------
// 6) Desafío diario: mapa y regla fijados por la fecha, igual para todos
// ---------------------------------------------------------------------------
export interface DailyModifier {
  id: string;
  name: string;
  desc: string;
  costMult?: number;
  enemySpeedMult?: number;
  enemyHpMult?: number;
  rewardMult?: number;
  startMoney?: number;
}

export const DAILY_MODIFIERS: DailyModifier[] = [
  { id: 'rush', name: 'Hora punta', desc: 'Enemigos +25% más rápidos, +25% de dinero por enemigo', enemySpeedMult: 1.25, rewardMult: 1.25 },
  { id: 'austerity', name: 'Austeridad', desc: 'Torres -25% de coste, enemigos +20% de vida', costMult: 0.75, enemyHpMult: 1.2 },
  { id: 'thick_skin', name: 'Piel gruesa', desc: 'Enemigos +40% de vida, +300 de dinero inicial', enemyHpMult: 1.4, startMoney: 300 },
  { id: 'scarcity', name: 'Escasez', desc: '-30% de dinero por enemigo, torres -15% de coste', rewardMult: 0.7, costMult: 0.85 },
];

/** Número de día estable (UTC) para la semilla. */
export const dayNumber = (d: Date = new Date()): number =>
  Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);

export const getDailyChallenge = (mapIds: string[], day: number = dayNumber()) => ({
  day,
  mapId: mapIds[((day % mapIds.length) + mapIds.length) % mapIds.length],
  modifier: DAILY_MODIFIERS[((Math.floor(day / 3) + day) % DAILY_MODIFIERS.length + DAILY_MODIFIERS.length) % DAILY_MODIFIERS.length],
});
