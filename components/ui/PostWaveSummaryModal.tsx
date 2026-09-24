import React, { useEffect, useState } from 'react';
import { 
  Skull, Zap, Heart, ArrowRight, Eye, Trophy, 
  Award, Crosshair, Coins, Repeat
} from 'lucide-react';
import { TowerType } from '../../types/index';
import { soundManager } from '../../config/soundManager';

export interface WaveSummaryData {
  waveNumber: number;
  totalWaves: number;
  isEndless: boolean;
  isBossWave: boolean;
  isFinalWave: boolean;
  mapName: string;
  mapDifficulty: string;
  
  // Enemies Defeated
  enemiesDefeatedWave: number;
  enemiesDefeatedTotal: number;
  enemyTypeBreakdown: Record<string, number>;
  
  // Tech Points
  techPointsEarnedWave: number;
  techPointsBreakdown: {
    base: number;
    flawlessBonus: number;
    bossBonus: number;
    mapClearBonus?: number;
  };
  totalTechPointsEarnedMatch: number;
  totalBankedTechPoints: number;
  
  // Health
  currentLives: number;
  maxLives: number;
  livesLostThisWave: number;
  
  // Economy & Combat
  moneyEarnedWave: number;
  currentMoney: number;
  waveDamageDealt: number;
  
  // MVP Tower
  mvpTower?: {
    name: string;
    type: TowerType;
    level: number;
    damageThisWave: number;
  };
}

interface PostWaveSummaryModalProps {
  summary: WaveSummaryData;
  isOpen: boolean;
  onNextWave: () => void;
  onPrepareDefenses: () => void;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
  onReturnToBase?: () => void;
  onContinueEndless?: () => void;
}

