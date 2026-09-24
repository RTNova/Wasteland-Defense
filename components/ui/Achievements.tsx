import React, { useState } from 'react';
import { 
  Trophy, ChevronLeft, CheckCircle2, Lock, Zap, 
  Skull, Swords, Flame, ShieldAlert, Coins, Crown, 
  Map, Infinity as InfinityIcon, Crosshair, ArrowUpCircle, Award
} from 'lucide-react';
import { ACHIEVEMENTS, INITIAL_PROGRESS_STATS } from '../../config/achievements';
import { PlayerProgress } from '../../types/index';
import { soundManager } from '../../config/soundManager';

interface AchievementsProps {
  progress: PlayerProgress;
  onBack: () => void;
}

export const Achievements: React.FC<AchievementsProps> = ({ 
  progress, 
  onBack 
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');
  const [category, setCategory] = useState<'ALL' | 'COMBAT' | 'ECONOMY' | 'CAMPAIGN' | 'UPGRADES'>('ALL');

  const stats = progress.stats || INITIAL_PROGRESS_STATS;
  const unlockedIds = new Set(progress.unlockedAchievements || []);

  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter(a => unlockedIds.has(a.id)).length;
  const completionPercent = Math.round((unlockedCount / totalAchievements) * 100);

  const getIcon = (iconName: string, isUnlocked: boolean) => {
    const props = { 
      className: `w-6 h-6 ${isUnlocked ? 'text-amber-400' : 'text-neutral-500'}` 
    };

    switch (iconName) {
      case 'Skull': return <Skull {...props} />;
      case 'Swords': return <Swords {...props} />;
      case 'Flame': return <Flame {...props} />;
      case 'ShieldAlert': return <ShieldAlert {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Coins': return <Coins {...props} />;
      case 'Crown': return <Crown {...props} />;
      case 'Trophy': return <Trophy {...props} />;
      case 'Map': return <Map {...props} />;
      case 'Infinity': return <InfinityIcon {...props} />;
      case 'Crosshair': return <Crosshair {...props} />;
      case 'ArrowUpCircle': return <ArrowUpCircle {...props} />;
      default: return <Award {...props} />;
    }
  };

  const filteredAchievements = ACHIEVEMENTS.filter(a => {
    const isUnlocked = unlockedIds.has(a.id);
    if (filter === 'UNLOCKED' && !isUnlocked) return false;
    if (filter === 'LOCKED' && isUnlocked) return false;
    if (category !== 'ALL' && a.category !== category) return false;
    return true;
  });

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-neutral-800 text-sm font-mono"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Base
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs font-mono">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{unlockedCount} / {totalAchievements} Unlocked ({completionPercent}%)</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border border-neutral-800 p-6 md:p-8 mb-6 shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-title tracking-wider text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              COMMANDER ACHIEVEMENTS
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-xl font-mono">
              Complete wasteland milestones, purge mutated hordes, and amass defensive tech to unlock honors and earn bonus Tech Points.
            </p>
          </div>

          {/* Overall Progress Gauge */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 min-w-[200px] flex flex-col gap-2 shadow-inner">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-neutral-400">Total Mastery</span>
              <span className="text-amber-400 font-bold">{completionPercent}%</span>
            </div>
            <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-700">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-neutral-500 font-mono text-center">
              {unlockedCount === totalAchievements ? 'ALL MILESTONES COMPLETED!' : `${totalAchievements - unlockedCount} milestones remaining`}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-neutral-900/80 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
          <button
            onClick={() => { soundManager.playClick(); setFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'ALL' 
                ? 'bg-neutral-800 text-white font-bold shadow-sm' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            All ({totalAchievements})
          </button>
          <button
            onClick={() => { soundManager.playClick(); setFilter('UNLOCKED'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              filter === 'UNLOCKED' 
                ? 'bg-amber-600 text-white font-bold shadow-sm' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" /> Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => { soundManager.playClick(); setFilter('LOCKED'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              filter === 'LOCKED' 
                ? 'bg-neutral-800 text-white font-bold shadow-sm' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-neutral-500" /> Locked ({totalAchievements - unlockedCount})
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
          {(['ALL', 'COMBAT', 'ECONOMY', 'CAMPAIGN', 'UPGRADES'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => { soundManager.playClick(); setCategory(cat); }}
              className={`px-2.5 py-1 rounded-md transition border ${
                category === cat
                  ? 'bg-neutral-700/80 border-neutral-500 text-white font-bold'
                  : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAchievements.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const rawCurrent = achievement.getValue(stats, progress);
          const current = Math.min(achievement.targetValue, rawCurrent);
          const progressPercent = Math.min(100, Math.round((current / achievement.targetValue) * 100));

          return (
            <div 
              key={achievement.id}
              className={`relative rounded-xl border p-5 transition-all overflow-hidden flex flex-col justify-between ${
                isUnlocked
                  ? 'bg-gradient-to-br from-neutral-900 to-amber-950/20 border-amber-600/40 shadow-lg shadow-amber-950/20'
                  : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 opacity-90'
              }`}
            >
              {/* Corner Status Badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-xl border flex items-center justify-center shrink-0 ${
                    isUnlocked
                      ? 'bg-amber-950/50 border-amber-500/40 shadow-inner'
                      : 'bg-neutral-800/80 border-neutral-700/60'
                  }`}>
                    {getIcon(achievement.iconName, isUnlocked)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-base leading-snug ${isUnlocked ? 'text-white' : 'text-neutral-300'}`}>
                        {achievement.title}
                      </h3>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-400 border border-neutral-700/50">
                        {achievement.category}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      {achievement.description}
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="shrink-0">
                  {isUnlocked ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>UNLOCKED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-800/80 border border-neutral-700 text-neutral-500 text-[11px] font-mono">
                      <Lock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>LOCKED</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar & Reward Footer */}
              <div className="pt-3 border-t border-neutral-800/80 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-neutral-400">
                    Progress: <strong className={isUnlocked ? 'text-amber-300' : 'text-neutral-200'}>{current.toLocaleString()}</strong> / {achievement.targetValue.toLocaleString()}
                  </span>
                  <span className={`text-[11px] font-bold ${isUnlocked ? 'text-emerald-400' : 'text-neutral-400'}`}>
                    {progressPercent}%
                  </span>
                </div>

                <div className="w-full h-2 bg-neutral-800/90 rounded-full overflow-hidden border border-neutral-700/50">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isUnlocked 
                        ? 'bg-gradient-to-r from-emerald-500 to-amber-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' 
                        : 'bg-neutral-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-yellow-400 font-bold">
                    <Zap className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                    <span>+{achievement.rewardTP} TP</span>
                  </div>

                  <span className="text-[10px] font-mono text-neutral-500">
                    {isUnlocked ? 'Milestone achieved' : 'Automatic claim upon unlock'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-16 bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-500 font-mono text-sm">
          No achievements match the current filters.
        </div>
      )}
    </main>
  );
};
