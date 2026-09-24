/**
 * Dynamic Enemy Scaling System for 'Endless' Mode
 * Scales both Mutant Health and Mutant Speed progressively with each wave
 * to continuously escalate challenge, test crowd control synergies, and reward strategic placement.
 */

export interface EndlessScalingModifiers {
  waveNumber: number;
  isEndless: boolean;
  hpMultiplier: number;
  speedMultiplier: number;
  threatTier: number;
  threatLabel: string;
  threatColor: string;
  bonusHpPercent: number;
  bonusSpeedPercent: number;
}

export const getEndlessScaling = (waveNumber: number, isEndless: boolean): EndlessScalingModifiers => {
  const currentWave = Math.max(1, waveNumber);

  if (!isEndless) {
    return {
      waveNumber: currentWave,
      isEndless: false,
      hpMultiplier: 1.0,
      speedMultiplier: 1.0,
      threatTier: 1,
      threatLabel: 'Standard Threat',
      threatColor: '#60a5fa',
      bonusHpPercent: 0,
      bonusSpeedPercent: 0
    };
  }

  // --- HEALTH SCALING (ENDLESS) ---
  // Exponential base compounding (6.5% per wave) combined with a progressive linear/polynomial modifier
  // Ensures early endless waves ramp up smoothly while high waves (20, 30, 50+) deliver true endgame tension.
  const waveOffset = currentWave - 1;
  const baseCompound = Math.pow(1.065, waveOffset);
  const progressiveGrowth = 1 + (waveOffset * 0.038) + (Math.pow(Math.max(0, waveOffset - 5), 1.25) * 0.015);
  const rawHpMultiplier = baseCompound * progressiveGrowth;
  const hpMultiplier = Number(rawHpMultiplier.toFixed(3));

  // --- SPEED SCALING (ENDLESS) ---
  // Smooth progressive speed acceleration with logarithmic dampening to keep enemies navigable
  // and responsive without clipping or teleporting through the waypoint system.
  // Wave 1: 1.00x (+0%)
  // Wave 5: ~1.14x (+14%)
  // Wave 10: ~1.28x (+28%)
  // Wave 20: ~1.52x (+52%)
  // Wave 35: ~1.82x (+82%)
  // Wave 50+: ~2.15x (+115%), capped gracefully at 2.35x (+135%)
  const speedProgression = (waveOffset * 0.024) + (Math.log10(1 + waveOffset * 0.15) * 0.26);
  const rawSpeedMultiplier = Math.min(2.35, 1 + speedProgression);
  const speedMultiplier = Number(rawSpeedMultiplier.toFixed(3));

  // --- THREAT DESIGNATION ---
  const threatTier = Math.max(1, Math.floor(1 + waveOffset / 3));

  let threatLabel = 'Alpha Mutants';
  let threatColor = '#38bdf8'; // Sky blue

  if (threatTier >= 15) {
    threatLabel = 'Catastrophic Apex';
    threatColor = '#f43f5e'; // Rose red
  } else if (threatTier >= 10) {
    threatLabel = 'Hyper Overclock';
    threatColor = '#c084fc'; // Purple
  } else if (threatTier >= 6) {
    threatLabel = 'Viral Swarm';
    threatColor = '#fb923c'; // Orange
  } else if (threatTier >= 3) {
    threatLabel = 'Frenzied Strain';
    threatColor = '#facc15'; // Amber
  }

  const bonusHpPercent = Math.max(0, Math.round((hpMultiplier - 1) * 100));
  const bonusSpeedPercent = Math.max(0, Math.round((speedMultiplier - 1) * 100));

  return {
    waveNumber: currentWave,
    isEndless: true,
    hpMultiplier,
    speedMultiplier,
    threatTier,
    threatLabel,
    threatColor,
    bonusHpPercent,
    bonusSpeedPercent
  };
};
