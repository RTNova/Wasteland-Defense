/**
 * Análisis estático de balance a partir de los datos de config/.
 * No simula combate: calcula cifras teóricas (DPS nominal, coste, curvas de oleada y economía)
 * para detectar torres o enemigos que se salen de la media. Ver BALANCE.md para la interpretación.
 */
import { TOWER_DEFINITIONS, ENEMY_STATS, generateWaves, MAPS } from '../config/constants';
import { getDifficultyConfig } from '../config/difficulty';
import {
  applyUpgradeStats, getUpgradeCost, getWaveHpMultiplier, getRewardMultiplier,
  getStartingMoney, TOWER_MAX_LEVEL, FRAMES_PER_SECOND,
} from '../config/balance';
import { EnemyType, TowerType } from '../types/index';

/** Torres cuyo DPS nominal (daño*60/cooldown) NO refleja bien su efecto real. */
export const DPS_CAVEATS: Partial<Record<TowerType, string>> = {
  [TowerType.FLAMETHROWER]: 'cooldown es la cadencia durante la ráfaga; el tiempo real de ráfaga no está en config. Además hace daño de quemadura y área.',
  [TowerType.MORTAR]: 'daño de área: el DPS nominal es por objetivo, puede golpear a varios.',
  [TowerType.LASER]: 'el rayo perfora: daña a todos los enemigos en la línea.',
  [TowerType.TESLA]: 'cadena eléctrica: daña a varios objetivos.',
  [TowerType.MONK]: 'una flecha teledirigida a la vez; el cooldown solo aplica si se pierde la flecha. Alcance global.',
  [TowerType.SHOCKWAVE]: 'su valor principal es el aturdimiento/ralentización, no el daño.',
  [TowerType.RADAR]: 'torre de apoyo sin daño propio.',
  [TowerType.CHEMIST]: 'además del impacto aplica veneno/daño en el tiempo.',
};

export interface TowerLevelRow {
  level: number;
  damage: number;
  range: number;
  cooldown: number;
  dps: number;
  /** Dinero total invertido (compra + mejoras) para llegar a este nivel. */
  invested: number;
  dpsPer1000: number;
}

export const towerLevels = (type: TowerType): TowerLevelRow[] => {
  const def = TOWER_DEFINITIONS[type];
  const base = { damage: def.damage ?? 0, range: def.range ?? 0, cooldown: def.cooldown ?? 0 };
  const cost = def.cost ?? 0;
  const rows: TowerLevelRow[] = [];
  let s = base;
  let invested = cost;
  for (let level = 1; level <= TOWER_MAX_LEVEL; level++) {
    if (level > 1) {
      invested += getUpgradeCost(cost, level - 1);
      s = applyUpgradeStats(type, s);
    }
    const dps = s.cooldown > 0 ? (s.damage * FRAMES_PER_SECOND) / s.cooldown : 0;
    rows.push({ level, ...s, dps, invested, dpsPer1000: invested > 0 ? (dps / invested) * 1000 : 0 });
  }
  return rows;
};

export const allTowerTypes = (): TowerType[] => Object.values(TowerType) as TowerType[];

export const median = (xs: number[]): number => {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/** Vida de un enemigo en una oleada (sin Endless), con la dificultad dada. */
export const enemyHp = (type: EnemyType, wave: number, difficulty = 'MEDIUM'): number =>
  Math.round(ENEMY_STATS[type].hp * getWaveHpMultiplier(wave) * getDifficultyConfig(difficulty).healthMultiplier);

export const enemyReward = (type: EnemyType, wave: number): number =>
  Math.round(ENEMY_STATS[type].reward * getRewardMultiplier(wave, false));

/** Vida y recompensa totales de un enemigo incluyendo lo que suelta al morir (recursivo). */
export const effectiveEnemy = (type: EnemyType, wave: number, difficulty = 'MEDIUM'): { hp: number; reward: number; units: number } => {
  let hp = enemyHp(type, wave, difficulty);
  let reward = enemyReward(type, wave);
  let units = 1;
  const spawn = ENEMY_STATS[type].onDeathSpawn;
  if (spawn) {
    const child = effectiveEnemy(spawn.type, wave, difficulty);
    hp += child.hp * spawn.count;
    reward += child.reward * spawn.count;
    units += child.units * spawn.count;
  }
  return { hp, reward, units };
};

export const pathLength = (path: { x: number; y: number }[]): number => {
  let len = 0;
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return len;
};

/** Segundos que tarda un enemigo en recorrer un mapa (velocidad en px por frame). */
export const traverseSeconds = (type: EnemyType, mapIndex: number): number =>
  pathLength(MAPS[mapIndex].path) / (ENEMY_STATS[type].speed * FRAMES_PER_SECOND);

/**
 * Daño que una torre puede hacer a UN enemigo que pasa por el centro de su alcance
 * (cuerda de 2*alcance a la velocidad del enemigo). Cota superior para torres de un solo objetivo.
 */
export const singlePassDamage = (type: EnemyType, tower: TowerLevelRow): number => {
  if (tower.range > 1200) return Infinity; // alcance global (Hunter)
  const seconds = (2 * tower.range) / (ENEMY_STATS[type].speed * FRAMES_PER_SECOND);
  return tower.dps * seconds;
};

export interface WaveRow {
  wave: number;
  units: number;
  totalHp: number;
  killReward: number;
  waveReward: number;
  income: number;
  hpPerIncome: number;
}

/**
 * Resumen por oleada. `randomValue` fija Math.random para las apariciones aleatorias de Ninja/Ice Mage:
 * 0 = no aparecen (cota inferior), 0.99 = aparecen siempre (cota superior).
 */
export const waveTable = (count: number, randomValue: number, difficulty = 'MEDIUM'): WaveRow[] => {
  const original = Math.random;
  Math.random = () => randomValue;
  try {
    return generateWaves(count, difficulty as never).map(w => {
      let units = 0, totalHp = 0, killReward = 0;
      for (const g of w.enemies) {
        const e = effectiveEnemy(g.type, w.number, difficulty);
        units += e.units * g.count;
        totalHp += e.hp * g.count;
        killReward += e.reward * g.count;
      }
      const income = killReward + w.reward;
      return { wave: w.number, units, totalHp, killReward, waveReward: w.reward, income, hpPerIncome: totalHp / income };
    });
  } finally {
    Math.random = original;
  }
};

/** Dinero acumulado disponible al empezar cada oleada (inicial + ingresos de las anteriores). */
export const cumulativeMoney = (rows: WaveRow[], cashLevel = 0): number[] => {
  const out: number[] = [];
  let money = getStartingMoney(cashLevel);
  for (const r of rows) {
    out.push(money);
    money += r.income;
  }
  return out;
};
