/**
 * Fórmulas de balance como funciones puras.
 *
 * Antes estaban repetidas dentro de GameCanvas.tsx. Ahora GameCanvas las importa de aquí
 * y los tests (tests/balance.test.ts) y el informe (scripts/balance-report.ts) usan
 * exactamente las mismas, así que lo que se analiza es lo que se juega.
 */

export const TOWER_MAX_LEVEL = 7;
export const STARTING_LIVES = 100;
export const BASE_STARTING_MONEY = 450;
export const FRAMES_PER_SECOND = 60;

/** Dinero inicial: 450 + 50 por nivel de "Reserves". */
export const getStartingMoney = (cashLevel: number): number => BASE_STARTING_MONEY + cashLevel * 50;

/** Coste de subir una torre desde `currentLevel` al siguiente: 60% del coste base + 20% por nivel actual. */
export const getUpgradeCost = (baseCost: number, currentLevel: number): number =>
  Math.floor(baseCost * 0.6 + baseCost * 0.2 * currentLevel);

/** Multiplicador de vida por oleada (curva de campaña, antes de dificultad y modo Endless). */
export const getWaveHpMultiplier = (waveNum: number): number =>
  1 + Math.pow(Math.max(1, waveNum) - 1, 1.6) / 12;

/** Multiplicador de recompensa por kill según oleada. */
export const getRewardMultiplier = (waveNum: number, isEndless: boolean): number =>
  1 + Math.pow(Math.max(1, waveNum), 0.4) * 0.1 * (isEndless ? 1 + Math.max(1, waveNum) * 0.025 : 1);

export interface UpgradableStats {
  damage: number;
  range: number;
  cooldown: number;
}

/**
 * Estadísticas tras subir un nivel. Flamethrower y Shockwave ganan más daño y cadencia, sin alcance.
 * El resto gana 30% de daño y 10% de alcance. Todas ganan además 5% de daño.
 */
export const applyUpgradeStats = (type: string, s: UpgradableStats): UpgradableStats => {
  let damage = Math.floor(s.damage * 1.05);
  let range = s.range;
  let cooldown = s.cooldown;
  if (type === 'FLAMETHROWER' || type === 'SHOCKWAVE') {
    damage = Math.floor(damage * 1.45);
    cooldown = Math.max(2, cooldown * 0.9);
  } else {
    damage = Math.floor(damage * 1.3);
    range = Math.floor(range * 1.1);
  }
  return { damage, range, cooldown };
};