export const PostWaveSummaryModal: React.FC<PostWaveSummaryModalProps> = ({
  summary,
  isOpen,
  onNextWave,
  onPrepareDefenses,
  autoPlay,
  onToggleAutoPlay,
  onReturnToBase,
  onContinueEndless,
}) => {
  const [countdown, setCountdown] = useState<number | null>(autoPlay ? 4 : null);

  // Auto-play countdown logic
  useEffect(() => {
    if (!isOpen) return;
    if (summary.isFinalWave && !summary.isEndless) {
      setCountdown(null);
      return;
    }

    if (autoPlay) {
      setCountdown(4);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            onNextWave();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [isOpen, autoPlay, summary.isFinalWave, summary.isEndless]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (summary.isFinalWave && !summary.isEndless && onContinueEndless) {
          onContinueEndless();
        } else {
          onNextWave();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onPrepareDefenses();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, summary.isFinalWave, summary.isEndless, onNextWave, onPrepareDefenses, onContinueEndless]);

  if (!isOpen) return null;

  const isFlawless = summary.livesLostThisWave === 0;
  const healthPercent = Math.max(0, Math.min(100, Math.round((summary.currentLives / summary.maxLives) * 100)));

  const getHealthColor = () => {
    if (healthPercent >= 75) return 'text-emerald-400 bg-emerald-500';
    if (healthPercent >= 35) return 'text-amber-400 bg-amber-500';
    return 'text-rose-500 bg-rose-600';
  };

  const getStatusBadge = () => {
    if (summary.isFinalWave && !summary.isEndless) {
      return { label: 'SECTOR PURGED · MISSION ACCOMPLISHED', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40' };
    }
    if (summary.isBossWave) {
      return { label: 'BOSS NEUTRALIZED', color: 'text-rose-400 border-rose-500/50 bg-rose-950/40' };
    }
    if (isFlawless) {
      return { label: 'FLAWLESS DEFENSE · 0 CASUALTIES', color: 'text-cyan-300 border-cyan-500/50 bg-cyan-950/40' };
    }
    return { label: 'PERIMETER SECURED', color: 'text-amber-300 border-amber-500/50 bg-amber-950/40' };
  };

  const status = getStatusBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-neutral-100 font-mono"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wave-summary-title"
      >
        {/* Modal Header */}
        <div className="relative p-5 pb-4 border-b border-neutral-800 bg-gradient-to-b from-neutral-850 to-neutral-900">
          <div className="flex items-center justify-between gap-3 text-xs tracking-wider text-neutral-400 uppercase mb-1">
            <span className="flex items-center gap-1.5 font-bold">
              <Crosshair className="w-3.5 h-3.5 text-red-500" />
              Tactical Combat Debrief
            </span>
            <span className="text-neutral-500">
              {summary.mapName} · {summary.mapDifficulty}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2 mt-1">
            <h2 id="wave-summary-title" className="text-2xl sm:text-3xl font-title tracking-tight text-white flex items-center gap-2">
              <span>WAVE {summary.waveNumber.toString().padStart(2, '0')}</span>
              <span className="text-neutral-500 font-mono text-base font-normal">
                {summary.isEndless ? '(ENDLESS)' : `/ ${summary.totalWaves.toString().padStart(2, '0')}`}
              </span>
            </h2>

            <span className={`px-2.5 py-1 text-xs font-bold tracking-wider rounded border ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto no-scrollbar">
          
          {/* Main 3 Metrics Cards: Enemies Defeated, Tech Points, Remaining Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* 1. Enemies Defeated */}
            <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-lg p-3.5 flex flex-col justify-between hover:border-neutral-600 transition">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span className="uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Skull className="w-4 h-4 text-red-400" /> Enemies Purged
                </span>
                <span className="text-[11px] text-neutral-500">Wave</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold font-mono text-red-400">
                    +{summary.enemiesDefeatedWave}
                  </span>
                  <span className="text-xs text-neutral-400">mutants</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between border-t border-neutral-700/60 pt-1.5">
                  <span>Match Total:</span>
                  <span className="font-bold text-neutral-200">{summary.enemiesDefeatedTotal} purged</span>
                </div>
              </div>

              {/* Enemy breakdown badges */}
              {Object.keys(summary.enemyTypeBreakdown).length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {Object.entries(summary.enemyTypeBreakdown).map(([type, count]) => (
                    <span 
                      key={type}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-neutral-700/50 text-neutral-300 font-mono"
                    >
                      {count}x {type.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Tech Points Earned */}
            <div className="bg-neutral-800/80 border border-amber-900/40 rounded-lg p-3.5 flex flex-col justify-between hover:border-amber-600/50 transition">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span className="uppercase tracking-wider font-bold text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400/20" /> Tech Points
                </span>
                <span className="text-[11px] text-amber-400/80">Earned</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold font-mono text-yellow-400">
                    +{summary.techPointsEarnedWave}
                  </span>
                  <span className="text-xs text-neutral-400">TP</span>
                </div>

                <div className="text-[11px] space-y-0.5 text-neutral-400 mt-1 border-t border-neutral-700/60 pt-1.5">
                  <div className="flex justify-between">
                    <span>Wave Clear:</span>
                    <span className="text-neutral-200">+{summary.techPointsBreakdown.base} TP</span>
                  </div>
                  {summary.techPointsBreakdown.flawlessBonus > 0 && (
                    <div className="flex justify-between text-cyan-300">
                      <span>Flawless Bonus:</span>
                      <span>+{summary.techPointsBreakdown.flawlessBonus} TP</span>
                    </div>
                  )}
                  {summary.techPointsBreakdown.bossBonus > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Boss Bounty:</span>
                      <span>+{summary.techPointsBreakdown.bossBonus} TP</span>
                    </div>
                  )}
                  {summary.techPointsBreakdown.mapClearBonus && summary.techPointsBreakdown.mapClearBonus > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Victory Bounty:</span>
                      <span>+{summary.techPointsBreakdown.mapClearBonus} TP</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2.5 text-[11px] bg-yellow-950/30 border border-yellow-800/40 px-2 py-1 rounded text-yellow-200 flex items-center justify-between font-mono">
                <span>Banked Reserves:</span>
                <span className="font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400 fill-current" /> {summary.totalBankedTechPoints} TP
                </span>
              </div>
            </div>

            {/* 3. Base Health / Remaining Lives */}
            <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-lg p-3.5 flex flex-col justify-between hover:border-neutral-600 transition">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span className="uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" /> Base Health
                </span>
                <span className="text-[11px] text-neutral-500">Integrity</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-3xl font-bold font-mono ${getHealthColor().split(' ')[0]}`}>
                    {summary.currentLives}
                  </span>
                  <span className="text-xs text-neutral-400">/ {summary.maxLives} HP</span>
                </div>

                {/* Health Bar */}
                <div className="w-full bg-neutral-950 rounded-full h-2 my-2 overflow-hidden border border-neutral-700/50">
                  <div 
                    className={`h-full transition-all duration-500 ${getHealthColor().split(' ')[1]}`}
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>

                <div className="text-[11px] flex items-center justify-between border-t border-neutral-700/60 pt-1.5">
                  <span className="text-neutral-400">Wave Damage:</span>
                  <span className={`font-bold ${isFlawless ? 'text-cyan-400' : 'text-rose-400'}`}>
                    {isFlawless ? '0 HP Lost' : `-${summary.livesLostThisWave} HP Lost`}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 text-[10px] text-neutral-400 flex items-center justify-between">
                <span>Perimeter Status:</span>
                <span className={`font-semibold ${healthPercent >= 75 ? 'text-emerald-400' : healthPercent >= 35 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {healthPercent >= 75 ? 'Optimal' : healthPercent >= 35 ? 'Compromised' : 'Critical'}
                </span>
              </div>
            </div>

          </div>

          {/* Secondary Stats Row: Tactical Economy & MVP Defender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Economy & Damage */}
            <div className="bg-neutral-800/50 border border-neutral-800 rounded-lg p-3">
              <div className="text-xs uppercase tracking-wider text-neutral-400 font-bold mb-2 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                Resource & Damage Logistics
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-neutral-900/70 p-2 rounded border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Cash Collected</div>
                  <div className="font-mono text-base font-bold text-yellow-500">+${summary.moneyEarnedWave}</div>
                  <div className="text-[10px] text-neutral-400">Total: ${summary.currentMoney}</div>
                </div>
                <div className="bg-neutral-900/70 p-2 rounded border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Wave Damage Output</div>
                  <div className="font-mono text-base font-bold text-orange-400">
                    {Math.round(summary.waveDamageDealt).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-neutral-400">Total fire applied</div>
                </div>
              </div>
            </div>

            {/* MVP Defender */}
            <div className="bg-neutral-800/50 border border-neutral-800 rounded-lg p-3 flex flex-col justify-between">
              <div className="text-xs uppercase tracking-wider text-neutral-400 font-bold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> Wave MVP Defense
                </span>
                <span className="text-[10px] text-amber-500 font-mono">TOP PERFORMANCE</span>
              </div>

              {summary.mvpTower ? (
                <div className="bg-neutral-900/80 p-2.5 rounded border border-neutral-700/60 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{summary.mvpTower.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-950/60 border border-yellow-700/50 text-yellow-300">
                        LVL {summary.mvpTower.level}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Primary elimination asset
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-amber-400">
                      {Math.round(summary.mvpTower.damageThisWave).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase">Wave DMG</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-500 italic p-3 text-center bg-neutral-900/40 rounded border border-neutral-800">
                  Defensive grid synchronized. All units contributed equally.
                </div>
              )}
            </div>

          </div>

          {/* Endless or Final Wave Notice */}
          {summary.isFinalWave && !summary.isEndless && (
            <div className="bg-emerald-950/40 border border-emerald-600/40 p-3.5 rounded-lg flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-300">
                <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                <span>
                  Map fully conquered! You can return to base or test your limits in <strong>Endless Mode</strong>.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex flex-col gap-3">
          
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
            <button
              onClick={onToggleAutoPlay}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition font-mono ${
                autoPlay 
                  ? 'bg-green-950/50 border-green-600 text-green-300' 
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Auto-Deploy: {autoPlay ? 'ON' : 'OFF'}</span>
            </button>

            {countdown !== null && (
              <span className="text-green-400 font-mono animate-pulse">
                Next wave launching in {countdown}s...
              </span>
            )}

            <div className="hidden sm:block text-[11px] text-neutral-500">
              <kbd className="px-1 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300">Space</kbd> Start Wave · <kbd className="px-1 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300">Esc</kbd> Prepare
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {summary.isFinalWave && !summary.isEndless ? (
              <>
                {onContinueEndless && (
                  <button
                    onClick={onContinueEndless}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50"
                  >
                    <Repeat className="w-4 h-4" /> Continue (Endless Mode)
                  </button>
                )}
                {onReturnToBase && (
                  <button
                    onClick={onReturnToBase}
                    className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-white text-neutral-900 font-bold rounded-lg uppercase tracking-wider transition flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-600" /> Claim Victory & Return
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onPrepareDefenses();
                  }}
                  className="sm:w-1/2 py-3 px-4 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white font-bold rounded-lg uppercase tracking-wider border border-neutral-700 transition flex items-center justify-center gap-2 text-xs sm:text-sm"
                  title="Close modal to inspect map and build/upgrade defenses"
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Prepare Defenses
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    onNextWave();
                  }}
                  className="sm:w-1/2 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 text-xs sm:text-sm group"
                >
                  <span>Deploy Wave {(summary.waveNumber + 1).toString().padStart(2, '0')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
