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

/**
 * Incinerator (nerf). Antes: cada llama atravesaba hasta 99 enemigos (pierce 99) y el daño subía x1.52 por nivel,
 * así que con 10 Matrioskas juntas el daño se multiplicaba por 10 y todo moría en ~1 s.
 */
export const FLAME_MAX_TARGETS = 3; // enemigos que puede golpear una misma llama (antes 99)
export const FLAME_UPGRADE_DAMAGE_MULT = 1.25; // por nivel, además del +5% general (antes 1.45)
export const FLAME_UPGRADE_COOLDOWN_MULT = 0.95; // por nivel (antes 0.9)
export const FLAME_BURST_SHOTS = 10; // llamas por ráfaga
export const FLAME_BURST_PAUSE_FRAMES = 30; // pausa tras cada ráfaga

/** DPS real del Incinerator contra un objetivo, contando la pausa entre ráfagas. */
export const flameRealDps = (damage: number, cooldownFrames: number): number => {
  const cycleFrames = FLAME_BURST_SHOTS * cooldownFrames + FLAME_BURST_PAUSE_FRAMES;
  return (damage * FLAME_BURST_SHOTS * FRAMES_PER_SECOND) / cycleFrames;
};

/** Segundos que tarda un Incinerator en limpiar `count` enemigos juntos de `hp` de vida cada uno. */
export const flameSecondsToClear = (damage: number, cooldownFrames: number, count: number, hp: number): number => {
  const perTarget = flameRealDps(damage, cooldownFrames);
  return (count * hp) / (perTarget * Math.min(count, FLAME_MAX_TARGETS));
};

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
  if (type === 'FLAMETHROWER') {
    damage = Math.floor(damage * FLAME_UPGRADE_DAMAGE_MULT);
    cooldown = Math.max(2, cooldown * FLAME_UPGRADE_COOLDOWN_MULT);
  } else if (type === 'SHOCKWAVE') {
    damage = Math.floor(damage * 1.45);
    cooldown = Math.max(2, cooldown * 0.9);
  } else {
    damage = Math.floor(damage * 1.3);
    range = Math.floor(range * 1.1);
  }
  return { damage, range, cooldown };
};
