import React, { useState } from 'react';
import { Volume2, VolumeX, Music, Bell, BellOff, Disc, Sparkles, Sliders } from 'lucide-react';
import { soundManager, SoundSettings } from '../../config/soundManager';

interface SoundSettingsPanelProps {
  settings: SoundSettings;
  onUpdateSettings: (newSettings: Partial<SoundSettings>) => void;
  variant?: 'card' | 'compact';
  onOpenFullMenu?: () => void;
}

export const SoundSettingsPanel: React.FC<SoundSettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  variant = 'card',
  onOpenFullMenu
}) => {
  const [showCompactPopover, setShowCompactPopover] = useState(false);

  const toggleAll = () => {
    const isAnyUnmuted = !settings.musicMuted || !settings.sfxMuted;
    if (isAnyUnmuted) {
      onUpdateSettings({ musicMuted: true, sfxMuted: true });
    } else {
      onUpdateSettings({ musicMuted: false, sfxMuted: false });
    }
  };

  const isMasterMuted = settings.musicMuted && settings.sfxMuted;

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const updates: Partial<SoundSettings> = { musicVolume: val };
    if (val > 0 && settings.musicMuted) {
      updates.musicMuted = false;
    }
    onUpdateSettings(updates);
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const updates: Partial<SoundSettings> = { sfxVolume: val };
    if (val > 0 && settings.sfxMuted) {
      updates.sfxMuted = false;
    }
    onUpdateSettings(updates);
  };

  if (variant === 'compact') {
    return (
      <div className="relative">
        <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 p-1.5 rounded-lg shadow-lg">
          <button
            onClick={toggleAll}
            className={`p-1.5 rounded transition ${
              isMasterMuted
                ? 'text-neutral-500 hover:text-neutral-400'
                : 'text-amber-400 hover:text-amber-300'
            }`}
            title={isMasterMuted ? 'Unmute All Audio' : 'Mute All Audio'}
          >
            {isMasterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onUpdateSettings({ musicMuted: !settings.musicMuted })}
            className={`p-1.5 rounded transition flex items-center gap-1 text-xs font-bold ${
              settings.musicMuted
                ? 'bg-neutral-800 text-neutral-500 line-through'
                : 'bg-indigo-900/40 border border-indigo-700/50 text-indigo-300'
            }`}
            title="Toggle Background Music"
          >
            <Music className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onUpdateSettings({ sfxMuted: !settings.sfxMuted })}
            className={`p-1.5 rounded transition flex items-center gap-1 text-xs font-bold ${
              settings.sfxMuted
                ? 'bg-neutral-800 text-neutral-500 line-through'
                : 'bg-emerald-900/40 border border-emerald-700/50 text-emerald-300'
            }`}
            title="Toggle Sound Effects"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (onOpenFullMenu) {
                onOpenFullMenu();
              } else {
                setShowCompactPopover(prev => !prev);
              }
            }}
            className="p-1.5 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
            title="Volume Sliders & Audio Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact Dropdown Popover with Volume Sliders */}
        {showCompactPopover && !onOpenFullMenu && (
          <div 
            className="absolute top-full right-0 mt-2 w-64 bg-neutral-900 border border-neutral-700 rounded-xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <span className="font-bold text-neutral-200 uppercase tracking-wider">Volume Controls</span>
              <button 
                onClick={() => setShowCompactPopover(false)}
                className="text-neutral-500 hover:text-neutral-300"
              >
                ✕
              </button>
            </div>

            {/* Music Slider */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-neutral-400">
                <span className="flex items-center gap-1">
                  <Music className="w-3 h-3 text-indigo-400" /> Music
                </span>
                <span className="text-indigo-400 font-bold">
                  {settings.musicMuted ? '0%' : `${Math.round((settings.musicVolume ?? 0.35) * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.musicMuted ? 0 : (settings.musicVolume ?? 0.35)}
                onChange={handleMusicVolumeChange}
                className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* SFX Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-neutral-400">
                <span className="flex items-center gap-1">
                  <Bell className="w-3 h-3 text-emerald-400" /> SFX
                </span>
                <span className="text-emerald-400 font-bold">
                  {settings.sfxMuted ? '0%' : `${Math.round((settings.sfxVolume ?? 0.5) * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.sfxMuted ? 0 : (settings.sfxVolume ?? 0.5)}
                onChange={handleSfxVolumeChange}
                className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
        <div className="flex items-center gap-2">
          {isMasterMuted ? (
            <VolumeX className="w-5 h-5 text-red-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-amber-400 animate-pulse" />
          )}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Audio Systems
            </h4>
            <p className="text-[10px] text-neutral-400">
              {isMasterMuted ? 'All Channels Muted' : 'Acoustic Synthesizer Active'}
            </p>
          </div>
        </div>

        <button
          onClick={toggleAll}
          className={`text-xs px-2.5 py-1 rounded font-bold transition flex items-center gap-1.5 border ${
            isMasterMuted
              ? 'bg-red-950/40 border-red-800 text-red-400 hover:bg-red-900/50'
              : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-700'
          }`}
        >
          {isMasterMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {isMasterMuted ? 'Muted' : 'Mute All'}
        </button>
      </div>

      <div className="space-y-4">
        {/* BGM Toggle & Slider */}
        <div className={`p-3 rounded-lg border transition ${
          settings.musicMuted
            ? 'bg-neutral-950/60 border-neutral-800 text-neutral-500'
            : 'bg-indigo-950/20 border-indigo-500/40 text-indigo-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => onUpdateSettings({ musicMuted: !settings.musicMuted })}
              className="flex items-center gap-2 text-left group"
            >
              <Disc className={`w-4 h-4 ${settings.musicMuted ? 'text-neutral-600' : 'text-indigo-400 animate-spin'} [animation-duration:8s]`} />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-200 group-hover:text-indigo-300">
                Music Track
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400">
                {settings.musicMuted ? '0%' : `${Math.round((settings.musicVolume ?? 0.35) * 100)}%`}
              </span>
              <button
                onClick={() => onUpdateSettings({ musicMuted: !settings.musicMuted })}
                className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                  settings.musicMuted
                    ? 'bg-neutral-800 text-neutral-400'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                }`}
              >
                {settings.musicMuted ? 'OFF' : 'ON'}
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.musicMuted ? 0 : (settings.musicVolume ?? 0.35)}
            onChange={handleMusicVolumeChange}
            className="w-full h-2 bg-neutral-800 rounded appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* SFX Toggle & Slider */}
        <div className={`p-3 rounded-lg border transition ${
          settings.sfxMuted
            ? 'bg-neutral-950/60 border-neutral-800 text-neutral-500'
            : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => onUpdateSettings({ sfxMuted: !settings.sfxMuted })}
              className="flex items-center gap-2 text-left group"
            >
              {settings.sfxMuted ? (
                <BellOff className="w-4 h-4 text-neutral-600" />
              ) : (
                <Bell className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-200 group-hover:text-emerald-300">
                Sound Effects (SFX)
              </span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => soundManager.playEnemyKilled()}
                disabled={settings.sfxMuted || settings.sfxVolume === 0}
                className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                title="Play test audio pop"
              >
                <Sparkles className="w-2.5 h-2.5" /> Test
              </button>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {settings.sfxMuted ? '0%' : `${Math.round((settings.sfxVolume ?? 0.5) * 100)}%`}
              </span>
              <button
                onClick={() => onUpdateSettings({ sfxMuted: !settings.sfxMuted })}
                className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                  settings.sfxMuted
                    ? 'bg-neutral-800 text-neutral-400'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {settings.sfxMuted ? 'OFF' : 'ON'}
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.sfxMuted ? 0 : (settings.sfxVolume ?? 0.5)}
            onChange={handleSfxVolumeChange}
            className="w-full h-2 bg-neutral-800 rounded appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};
