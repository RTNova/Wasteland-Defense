export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'COMBAT' | 'ECONOMY' | 'UPGRADES' | 'CAMPAIGN';
  targetValue: number;
  rewardTP: number;
  iconName: string; // Lucide icon identifier
  getValue: (stats: PlayerProgressStats, progress: { techPoints: number; completedMaps: string[]; upgrades: any }) => number;
}

export interface PlayerProgressStats {
  mutantsKilled: number;
  bossesKilled: number;
  totalTechPointsEarned: number;
  wavesCleared: number;
  endlessWaveRecord: number;
  towersBuilt: number;
}

export const INITIAL_PROGRESS_STATS: PlayerProgressStats = {
  mutantsKilled: 0,
  bossesKilled: 0,
  totalTechPointsEarned: 0,
  wavesCleared: 0,
  endlessWaveRecord: 0,
  towersBuilt: 0,
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'defeat_100_mutants',
    title: 'Wasteland Cleaner',
    description: 'Defeat 100 mutants across your defense missions.',
    category: 'COMBAT',
    targetValue: 100,
    rewardTP: 50,
    iconName: 'Skull',
    getValue: (stats) => stats.mutantsKilled || 0,
  },
  {
    id: 'defeat_500_mutants',
    title: 'Purge Veteran',
    description: 'Defeat 500 mutants in total.',
    category: 'COMBAT',
    targetValue: 500,
    rewardTP: 150,
    iconName: 'Swords',
    getValue: (stats) => stats.mutantsKilled || 0,
  },
  {
    id: 'defeat_1000_mutants',
    title: 'Extinction Protocol',
    description: 'Defeat 1,000 mutants in the wasteland.',
    category: 'COMBAT',
    targetValue: 1000,
    rewardTP: 300,
    iconName: 'Flame',
    getValue: (stats) => stats.mutantsKilled || 0,
  },
  {
    id: 'defeat_5_bosses',
    title: 'Apex Slayer',
    description: 'Defeat 5 boss mutations in combat.',
    category: 'COMBAT',
    targetValue: 5,
    rewardTP: 100,
    iconName: 'ShieldAlert',
    getValue: (stats) => stats.bossesKilled || 0,
  },
  {
    id: 'save_500_tech_points',
    title: 'Tech Hoarder',
    description: 'Save 500 Tech Points in your treasury.',
    category: 'ECONOMY',
    targetValue: 500,
    rewardTP: 75,
    iconName: 'Zap',
    getValue: (_, progress) => progress.techPoints || 0,
  },
  {
    id: 'save_1000_tech_points',
    title: 'Tech Tycoon',
    description: 'Save 1,000 Tech Points in your profile balance.',
    category: 'ECONOMY',
    targetValue: 1000,
    rewardTP: 200,
    iconName: 'Coins',
    getValue: (_, progress) => progress.techPoints || 0,
  },
  {
    id: 'save_2500_tech_points',
    title: 'Apex Technocrat',
    description: 'Amass 2,500 Tech Points in your vault.',
    category: 'ECONOMY',
    targetValue: 2500,
    rewardTP: 500,
    iconName: 'Crown',
    getValue: (_, progress) => progress.techPoints || 0,
  },
  {
    id: 'clear_first_map',
    title: 'First Stronghold',
    description: 'Successfully complete any campaign sector map.',
    category: 'CAMPAIGN',
    targetValue: 1,
    rewardTP: 100,
    iconName: 'Trophy',
    getValue: (_, progress) => progress.completedMaps?.length || 0,
  },
  {
    id: 'clear_3_maps',
    title: 'Sector Liberator',
    description: 'Conquer 3 distinct wasteland sectors.',
    category: 'CAMPAIGN',
    targetValue: 3,
    rewardTP: 250,
    iconName: 'Map',
    getValue: (_, progress) => progress.completedMaps?.length || 0,
  },
  {
    id: 'survive_wave_25',
    title: 'Iron Bulwark',
    description: 'Survive to Wave 25 in any mission or Endless Op.',
    category: 'CAMPAIGN',
    targetValue: 25,
    rewardTP: 150,
    iconName: 'Infinity',
    getValue: (stats) => Math.max(stats.wavesCleared || 0, stats.endlessWaveRecord || 0),
  },
  {
    id: 'build_50_towers',
    title: 'Architect of War',
    description: 'Construct 50 defensive turrets across missions.',
    category: 'UPGRADES',
    targetValue: 50,
    rewardTP: 100,
    iconName: 'Crosshair',
    getValue: (stats) => stats.towersBuilt || 0,
  },
  {
    id: 'upgrade_arsenal',
    title: 'Arms Race',
    description: 'Purchase at least 8 Armory upgrades across all categories.',
    category: 'UPGRADES',
    targetValue: 8,
    rewardTP: 150,
    iconName: 'ArrowUpCircle',
    getValue: (_, progress) => {
      const u = progress.upgrades || {};
      return (u.damageLevel || 0) + (u.rangeLevel || 0) + (u.discountLevel || 0) + (u.cashLevel || 0);
    },
  },
];
