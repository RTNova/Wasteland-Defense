import React, { useState } from 'react';
import { 
  X, Volume2, VolumeX, Music, Bell, BellOff, 
  Save, Play, FastForward, Repeat, LogOut, 
  CheckCircle2, Shield, Sliders, Sparkles, AlertTriangle
} from 'lucide-react';
import { soundManager, SoundSettings } from '../../config/soundManager';

interface GameMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundSettings: SoundSettings;
  onUpdateSoundSettings: (updated: Partial<SoundSettings>) => void;
  onSaveGame?: () => void;
  autoPlay?: boolean;
  onToggleAutoPlay?: () => void;
  gameSpeed?: number;
  onToggleSpeed?: () => void;
  onReturnToBase: () => void;
  currentWave?: number;
  totalWaves?: number;
  isEndless?: boolean;
  mapName?: string;
  difficultyName?: string;
}

export const GameMenuModal: React.FC<GameMenuModalProps> = ({
  isOpen,
  onClose,
  soundSettings,
  onUpdateSoundSettings,
  onSaveGame,
  autoPlay,
  onToggleAutoPlay,
  gameSpeed = 1,
  onToggleSpeed,
  onReturnToBase,
  currentWave = 1,
  totalWaves = 20,
  isEndless = false,
  mapName = 'Wasteland',
  difficultyName = 'Standard'
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  if (!isOpen) return null;

  const isMasterMuted = soundSettings.musicMuted && soundSettings.sfxMuted;

  const handleToggleMasterMute = () => {
    soundManager.playClick();
    if (isMasterMuted) {
      onUpdateSoundSettings({ musicMuted: false, sfxMuted: false });
    } else {
      onUpdateSoundSettings({ musicMuted: true, sfxMuted: true });
    }
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const updates: Partial<SoundSettings> = { musicVolume: val };
    if (val > 0 && soundSettings.musicMuted) {
      updates.musicMuted = false;
    }
    onUpdateSoundSettings(updates);
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const updates: Partial<SoundSettings> = { sfxVolume: val };
    if (val > 0 && soundSettings.sfxMuted) {
      updates.sfxMuted = false;
    }
    onUpdateSoundSettings(updates);
  };

  const handleTestSfx = () => {
    soundManager.playEnemyKilled();
  };

  const handleSaveClick = () => {
    soundManager.playClick();
    setJustSaved(true);
    if (onSaveGame) {
      onSaveGame();
    }
    setTimeout(() => {
      setJustSaved(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-neutral-900 border-2 border-neutral-700/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] text-neutral-100 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-title tracking-wider text-white">
                TACTICAL MENU & SETTINGS
              </h2>
              <p className="text-[11px] text-neutral-400">
                {mapName} • {difficultyName} • {isEndless ? `Endless Wave ${currentWave}` : `Wave ${currentWave}/${totalWaves}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
            title="Resume Game (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* SECTION 1: AUDIO CONFIGURATION */}
          <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Audio & Acoustics
                </span>
              </div>
              <button
                onClick={handleToggleMasterMute}
                className={`text-xs px-2.5 py-1 rounded font-bold transition flex items-center gap-1.5 border ${
                  isMasterMuted
                    ? 'bg-red-950/40 border-red-800 text-red-400 hover:bg-red-900/50'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-700'
                }`}
              >
                {isMasterMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isMasterMuted ? 'Unmute All' : 'Mute All'}
              </button>
            </div>

            {/* MUSIC SLIDER */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onUpdateSoundSettings({ musicMuted: !soundSettings.musicMuted });
                    }}
                    className={`p-1 rounded transition ${
                      soundSettings.musicMuted
                        ? 'bg-neutral-800 text-neutral-500 hover:text-neutral-400'
                        : 'bg-indigo-950/60 border border-indigo-500/40 text-indigo-300'
                    }`}
                    title={soundSettings.musicMuted ? 'Unmute Music' : 'Mute Music'}
                  >
                    {soundSettings.musicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                  </button>
                  <span className="font-bold text-neutral-200">Music Volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">Ambient Drone</span>
                  <span className="text-xs font-mono font-bold text-indigo-400 w-9 text-right">
                    {soundSettings.musicMuted ? '0%' : `${Math.round((soundSettings.musicVolume ?? 0.35) * 100)}%`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={soundSettings.musicMuted ? 0 : (soundSettings.musicVolume ?? 0.35)}
                  onChange={handleMusicVolumeChange}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* SFX SLIDER */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onUpdateSoundSettings({ sfxMuted: !soundSettings.sfxMuted });
                    }}
                    className={`p-1 rounded transition ${
                      soundSettings.sfxMuted
                        ? 'bg-neutral-800 text-neutral-500 hover:text-neutral-400'
                        : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                    }`}
                    title={soundSettings.sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                  >
                    {soundSettings.sfxMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  </button>
                  <span className="font-bold text-neutral-200">Sound Effects (SFX)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestSfx}
                    disabled={soundSettings.sfxMuted || soundSettings.sfxVolume === 0}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                    title="Play test audio pop"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Test SFX
                  </button>
                  <span className="text-xs font-mono font-bold text-emerald-400 w-9 text-right">
                    {soundSettings.sfxMuted ? '0%' : `${Math.round((soundSettings.sfxVolume ?? 0.5) * 100)}%`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={soundSettings.sfxMuted ? 0 : (soundSettings.sfxVolume ?? 0.5)}
                  onChange={handleSfxVolumeChange}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: AUTOSAVE & PERSISTENCE */}
          <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Mission Persistence
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Auto-Saves After Every Round
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Tactical progress, banked Tech Points, and stats are saved automatically at the completion of every wave with a 3-second visual confirmation.
            </p>

            <button
              onClick={handleSaveClick}
              disabled={justSaved}
              className={`w-full py-2.5 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 transition ${
                justSaved
                  ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                  : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200 hover:text-white'
              }`}
            >
              {justSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                  Mission Saved Successfully!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-400" />
                  Save Game Now (Instant Cloud/Local Backup)
                </>
              )}
            </button>
          </div>

          {/* SECTION 3: GAMEPLAY CONTROLS */}
          {(onToggleAutoPlay || onToggleSpeed) && (
            <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-neutral-800/80">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Combat Mechanics
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {onToggleAutoPlay && (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onToggleAutoPlay();
                    }}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition ${
                      autoPlay
                        ? 'bg-blue-950/40 border-blue-500/60 text-blue-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5" /> Auto-Deploy
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${autoPlay ? 'bg-blue-500/20 text-blue-300' : 'bg-neutral-800 text-neutral-500'}`}>
                        {autoPlay ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      Auto-starts next wave
                    </span>
                  </button>
                )}

                {onToggleSpeed && (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onToggleSpeed();
                    }}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition ${
                      gameSpeed > 1
                        ? 'bg-yellow-950/40 border-yellow-500/60 text-yellow-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <FastForward className="w-3.5 h-3.5" /> Combat Speed
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-neutral-800 text-yellow-400">
                        {gameSpeed}x
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      Toggle 1x or 2x speed
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* EXIT / SURRENDER CONFIRMATION */}
          {showExitConfirm ? (
            <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase">
                <AlertTriangle className="w-4 h-4" /> Return to Base Warning
              </div>
              <p className="text-xs text-neutral-300">
                Are you sure you want to abort the current mission? All Tech Points and waves saved up to the last completed round are preserved.
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onReturnToBase();
                  }}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition"
                >
                  Confirm Exit
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs uppercase tracking-wider transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-3">
          {!showExitConfirm && (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="px-3.5 py-2.5 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-800/50 text-red-300 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Return to Base
            </button>
          )}

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition"
          >
            <Play className="w-4 h-4 fill-current" /> Resume Mission
          </button>
        </div>
      </div>
    </div>
  );
};
