import React from 'react';
import { Volume2, VolumeX, Music, Bell, BellOff, Disc } from 'lucide-react';
import { SoundSettings } from '../../config/soundManager';

interface SoundSettingsPanelProps {
  settings: SoundSettings;
  onUpdateSettings: (newSettings: Partial<SoundSettings>) => void;
  variant?: 'card' | 'compact';
}

export const SoundSettingsPanel: React.FC<SoundSettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  variant = 'card'
}) => {
  const toggleAll = () => {
    const isAnyUnmuted = !settings.musicMuted || !settings.sfxMuted;
    if (isAnyUnmuted) {
      // Mute both
      onUpdateSettings({ musicMuted: true, sfxMuted: true });
    } else {
      // Unmute both
      onUpdateSettings({ musicMuted: false, sfxMuted: false });
    }
  };

  const isMasterMuted = settings.musicMuted && settings.sfxMuted;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 p-1.5 rounded-lg">
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

      <div className="grid grid-cols-2 gap-2.5">
        {/* BGM Toggle */}
        <button
          onClick={() => onUpdateSettings({ musicMuted: !settings.musicMuted })}
          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition group ${
            settings.musicMuted
              ? 'bg-neutral-950/60 border-neutral-800 text-neutral-500 hover:border-neutral-700'
              : 'bg-indigo-950/30 border-indigo-500/50 text-indigo-200 shadow-md shadow-indigo-950/30'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <div className="flex items-center gap-2">
              <Disc className={`w-4 h-4 ${settings.musicMuted ? 'text-neutral-600' : 'text-indigo-400 animate-spin'} [animation-duration:8s]`} />
              <span className="text-xs font-bold uppercase tracking-wider">Music</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                settings.musicMuted
                  ? 'bg-neutral-800 text-neutral-400'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              }`}
            >
              {settings.musicMuted ? 'OFF' : 'ON'}
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 leading-tight">
            Ambient wasteland drone synth
          </span>
        </button>

        {/* SFX Toggle */}
        <button
          onClick={() => onUpdateSettings({ sfxMuted: !settings.sfxMuted })}
          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition group ${
            settings.sfxMuted
              ? 'bg-neutral-950/60 border-neutral-800 text-neutral-500 hover:border-neutral-700'
              : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200 shadow-md shadow-emerald-950/30'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <div className="flex items-center gap-2">
              {settings.sfxMuted ? (
                <BellOff className="w-4 h-4 text-neutral-600" />
              ) : (
                <Bell className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider">SFX</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                settings.sfxMuted
                  ? 'bg-neutral-800 text-neutral-400'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {settings.sfxMuted ? 'OFF' : 'ON'}
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 leading-tight">
            Combat, alarms & construction
          </span>
        </button>
      </div>
    </div>
  );
};
