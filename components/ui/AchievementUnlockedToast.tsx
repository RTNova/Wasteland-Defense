import React from 'react';
import { Trophy, Zap } from 'lucide-react';

interface AchievementUnlockedToastProps {
  achievement: {
    title: string;
    description: string;
    rewardTP: number;
  } | null;
}

export const AchievementUnlockedToast: React.FC<AchievementUnlockedToastProps> = ({ achievement }) => {
  if (!achievement) return null;

  return (
    <div 
      aria-live="assertive"
      className="fixed top-20 right-6 z-50 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300"
    >
      <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-neutral-900/95 text-white border-2 border-amber-500/80 shadow-[0_8px_30px_rgba(245,158,11,0.35)] backdrop-blur-md max-w-sm select-none">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-black">
              Achievement Unlocked!
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-yellow-400 font-bold bg-yellow-950/60 px-2 py-0.5 rounded-full border border-yellow-700/50">
              <Zap className="w-3 h-3 fill-current text-yellow-500" /> +{achievement.rewardTP} TP
            </span>
          </div>
          <h4 className="text-sm font-bold text-white truncate mt-0.5">
            {achievement.title}
          </h4>
          <p className="text-[11px] text-neutral-400 line-clamp-1">
            {achievement.description}
          </p>
        </div>
      </div>
    </div>
  );
};
