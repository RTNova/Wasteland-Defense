export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface DifficultyConfig {
  id: DifficultyLevel;
  name: string;
  badgeLabel: string;
  tagline: string;
  description: string;
  // Multipliers
  healthMultiplier: number;        // Adjusts mutant health (e.g., 0.8x, 1.0x, 1.45x)
  densityMultiplier: number;       // Adjusts wave density / mutant pack counts (e.g., 0.8x, 1.0x, 1.35x)
  spacingMultiplier: number;       // Adjusts spawn interval (lower = denser/faster spawn rush, e.g., 1.25x, 1.0x, 0.75x)
  techPointReward: number;         // Tiered Tech Point reward upon map completion
  waveTechPointMultiplier: number; // Multiplier on per-wave Tech Points
  // UI styling
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  glowColor: string;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  EASY: {
    id: 'EASY',
    name: 'Easy',
    badgeLabel: 'EASY',
    tagline: 'Reconnaissance Protocol',
    description: 'Reduced mutant vitality and thinned hordes. Generous spawn intervals for controlled defense.',
    healthMultiplier: 0.8,
    densityMultiplier: 0.8,
    spacingMultiplier: 1.25,
    techPointReward: 150,
    waveTechPointMultiplier: 0.85,
    color: '#10b981',
    badgeBg: 'bg-emerald-950/60',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.35)',
  },
  MEDIUM: {
    id: 'MEDIUM',
    name: 'Medium',
    badgeLabel: 'MEDIUM',
    tagline: 'Standard Purge Protocol',
    description: 'Standard wasteland combat engagement. Balanced mutant durability, pack density, and tactical bounties.',
    healthMultiplier: 1.0,
    densityMultiplier: 1.0,
    spacingMultiplier: 1.0,
    techPointReward: 300,
    waveTechPointMultiplier: 1.0,
    color: '#f59e0b',
    badgeBg: 'bg-amber-950/60',
    badgeBorder: 'border-amber-500/50',
    badgeText: 'text-amber-400',
    glowColor: 'rgba(245, 158, 11, 0.35)',
  },
  HARD: {
    id: 'HARD',
    name: 'Hard',
    badgeLabel: 'HARD',
    tagline: 'Extinction Zone Protocol',
    description: 'Reinforced mutant vitality and high-density swarms with rapid spawn surges. Maximum Tech Point bounty.',
    healthMultiplier: 1.45,
    densityMultiplier: 1.35,
    spacingMultiplier: 0.75,
    techPointReward: 600,
    waveTechPointMultiplier: 1.4,
    color: '#ef4444',
    badgeBg: 'bg-red-950/60',
    badgeBorder: 'border-red-500/50',
    badgeText: 'text-red-400',
    glowColor: 'rgba(239, 68, 68, 0.35)',
  },
};

export const DEFAULT_DIFFICULTY: DifficultyLevel = 'MEDIUM';

export const getDifficultyConfig = (diff?: string | null): DifficultyConfig => {
  if (diff === 'EASY') return DIFFICULTY_CONFIGS.EASY;
  if (diff === 'HARD' || diff === 'EXTREME') return DIFFICULTY_CONFIGS.HARD;
  return DIFFICULTY_CONFIGS.MEDIUM;
};
