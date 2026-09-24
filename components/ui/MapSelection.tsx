import React, { useState } from 'react';
import { 
  ArrowRight, ChevronLeft, Infinity as InfinityIcon, 
  ShieldAlert, Zap, Skull, CheckCircle2, 
  Swords
} from 'lucide-react';
import { MAPS } from '../../config/constants';
import { GameMap, PlayerProgress, DifficultyLevel } from '../../types/index';
import { DIFFICULTY_CONFIGS, DifficultyConfig } from '../../config/difficulty';
import { soundManager } from '../../config/soundManager';

interface MapSelectionProps {
    progress: PlayerProgress;
    onSelectMap: (map: GameMap, difficulty: DifficultyLevel) => void;
    onBack: () => void;
    mode?: 'STANDARD' | 'ENDLESS';
}

export const MapSelection: React.FC<MapSelectionProps> = ({ 
  progress, 
  onSelectMap, 
  onBack, 
  mode = 'STANDARD' 
}) => {
  // Global difficulty selection (can also be toggled per card)
  const [globalDifficulty, setGlobalDifficulty] = useState<DifficultyLevel>('MEDIUM');
  // Per-map difficulty overrides
  const [mapDifficulties, setMapDifficulties] = useState<Record<string, DifficultyLevel>>({});

  const handleGlobalDifficultyChange = (diff: DifficultyLevel) => {
    soundManager.playClick();
    setGlobalDifficulty(diff);
    // Apply globally
    const updated: Record<string, DifficultyLevel> = {};
    MAPS.forEach(m => {
      updated[m.id] = diff;
    });
    setMapDifficulties(updated);
  };

  const handleCardDifficultyChange = (e: React.MouseEvent, mapId: string, diff: DifficultyLevel) => {
    e.stopPropagation();
    soundManager.playClick();
    setMapDifficulties(prev => ({
      ...prev,
      [mapId]: diff
    }));
  };

  const isMapClearedOnDifficulty = (mapId: string, diff: DifficultyLevel): boolean => {
    const key = `${mapId}_${diff}`;
    const diffs = progress.completedDifficulties || [];
    if (diffs.includes(key)) return true;
    // Backwards compatibility: if completed on standard map and diff is EASY or MEDIUM
    if (progress.completedMaps.includes(mapId) && diff === 'MEDIUM') return true;
    return false;
  };

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 animate-in slide-in-from-right-8 font-mono">
        <button 
            onClick={() => {
              soundManager.playClick();
              onBack();
            }}
            className="flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition group"
        >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
            <span>Back to Command</span>
        </button>

        {/* Header and Global Difficulty Selector */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 border-b border-neutral-800 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl sm:text-4xl font-title text-white tracking-wider">
                    {mode === 'ENDLESS' ? 'ENDLESS OPERATIONS' : 'DEPLOYMENT ZONES'}
                </h2>
                {mode === 'ENDLESS' && (
                    <span className="text-indigo-400 text-xs sm:text-sm font-bold flex items-center gap-1 bg-indigo-950/60 border border-indigo-500/40 px-2.5 py-1 rounded-full">
                        <InfinityIcon className="w-4 h-4" /> Infinite Waves
                    </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-neutral-400">
                Select combat theater and mission difficulty multipliers before deployment.
              </p>
            </div>

            {/* Global Difficulty Quick Preset */}
            <div className="bg-neutral-900 border border-neutral-800 p-2 sm:p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider px-1">
                <Swords className="w-4 h-4 text-neutral-500" />
                Difficulty Preset:
              </span>
              <div className="grid grid-cols-3 gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800/80">
                {(['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]).map((d) => {
                  const cfg = DIFFICULTY_CONFIGS[d];
                  const isActive = globalDifficulty === d;
                  return (
                    <button
                      key={d}
                      onClick={() => handleGlobalDifficultyChange(d)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isActive
                          ? `${cfg.badgeBg} ${cfg.badgeText} border ${cfg.badgeBorder} shadow-sm`
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                      }`}
                    >
                      <span>{cfg.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({cfg.healthMultiplier}x)</span>
                    </button>
                  );
                })}
              </div>
            </div>
        </div>

        {/* Global Multiplier Summary Banner */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]).map((d) => {
            const cfg = DIFFICULTY_CONFIGS[d];
            const isSelected = globalDifficulty === d;
            return (
              <div 
                key={d}
                onClick={() => handleGlobalDifficultyChange(d)}
                className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                  isSelected 
                    ? `${cfg.badgeBg} ${cfg.badgeBorder} ring-1 ring-inset ${cfg.badgeText} shadow-lg shadow-black/40`
                    : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText}`}>
                    {cfg.name}
                  </span>
                  <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" /> +{cfg.techPointReward} TP
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-1">
                  <div className="bg-neutral-950/50 p-1.5 rounded border border-neutral-800/50">
                    <span className="text-neutral-500 block text-[10px] uppercase">Mutant Vitality</span>
                    <span className="font-bold text-neutral-200">{cfg.healthMultiplier}x HP</span>
                  </div>
                  <div className="bg-neutral-950/50 p-1.5 rounded border border-neutral-800/50">
                    <span className="text-neutral-500 block text-[10px] uppercase">Wave Density</span>
                    <span className="font-bold text-neutral-200">{cfg.densityMultiplier}x Swarm</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Map Cards Grid */}
        <div className="flex flex-col md:block">
            <div className="md:hidden flex items-center gap-2 text-neutral-500 text-xs mb-2">
                <ArrowRight className="w-4 h-4" /> 
                <span>Swipe horizontally to view all deployment zones</span>
            </div>
            
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:pb-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible no-scrollbar">
                {MAPS.map((map) => {
                    const cardDifficulty = mapDifficulties[map.id] || globalDifficulty;
                    const diffConfig: DifficultyConfig = DIFFICULTY_CONFIGS[cardDifficulty];
                    const isCompletedCurrent = isMapClearedOnDifficulty(map.id, cardDifficulty);

                    return (
                        <div
                          key={map.id}
                          className={`snap-center shrink-0 w-[88vw] sm:w-[75vw] md:w-auto relative bg-neutral-900 rounded-xl overflow-hidden border-2 transition-all duration-300 flex flex-col justify-between ${
                              mode === 'ENDLESS' 
                              ? 'border-indigo-900/60 hover:border-indigo-500 hover:shadow-indigo-950/40 shadow-lg' 
                              : isCompletedCurrent 
                                ? 'border-neutral-800 hover:border-emerald-600/70 hover:shadow-emerald-950/30 shadow-lg' 
                                : 'border-neutral-800 hover:border-red-600/70 hover:shadow-red-950/30 shadow-lg'
                          }`}
                        >
                          {/* Map Preview Visualization Header */}
                          <div 
                            className="relative h-44 cursor-pointer overflow-hidden group"
                            style={{ backgroundColor: map.background }}
                            onClick={() => {
                              soundManager.playClick();
                              onSelectMap(map, cardDifficulty);
                            }}
                          >
                            <svg width="100%" height="100%" viewBox="0 0 800 600" className="w-full h-full opacity-60 group-hover:opacity-85 transition-opacity group-hover:scale-105 transition-transform duration-500">
                                <path 
                                    d={`M ${map.path.map(p => `${p.x},${p.y}`).join(' L ')}`} 
                                    fill="none" 
                                    stroke="#000" 
                                    strokeWidth="80" 
                                    strokeOpacity="0.5"
                                />
                                <path 
                                    d={`M ${map.path.map(p => `${p.x},${p.y}`).join(' L ')}`} 
                                    fill="none" 
                                    stroke={diffConfig.color} 
                                    strokeWidth="6" 
                                    strokeOpacity="0.4"
                                    strokeDasharray="20,20"
                                />
                            </svg>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/60 pointer-events-none" />

                            {/* Top Badges */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                              <span className="text-xs font-mono font-bold text-neutral-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-neutral-700/60">
                                {mode === 'ENDLESS' ? '∞ Waves' : `${map.waves} Waves`}
                              </span>

                              {isCompletedCurrent && mode === 'STANDARD' && (
                                <div className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1 backdrop-blur-sm animate-in fade-in">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> CLEARED
                                </div>
                              )}
                            </div>

                            {/* Title on Preview */}
                            <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                              <h3 className="text-2xl font-title text-white tracking-wide drop-shadow-md">
                                {map.name}
                              </h3>
                            </div>
                          </div>

                          {/* Card Content & Difficulty Controller */}
                          <div className="p-4 bg-neutral-900 flex-1 flex flex-col justify-between">
                            <div>
                              {/* Per-Card Difficulty Switcher */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                                  <span className="uppercase tracking-wider font-bold">Select Difficulty</span>
                                  <span className="text-[10px] text-neutral-500">Tiered Multipliers</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                                  {(['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]).map((d) => {
                                    const cfg = DIFFICULTY_CONFIGS[d];
                                    const isCurrent = cardDifficulty === d;
                                    const isDiffCleared = isMapClearedOnDifficulty(map.id, d);
                                    return (
                                      <button
                                        key={d}
                                        onClick={(e) => handleCardDifficultyChange(e, map.id, d)}
                                        className={`py-1.5 px-2 rounded text-[11px] font-bold transition flex items-center justify-center gap-1 relative ${
                                          isCurrent
                                            ? `${cfg.badgeBg} ${cfg.badgeText} border ${cfg.badgeBorder} shadow`
                                            : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                                        }`}
                                      >
                                        <span>{cfg.name}</span>
                                        {isDiffCleared && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Completed on this difficulty" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Multiplier Stats Badges */}
                              <div className="bg-neutral-950/80 border border-neutral-800/90 rounded-lg p-3 mb-3 font-mono space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-neutral-400 flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Mutant Health:
                                  </span>
                                  <span className={`font-bold ${diffConfig.badgeText}`}>
                                    {diffConfig.healthMultiplier}x Vitality
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-neutral-400 flex items-center gap-1.5">
                                    <Skull className="w-3.5 h-3.5 text-neutral-400" /> Wave Density:
                                  </span>
                                  <span className="text-neutral-200 font-bold">
                                    {diffConfig.densityMultiplier}x Swarm ({diffConfig.spacingMultiplier < 1 ? 'Tight' : diffConfig.spacingMultiplier > 1 ? 'Sparse' : 'Standard'})
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs border-t border-neutral-800/80 pt-1.5">
                                  <span className="text-neutral-400 flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" /> Victory Bounty:
                                  </span>
                                  <span className="font-bold text-yellow-400">
                                    +{diffConfig.techPointReward} TP
                                  </span>
                                </div>
                              </div>

                              {/* Difficulty Mastery Trophies */}
                              <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-3 px-1">
                                <span>Mastery Medals:</span>
                                <div className="flex items-center gap-1">
                                  {(['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]).map((d) => {
                                    const cleared = isMapClearedOnDifficulty(map.id, d);
                                    const cfg = DIFFICULTY_CONFIGS[d];
                                    return (
                                      <span
                                        key={d}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                          cleared
                                            ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`
                                            : 'bg-neutral-950 text-neutral-600 border-neutral-850'
                                        }`}
                                        title={`${d}: ${cleared ? 'Conquered' : 'Not Cleared'}`}
                                      >
                                        {d[0]}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Launch Button */}
                            <button
                              onClick={() => {
                                soundManager.playClick();
                                onSelectMap(map, cardDifficulty);
                              }}
                              className={`w-full py-2.5 px-4 rounded-lg font-bold uppercase tracking-wider text-xs sm:text-sm transition flex items-center justify-center gap-2 group ${
                                mode === 'ENDLESS'
                                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                                  : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40'
                              }`}
                            >
                              <span>Deploy · {cardDifficulty}</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </main>
  );
};
